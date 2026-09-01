import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

dotenv.config({ override: true });

function cleanEnv(val?: string): string | undefined {
  if (!val) return undefined;
  let cleaned = val.trim();
  // Only strip an inline "# comment" when the # starts the value or is preceded by whitespace
  // (the normal .env comment convention) — a bare .includes("#") check would truncate a token
  // or URL that legitimately contains a "#" (e.g. a fragment or an API key charset that allows it).
  const commentAt = cleaned.search(/(^|\s)#/);
  if (commentAt !== -1) {
    cleaned = cleaned.slice(0, commentAt).trim();
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
  
  let defaultDbUrl = "file:./data/seo.db";
  if (isServerless) {
    defaultDbUrl = `file:${path.join(dataDir, "seo.db")}`;
  }

  return {
    databaseUrl: cleanEnv(process.env.DATABASE_URL) || defaultDbUrl,
    databaseAuthToken: cleanEnv(process.env.DATABASE_AUTH_TOKEN),
    google: {
      clientId: cleanEnv(process.env.GOOGLE_CLIENT_ID),
      clientSecret: cleanEnv(process.env.GOOGLE_CLIENT_SECRET),
      refreshToken: cleanEnv(process.env.GOOGLE_REFRESH_TOKEN),
    },
    geminiApiKey: cleanEnv(process.env.GEMINI_API_KEY),
    serperApiKey: cleanEnv(process.env.SERPER_API_KEY),
    pagespeedApiKey: cleanEnv(process.env.PAGESPEED_API_KEY),
    bingApiKey: cleanEnv(process.env.BING_WEBMASTER_API_KEY),
    dataDir,
  };
}

export function updateRuntimeConfig(updates: {
  googleClientId?: string;
  googleClientSecret?: string;
  googleRefreshToken?: string;
  geminiApiKey?: string;
  serperApiKey?: string;
  pagespeedApiKey?: string;
}): void {
  if (updates.googleClientId !== undefined) process.env.GOOGLE_CLIENT_ID = updates.googleClientId;
  if (updates.googleClientSecret !== undefined) process.env.GOOGLE_CLIENT_SECRET = updates.googleClientSecret;
  if (updates.googleRefreshToken !== undefined) process.env.GOOGLE_REFRESH_TOKEN = updates.googleRefreshToken;
  if (updates.geminiApiKey !== undefined) process.env.GEMINI_API_KEY = updates.geminiApiKey;
  if (updates.serperApiKey !== undefined) process.env.SERPER_API_KEY = updates.serperApiKey;
  if (updates.pagespeedApiKey !== undefined) process.env.PAGESPEED_API_KEY = updates.pagespeedApiKey;

  try {
    const envPath = path.resolve(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      let content = fs.readFileSync(envPath, "utf8");
      const setVar = (key: string, val?: string) => {
        if (val === undefined) return;
        const regex = new RegExp(`^${key}=.*$`, "m");
        if (regex.test(content)) {
          content = content.replace(regex, `${key}="${val}"`);
        } else {
          content += `\n${key}="${val}"`;
        }
      };
      if (updates.googleClientId !== undefined) setVar("GOOGLE_CLIENT_ID", updates.googleClientId);
      if (updates.googleClientSecret !== undefined) setVar("GOOGLE_CLIENT_SECRET", updates.googleClientSecret);
      if (updates.googleRefreshToken !== undefined) setVar("GOOGLE_REFRESH_TOKEN", updates.googleRefreshToken);
      if (updates.geminiApiKey !== undefined) setVar("GEMINI_API_KEY", updates.geminiApiKey);
      if (updates.serperApiKey !== undefined) setVar("SERPER_API_KEY", updates.serperApiKey);
      if (updates.pagespeedApiKey !== undefined) setVar("PAGESPEED_API_KEY", updates.pagespeedApiKey);
      fs.writeFileSync(envPath, content, "utf8");
    }
  } catch (err) {
    console.warn("Notice: Could not write to .env file:", err);
  }
}

export const TOKENS_PATH = () => path.join(loadConfig().dataDir, "google-tokens.json");
