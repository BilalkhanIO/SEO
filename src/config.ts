import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

export interface AppConfig {
  databaseUrl: string;
  databaseAuthToken?: string;
  google: {
    clientId?: string;
    clientSecret?: string;
    refreshToken?: string;
  };
  geminiApiKey?: string;
  serperApiKey?: string;
  pagespeedApiKey?: string;
  bingApiKey?: string;
  dataDir: string;
}

export function loadConfig(): AppConfig {
  const dataDir = path.resolve(process.cwd(), "data");
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return {
    databaseUrl: process.env.DATABASE_URL || "file:./data/seo.db",
    databaseAuthToken: process.env.DATABASE_AUTH_TOKEN || undefined,
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    },
    geminiApiKey: process.env.GEMINI_API_KEY,
    serperApiKey: process.env.SERPER_API_KEY,
    pagespeedApiKey: process.env.PAGESPEED_API_KEY,
    bingApiKey: process.env.BING_WEBMASTER_API_KEY,
    dataDir,
  };
}

export const TOKENS_PATH = () => path.join(loadConfig().dataDir, "google-tokens.json");
