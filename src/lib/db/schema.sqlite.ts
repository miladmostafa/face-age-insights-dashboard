import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  writeKeyHash: text("write_key_hash").notNull().unique(),
  allowedOrigins: text("allowed_origins").notNull().default("*"),
  createdAt: integer("created_at").notNull(),
});

export const events = sqliteTable(
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
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("events_site_created_idx").on(table.siteId, table.createdAt)],
);
