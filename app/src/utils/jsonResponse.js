export function extractJsonObject(text) {
    const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
    const raw = fencedMatch ? fencedMatch[1] : text
    return JSON.parse(raw.trim())
}
