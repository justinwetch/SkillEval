const HTML_FENCE_RE = /```(?:html)?\s*([\s\S]*?)(?:```|$)/i
const ANY_FENCE_RE = /```\w*\s*([\s\S]*?)(?:```|$)/i
const HTML_TAG_RE = /<(html|body|style|main|section|article|header|footer|nav|form|button|div|span|input|label|ul|ol|li|h[1-6]|p)\b/i
const FRAMEWORK_RE = /\b(import\s+|export\s+default|from\s+['"]react|type\s+\w+\s*=|interface\s+\w+|function\s+\w+\s*\([^)]*\)\s*{)/i

function stripFence(content) {
    const htmlFence = content.match(HTML_FENCE_RE)
    if (htmlFence) return htmlFence[1].trim()

    const anyFence = content.match(ANY_FENCE_RE)
    if (anyFence && HTML_TAG_RE.test(anyFence[1])) {
        return anyFence[1].trim()
    }

    return content.trim()
}

function wrapFragment(fragment) {
    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; min-height: 100vh; font-family: ui-sans-serif, system-ui, sans-serif; }
  </style>
</head>
<body>
${fragment}
</body>
</html>`
}

export function extractRenderableHtml(content) {
    if (!content || typeof content !== 'string') return null

    const candidate = stripFence(content)
    if (!HTML_TAG_RE.test(candidate)) return null
    if (FRAMEWORK_RE.test(candidate) && !/<html\b/i.test(candidate)) return null

    if (/<!doctype html/i.test(candidate) || /<html\b/i.test(candidate)) {
        return candidate
    }

    return wrapFragment(candidate)
}
