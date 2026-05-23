import { Platform } from 'react-native';
import { type Podcast } from '@/types/podcast';

export interface ItunesResult {
  collectionId: number;
  collectionName: string;
  artistName: string;
  artworkUrl600?: string;
  artworkUrl100?: string;
  feedUrl: string;
  primaryGenreName?: string;
  trackCount?: number;
}

const _domain = process.env.EXPO_PUBLIC_DOMAIN ?? '';
const API_BASE = _domain
  ? _domain.startsWith('http://') || _domain.startsWith('https://')
    ? _domain
    : `https://${_domain}`
  : '';

export async function searchPodcasts(query: string): Promise<ItunesResult[]> {
  let url: string;
  if (Platform.OS === 'web' || API_BASE) {
    url = `${API_BASE}/api/itunes/search?term=${encodeURIComponent(query)}&limit=25`;
  } else {
    url = `https://itunes.apple.com/search?media=podcast&term=${encodeURIComponent(query)}&limit=25`;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`iTunes search failed: ${response.status}`);
  const data = await response.json();
  return ((data.results ?? []) as ItunesResult[]).filter((r) => !!r.feedUrl);
}

export function itunesResultToPodcast(result: ItunesResult): Podcast {
  return {
    id: `itunes_${result.collectionId}`,
    title: result.collectionName,
    author: result.artistName,
    description: '',
    artwork: result.artworkUrl600 ?? result.artworkUrl100 ?? '',
    feedUrl: result.feedUrl,
    genre: result.primaryGenreName,
    episodeCount: result.trackCount,
    subscribedAt: Date.now(),
    tags: [],
    feedMode: 'default',
    backfill: 'latest-only',
  };
}
