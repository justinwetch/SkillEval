import { describe, expect, it } from 'vitest'
import { DEFAULT_RUNTIME_CONFIG, getRuntimeConfig } from './runtimeConfig'

describe('getRuntimeConfig', () => {
  it('returns the default runtime config when env vars are missing', () => {
    expect(getRuntimeConfig({})).toEqual(DEFAULT_RUNTIME_CONFIG)
  })

  it('uses env vars when provided', () => {
    expect(
      getRuntimeConfig({
        VITE_LLM_HUB_SERVER_URL: 'https://llm.example.com',
        VITE_SCREENSHOT_SERVER_URL: 'https://shots.example.com',
      }),
    ).toEqual({
      llmHubServerUrl: 'https://llm.example.com',
      screenshotServerUrl: 'https://shots.example.com',
    })
  })
})
