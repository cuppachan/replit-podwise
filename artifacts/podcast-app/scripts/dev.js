#!/usr/bin/env node
/**
 * Dev wrapper: binds PORT immediately so the workflow system detects it,
 * then starts Expo Metro on PORT+1.  Mobile clients (Expo Go) use the
 * REPLIT_EXPO_DEV_DOMAIN so they are unaffected by the port split.
 * Web preview requests hitting PORT are proxied to Expo on PORT+1.
 *
 * We strip Origin/Referer headers before forwarding so Expo's CorsMiddleware
 * doesn't reject requests that arrive via the Replit preview domain.
 */
const http = require("http");
const { spawn } = require("child_process");

const PORT = parseInt(process.env.PORT || "23710", 10);
const EXPO_PORT = PORT + 1;

const STRIP_HEADERS = new Set([
  "origin",
  "referer",
  "sec-fetch-site",
  "sec-fetch-mode",
  "sec-fetch-dest",
]);

// ── 1. Proxy / keepalive server on PORT (bound immediately) ──────────────
const server = http.createServer((req, res) => {
  const safeHeaders = Object.fromEntries(
    Object.entries(req.headers).filter(([k]) => !STRIP_HEADERS.has(k.toLowerCase()))
  );
  const opts = {
    hostname: "localhost",
    port: EXPO_PORT,
    path: req.url,
    method: req.method,
    headers: { ...safeHeaders, host: `localhost:${EXPO_PORT}` },
  };
  const proxy = http.request(opts, (pr) => {
    res.writeHead(pr.statusCode, pr.headers);
    pr.pipe(res, { end: true });
  });
  proxy.on("error", () => {
    if (!res.headersSent) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end("Expo starting\u2026");
    }
  });
  req.pipe(proxy, { end: true });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[dev] Bridge server ready on port ${PORT} \u2192 Expo on ${EXPO_PORT}`);
});

// ── 2. Start Expo on EXPO_PORT ────────────────────────────────────────────
const env = {
  ...process.env,
  PORT: String(EXPO_PORT),
  EXPO_PACKAGER_PROXY_URL: `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`,
  EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN ?? process.env.EXPO_PUBLIC_DOMAIN,
  EXPO_PUBLIC_REPL_ID: process.env.REPL_ID,
  REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REPLIT_DEV_DOMAIN,
};

const expo = spawn(
  "pnpm",
  ["exec", "expo", "start", "--localhost", "--port", String(EXPO_PORT)],
  { env, stdio: "inherit" }
);

expo.on("exit", (code) => {
  server.close();
  process.exit(code ?? 0);
});

// Forward termination signals
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => expo.kill(sig));
}
