
import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"])
    .default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("1h"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  AI_PROVIDER: z.enum(["fixture", "real"]).default("fixture"),
  AI_TIMEOUT_MS: z.coerce.number().positive().default(5000)
});

export const env = EnvSchema.parse(process.env);
