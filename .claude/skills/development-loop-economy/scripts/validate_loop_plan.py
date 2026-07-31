#!/usr/bin/env python3
"""Validate an economical development loop plan using Python stdlib only."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

SIZE_LIMITS = {
    "micro": {"read": 5, "modify": 2, "validate": 2, "subagents": 0},
    "small": {"read": 8, "modify": 4, "validate": 4, "subagents": 1},
}
VALID_PHASES = {
    "discover",
    "implement",
    "deploy-smoke",
    "state-close",
    "incident-diagnosis",
}
VALID_AGENTS = {"claude", "antigravity"}


def load_plan(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"Plan not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(
            f"Invalid JSON at line {exc.lineno}, column {exc.colno}: {exc.msg}"
        ) from exc
    if not isinstance(data, dict):
        raise ValueError("Plan root must be a JSON object")
    return data


def as_list(plan: dict[str, Any], key: str, errors: list[str]) -> list[Any]:
    value = plan.get(key, [])
    if not isinstance(value, list):
        errors.append(f"{key} must be an array")
        return []
    return value


def as_nonnegative_int(plan: dict[str, Any], key: str, errors: list[str]) -> int:
    value = plan.get(key, 0)
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        errors.append(f"{key} must be a non-negative integer")
        return 0
    return value


def validate(plan: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    if plan.get("agent") not in VALID_AGENTS:
        errors.append("agent must be claude or antigravity")

    task_id = plan.get("taskId")
    if not isinstance(task_id, str) or not task_id.strip():
        errors.append("taskId is required")

    outcome = plan.get("outcome")
    if not isinstance(outcome, str) or not outcome.strip():
        errors.append("outcome is required")
    elif len(outcome) > 220:
        errors.append("outcome must be concise (220 characters or fewer)")

    size = plan.get("size")
    if size not in {"micro", "small", "medium", "large"}:
        errors.append("size must be micro, small, medium, or large")

    phase = plan.get("phase")
    if phase not in VALID_PHASES:
        errors.append(f"phase must be one of: {', '.join(sorted(VALID_PHASES))}")

    read_files = as_list(plan, "readFiles", errors)
    modify_files = as_list(plan, "modifyFiles", errors)
    validations = as_list(plan, "validationCommands", errors)
    deploys = as_nonnegative_int(plan, "deploysAllowed", errors)
    smokes = as_nonnegative_int(plan, "smokesAllowed", errors)
    production_calls = as_nonnegative_int(plan, "productionCallsAllowed", errors)
    subagents = as_nonnegative_int(plan, "subagentsAllowed", errors)
    parallel_agents = as_nonnegative_int(plan, "parallelAgentsAllowed", errors)

    if size in SIZE_LIMITS:
        limits = SIZE_LIMITS[size]
        if len(read_files) > limits["read"]:
            errors.append(f"{size} loop may read at most {limits['read']} files")
        if len(modify_files) > limits["modify"]:
            errors.append(f"{size} loop may modify at most {limits['modify']} files")
        if len(validations) > limits["validate"]:
            errors.append(
                f"{size} loop may run at most {limits['validate']} primary validations"
            )
        if subagents > limits["subagents"]:
            errors.append(f"{size} loop may use at most {limits['subagents']} subagents")
    elif size in {"medium", "large"} and not plan.get("splitIntoSubloops", False):
        errors.append("medium/large work must set splitIntoSubloops=true")

    if plan.get("broadScanAllowed") is True and size in {"micro", "small"}:
        errors.append("micro/small loops must not authorize broad repository scans")

    if deploys > 1:
        errors.append("Only one deploy may be authorized per loop")
    if smokes > 1:
        errors.append("Only one smoke may be authorized per loop")

    if parallel_agents > 1 and plan.get("isolatedWorktrees") is not True:
        errors.append("Parallel editing agents require isolatedWorktrees=true")

    if phase in {"discover", "incident-diagnosis"}:
        if modify_files:
            errors.append(f"{phase} loops must not modify files")
        if deploys or smokes:
            errors.append(f"{phase} loops must not deploy or smoke")
        if production_calls:
            errors.append(f"{phase} loops must not call production")

    if phase == "state-close" and deploys:
        errors.append("state-close loops must not deploy")

    if plan.get("productionWrites") is True and plan.get("confirmationPresent") is not True:
        errors.append("Production writes require confirmationPresent=true")

    runner = plan.get("canonicalRunner")
    evidence = plan.get("evidence", {})
    if not isinstance(evidence, dict):
        errors.append("evidence must be an object")
        evidence = {}

    if phase == "deploy-smoke" or smokes == 1:
        if plan.get("boundaryQaPresent") is not True:
            errors.append("deploy-smoke requires boundaryQaPresent=true")
        if plan.get("platformLimitsVerified") is not True:
            errors.append("deploy-smoke requires platformLimitsVerified=true")
        if not isinstance(runner, str) or not runner.strip():
            errors.append("deploy-smoke requires canonicalRunner")
        for key in ("runId", "requestResponseSeparated", "hash", "assertions"):
            if evidence.get(key) is not True:
                errors.append(f"deploy-smoke requires evidence.{key}=true")

    budget = plan.get("externalCallBudget", {})
    if not isinstance(budget, dict):
        errors.append("externalCallBudget must be an object")
    else:
        expected = budget.get("expected", 0)
        limit = budget.get("limit", 0)
        breakdown = budget.get("breakdown", [])
        if not isinstance(expected, int) or expected < 0:
            errors.append("externalCallBudget.expected must be a non-negative integer")
        if not isinstance(limit, int) or limit < 0:
            errors.append("externalCallBudget.limit must be a non-negative integer")
        if isinstance(expected, int) and isinstance(limit, int) and limit > 0 and expected > limit:
            errors.append("Expected external calls exceed the documented platform limit")
        if expected and (not isinstance(breakdown, list) or not breakdown):
            errors.append("External calls require a non-empty breakdown")

    if len(set(map(str, modify_files))) != len(modify_files):
        warnings.append("modifyFiles contains duplicates")
    if len(set(map(str, read_files))) != len(read_files):
        warnings.append("readFiles contains duplicates")
    if phase == "implement" and not validations:
        warnings.append("Implementation loop has no validation command")

    return errors, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate a development loop plan JSON")
    parser.add_argument("plan", type=Path)
    parser.add_argument("--json", action="store_true", dest="json_output")
    args = parser.parse_args()

    try:
        plan = load_plan(args.plan)
        errors, warnings = validate(plan)
    except ValueError as exc:
        errors, warnings = [str(exc)], []

    result = {"valid": not errors, "errors": errors, "warnings": warnings}
    if args.json_output:
        print(json.dumps(result, ensure_ascii=False, indent=2))
    else:
        print("VALID" if not errors else "INVALID")
        for warning in warnings:
            print(f"WARNING: {warning}")
        for error in errors:
            print(f"ERROR: {error}")

    return 0 if not errors else 1


if __name__ == "__main__":
    sys.exit(main())
