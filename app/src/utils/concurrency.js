export async function runWithConcurrency(items, limit, worker) {
    const results = new Array(items.length)
    let index = 0

    async function consume() {
        while (index < items.length) {
            const current = index
            index += 1
            results[current] = await worker(items[current], current)
        }
    }

    await Promise.all(
        Array.from({ length: Math.min(limit, items.length) }, consume),
    )

    return results
}
