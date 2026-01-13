const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Browser instance (reused for performance)
let browser = null;

async function getBrowser() {
    if (!browser) {
        browser = await puppeteer.launch({
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
    res.json({ status: 'ok', browser: browser ? 'running' : 'not started' });
});

// Graceful shutdown
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
