import type { Episode, FeedMode, Podcast } from '@/types/podcast';

export interface FeedBehavior {
  mode: FeedMode;
  label: string;
  description: string;
  wizardLabel: string;
  applyToEpisodes: (episodes: Episode[], podcast: Podcast) => Episode[];
}

export const FEED_BEHAVIORS: Record<FeedMode, FeedBehavior> = {
  default: {
    mode: 'default',
    label: 'Latest first',
    wizardLabel: 'Latest episode first (default)',
    description: 'Newest episodes appear at the top of your inbox.',
    applyToEpisodes: (episodes) =>
      [...episodes].sort((a, b) => b.publishedAt - a.publishedAt),
  },

  reverse: {
    mode: 'reverse',
    label: 'Oldest first',
    wizardLabel: 'Play in reverse — oldest episode first',
    description: 'Play from the very beginning. Ideal for narrative series and true crime.',
    applyToEpisodes: (episodes) =>
      [...episodes].sort((a, b) => a.publishedAt - b.publishedAt),
  },

  '1-in-10': {
    mode: '1-in-10',
    label: '1 in 10 — serendipity',
    wizardLabel: '1 in 10 — random back-catalog episode',
    description:
      'A randomly selected back-catalog episode is injected at every 10th slot in your combined inbox.',
    applyToEpisodes: (episodes) =>
      [...episodes].sort((a, b) => b.publishedAt - a.publishedAt),
  },

  'random-pick': {
    mode: 'random-pick',
    label: 'Random pick',
    wizardLabel: 'Add a random episode to my feed',
    description: 'One randomly selected episode from this podcast is added to your inbox.',
    applyToEpisodes: (episodes) => {
      if (episodes.length === 0) return [];
      const idx = Math.floor(Math.random() * episodes.length);
      return [episodes[idx]];
    },
  },
};

export const ALL_FEED_MODES: FeedMode[] = ['default', 'reverse', '1-in-10', 'random-pick'];

export function applyFeedBehavior(episodes: Episode[], podcast: Podcast): Episode[] {
  const behavior = FEED_BEHAVIORS[podcast.feedMode] ?? FEED_BEHAVIORS.default;
  return behavior.applyToEpisodes(episodes, podcast);
}
