import { drizzle } from "drizzle-orm/d1";

export const getCloudflareD1 = (db: D1Database) => drizzle(db)
