export function createPendingResult() {
    return { content: '', error: null, elapsed: null, status: 'pending' }
}

export function createPendingJudge() {
    return { status: 'pending', result: '', scores: null, elapsed: null }
}

export function getConfiguredSkills(config = {}) {
    if (Array.isArray(config.skills) && config.skills.length > 0) {
        return config.skills
            .filter((skill) => skill && (skill.id || skill.filename || skill.content))
            .slice(0, 5)
    }

    const legacySkills = [config.skillA, config.skillB]
        .filter((skill) => skill && (skill.filename || skill.content))
        .map((skill, index) => ({
            id: skill.id || `legacy-skill-${index + 1}`,
            filename: skill.filename || '',
            content: skill.content || '',
        }))

    return legacySkills
}

export function getBaselineSkill(skills = []) {
    return skills[0] || null
}

export function getChallengerSkills(skills = []) {
    return skills.slice(1)
}

export function createComparisonState(baselineSkillId, challengerSkillId, existing = {}) {
    return {
        baselineSkillId,
        challengerSkillId,
        judge: existing.judge || createPendingJudge(),
        screenshotA: existing.screenshotA ?? null,
        screenshotB: existing.screenshotB ?? null,
    }
}

export function withLegacyMirrors(evaluation, skills = [], challengerSkillId = null) {
    const baselineSkill = getBaselineSkill(skills)
    const challengers = getChallengerSkills(skills)
    const activeChallengerId = challengerSkillId || challengers[0]?.id || null
    const activeComparison = activeChallengerId ? evaluation.comparisons?.[activeChallengerId] : null

    return {
        ...evaluation,
        resultA: baselineSkill
            ? evaluation.resultsBySkillId?.[baselineSkill.id] || createPendingResult()
            : createPendingResult(),
        resultB: activeChallengerId
            ? evaluation.resultsBySkillId?.[activeChallengerId] || createPendingResult()
            : createPendingResult(),
        judge: activeComparison?.judge || createPendingJudge(),
        screenshotA: activeComparison?.screenshotA ?? null,
        screenshotB: activeComparison?.screenshotB ?? null,
    }
}

export function createEvaluation(prompt, idx, skills = []) {
    const baselineSkill = getBaselineSkill(skills)
    const challengers = getChallengerSkills(skills)
    const resultsBySkillId = Object.fromEntries(
        skills.map((skill) => [skill.id, createPendingResult()]),
    )
    const comparisons = Object.fromEntries(
        challengers.map((skill) => [
            skill.id,
            createComparisonState(baselineSkill?.id || null, skill.id),
        ]),
    )

    return {
        id: idx + 1,
        prompt,
        resultsBySkillId,
        comparisons,
    }
}

export function normalizeEvaluation(evaluation, prompt, idx, skills = []) {
    const baselineSkill = getBaselineSkill(skills)
    const challengers = getChallengerSkills(skills)

    const resultsBySkillId = {}
    skills.forEach((skill, skillIndex) => {
        const existingResult = evaluation?.resultsBySkillId?.[skill.id]
        const legacyResult = skillIndex === 0
            ? evaluation?.resultA
            : skillIndex === 1
                ? evaluation?.resultB
                : null

        resultsBySkillId[skill.id] = existingResult || legacyResult || createPendingResult()
    })

    const comparisons = {}
    challengers.forEach((skill, challengerIndex) => {
        const existingComparison = evaluation?.comparisons?.[skill.id]
        const legacyComparison = challengerIndex === 0
            ? {
                judge: evaluation?.judge,
                screenshotA: evaluation?.screenshotA,
                screenshotB: evaluation?.screenshotB,
            }
            : null

        comparisons[skill.id] = createComparisonState(
            baselineSkill?.id || null,
            skill.id,
            existingComparison || legacyComparison || {},
        )
    })

    return {
        ...evaluation,
        id: evaluation?.id || idx + 1,
        prompt: prompt ?? evaluation?.prompt ?? '',
        resultsBySkillId,
        comparisons,
    }
}

export function getDisplayedEvaluation(evaluation, skills = [], challengerSkillId = null, prompt, idx = 0) {
    const normalized = normalizeEvaluation(evaluation, prompt, idx, skills)
    return withLegacyMirrors(normalized, skills, challengerSkillId)
}

export function isResultTerminal(result) {
    return ['complete', 'error'].includes(result?.status)
}
