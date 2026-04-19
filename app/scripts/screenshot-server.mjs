import cors from 'cors';
import express from 'express';
import puppeteer from 'puppeteer';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRunHistoryStore } from './run-history-store.mjs';

const app = express();
const PORT = Number(process.env.SCREENSHOT_SERVER_PORT || 3001);
const scriptDir = dirname(fileURLToPath(import.meta.url));
const appDir = resolve(scriptDir, '..');
const repoRoot = resolve(appDir, '..');
const runHistoryDbPath = process.env.SKILLEVAL_RUN_HISTORY_DB || resolve(repoRoot, 'data', 'skilleval.sqlite');
const runHistory = createRunHistoryStore(runHistoryDbPath);

app.use(cors());
app.use(express.json({ limit: '100mb' }));

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

app.get('/runs', (_req, res) => {
  try {
    res.json({ runs: runHistory.list() });
  } catch (error) {
    console.error('Run history list error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/runs', (req, res) => {
  try {
    const run = runHistory.create(req.body?.payload || {}, req.body?.name);
    res.status(201).json({ run });
  } catch (error) {
    console.error('Run history create error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/runs/:id', (req, res) => {
  try {
    const run = runHistory.get(req.params.id);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json({ run });
  } catch (error) {
    console.error('Run history load error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.patch('/runs/:id', (req, res) => {
  try {
    const run = runHistory.update(req.params.id, req.body?.payload || {}, req.body?.name);
    if (!run) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.json({ run });
  } catch (error) {
    console.error('Run history update error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.delete('/runs/:id', (req, res) => {
  try {
    const deleted = runHistory.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Run not found' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Run history delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

process.on('SIGINT', async () => {
  console.log('\nShutting down...');

  if (browser) {
    await browser.close();
  }
  runHistory.close();

  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`Screenshot server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /screenshot - Capture screenshot of HTML');
  console.log('  GET  /health     - Health check');
  console.log('  GET  /runs       - List saved evaluation runs');
  console.log(`Run history DB: ${runHistoryDbPath}`);
});
