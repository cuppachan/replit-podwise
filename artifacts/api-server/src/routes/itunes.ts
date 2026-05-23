import { Router } from "express";

const router = Router();

router.get("/itunes/search", async (req, res) => {
  const { term, limit = "25" } = req.query;

  if (!term || typeof term !== "string") {
    res.status(400).json({ error: "Missing term parameter" });
    return;
  }

  const url = `https://itunes.apple.com/search?media=podcast&term=${encodeURIComponent(term)}&limit=${encodeURIComponent(String(limit))}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "PodcastApp/1.0" },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      res.status(response.status).json({ error: `iTunes returned ${response.status}` });
      return;
    }

    const data = await response.json();
    res.set("Cache-Control", "public, max-age=60");
    res.json(data);
  } catch (err: unknown) {
    clearTimeout(timeout);
    const isAbort = err instanceof Error && err.name === "AbortError";
    req.log.warn({ err }, isAbort ? "iTunes search timed out" : "iTunes search failed");
    res.status(isAbort ? 504 : 502).json({
      error: isAbort ? "iTunes search timed out" : "Failed to reach iTunes API",
    });
  }
});

export default router;
