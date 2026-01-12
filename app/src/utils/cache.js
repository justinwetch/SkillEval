/**
 * Caching utilities for generated configurations
 * Uses localStorage with content-based hashing and TTL
 */

const CACHE_PREFIX = 'skill_eval_config_';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Generate a SHA-256 hash of skill contents for cache key
 * @param {Object} skillA - { filename, content }
 * @param {Object} skillB - { filename, content }
 * @returns {Promise<string>} Hash string
 */
export async function getSkillHash(skillA, skillB) {
    const combined = `${skillA.content}|||${skillB.content}`;
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
