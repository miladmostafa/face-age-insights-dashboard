import { and, asc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { POSTGRES_MIGRATION } from "./migrate";
import { events, sites } from "./schema.postgres";
import type { EventRecord, SiteRecord, Store } from "./types";

export function createPostgresStore(connectionString: string): Store {
  const pool = new Pool({ connectionString });
  const db = drizzle(pool);
  let migrated = false;

  async function migrate() {
    if (migrated) return;
    await pool.query(POSTGRES_MIGRATION);
    migrated = true;
  }

  return {
    async upsertSite(site: SiteRecord) {
      await migrate();
      await db
        .insert(sites)
        .values(site)
        .onConflictDoUpdate({
          target: sites.id,
          set: {
            name: site.name,
            writeKeyHash: site.writeKeyHash,
            allowedOrigins: site.allowedOrigins,
          },
        });
    },
    async findSiteByWriteKeyHash(hash: string) {
      await migrate();
      const rows = await db.select().from(sites).where(eq(sites.writeKeyHash, hash)).limit(1);
      return rows[0] ?? null;
    },
    async listSites() {
      await migrate();
      return db.select().from(sites).orderBy(asc(sites.createdAt));
    },
    async insertEvent(event: EventRecord) {
      await migrate();
      await db.insert(events).values(event);
    },
    async listEvents(siteId: string, from: number, to: number) {
      await migrate();
      return db
        .select()
        .from(events)
        .where(and(eq(events.siteId, siteId), gte(events.createdAt, from), lte(events.createdAt, to)));
    },
    async countEvents(siteId: string) {
      await migrate();
      const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(events)
        .where(eq(events.siteId, siteId));
      return Number(rows[0]?.count ?? 0);
    },
    async deleteEvents(siteId: string) {
      await migrate();
      await db.delete(events).where(eq(events.siteId, siteId));
    },
  };
}
