import puppeteer, { type Browser, type Page } from 'puppeteer';
import { spawn, type ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

/**
 * Helper function to wait for a specified number of milliseconds
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface ExportOptions {
  outputPath?: string;
  useDevServer?: boolean;
  devServerPort?: number;
  waitForDiagrams?: boolean;
  timeout?: number;
  maxSlides?: number; // Maximum number of slides to export (if not specified, exports all)
}

/**
 * Starts the Vite dev server
 */
function startDevServer(port: number = 5173): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    console.log(`Starting dev server on port ${port}...`);
    const server = spawn('npm', ['run', 'dev', '--', '--port', port.toString(), '--host'], {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: false,
    });

    let serverReady = false;

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.log(output);
      if ((output.includes('Local:') || output.includes('ready') || output.includes('VITE')) && 
          (output.includes('http://') || output.includes('localhost'))) {
        if (!serverReady) {
          serverReady = true;
          // Give it a moment to fully start
          setTimeout(() => resolve(server), 2000);
        }
      }
    });

    server.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();
      console.error(output);
      if (output.includes('EADDRINUSE')) {
        reject(new Error(`Port ${port} is already in use`));
      }
    });

    server.on('error', (error) => {
      reject(error);
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('Dev server failed to start within 30 seconds'));
      }
    }, 30000);
  });
}

/**
 * Waits for PlantUML diagrams to load on the current slide
 */
async function waitForPlantUMLDiagrams(page: Page, timeout: number = 20000): Promise<void> {
  try {
    // Wait for all PlantUML images to load
    await page.waitForFunction(
      () => {
        const images = document.querySelectorAll('img[alt="PlantUML Diagram"]');
        if (images.length === 0) return true; // No diagrams, we're done
        
        // Check that all images are loaded and have content
        const allLoaded = Array.from(images).every((img) => {
          const htmlImg = img as HTMLImageElement;
          // Image must be complete, have dimensions, and not be in error state
          return htmlImg.complete && 
                 htmlImg.naturalWidth > 0 && 
                 htmlImg.naturalHeight > 0 &&
                 !htmlImg.src.includes('data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='); // Not empty SVG
        });
        
        return allLoaded;
      },
      { timeout, polling: 500 } // Check every 500ms
    );
    
    // Additional verification - check that images are actually visible
    const imagesLoaded = await page.evaluate(() => {
      const images = document.querySelectorAll('img[alt="PlantUML Diagram"]');
      return Array.from(images).filter((img) => {
        const htmlImg = img as HTMLImageElement;
        return htmlImg.complete && htmlImg.naturalWidth > 0;
      }).length;
    });
    
    console.log(`  ${imagesLoaded} diagram(s) loaded on slide`);
  } catch (error) {
    console.warn('Timeout waiting for diagrams, continuing anyway...');
  }
}

/**
 * Waits for the presentation to be fully loaded
 */
async function waitForPresentationLoad(page: Page): Promise<number> {
  // Wait for the presentation container to appear
  await page.waitForSelector('[class*="container"]', { timeout: 10000 });
  
  // Wait a bit for React to fully render
  await delay(1000);
  
  // Get total number of slides from the navigation
  const totalSlides = await page.evaluate(() => {
    // Try to find slide counter in navigation
    const counter = document.querySelector('[class*="slideCounter"]');
    if (counter) {
      const text = counter.textContent || '';
      const match = text.match(/\d+\s*\/\s*(\d+)/);
      if (match) {
        const count = parseInt(match[1], 10);
        if (!isNaN(count) && count > 0) {
          return count;
        }
      }
    }
    return null;
  });

  if (totalSlides && totalSlides > 0) {
    return totalSlides;
  }

  // Fallback: navigate through slides to count them
  console.log('Counting slides by navigation...');
  let slideCount = 1;
  let canNavigate = true;

  while (canNavigate) {
    // Try to go to next slide
    await page.keyboard.press('ArrowRight');
    await delay(500);
    
    const newSlideNumber = await page.evaluate(() => {
      const counter = document.querySelector('[class*="slideCounter"]');
      if (counter) {
        const text = counter.textContent || '';
        const match = text.match(/(\d+)\s*\/\s*\d+/);
        if (match) {
          return parseInt(match[1], 10);
        }
      }
      return null;
    });

    if (newSlideNumber && newSlideNumber > slideCount) {
      slideCount = newSlideNumber;
    } else {
      canNavigate = false;
    }
  }

  // Go back to first slide
  await page.keyboard.press('Home');
  await delay(500);

  return slideCount;
}

/**
 * Navigates to a specific slide
 */
async function navigateToSlide(page: Page, slideNumber: number, totalSlides: number): Promise<void> {
  // Go to first slide
  await page.keyboard.press('Home');
  await delay(300);

  // Navigate to target slide
  for (let i = 1; i < slideNumber; i++) {
    await page.keyboard.press('ArrowRight');
    await delay(300);
  }

  // Verify we're on the correct slide
  await page.waitForFunction(
    (expectedSlide) => {
      const counter = document.querySelector('[class*="slideCounter"]');
      if (counter) {
        const text = counter.textContent || '';
        const match = text.match(/(\d+)\s*\/\s*\d+/);
        if (match) {
          return parseInt(match[1], 10) === expectedSlide;
        }
      }
      return false;
    },
    { timeout: 5000 },
    slideNumber
  );
}

