# Patch install steps

1. Create a backup branch.
```bash
git checkout -b backup/pre-taxonomy-years
```

2. Copy the files from this patch zip into the project root, preserving folders.

3. Verify branch and status.
```bash
git rev-parse --abbrev-ref HEAD
git status -sb
```

4. Install dependencies if needed.
```bash
npm install
```

5. Ensure `DATABASE_URL` is loaded in your shell.

6. Push schema changes.
```bash
npm run db:push
```

7. Run the taxonomy seed from `seed/taxonomia.xlsx`.
```bash
npm run seed:taxonomy
```

8. Start the app locally.
```bash
npm run dev
```

9. Validate:
- open curator new garment and confirm `Year (optional)` appears
- open curator edit garment and confirm `Year (optional)` appears
- as master curator, open `/admin/taxonomy-import`
- download the template and upload a filled Excel
- verify duplicates are skipped and new values are inserted

10. Before deploy, review:
```bash
git diff -- shared/schema.ts server/storage.ts server/routes.ts seed/seed-taxonomia.mjs client/src/App.tsx client/src/components/app-sidebar.tsx client/src/pages/curator.tsx client/src/pages/curator-new-garment.tsx client/src/pages/curator-edit-garment.tsx client/src/pages/admin-taxonomy-import.tsx
```
