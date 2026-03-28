let cachedRate: { rate: number; fetchedAt: number } | null = null;
const RATE_CACHE_MS = 60 * 60 * 1000; // 1 hour
const FALLBACK_RATE = 1350;

export async function getExchangeRate(): Promise<number> {
  if (cachedRate && Date.now() - cachedRate.fetchedAt < RATE_CACHE_MS) {
    return cachedRate.rate;
  }

  try {
    const res = await fetch(
      "https://api.exchangerate-api.com/v4/latest/USD"
    );
    if (!res.ok) return FALLBACK_RATE;
    const data = (await res.json()) as { rates: { KRW: number } };
    const rate = data.rates.KRW || FALLBACK_RATE;
    cachedRate = { rate, fetchedAt: Date.now() };
    return rate;
  } catch {
    return FALLBACK_RATE;
  }
}

export function formatUSD(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatKRW(amount: number): string {
  return `₩${Math.round(amount).toLocaleString()}`;
}

export function formatDualPrice(
  usd: number,
  rate: number
): string {
  return `${formatUSD(usd)} (${formatKRW(usd * rate)})`;
}

export function generateShareToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateAnonymousId(): string {
  return crypto.randomUUID();
}
