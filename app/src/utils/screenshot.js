/**
 * Screenshot utilities for visual evaluation
 * Communicates with local Puppeteer screenshot server
 */

const SCREENSHOT_SERVER = 'http://localhost:3001';

/**
 * Check if the screenshot server is running and healthy
 * @returns {Promise<{available: boolean, error?: string}>}
 */
export async function checkServerHealth() {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(`${SCREENSHOT_SERVER}/health`, {
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
            const data = await response.json();
            return { available: true, status: data.status };
        }
        return { available: false, error: `Server returned ${response.status}` };
    } catch (error) {
        if (error.name === 'AbortError') {
            return { available: false, error: 'Connection timeout' };
        }
        return { available: false, error: error.message };
    }
}

/**
 * Extract HTML from model response (handles markdown code blocks)
 * @param {string} content - Raw model output
 * @returns {string} Extracted HTML
 */
export function extractHtml(content) {
    if (!content) return '';

    // Try to find HTML in a code block (```html ... ``` or ``` ... ```)
    const htmlBlockMatch = content.match(/```(?:html|HTML)?\s*\n?([\s\S]*?)```/);
    if (htmlBlockMatch) {
        const extracted = htmlBlockMatch[1].trim();
        // Verify it looks like HTML
        if (extracted.includes('<') && extracted.includes('>')) {
            return extracted;
        }
    }

    // Try to find HTML starting with <!DOCTYPE or <html
    const doctypeMatch = content.match(/<!DOCTYPE\s+html[\s\S]*/i);
    if (doctypeMatch) {
        return doctypeMatch[0].trim();
    }

    const htmlTagMatch = content.match(/<html[\s\S]*/i);
    if (htmlTagMatch) {
        return htmlTagMatch[0].trim();
    }

    // If content itself looks like raw HTML, use it
    if (content.trim().startsWith('<') && content.includes('>')) {
        return content;
    }

    // Fallback: return original content
    console.warn('extractHtml: Could not extract HTML, using raw content');
    return content;
}

/**
 * Capture a screenshot of rendered HTML
 * @param {string} htmlContent - HTML to render and capture
 * @param {Object} options - Optional width/height
 * @returns {Promise<string|null>} Base64 PNG string or null if failed
 */
export async function captureScreenshot(htmlContent, options = {}) {
    const { width = 1200, height = 800 } = options;

    try {
        // Extract just the HTML from the content
        const cleanHtml = extractHtml(htmlContent);

        const response = await fetch(`${SCREENSHOT_SERVER}/screenshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html: cleanHtml, width, height })
        });

        if (!response.ok) {
            console.warn('Screenshot server error:', response.statusText);
            return null;
        }

        const data = await response.json();
        return data.screenshot; // base64 string
    } catch (error) {
        console.warn('Screenshot capture failed:', error.message);
        return null;
    }
}

/**
 * Capture screenshots for both A and B results in parallel
 * @param {string} contentA - HTML content for result A
 * @param {string} contentB - HTML content for result B
 * @returns {Promise<{screenshotA: string|null, screenshotB: string|null}>}
 */
export async function captureScreenshots(contentA, contentB) {
    const [screenshotA, screenshotB] = await Promise.all([
        captureScreenshot(contentA),
        captureScreenshot(contentB)
    ]);
    return { screenshotA, screenshotB };
}
