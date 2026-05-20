export type FeedMode = 'default' | 'reverse' | '1-in-10' | 'random-pick';
export type BackfillMode = 'latest-only' | 'last-N' | 'all';

export interface Podcast {
  id: string;
  title: string;
  author: string;
  description: string;
  artwork: string;
  feedUrl: string;
  genre?: string;
  episodeCount?: number;
  subscribedAt: number;
  tags: string[];
  feedMode: FeedMode;
  backfill: BackfillMode;
  backfillCount?: number;
}

export interface Episode {
  id: string;
  podcastId: string;
  podcastTitle: string;
  podcastArtwork: string;
  title: string;
  description: string;
  audioUrl: string;
  duration: string;
  pubDate: string;
  publishedAt: number;
  isRead: boolean;
}

export const PODCAST_DEFAULTS: Pick<Podcast, 'tags' | 'feedMode' | 'backfill'> = {
  tags: [],
  feedMode: 'default',
  backfill: 'latest-only' as BackfillMode,
};

export function withPodcastDefaults(p: Partial<Podcast> & Pick<Podcast, 'id' | 'title' | 'feedUrl' | 'subscribedAt'>): Podcast {
  return {
    author: '',
    description: '',
    artwork: '',
    ...PODCAST_DEFAULTS,
    ...p,
  };
}
