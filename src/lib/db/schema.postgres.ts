import { bigint, index, integer, pgTable, text } from "drizzle-orm/pg-core";

export const sites = pgTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  writeKeyHash: text("write_key_hash").notNull().unique(),
  allowedOrigins: text("allowed_origins").notNull().default("*"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    siteId: text("site_id").notNull(),
    type: text("type").notNull(),
    sessionId: text("session_id").notNull(),
    language: text("language"),
    skinAgeBucket: text("skin_age_bucket"),
    skinHealthPct: integer("skin_health_pct"),
    problemKeys: text("problem_keys"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (table) => [index("events_site_created_idx").on(table.siteId, table.createdAt)],
);
