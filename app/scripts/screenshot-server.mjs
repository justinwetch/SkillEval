import cors from 'cors';
import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = Number(process.env.SCREENSHOT_SERVER_PORT || 3001);

app.use(cors());
app.use(express.json({ limit: '50mb' }));

let browser = null;

async function getBrowser() {
  if (!browser) {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  }

  return browser;
}

app.post('/screenshot', async (req, res) => {
  const { html, width = 1200, height = 800 } = req.body;

  if (!html) {
    return res.status(400).json({ error: 'HTML content is required' });
  }

  let page = null;

  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

    await page.setViewport({ width, height });
    await page.setContent(html, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    const screenshot = await page.screenshot({
      type: 'png',
      fullPage: false,
      encoding: 'base64',
    });

    res.json({ screenshot });
  } catch (error) {
    console.error('Screenshot error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (page) {
      await page.close();
    }
  }
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', browser: browser ? 'running' : 'not started' });
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');

  if (browser) {
    await browser.close();
  }

  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Screenshot server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /screenshot - Capture screenshot of HTML');
  console.log('  GET  /health     - Health check');
});
