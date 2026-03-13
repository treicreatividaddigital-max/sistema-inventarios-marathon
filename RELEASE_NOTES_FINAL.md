# ARCHIVE – Final polish package

## Included improvements

### 1. Garment detail mobile hardening
- Removed duplicate Note/Notes rendering.
- Fixed likely horizontal overflow sources on mobile:
  - wrapped long garment codes
  - wrapped QR URLs
  - constrained rack block layout
  - added `min-w-0`, `break-all`, `break-words`, `overflow-x-hidden`
- Preserved existing garment detail functionality.

### 2. QR batch print by rack
- Added rack filter to `/curator/print-qrs`.
- Added garment search box inside the QR batch page.
- Added visible counts, refresh button, clear button, and selection helpers.
- Allows printing garments contained in one specific rack without affecting rack printing.

### 3. Search page resilience
- Added visible recovery state instead of silent blank failure.
- Added manual refresh button.
- Added resume recovery on `pageshow`, `focus`, and `visibilitychange`.
- Re-enabled query refetch on focus/reconnect for garment search queries.
- Added rack filter badge to active filters area.

## Validation
- `npm run check` ✅

## Packaging cleanup
This ZIP is intended to be review-friendly.
Recommended ignored/generated artifacts were excluded from the final delivery package where possible.
