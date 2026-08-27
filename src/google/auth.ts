import fs from "node:fs";
import http from "node:http";
import { google } from "googleapis";
import type { Credentials } from "google-auth-library";
import { loadConfig, TOKENS_PATH } from "../config.js";

export const SCOPES = [
  "https://www.googleapis.com/auth/blogger",
  "https://www.googleapis.com/auth/webmasters",
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/adsense.readonly",
];

const REDIRECT_PORT = 8123;
const REDIRECT_URI = `http://localhost:${REDIRECT_PORT}/callback`;

function readStoredTokens(): Credentials | null {
  try {
    return JSON.parse(fs.readFileSync(TOKENS_PATH(), "utf8"));
  } catch {
    return null;
  }
}

export function storeTokens(tokens: Credentials): void {
  const existing = readStoredTokens() || {};
  fs.writeFileSync(TOKENS_PATH(), JSON.stringify({ ...existing, ...tokens }, null, 2));
}

export function getOAuthClient(): InstanceType<typeof google.auth.OAuth2> {
  const cfg = loadConfig();
  if (!cfg.google.clientId || !cfg.google.clientSecret) {
    throw new Error(
      "GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET missing. Copy .env.example to .env and fill them (Google Cloud Console → Credentials → OAuth client, redirect URI http://localhost:8123/callback)."
    );
  }
  const client = new google.auth.OAuth2(cfg.google.clientId, cfg.google.clientSecret, REDIRECT_URI);

  const stored = readStoredTokens();
  if (stored) client.setCredentials(stored);
  else if (cfg.google.refreshToken) client.setCredentials({ refresh_token: cfg.google.refreshToken });

  client.on("tokens", (t) => storeTokens(t));
  return client;
}

export function hasCredentials(): boolean {
  const cfg = loadConfig();
  return !!(readStoredTokens()?.refresh_token || readStoredTokens()?.access_token || cfg.google.refreshToken);
}

/** Interactive login: prints an auth URL, waits for the browser redirect on localhost:8123. */
export async function login(): Promise<void> {
  const client = getOAuthClient();
  const url = client.generateAuthUrl({ access_type: "offline", scope: SCOPES, prompt: "consent" });

  console.log("\nOpen this URL in your browser and approve access:\n");
  console.log(url + "\n");
  console.log(`Waiting for the redirect on ${REDIRECT_URI} ...`);
  console.log("(Running on a remote machine? Open the URL locally, and if the final redirect");
  console.log(" fails, copy the ?code=... value from the address bar and run: seo auth code <CODE>)\n");

  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const u = new URL(req.url || "/", `http://localhost:${REDIRECT_PORT}`);
      if (u.pathname !== "/callback") { res.writeHead(404); res.end(); return; }
      const c = u.searchParams.get("code");
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end("<h2>Login complete.</h2>You can close this tab and return to the terminal.");
      server.close();
      if (c) resolve(c);
      else reject(new Error(u.searchParams.get("error") || "No code returned"));
    });
    server.listen(REDIRECT_PORT);
    setTimeout(() => { server.close(); reject(new Error("Timed out after 5 minutes")); }, 5 * 60 * 1000);
  });

  await exchangeCode(code);
}

export async function exchangeCode(code: string): Promise<void> {
  const client = getOAuthClient();
  const { tokens } = await client.getToken(code);
  storeTokens(tokens);
  console.log(`Tokens saved to ${TOKENS_PATH()}`);
  if (tokens.refresh_token) {
    console.log("\nRefresh token (add as GOOGLE_REFRESH_TOKEN in .env on servers / Claude Code remote):");
    console.log(tokens.refresh_token);
  }
}
