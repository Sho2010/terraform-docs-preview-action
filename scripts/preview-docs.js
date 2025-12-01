const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

async function capturePreview(markdownPath) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    locale: 'en-US'
  });

  // Set Accept-Language header to ensure English content
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9'
  });

  try {
    // Read the markdown file
    const markdown = fs.readFileSync(markdownPath, 'utf8');

    // Navigate to the doc-preview page
    await page.goto('https://registry.terraform.io/tools/doc-preview');

    // Close privacy settings modal if it appears
    try {
      // Try to find the close button (X) or accept button
      // Support multiple languages
      const closeButton = page.locator('button[aria-label="Close"]').first();
      const acceptAllButton = page.locator('button:has-text("Accept All"), button:has-text("すべて承認")').first();

      // Wait for either button to appear
      await Promise.race([
        closeButton.waitFor({ timeout: 3000 }),
        acceptAllButton.waitFor({ timeout: 3000 })
      ]).catch(() => {});

      // Try clicking the close button first, then accept button
      if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click();
      } else if (await acceptAllButton.isVisible().catch(() => false)) {
        await acceptAllButton.click();
      }

      // Wait a bit for the modal to close
      await page.waitForTimeout(500);
    } catch (error) {
      // If the modal doesn't appear or is already closed, continue
      console.log('Privacy modal not found or already closed');
    }

    // Find the textarea and paste the content
    await page.fill('textarea', markdown);

    // Wait for the preview to render by checking if content appears
    // The preview typically shows the page title or content
    try {
      // Wait for any content to appear in the preview area
      await page.waitForSelector('.g-type-display-1, h1, .markdown-body', { timeout: 5000 });
      // Give it a bit more time to fully render
      await page.waitForTimeout(1000);
    } catch (error) {
      // If selector doesn't match, just wait a fixed time
      console.log('Using fallback wait time');
      await page.waitForTimeout(3000);
    }

    // Create screenshots directory if it doesn't exist
    if (!fs.existsSync('screenshots')) {
      fs.mkdirSync('screenshots', { recursive: true });
    }

    // Take a screenshot
    const filename = path.basename(markdownPath, '.md');
    await page.screenshot({
      path: `screenshots/${filename}.png`,
      fullPage: true
    });

    console.log(`✓ ${markdownPath}`);
  } catch (error) {
    console.error(`✗ ${markdownPath}: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

const markdownPath = process.argv[2];
if (!markdownPath) {
  console.error('Usage: node preview-docs.js <markdown-file-path>');
  process.exit(1);
}

capturePreview(markdownPath);
