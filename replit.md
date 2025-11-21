# Smart Garment Inventory System

A professional full-stack web application for managing sports clothing inventory with QR code scanning, role-based access control, and advanced search capabilities.

## Overview

The Smart Garment Inventory System is a comprehensive solution for managing garment inventory with features like QR code generation, barcode scanning, role-based access (ADMIN/CURATOR/USER), and offline support via PWA.

## Recent Changes

### 2024-11-21: PWA Implementation & Code-Based Routing
- Migrated all routes from UUID-based to human-readable code-based (e.g., `/garment/GAR-SS24-ACT-TS-M-001`)
- Implemented complete PWA support with manifest, service worker, and offline caching
- Generated 8 unique PWA icons (72x72 to 512x512px) using AI
- Created idempotent seed script with movement history tracking
- Enhanced backend APIs to return fully hydrated data with all relations
- Passed comprehensive E2E tests for QR scanner → detail page flow

### 2024-11-20: Initial Implementation
- Created complete database schema with 8 models (Users, Categories, GarmentTypes, Collections, Lots, Racks, Garments, Movements)
- Implemented full authentication system with JWT tokens and bcrypt password hashing
- Built complete REST API with rate limiting, CORS, and error handling
- Designed and implemented responsive UI with Shadcn/UI components
- Connected frontend to backend with authentication flow
- Implemented seed script with test data

## Project Architecture

### Technology Stack
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Tailwind CSS + Shadcn/UI components
- **Authentication**: JWT tokens + bcrypt
- **QR Codes**: qrcode library
- **PWA**: Service Worker with offline caching, manifest.json, installable

### Database Schema

#### Core Tables
- **users**: User accounts with role-based access (ADMIN, CURATOR, USER)
- **categories**: Top-level garment categories (e.g., Activewear, Sportswear)
- **garmentTypes**: Specific types within categories (e.g., T-Shirt, Leggings)
- **collections**: Seasonal or special collections
- **lots**: Production batches within collections
- **racks**: Physical storage locations with zones
- **garments**: Individual garment items with complete details
- **movements**: Audit trail of garment location changes

#### Key Features
- UUID primary keys for all tables
- Optimized indexes on code, rackId, status, and composite fields
- Foreign key constraints with appropriate cascade/restrict behaviors
- Enum types for user roles, garment status, and gender

### API Endpoints

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT token
- `GET /api/auth/me` - Get current user info

#### Categories
- `GET /api/categories` - List all categories
- `POST /api/categories` - Create category (ADMIN only)
- `PATCH /api/categories/:id` - Update category (ADMIN only)
- `DELETE /api/categories/:id` - Delete category (ADMIN only)

#### Garment Types
- `GET /api/garment-types` - List all types
- `GET /api/garment-types/by-category/:categoryId` - List types by category
- `POST /api/garment-types` - Create type (ADMIN only)
- `PATCH /api/garment-types/:id` - Update type (ADMIN only)
- `DELETE /api/garment-types/:id` - Delete type (ADMIN only)

#### Collections
- `GET /api/collections` - List all collections
- `POST /api/collections` - Create collection (CURATOR+)
- `PATCH /api/collections/:id` - Update collection (CURATOR+)
- `DELETE /api/collections/:id` - Delete collection (CURATOR+)

#### Lots
- `GET /api/lots` - List all lots
- `GET /api/lots/by-collection/:collectionId` - List lots by collection
- `POST /api/lots` - Create lot (CURATOR+)
- `PATCH /api/lots/:id` - Update lot (CURATOR+)
- `DELETE /api/lots/:id` - Delete lot (CURATOR+)

#### Racks
- `GET /api/racks` - List all racks
- `GET /api/racks/:id` - Get rack with garments
- `POST /api/racks` - Create rack (CURATOR+)
- `PATCH /api/racks/:id` - Update rack (CURATOR+)
- `DELETE /api/racks/:id` - Delete rack (CURATOR+)

