import { describe, expect, it } from 'vitest'

import { extractRenderableHtml } from './renderablePreview'

describe('extractRenderableHtml', () => {
    it('extracts fenced html for iframe preview', () => {
        const html = extractRenderableHtml(`Here is the result:\n\n\`\`\`html\n<button>Buy</button>\n\`\`\``)

        expect(html).toContain('<!doctype html>')
        expect(html).toContain('<button>Buy</button>')
    })

    it('returns full html documents unchanged', () => {
        const doc = '<!doctype html><html><body><main>Preview</main></body></html>'

        expect(extractRenderableHtml(doc)).toBe(doc)
    })

    it('does not preview React component source as plain html', () => {
        const source = "import React from 'react'\nexport default function Button() { return <button>Buy</button> }"

        expect(extractRenderableHtml(source)).toBeNull()
    })
})
