interface ApifyRunResult {
  items: Record<string, unknown>[];
}

const APIFY_BASE = "https://api.apify.com/v2";
const POLL_INTERVAL_MS = 5_000;

export async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>[]> {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error("APIFY_TOKEN not configured");

  // Apify uses ~ separator in actor IDs (e.g., trudax~reddit-scraper-lite)
  const normalizedId = actorId.replace("/", "~");
  const startRes = await fetch(
    `${APIFY_BASE}/acts/${normalizedId}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!startRes.ok) {
    throw new Error(`Apify start failed: ${startRes.status} ${await startRes.text()}`);
  }

  const startData = (await startRes.json()) as { data: { id: string } };
  const runId = startData.data.id;

  // Poll until completion — no timeout
  while (true) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const statusRes = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${token}`
    );
    const statusData = (await statusRes.json()) as {
      data: { status: string; defaultDatasetId: string };
    };

    if (statusData.data.status === "SUCCEEDED") {
      const datasetRes = await fetch(
        `${APIFY_BASE}/datasets/${statusData.data.defaultDatasetId}/items?token=${token}`
      );
      const items = (await datasetRes.json()) as Record<string, unknown>[];
      return items;
    }

    if (
      statusData.data.status === "FAILED" ||
      statusData.data.status === "ABORTED"
    ) {
      throw new Error(`Apify run ${runId} ${statusData.data.status}`);
    }
  }
}
