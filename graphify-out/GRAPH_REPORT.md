# Graph Report - /Users/pancho/Desarrollo/Conenido Archive/ARCHIVE  (2026-07-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1063 nodes · 2399 edges · 59 communities (50 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2183dde1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- dependencies
- curator-print-qrs.tsx
- routes.ts
- curator-users.tsx
- schema.ts
- search.tsx
- devDependencies
- garment-print.tsx
- curator-edit-garment.tsx
- IStorage
- cn
- curator-racks.tsx
- DatabaseStorage
- use-toast.ts
- utils.ts
- compilerOptions
- menubar.tsx
- qz-tray.d.ts
- qz-tray.d.ts
- components.json
- App.tsx
- CustomField
- manifest.json
- pagination.tsx
- carousel.tsx
- seed-taxonomia.mjs
- setup.sh
- custom-fields-import.ts
- GarmentType
- Lot
- Rack
- theme-provider.tsx
- chart.tsx
- context-menu.tsx
- dropdown-menu.tsx
- garment-public-detail.tsx
- Category
- Collection
- Config
- printer-status-card.tsx
- sheet.tsx
- table.tsx
- Config
- validate_loop_plan.py
- breadcrumb.tsx
- react
- drawer.tsx
- navigation-menu.tsx
- Year
- input-otp.tsx
- main.tsx
- avatar.tsx
- sw.js

