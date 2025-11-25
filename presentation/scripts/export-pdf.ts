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
async function waitForPlantUMLDiagrams(page: Page, timeout: number = 30000): Promise<void> {
  try {
    // Wait for all PlantUML diagrams to load
    // This includes waiting for loading spinners to disappear and images to be ready
    await page.waitForFunction(
      () => {
        // Check if there are any loading indicators visible
        const loadingTexts = Array.from(document.querySelectorAll('*')).filter(
          (el) => el.textContent?.includes('Загрузка диаграммы')
        );
        if (loadingTexts.length > 0) {
          return false; // Still loading
        }

        // Check for Spin components (Ant Design spinner)
        const spinners = document.querySelectorAll('.ant-spin, [class*="spin"]');
        const visibleSpinners = Array.from(spinners).filter((spinner) => {
          const style = window.getComputedStyle(spinner);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });
        if (visibleSpinners.length > 0) {
          return false; // Still loading
        }

        // Check for all PlantUML images
        const images = document.querySelectorAll('img[alt="PlantUML Diagram"]');
        
        // If there are no images and no loading indicators, we're done
        if (images.length === 0) {
          return true;
        }
        
        // All images must be loaded
        const allLoaded = Array.from(images).every((img) => {
          const htmlImg = img as HTMLImageElement;
          return htmlImg.complete && htmlImg.naturalWidth > 0 && htmlImg.naturalHeight > 0;
        });

        return allLoaded;
      },
      { timeout, polling: 500 } // Check every 500ms
    );

    // Additional wait to ensure images are fully rendered
    await delay(1000);
  } catch (error) {
    console.warn('Timeout waiting for diagrams, continuing anyway...');
    // Give it one more second before continuing
    await delay(1000);
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
  await delay(500);

  // Navigate to target slide
  for (let i = 1; i < slideNumber; i++) {
    await page.keyboard.press('ArrowRight');
    await delay(500); // Increased delay for React to render
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
    { timeout: 10000 },
    slideNumber
  );

  // Wait for slide content to render
  await delay(1000);
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

    // Generate PDF with all slides
    console.log('Generating PDF...');
    
    const pdfPages: Buffer[] = [];

    for (let slideNum = 1; slideNum <= totalSlides; slideNum++) {
      console.log(`Processing slide ${slideNum}/${totalSlides}...`);
      
      // Navigate to slide
      await navigateToSlide(page, slideNum, totalSlides);
      
      // Wait for React to render the slide content
      await delay(1000);
      
      // Wait for any network requests to complete
      // Puppeteer doesn't have waitForLoadState, so we wait a bit for async operations
      await delay(2000);
      
      // Wait for diagrams if needed
      if (waitForDiagrams) {
        console.log(`  Waiting for diagrams on slide ${slideNum}...`);
        await waitForPlantUMLDiagrams(page, 45000); // Increased timeout to 45 seconds
        
        // Verify diagrams are actually loaded (not showing loading state)
        const diagramStatus = await page.evaluate(() => {
          const loadingTexts = Array.from(document.querySelectorAll('*')).some(
            (el) => el.textContent?.includes('Загрузка диаграммы')
          );
          const spinners = document.querySelectorAll('.ant-spin, [class*="spin"]');
          const visibleSpinners = Array.from(spinners).some((spinner) => {
            const style = window.getComputedStyle(spinner);
            return style.display !== 'none' && style.visibility !== 'hidden';
          });
          const images = document.querySelectorAll('img[alt="PlantUML Diagram"]');
          const loadedImages = Array.from(images).filter((img) => {
            const htmlImg = img as HTMLImageElement;
            return htmlImg.complete && htmlImg.naturalWidth > 0;
          });
          
          return {
            hasLoading: loadingTexts || visibleSpinners,
            totalImages: images.length,
            loadedImages: loadedImages.length,
          };
        });

        if (diagramStatus.hasLoading) {
          console.warn(`  ⚠️  Warning: Some diagrams may still be loading on slide ${slideNum}`);
          // Wait a bit more
          await delay(5000);
        } else if (diagramStatus.totalImages > 0) {
          console.log(`  ✓ All ${diagramStatus.loadedImages}/${diagramStatus.totalImages} diagrams loaded on slide ${slideNum}`);
        } else {
          console.log(`  ✓ No diagrams on slide ${slideNum}`);
        }
      }
      
      // Wait a bit more for any animations/transitions
      await delay(1000);

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
  const outputPath = args[0] || undefined;
  
  exportPresentationToPDF({
    outputPath,
    useDevServer: true,
    waitForDiagrams: true,
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

