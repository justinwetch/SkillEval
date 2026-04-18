/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { FetchLLMHubUIAdapter } from '@llm-hub/ui'

import { getRuntimeConfig } from '../lib/runtimeConfig'

const LlmHubContext = createContext(null)

export function LlmHubProvider({ children }) {
    const { llmHubServerUrl } = getRuntimeConfig()
    const adapter = useMemo(() => new FetchLLMHubUIAdapter(llmHubServerUrl), [llmHubServerUrl])
    const [providers, setProviders] = useState([])
    const [connectedProviders, setConnectedProviders] = useState([])
    const [models, setModels] = useState([])
    const [defaultModel, setDefaultModel] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState(null)
    const [refreshToken, setRefreshToken] = useState(0)

    useEffect(() => {
        let cancelled = false

        async function loadState() {
            setIsLoading(true)
            setError(null)

            try {
                const [providerResponse, connectedResponse, modelsResponse] = await Promise.all([
                    adapter.getProviders(),
                    adapter.getConnectedProviders(),
                    adapter.getModels(),
                ])

                if (cancelled) {
                    return
                }

                setProviders(providerResponse.providers ?? [])
                setConnectedProviders(connectedResponse.providers ?? [])
                setModels(modelsResponse.models ?? [])
                setDefaultModel(modelsResponse.defaultModel ?? null)
            } catch (loadError) {
                if (cancelled) {
                    return
                }

                setProviders([])
                setConnectedProviders([])
                setModels([])
                setDefaultModel(null)
                setError(loadError)
            } finally {
                if (!cancelled) {
                    setIsLoading(false)
                }
            }
        }

        void loadState()

        return () => {
            cancelled = true
        }
    }, [adapter, refreshToken])

    const refresh = () => {
        setRefreshToken((value) => value + 1)
    }

    const value = {
        adapter,
        providers,
        connectedProviders,
        models,
        defaultModel,
        isLoading,
        error,
        refresh,
    }

    return (
        <LlmHubContext.Provider value={value}>
            {children}
        </LlmHubContext.Provider>
    )
}

export function useLlmHub() {
    const context = useContext(LlmHubContext)

    if (!context) {
        throw new Error('useLlmHub must be used within a LlmHubProvider')
    }

    return context
}
