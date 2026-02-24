# Smart Garment Inventory - Design Guidelines

## Design Approach
**System-Based Approach**: Leveraging Shadcn/UI component library with Tailwind CSS for a professional, data-dense inventory management system. Drawing inspiration from enterprise productivity tools like Linear and Notion for clean information hierarchy and efficient workflows.

## Design Principles
1. **Clarity Over Decoration**: Prioritize information legibility and data scanning efficiency
2. **Role-Based Contexts**: Distinct visual hierarchies for Curator (workflow-focused) vs User Portal (discovery-focused)
3. **Scan-Optimized**: Large touch targets and high-contrast elements for mobile QR scanning scenarios
4. **Offline-Aware**: Clear visual indicators for connectivity status and action availability

## Typography System

**Font Family**: Inter (Google Fonts) for UI, JetBrains Mono for codes/IDs

**Scale**:
- Headings: text-3xl (Dashboard titles), text-2xl (Page headers), text-xl (Section headers)
- Body: text-base (Primary content), text-sm (Secondary info, labels)
- Small: text-xs (Metadata, timestamps, helper text)
- Codes: font-mono text-sm (Garment codes, Rack codes, IDs)

**Weights**: font-semibold (Headings, labels), font-medium (Buttons, active states), font-normal (Body text)

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16, 20
- Component padding: p-4, p-6
- Section spacing: space-y-6, gap-8
- Card spacing: p-6 for content, p-4 for compact
- Page margins: px-6 lg:px-8

**Grid Patterns**:
- Search results: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6
- Filter sidebar: w-64 lg:w-80 (desktop), full-width drawer (mobile)
- Print QR grid: grid-cols-3 gap-4 (optimized for A4)

**Containers**: max-w-7xl mx-auto for main content areas

## Core Layouts

### Curator Layout (Sidebar Navigation)
- Fixed sidebar: w-64, full height with collapsible state
- Logo/branding at top (h-16)
- Main navigation grouped by function: Inventory, Actions, Settings
- Active state: Full-width accent indicator on left edge
- Mobile: Transform to bottom navigation bar or drawer

### User Portal Layout (Top Navbar)
- Sticky navbar: h-16, backdrop-blur with border-b
- Centered logo, right-aligned user menu and theme toggle
- Breadcrumb navigation below navbar for deep pages
- Full-width content area with centered max-w containers

## Component Library

### Navigation Components
- **Sidebar Items**: Horizontal padding p-3, gap-3 between icon and text, rounded-lg, full-width hover state
- **Nav Pills**: rounded-full px-4 py-2 for secondary navigation
- **Breadcrumbs**: text-sm with chevron separators, last item font-medium

### Cards
- **Garment Card**: Aspect-ratio 3:4 image, p-4 content area, shadow-sm, rounded-xl, hover:shadow-lg transition
- **Rack Card**: Horizontal layout with QR preview (w-20), p-4, border
- **Detail Card**: Larger p-6, divide-y for sections, shadow-md

### Data Display
- **Timeline**: Vertical line (border-l-2), circular nodes (w-3 h-3 rounded-full), left-aligned content with pl-6
- **Stats Grid**: grid-cols-2 lg:grid-cols-4, each stat with text-sm label and text-2xl font-bold value
- **Status Badges**: rounded-full px-3 py-1 text-xs font-medium (semantic colors per status)
- **Code Display**: font-mono bg-muted px-2 py-1 rounded text-sm

### Forms
- **Input Fields**: h-10, px-3, rounded-md, border, focus:ring-2 focus:ring-offset-2
- **Labels**: text-sm font-medium mb-2 block
- **Multi-step Form**: Progress indicator at top (w-full h-1 bg-muted with filled progress), numbered steps,Next/Back buttons fixed at bottom
- **Select Dropdowns**: Full Shadcn select component with icon indicators
- **File Upload**: Dashed border drag-drop zone, preview thumbnails in grid

### Buttons
- **Primary**: h-10 px-6 rounded-md font-medium (for main actions)
- **Secondary**: h-10 px-6 rounded-md with border variant
- **Icon Buttons**: w-10 h-10 rounded-md (square) for toolbar actions
- **Floating Action**: fixed bottom-right, w-14 h-14 rounded-full shadow-lg (Curator mobile)

### QR Display
- **Detail Page QR**: Large centered display (w-64 h-64), white background padding p-4, downloadable
- **Card QR**: Small preview (w-16 h-16) in corner
- **Print Grid**: Each QR with label below, w-32 h-32 QR size, centered in grid cell

## Specialized Views

### Search/Filter Interface
- Left sidebar (desktop): Sticky filters with collapsible sections, "Apply Filters" button at bottom
- Filter chips: Display active filters as dismissible pills below search bar
- Search input: Large h-12 with icon, prominent placement
- Results count: text-sm text-muted displayed above grid

### QR Scanner View
- Full-screen camera viewport
- Minimal UI overlay: Cancel button top-left, instructions centered bottom
- Scan success: Brief success animation, auto-redirect
- Target frame: Centered outline guide (square, rounded corners)

### Print View
- Clean white background (forced in @media print)
- Hide all navigation, buttons, and interactive elements
- QR grid optimized for A4: 3 columns, adequate margins (2cm)
- Each cell: QR + code label below + optional metadata (small text)
- Page breaks: Prevent breaks within QR cells

### Rack Detail View
- Hero section: Rack code (text-4xl font-bold), zone badge, large QR display
- Inventory grid below: Standard garment cards with "Currently Here" badge
- Empty state: Centered illustration with "No garments" message

## Responsive Patterns
- **Breakpoints**: sm:640px, md:768px, lg:1024px, xl:1280px
- **Mobile-first**: Stack all multi-column layouts, expand filters to full-screen modals
- **Touch targets**: Minimum h-12 for all interactive elements on mobile
- **Scanner**: Full-screen on all devices for optimal camera usage

## Accessibility
- All form inputs with associated labels
- Status communicated via icons + text (not color alone)
- Keyboard navigation: Focus rings (ring-2 ring-offset-2)
- ARIA labels for icon-only buttons
- Skip to main content link

## Images
**Category/Type Cards**: Square aspect ratio (1:1) images, 400x400px minimum. Use placeholder icons from Lucide for missing images (Shirt, Users, Package, etc.)

**Garment Photos**: Portrait aspect ratio (3:4), 600x800px minimum. Display in detail view with lightbox capability

**Empty States**: Use Lucide icon illustrations (large size-16, muted color) centered with text-lg message below

No large hero images needed - this is a functional application focused on data and workflows.