import { getRuntimeConfig } from '../lib/runtimeConfig'

const { runHistoryServerUrl: RUN_HISTORY_SERVER } = getRuntimeConfig()

async function request(path, options = {}) {
    const response = await fetch(`${RUN_HISTORY_SERVER}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
    })

    if (response.status === 204) return null

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
        throw new Error(data.error || `Run history request failed: ${response.status}`)
    }
    return data
}

export async function listRunHistory() {
    const data = await request('/runs')
    return data.runs || []
}

export async function createRunHistory(payload, name) {
    const data = await request('/runs', {
        method: 'POST',
        body: JSON.stringify({ payload, name }),
    })
    return data.run
}

export async function updateRunHistory(id, payload, name) {
    const data = await request(`/runs/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ payload, name }),
    })
    return data.run
}

export async function loadRunHistory(id) {
    const data = await request(`/runs/${encodeURIComponent(id)}`)
    return data.run
}

export async function deleteRunHistory(id) {
    await request(`/runs/${encodeURIComponent(id)}`, { method: 'DELETE' })
}
