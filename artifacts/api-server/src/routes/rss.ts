import { Router } from "express";

const router = Router();

router.get("/rss", async (req, res) => {
  const { url } = req.query;

  if (!url || typeof url !== "string") {
    res.status(400).json({ error: "Missing url parameter" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    res.status(400).json({ error: "Only http/https URLs are allowed" });
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "PodcastApp/1.0 (RSS Reader)",
        Accept: "application/rss+xml, application/xml, text/xml, */*",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(response.status).json({ error: `Upstream returned ${response.status}` });
      return;
    }

    const text = await response.text();
    const contentType = response.headers.get("content-type") ?? "text/xml";
    res.set("Content-Type", contentType);
    res.set("Cache-Control", "public, max-age=300");
    res.send(text);
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    req.log.warn({ err }, isAbort ? "RSS fetch timed out" : "RSS fetch failed");
    res.status(isAbort ? 504 : 502).json({
      error: isAbort ? "RSS feed request timed out" : "Failed to fetch RSS feed",
    });
  }
});

export default router;
