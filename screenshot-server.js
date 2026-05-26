const express = require('express');
const cors = require('cors');
const fs = require('node:fs');
const puppeteer = require('puppeteer-core');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Browser instance (reused for performance)
let browser = null;

function getChromePath() {
    const candidates = [
        process.env.CHROME_PATH,
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/google-chrome',
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
    ].filter(Boolean);

    const executablePath = candidates.find(candidate => fs.existsSync(candidate));
    if (!executablePath) {
        throw new Error('Chrome executable not found. Install Google Chrome or set CHROME_PATH to a Chromium executable.');
    }
    return executablePath;
}

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
            executablePath: getChromePath(),
            headless: 'new',
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
    }
    return browser;
}

// Screenshot endpoint
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

        // Set content and wait for network idle
        await page.setContent(html, {
            waitUntil: ['load', 'networkidle0'],
            timeout: 30000
        });

        // Small delay to ensure any animations/transitions complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Capture screenshot
        const screenshot = await page.screenshot({
            type: 'png',
            fullPage: false,
            encoding: 'base64'
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

// Health check
app.get('/health', (req, res) => {
    let chromePath = null;
    let chromeAvailable = false;
    try {
        chromePath = getChromePath();
        chromeAvailable = true;
    } catch (error) {
        chromePath = error.message;
    }

    res.json({
        status: 'ok',
        service: 'skilleval-local-runner',
        browser: browser ? 'running' : 'not started',
        chromeAvailable,
        chromePath,
    });
});

app.get('/api/health', (req, res) => {
    res.redirect(307, '/health');
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\nShutting down...');
    if (browser) {
        await browser.close();
    }
    clearInterval(keepAlive);
    server.close();
    process.exit(0);
});

const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`SkillEval local runner running on http://localhost:${PORT}`);
    console.log('Endpoints:');
    console.log('  POST /screenshot - Capture screenshot of HTML');
    console.log('  GET  /health     - Health check');
});

// Some desktop sandbox launchers do not keep the Node event loop alive for the
// HTTP server handle alone, so keep an explicit heartbeat for foreground runs.
const keepAlive = setInterval(() => {}, 60_000);