#### Garments
- `GET /api/garments` - Search garments with filters (code, categoryId, typeId, collectionId, lotId, rackId, status, gender, size)
- `GET /api/garments/:id` - Get garment details
- `POST /api/garments` - Create garment (CURATOR+)
- `PATCH /api/garments/:id` - Update garment (CURATOR+)
- `PATCH /api/garments/:id/move` - Move garment to rack (atomic transaction)
- `DELETE /api/garments/:id` - Delete garment (CURATOR+)

#### QR Codes
- `GET /api/qr/garment/:id` - Generate QR code for garment
- `GET /api/qr/rack/:id` - Generate QR code for rack

#### Image Upload
- `POST /api/upload/image` - Upload image file (returns URL)

### Frontend Architecture

#### Pages
- `/login` - Login page
- `/dashboard` - Dashboard with inventory stats
- `/search` - Advanced search with filters
- `/garment/:id` - Garment detail view
- `/rack/:id` - Rack detail view
- `/curator/scan` - QR code scanner
- `/curator/new` - New garment form
- `/curator/print-qrs` - Print QR codes in grid
- `/curator/categories` - Manage categories (ADMIN only)
- `/curator/types` - Manage garment types (ADMIN only)
- `/curator/collections` - Manage collections (CURATOR+)
- `/curator/lots` - Manage lots (CURATOR+)
- `/curator/racks` - Manage racks (CURATOR+)

#### Authentication Flow
1. User logs in with email/password
2. Backend validates credentials and returns JWT token
3. Token stored in localStorage
4. AuthContext provides user info to entire app
5. Protected routes check authentication status
6. Logout clears token and redirects to login

#### Design System
- **Typography**: Inter for UI, JetBrains Mono for codes
- **Colors**: System-based design with semantic tokens
- **Components**: Shadcn/UI components with custom theming
- **Layout**: Sidebar navigation for authenticated users
- **Theme**: Light/dark mode support

### Security Features
- Password hashing with bcrypt (10 salt rounds)
- JWT tokens for stateless authentication
- Rate limiting on auth endpoints (5 attempts per 15 minutes)
- CORS configuration for production
- Role-based access control on all endpoints
- SQL injection protection via Drizzle ORM

### Default Credentials
- **Admin**: admin@inventory.com / admin123
- **Curator**: curator@inventory.com / curator123

## User Preferences

None documented yet.

## Development

### Running the Application
```bash
npm run dev
```

### Database Management
```bash
# Push schema to database
npm run db:push

# Seed database with test data
tsx server/seed.ts
```

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `SESSION_SECRET` - Secret for JWT signing
- `NODE_ENV` - development or production

## Progressive Web App (PWA) Support

### Manifest Configuration
- **File**: `client/public/manifest.json`
- **Name**: Smart Garment Inventory
- **Icons**: 8 unique sizes (72x72 to 512x512px) generated via AI
- **Display**: Standalone mode (full-screen, no browser UI)
- **Theme Color**: #3b82f6 (blue)
- **Shortcuts**: Quick access to "Scan QR" and "New Garment"
- **Categories**: business, productivity

### Service Worker Offline Support
- **File**: `client/public/sw.js`
- **Cache Strategy**:
  - Static assets (HTML, manifest, icons): Precached on install
  - App shell bundles (JS/CSS): Discovered from HTML and precached
  - Vite ES modules (.tsx, .ts): Runtime caching on first load
  - Images, fonts, assets: Cache-first strategy
  - API calls: Network-only (no caching of dynamic data)
  
### Installation
- Installable on mobile (Android/iOS) and desktop (Chrome, Edge)
- Add to home screen prompt appears automatically
- Works offline after first visit (requires network for initial load)

### Development vs Production
- **Development Mode**: Vite ES modules are cached at runtime (first online visit required)
- **Production Mode**: All bundles precached from built assets

**Note**: Complete offline support (cold start without prior network) requires production build with all module dependencies bundled.

## Next Steps
1. ~~Add PWA configuration for offline support~~ ✅ COMPLETED
2. ~~Implement barcode/QR scanner functionality~~ ✅ COMPLETED
3. Add comprehensive error handling and validation
4. ~~Implement movement history tracking~~ ✅ COMPLETED
5. Add data export/import features
