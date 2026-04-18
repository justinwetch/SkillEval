export function buildJudgeMessages({
    prompt,
    resultA,
    resultB,
    screenshotA,
    screenshotB,
    includeCode,
    isVisual,
    skillNames,
}) {
    const content = [
        {
            type: 'text',
            text: `Original prompt:\n${prompt}\n\nResult A (${skillNames.skillA})`,
        },
    ]

    if (isVisual && screenshotA) {
        content.push({ type: 'image', image: `data:image/png;base64,${screenshotA}` })
    }

    if (includeCode) {
        content.push({ type: 'text', text: `\n\`\`\`\n${resultA}\n\`\`\`` })
    }

    content.push({ type: 'text', text: `\n\nResult B (${skillNames.skillB})` })

    if (isVisual && screenshotB) {
        content.push({ type: 'image', image: `data:image/png;base64,${screenshotB}` })
    }

    if (includeCode) {
        content.push({ type: 'text', text: `\n\`\`\`\n${resultB}\n\`\`\`` })
    }

    return [{ role: 'user', content }]
}
