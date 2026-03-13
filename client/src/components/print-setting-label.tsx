import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

type PrintSettingLabelProps = {
  htmlFor?: string;
  children: ReactNode;
  help: string;
};

export function PrintSettingLabel({ htmlFor, children, help }: PrintSettingLabelProps) {
  return (
    <div className="flex items-center gap-1.5">
      <Label htmlFor={htmlFor}>{children}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground">
            <CircleHelp className="h-4 w-4" />
            <span className="sr-only">Field help</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 text-sm leading-6">{help}</PopoverContent>
      </Popover>
    </div>
  );
}