/**
 * Exports presentation to PDF
 */
export async function exportPresentationToPDF(options: ExportOptions = {}): Promise<string> {
  const {
    outputPath = join(projectRoot, 'dist', 'presentation.pdf'),
    useDevServer = true,
    devServerPort = 5173,
    waitForDiagrams = true,
    timeout = 30000,
    maxSlides,
  } = options;

  let devServer: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    // Start dev server if needed
    if (useDevServer) {
      devServer = await startDevServer(devServerPort);
    }

    // Launch browser
    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set viewport to A4 size (landscape for presentations)
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 2, // Higher DPI for better quality
    });

    // Navigate to presentation
    const baseUrl = useDevServer 
      ? `http://localhost:${devServerPort}` 
      : `file://${join(projectRoot, 'dist', 'index.html')}`;
    
    const presentationUrl = `${baseUrl}/presentation/`;
    console.log(`Navigating to ${presentationUrl}...`);
    
    await page.goto(presentationUrl, {
      waitUntil: 'networkidle0',
      timeout,
    });

    // Wait for presentation to load
    console.log('Waiting for presentation to load...');
    const totalSlides = await waitForPresentationLoad(page);
    console.log(`Found ${totalSlides} slides`);

    // Hide navigation for PDF
    await page.evaluate(() => {
      // Hide navigation controls
      const style = document.createElement('style');
      style.textContent = `
        [class*="navigation"] {
          display: none !important;
        }
        [class*="navigationToggle"] {
          display: none !important;
        }
        [class*="companyLogo"] {
          display: none !important;
        }
        body {
          margin: 0;
          padding: 0;
        }
      `;
      document.head.appendChild(style);
    });

    // Generate PDF with all slides (or up to maxSlides if specified)
    const slidesToExport = maxSlides ? Math.min(maxSlides, totalSlides) : totalSlides;
    if (maxSlides && maxSlides < totalSlides) {
      console.log(`Generating PDF for ${slidesToExport} of ${totalSlides} slides...`);
    } else {
      console.log(`Generating PDF for all ${slidesToExport} slide(s)...`);
    }
    
    const pdfPages: Buffer[] = [];

    for (let slideNum = 1; slideNum <= slidesToExport; slideNum++) {
      console.log(`Processing slide ${slideNum}/${slidesToExport}...`);
      
      // Navigate to slide
      await navigateToSlide(page, slideNum, totalSlides);
      
      // Give time for diagrams to start loading
      await delay(1000);
      
      // Wait for diagrams if needed
      if (waitForDiagrams) {
        console.log(`  Waiting for PlantUML diagrams on slide ${slideNum}...`);
        await waitForPlantUMLDiagrams(page, 20000); // Increased timeout to 20 seconds
        
        // Additional wait after diagrams are loaded to ensure they're fully rendered
        // This prevents empty spaces in PDF
        console.log(`  Diagrams loaded, waiting 5 seconds for full rendering...`);
        await delay(5000);
      }
      
      // Wait a bit more for any animations/transitions
      await delay(500);

      // Generate PDF for this slide
      const slidePdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: {
          top: '0.5cm',
          right: '0.5cm',
          bottom: '0.5cm',
          left: '0.5cm',
        },
      });

      pdfPages.push(slidePdf);
    }

    // Combine all PDF pages into one using pdf-lib
    console.log('Combining PDF pages...');
    const { PDFDocument } = await import('pdf-lib');
    const mergedPdf = await PDFDocument.create();

    for (const pdfBuffer of pdfPages) {
      const pdf = await PDFDocument.load(pdfBuffer);
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach((page) => mergedPdf.addPage(page));
    }

    const mergedPdfBytes = await mergedPdf.save();
    
    // Ensure output directory exists
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      const { mkdir } = await import('fs/promises');
      await mkdir(outputDir, { recursive: true });
    }

    // Write PDF
    const { writeFile } = await import('fs/promises');
    await writeFile(outputPath, mergedPdfBytes);

    console.log(`PDF exported successfully to: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  } finally {
    // Cleanup
    if (browser) {
      await browser.close();
    }
    if (devServer) {
      devServer.kill();
      console.log('Dev server stopped');
    }
  }
}

// CLI execution
// Run if this file is executed directly (not imported as a module)
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.includes('export-pdf');

if (isMainModule) {
  const args = process.argv.slice(2);
  let outputPath: string | undefined;
  let maxSlides: number | undefined;

  // Parse command line arguments
  // Usage: npm run export:pdf -- [output-path] [--slides N]
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--slides' || arg === '-s') {
      const slidesArg = args[i + 1];
      if (slidesArg && !slidesArg.startsWith('-')) {
        const parsed = parseInt(slidesArg, 10);
        if (!isNaN(parsed) && parsed > 0) {
          maxSlides = parsed;
          i++; // Skip next argument as it's the value
        }
      }
    } else if (!outputPath && !arg.startsWith('-') && arg !== '--') {
      // First non-flag argument is the output path
      outputPath = arg;
    }
  }
  
  exportPresentationToPDF({
    outputPath,
    useDevServer: true,
    waitForDiagrams: true,
    maxSlides,
  })
    .then((path) => {
      console.log(`✅ PDF exported to: ${path}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Failed to export PDF:', error);
      process.exit(1);
    });
}

