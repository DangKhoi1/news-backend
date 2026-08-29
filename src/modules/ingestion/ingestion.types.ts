export type FeedSyncResult = {
  feedId: string;
  feedName: string;
  imported: number;
  skipped: number;
  failed: number;
  error: string | null;
};

export type IngestionSyncResult = {
  trigger: 'manual' | 'scheduled' | 'startup' | 'cli';
  startedAt: string;
  completedAt: string;
  imported: number;
  skipped: number;
  failed: number;
  feeds: FeedSyncResult[];
};

export type IngestionRuntimeStatus = {
  running: boolean;
  lastRun: IngestionSyncResult | null;
};

export type ParsedFeedItem = {
  title: string;
  link: string;
  description: string;
  imageUrl: string | null;
  publishedAt: Date;
};
