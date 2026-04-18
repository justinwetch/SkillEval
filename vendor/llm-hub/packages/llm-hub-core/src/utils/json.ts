export function safeParseJsonRecord(
  input: string | undefined,
): { ok: true; value: Record<string, string> } | { ok: false; error: string } {
  if (!input || input.trim().length === 0) {
    return { ok: true, value: {} };
  }

  try {
    const parsed = JSON.parse(input) as unknown;

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Expected a JSON object.' };
    }

    const record = Object.entries(parsed).reduce<Record<string, string>>(
      (accumulator, [key, value]) => {
        accumulator[key] = String(value);
        return accumulator;
      },
      {},
    );

    return { ok: true, value: record };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : 'Invalid JSON payload supplied.',
    };
  }
}
