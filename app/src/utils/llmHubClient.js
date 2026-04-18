export async function chatWithModel({
    adapter,
    selection,
    system,
    messages,
    maxOutputTokens = 8192,
}) {
    if (!adapter) {
        throw new Error('llm-hub adapter is required')
    }

    if (!selection?.providerId || !selection?.modelId) {
        throw new Error('A provider and model selection is required')
    }

    const response = await adapter.chat({
        providerId: selection.providerId,
        modelId: selection.modelId,
        system,
        messages,
        maxOutputTokens,
    })

    return response.text
}
