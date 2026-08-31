import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

dotenv.config({ override: true });

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  if (cleaned.includes("#")) {
    cleaned = cleaned.split("#")[0].trim();
  }
  cleaned = cleaned.replace(/^["']+|["']+$/g, "").trim();
  return cleaned || undefined;
}

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
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  
  let dataDir = path.resolve(process.cwd(), "data");
  if (isServerless) {
    dataDir = path.join(os.tmpdir(), "seo-data");
  }

  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch {
    dataDir = path.join(os.tmpdir(), "seo-data");
    try {
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    } catch {
      // Ignore if cannot create
    }
  }
  
  const defaultApiKey = "AIzaSyDj5LeNFgrN8M4usW1mVPhj_lCFDTMR-9A";
  const defaultClientId = "986619466549-o6hntm2g2r40cum796eem9vqjjvehfbd.apps.googleusercontent.com";

  let defaultDbUrl = "file:./data/seo.db";
  if (isServerless) {
    defaultDbUrl = `file:${path.join(dataDir, "seo.db")}`;
  }

  return {
    databaseUrl: cleanEnv(process.env.DATABASE_URL) || defaultDbUrl,
    databaseAuthToken: cleanEnv(process.env.DATABASE_AUTH_TOKEN),
    google: {
      clientId: cleanEnv(process.env.GOOGLE_CLIENT_ID) || defaultClientId,
      clientSecret: cleanEnv(process.env.GOOGLE_CLIENT_SECRET),
      refreshToken: cleanEnv(process.env.GOOGLE_REFRESH_TOKEN),
    },
    geminiApiKey: cleanEnv(process.env.GEMINI_API_KEY) || defaultApiKey,
    serperApiKey: cleanEnv(process.env.SERPER_API_KEY),
    pagespeedApiKey: cleanEnv(process.env.PAGESPEED_API_KEY) || defaultApiKey,
    bingApiKey: cleanEnv(process.env.BING_WEBMASTER_API_KEY),
    dataDir,
  };
}

export const TOKENS_PATH = () => path.join(loadConfig().dataDir, "google-tokens.json");
