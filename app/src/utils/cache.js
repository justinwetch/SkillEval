/**
 * Caching utilities for generated configurations
 * Uses localStorage with content-based hashing and TTL
 */

const CACHE_PREFIX = 'skill_eval_config_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function normalizeHashSkills(skillsOrSkillA, maybeSkillB) {
    if (Array.isArray(skillsOrSkillA)) {
        return skillsOrSkillA.filter((skill) => skill?.content)
    }

    return [skillsOrSkillA, maybeSkillB].filter((skill) => skill?.content)
}

/**
 * Generate a SHA-256 hash of skill contents for cache key
 * @param {Object[]|Object} skillsOrSkillA - Array of skills, or legacy skillA
 * @param {Object} maybeSkillB - Legacy skillB
 * @returns {Promise<string>} Hash string
 */
export async function getSkillHash(skillsOrSkillA, maybeSkillB) {
    const skills = normalizeHashSkills(skillsOrSkillA, maybeSkillB)
    const combined = skills
        .map((skill, index) => `${skill.filename || `skill-${index + 1}`}|||${skill.content}`)
        .join('\n=====SKILL_BOUNDARY=====\n')
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);

    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex.substring(0, 32); // Use first 32 chars for shorter key
}

/**
 * Get cached configuration if valid
 * @param {string} hash - Skill content hash
 * @returns {Object|null} Cached config or null if expired/missing
 */
export function getCachedConfig(hash) {
    const key = `${CACHE_PREFIX}${hash}`;
    const cached = localStorage.getItem(key);

    if (!cached) {
        return null;
    }

    try {
        const { config, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        if (age > CACHE_TTL_MS) {
            // Expired, remove and return null
            localStorage.removeItem(key);
            return null;
        }

        return config;
    } catch (error) {
        console.warn('Failed to parse cached config:', error);
        localStorage.removeItem(key);
        return null;
    }
}

/**
 * Store generated configuration in cache
 * @param {string} hash - Skill content hash
 * @param {Object} config - Generated configuration
 */
export function setCachedConfig(hash, config) {
    const key = `${CACHE_PREFIX}${hash}`;
    const cacheEntry = {
        config,
        timestamp: Date.now()
    };

    try {
        localStorage.setItem(key, JSON.stringify(cacheEntry));
    } catch (error) {
        console.warn('Failed to cache config (storage full?):', error);
    }
}

/**
 * Clear all cached configurations
 */
export function clearConfigCache() {
    const keysToRemove = [];

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    return keysToRemove.length;
}
