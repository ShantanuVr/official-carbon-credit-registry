import { z } from 'zod'
import path from 'path'

const configSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters long'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  SERVER_PORT: z.coerce.number().default(4000),
  SERVER_HOST: z.string().default('0.0.0.0'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  ADAPTER_URL: z.string().optional(),
  LOCKER_URL: z.string().optional(),
  ORACLE_URL: z.string().optional(),
  REGISTRY_BRAND_NAME: z.string().default('Official Carbon Credit Registry'),
  ENABLE_TOTP: z.coerce.boolean().default(false),
  READONLY_MODE: z.coerce.boolean().default(false),
  ALLOW_DEMO_UPLOAD_BYPASS: z.coerce.boolean().default(false),
})

const env = configSchema.parse(process.env)

export const config = {
  env: env.NODE_ENV,
  database: {
    url: env.DATABASE_URL,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
  },
  server: {
    port: env.SERVER_PORT,
    host: env.SERVER_HOST,
  },
  cors: {
    origin: env.CORS_ORIGIN,
  },
  integrations: {
    adapterUrl: env.ADAPTER_URL,
    lockerUrl: env.LOCKER_URL,
    oracleUrl: env.ORACLE_URL,
  },
  registry: {
    brandName: env.REGISTRY_BRAND_NAME,
    enableTotp: env.ENABLE_TOTP,
    readonlyMode: env.READONLY_MODE,
    allowDemoUploadBypass: env.ALLOW_DEMO_UPLOAD_BYPASS,
  },
  static: {
    root: path.join(process.cwd(), 'public'),
    prefix: '/public',
  },
} as const