## God Nodes (most connected - your core abstractions)
1. `cn()` - 94 edges
2. `DatabaseStorage` - 63 edges
3. `IStorage` - 61 edges
4. `useAuth()` - 32 edges
5. `useToast()` - 31 edges
6. `Button` - 29 edges
7. `apiRequest()` - 26 edges
8. `Card` - 24 edges
9. `CardContent` - 24 edges
10. `registerRoutes()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `useChart()` --references--> `react`  [EXTRACTED]
  client/src/components/ui/chart.tsx → package.json
- `useCarousel()` --references--> `react`  [EXTRACTED]
  client/src/components/ui/carousel.tsx → package.json
- `useFormField()` --references--> `react`  [EXTRACTED]
  client/src/components/ui/form.tsx → package.json
- `useSidebar()` --references--> `react`  [EXTRACTED]
  client/src/components/ui/sidebar.tsx → package.json
- `useToast()` --references--> `react`  [EXTRACTED]
  client/src/hooks/use-toast.ts → package.json

## Import Cycles
- None detected.

## Communities (59 total, 9 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.03
Nodes (76): dependencies, bcrypt, bcryptjs, class-variance-authority, clsx, cmdk, connect-pg-simple, date-fns (+68 more)

### Community 1 - "curator-print-qrs.tsx"
Cohesion: 0.07
Nodes (62): ThermalLabelPreview(), ThermalLabelPreviewProps, ThermalPrintSupportNote(), Checkbox, Switch, TabsContent, TabsList, TabsTrigger (+54 more)

### Community 2 - "routes.ts"
Cohesion: 0.05
Nodes (58): express, qrcode, vite, buildCustomFieldsTemplateBuffer(), app, http, IncomingMessage, authLimiter (+50 more)

### Community 3 - "curator-users.tsx"
Cohesion: 0.11
Nodes (42): AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay, AlertDialogTitle (+34 more)

### Community 4 - "schema.ts"
Cohesion: 0.06
Nodes (41): db, pool, ensureYearsSeeded(), GarmentSearchFilters, GarmentSearchPagedFilters, GarmentSearchPagedResult, storage, categories (+33 more)

### Community 5 - "search.tsx"
Cohesion: 0.07
Nodes (31): PrintSettingLabel(), PrintSettingLabelProps, Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList (+23 more)

### Community 6 - "devDependencies"
Cohesion: 0.05
Nodes (37): devDependencies, autoprefixer, drizzle-kit, esbuild, postcss, @replit/vite-plugin-cartographer, @replit/vite-plugin-dev-banner, @replit/vite-plugin-runtime-error-modal (+29 more)

### Community 7 - "garment-print.tsx"
Cohesion: 0.12
Nodes (26): PrinterIssueDialog(), PrinterIssueDialogMode, Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle (+18 more)

### Community 8 - "curator-edit-garment.tsx"
Cohesion: 0.13
Nodes (32): useToast(), useAuth(), apiRequest(), getAuthHeaders(), getQueryFn(), invalidateGarmentQueries(), parseJsonIfAny(), queryClient (+24 more)

### Community 9 - "IStorage"
Cohesion: 0.08
Nodes (5): IStorage, Garment, InsertGarment, InsertMovement, Movement

### Community 10 - "cn"
Cohesion: 0.14
Nodes (29): Separator, Sidebar(), SidebarContent(), SidebarContext, SidebarContextProps, SidebarFooter(), SidebarGroup(), SidebarGroupAction() (+21 more)

### Community 11 - "curator-racks.tsx"
Cohesion: 0.14
Nodes (24): Garment, GarmentCard(), GarmentCardProps, getStatusColor(), getStatusLabel(), Badge(), BadgeProps, badgeVariants (+16 more)

### Community 12 - "DatabaseStorage"
Cohesion: 0.09
Nodes (3): DatabaseStorage, InsertUser, User

### Community 13 - "use-toast.ts"
Cohesion: 0.12
Nodes (23): Toast, ToastAction, ToastActionElement, ToastClose, ToastDescription, ToastProps, ToastTitle, toastVariants (+15 more)

### Community 14 - "utils.ts"
Cohesion: 0.09
Nodes (15): AccordionContent, AccordionItem, AccordionTrigger, HoverCardContent, Progress, RadioGroup, RadioGroupItem, ResizableHandle() (+7 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, esModuleInterop, incremental, jsx, lib, module, moduleResolution (+10 more)

### Community 16 - "menubar.tsx"
Cohesion: 0.12
Nodes (11): Menubar, MenubarCheckboxItem, MenubarContent, MenubarItem, MenubarLabel, MenubarRadioItem, MenubarSeparator, MenubarShortcut() (+3 more)

### Community 17 - "qz-tray.d.ts"
Cohesion: 0.12
Nodes (6): QzConfig, QzPromiseFactory, QzPromiseRejector, QzPromiseResolver, QzTrayApi, Window

### Community 18 - "qz-tray.d.ts"
Cohesion: 0.12
Nodes (6): QzConfig, QzPromiseFactory, QzPromiseRejector, QzPromiseResolver, QzTrayApi, Window

### Community 19 - "components.json"
Cohesion: 0.12
Nodes (16): aliases, components, hooks, lib, ui, utils, rsc, $schema (+8 more)

### Community 20 - "App.tsx"
Cohesion: 0.15
Nodes (12): AppRouter(), AuthenticatedLayout(), isPublicGarmentRoute(), isPublicRackRoute(), AppSidebar(), AuthContext, AuthContextType, AuthProvider() (+4 more)

### Community 21 - "CustomField"
Cohesion: 0.17
Nodes (4): CustomField, CustomFieldOption, InsertCustomField, InsertCustomFieldOption

### Community 22 - "manifest.json"
Cohesion: 0.14
Nodes (13): background_color, categories, description, display, icons, name, orientation, scope (+5 more)

### Community 23 - "pagination.tsx"
Cohesion: 0.16
Nodes (12): ButtonProps, buttonVariants, Calendar(), CalendarProps, Pagination(), PaginationContent, PaginationEllipsis(), PaginationItem (+4 more)

### Community 24 - "carousel.tsx"
Cohesion: 0.15
Nodes (12): Carousel, CarouselApi, CarouselContent, CarouselContext, CarouselContextProps, CarouselItem, CarouselNext, CarouselOptions (+4 more)

### Community 25 - "seed-taxonomia.mjs"
Cohesion: 0.35
Nodes (12): buildLotDescription(), buildLotName(), canonicalKey(), compactUpper(), EXCEL_PATH, findHeaderIndex(), main(), mapHeaderName() (+4 more)

### Community 26 - "setup.sh"
Cohesion: 0.35
Nodes (12): add_ignore(), c_blue(), c_green(), c_red(), c_yellow(), fail(), has(), ok() (+4 more)

### Community 27 - "custom-fields-import.ts"
Cohesion: 0.29
Nodes (11): xlsx, CustomFieldImportSummary, importCustomFieldsBuffer(), ImportRow, normalizeKey(), normalizeText(), parseWorkbook(), toBool() (+3 more)

### Community 31 - "theme-provider.tsx"
Cohesion: 0.24
Nodes (9): getSystemTheme(), initialState, Theme, ThemeProvider(), ThemeProviderContext, ThemeProviderProps, ThemeProviderState, useTheme() (+1 more)

### Community 32 - "chart.tsx"
Cohesion: 0.18
Nodes (8): ChartConfig, ChartContainer, ChartContext, ChartContextProps, ChartLegendContent, ChartTooltipContent, THEMES, useChart()

### Community 33 - "context-menu.tsx"
Cohesion: 0.20
Nodes (9): ContextMenuCheckboxItem, ContextMenuContent, ContextMenuItem, ContextMenuLabel, ContextMenuRadioItem, ContextMenuSeparator, ContextMenuShortcut(), ContextMenuSubContent (+1 more)

### Community 34 - "dropdown-menu.tsx"
Cohesion: 0.20
Nodes (9): DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuShortcut(), DropdownMenuSubContent (+1 more)

### Community 35 - "garment-public-detail.tsx"
Cohesion: 0.33
Nodes (8): formatLot(), formatRack(), formatYear(), GarmentPublicDetailPage(), normalizePhotoUrls(), PublicGarment, statusLabel(), statusVariant()

### Community 39 - "printer-status-card.tsx"
Cohesion: 0.36
Nodes (5): PrinterStatusCard(), Alert, AlertDescription, AlertTitle, alertVariants

### Community 40 - "sheet.tsx"
Cohesion: 0.22
Nodes (8): SheetContent, SheetContentProps, SheetDescription, SheetFooter(), SheetHeader(), SheetOverlay, SheetTitle, sheetVariants

### Community 41 - "table.tsx"
Cohesion: 0.22
Nodes (8): Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow

### Community 43 - "validate_loop_plan.py"
Cohesion: 0.50
Nodes (7): Any, as_list(), as_nonnegative_int(), load_plan(), main(), validate(), Path

### Community 44 - "breadcrumb.tsx"
Cohesion: 0.25
Nodes (7): Breadcrumb, BreadcrumbEllipsis(), BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator()

### Community 45 - "react"
Cohesion: 0.29
Nodes (7): useCarousel(), useFormField(), SearchableSelect(), SidebarMenuSkeleton(), SidebarProvider(), useIsMobile(), react

### Community 46 - "drawer.tsx"
Cohesion: 0.25
Nodes (6): DrawerContent, DrawerDescription, DrawerFooter(), DrawerHeader(), DrawerOverlay, DrawerTitle

### Community 47 - "navigation-menu.tsx"
Cohesion: 0.25
Nodes (7): NavigationMenu, NavigationMenuContent, NavigationMenuIndicator, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle, NavigationMenuViewport

### Community 49 - "input-otp.tsx"
Cohesion: 0.33
Nodes (5): InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot, input-otp

### Community 50 - "main.tsx"
Cohesion: 0.40
Nodes (3): __isQaHost, __isRunApp, rootEl

### Community 51 - "avatar.tsx"
Cohesion: 0.50
Nodes (3): Avatar, AvatarFallback, AvatarImage

## Knowledge Gaps
- **403 isolated node(s):** `name`, `short_name`, `description`, `start_url`, `display` (+398 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `curator-print-qrs.tsx`, `curator-users.tsx`, `search.tsx`, `garment-print.tsx`, `curator-racks.tsx`, `use-toast.ts`, `utils.ts`, `menubar.tsx`, `pagination.tsx`, `carousel.tsx`, `chart.tsx`, `context-menu.tsx`, `dropdown-menu.tsx`, `printer-status-card.tsx`, `sheet.tsx`, `table.tsx`, `breadcrumb.tsx`, `react`, `drawer.tsx`, `navigation-menu.tsx`, `input-otp.tsx`, `avatar.tsx`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `routes.ts`, `devDependencies`, `react`, `input-otp.tsx`, `custom-fields-import.ts`?**
  _High betweenness centrality (0.163) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `chart.tsx`, `curator-edit-garment.tsx`, `cn`, `dependencies`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `name`, `short_name`, `description` to the rest of the system?**
  _405 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.02631578947368421 - nodes in this community are weakly interconnected._
- **Should `curator-print-qrs.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.06680080482897384 - nodes in this community are weakly interconnected._
- **Should `routes.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.054563492063492064 - nodes in this community are weakly interconnected._