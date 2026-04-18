export function getLanguageModels(models) {
    return models.filter((model) => model.connected && model.kind === 'language')
}

export function getConfigGenerationModels(models) {
    return getLanguageModels(models)
}

export function getVisionJudgeModels(models) {
    return getLanguageModels(models).filter((model) => model.supportsVision)
}
