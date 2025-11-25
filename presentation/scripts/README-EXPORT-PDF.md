# PDF Export Script

This script exports the presentation to PDF using Puppeteer.

## Prerequisites

- Node.js installed
- All dependencies installed (`npm install`)

## Usage

### Basic Export

Export the presentation to the default location (`dist/presentation.pdf`):

```bash
npm run export:pdf
```

### Custom Output Path

Export to a specific location:

```bash
npm run export:pdf ./output/my-presentation.pdf
```

### Export Limited Number of Slides

Export only the first N slides:

```bash
# IMPORTANT: Use -- to pass arguments to the script when using npm run
npm run export:pdf -- --slides 5
# or with custom output path
npm run export:pdf -- ./output/first-5-slides.pdf --slides 5
# or slides first, then path
npm run export:pdf -- --slides 5 ./output/first-5-slides.pdf
```

Or using tsx directly (no -- needed):

```bash
tsx scripts/export-pdf.ts --slides 10
tsx scripts/export-pdf.ts ./output/my-presentation.pdf --slides 5
```

**Note**: When using `npm run`, you must use `--` before any flags to pass them to the script. Without `--`, npm will try to interpret the flags itself.

## How It Works

1. **Starts Dev Server**: Automatically starts the Vite dev server on port 5173 (or next available port)
2. **Launches Browser**: Opens a headless Chrome browser using Puppeteer
3. **Loads Presentation**: Navigates to the presentation page
4. **Counts Slides**: Determines the total number of slides
5. **Captures Each Slide**: 
   - Navigates to each slide
   - Waits for PlantUML diagrams to load
   - Captures the slide as a PDF page
6. **Merges PDFs**: Combines all slide PDFs into a single document
7. **Saves Output**: Saves the final PDF to the specified location

## Features

- ✅ Automatically handles async PlantUML diagram loading
- ✅ Hides navigation UI in PDF output
- ✅ Optimized page breaks for slides
- ✅ High-quality rendering (2x DPI)
- ✅ Landscape A4 format
- ✅ Optional limit on number of slides to export
- ✅ Automatic cleanup (stops dev server and closes browser)

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, the script will try to use the next available port. Make sure no other dev server is running, or modify the port in the script.

### Diagrams Not Loading

The script waits up to 15 seconds per slide for PlantUML diagrams to load. If diagrams are still missing:

1. Check your internet connection (diagrams are loaded from kroki.io)
2. Increase the timeout in the script
3. Check browser console for errors

### PDF Quality Issues

The script uses 2x device scale factor for high quality. If you need higher quality:

1. Increase `deviceScaleFactor` in the script
2. Adjust PDF format settings (currently A4 landscape)

## Configuration

You can modify the export options in `scripts/export-pdf.ts`:

```typescript
exportPresentationToPDF({
  outputPath: './custom/path.pdf',  // Custom output path
  useDevServer: true,                // Use dev server (false for built version)
  devServerPort: 5173,               // Dev server port
  waitForDiagrams: true,             // Wait for PlantUML diagrams
  timeout: 30000,                    // Page load timeout
  maxSlides: 10,                     // Maximum number of slides to export (optional, exports all if not specified)
});
```


## Notes

- The script requires the dev server to be available (or a built version in `dist/`)
- PlantUML diagrams are loaded from kroki.io, so internet connection is required
- The script automatically cleans up resources (dev server, browser) on completion or error

