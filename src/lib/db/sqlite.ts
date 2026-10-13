import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { SQLITE_MIGRATION } from "./migrate";
import { events, sites } from "./schema.sqlite";
import type { EventRecord, SiteRecord, Store } from "./types";

export function sqliteFilename(databaseUrl: string): string {
  if (databaseUrl === ":memory:" || databaseUrl === "file::memory:") return ":memory:";
  return databaseUrl.startsWith("file:") ? databaseUrl.slice("file:".length) : databaseUrl;
}

export function createSqliteStore(databaseUrl = "file:./data/insights.db"): Store {
  const filename = sqliteFilename(databaseUrl);
  if (filename !== ":memory:") {
    fs.mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  }
  const sqlite = new Database(filename);
  if (filename !== ":memory:") sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.exec(SQLITE_MIGRATION);
  const db = drizzle(sqlite);

  return {
    async upsertSite(site: SiteRecord) {
      db.insert(sites)
        .values(site)
        .onConflictDoUpdate({
          target: sites.id,
          set: {
            name: site.name,
            writeKeyHash: site.writeKeyHash,
            allowedOrigins: site.allowedOrigins,
          },
        })
        .run();
    },
    async findSiteByWriteKeyHash(hash: string) {
      const row = db.select().from(sites).where(eq(sites.writeKeyHash, hash)).get();
      return row ?? null;
    },
    async listSites() {
      return db.select().from(sites).orderBy(asc(sites.createdAt)).all();
    },
    async insertEvent(event: EventRecord) {
      db.insert(events).values(event).run();
    },
    async listEvents(siteId: string, from: number, to: number) {
      return db
        .select()
        .from(events)
        .where(and(eq(events.siteId, siteId), gte(events.createdAt, from), lte(events.createdAt, to)))
        .all();
    },
    async countEvents(siteId: string) {
      const row = db
        .select({ count: sql<number>`count(*)` })
        .from(events)
        .where(eq(events.siteId, siteId))
        .get();
      return Number(row?.count ?? 0);
    },
    async deleteEvents(siteId: string) {
      db.delete(events).where(eq(events.siteId, siteId)).run();
    },
  };
}
