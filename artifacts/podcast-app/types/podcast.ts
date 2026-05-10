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
