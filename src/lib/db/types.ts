export type SiteRecord = {
  id: string;
  name: string;
  writeKeyHash: string;
  allowedOrigins: string;
  createdAt: number;
};

export type EventRecord = {
  id: string;
  siteId: string;
  type: string;
  sessionId: string;
  language: string | null;
  skinAgeBucket: string | null;
  skinHealthPct: number | null;
  problemKeys: string | null;
  createdAt: number;
};

export interface Store {
  upsertSite(site: SiteRecord): Promise<void>;
  findSiteByWriteKeyHash(hash: string): Promise<SiteRecord | null>;
  listSites(): Promise<SiteRecord[]>;
  insertEvent(event: EventRecord): Promise<void>;
  listEvents(siteId: string, from: number, to: number): Promise<EventRecord[]>;
  countEvents(siteId: string): Promise<number>;
  deleteEvents(siteId: string): Promise<void>;
}
