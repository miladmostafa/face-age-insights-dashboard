import { createPostgresStore } from "./postgres";
import { createSqliteStore } from "./sqlite";
import type { Store } from "./types";

export type { EventRecord, SiteRecord, Store } from "./types";

let singleton: Store | null = null;

export function isPostgresUrl(url: string): boolean {
  return url.startsWith("postgres://") || url.startsWith("postgresql://");
}

export function openStore(databaseUrl = process.env.DATABASE_URL || "file:./data/insights.db"): Store {
  if (isPostgresUrl(databaseUrl)) return createPostgresStore(databaseUrl);
  return createSqliteStore(databaseUrl);
}

export function getStore(): Store {
  if (!singleton) singleton = openStore();
  return singleton;
}

/** Test helper. Production code uses the process-wide store. */
export function setStoreForTests(store: Store | null) {
  singleton = store;
}
