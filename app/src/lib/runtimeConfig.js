export const DEFAULT_RUNTIME_CONFIG = Object.freeze({
  llmHubServerUrl: 'http://localhost:3002',
  screenshotServerUrl: 'http://localhost:3001',
})

export function getRuntimeConfig(env = import.meta.env) {
  return {
    llmHubServerUrl: env?.VITE_LLM_HUB_SERVER_URL || DEFAULT_RUNTIME_CONFIG.llmHubServerUrl,
    screenshotServerUrl: env?.VITE_SCREENSHOT_SERVER_URL || DEFAULT_RUNTIME_CONFIG.screenshotServerUrl,
  }
}
