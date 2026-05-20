import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { EpisodeCard } from '@/components/EpisodeCard';
import { FilterBar } from '@/components/FilterBar';
import { useAudioPlayer } from '@/context/AudioPlayerContext';
import { usePodcast } from '@/context/PodcastContext';
import { useColors } from '@/hooks/useColors';
import {
  episodeToPlayerEpisode,
  filterInboxView,
  type InboxFilter,
} from '@/services/inboxBuilder';
import type { Episode } from '@/types/podcast';

export default function InboxScreen() {
  const colors = useColors();
  const { inbox, subscriptions, readIds, loading, refreshing, refreshInbox, markRead } = usePodcast();
  const { playQueue } = useAudioPlayer();
  const insets = useSafeAreaInsets();
  const isWeb = Platform.OS === 'web';
  const bottomPad = isWeb ? 34 + 84 : 84;

  const [filter, setFilter] = useState<InboxFilter>({ type: 'all' });

  const subsWithInbox = useMemo(() => {
    const inboxPodcastIds = new Set(inbox.map((e) => e.podcastId));
    return subscriptions.filter((p) => inboxPodcastIds.has(p.id));
  }, [subscriptions, inbox]);

  const displayEpisodes = useMemo(
    () => filterInboxView(inbox, subscriptions, filter),
    [inbox, subscriptions, filter]
  );

  const isFiltered = filter.type !== 'all';

  const handlePlayAll = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const playable = displayEpisodes
      .filter((e) => !!e.audioUrl)
      .map(episodeToPlayerEpisode);
    if (playable.length > 0) playQueue(playable);
  }, [displayEpisodes, playQueue]);

  const handlePress = useCallback(
    (episode: Episode) => {
      markRead(episode.id);
    },
    [markRead]
  );

  const renderItem = useCallback(
    ({ item }: { item: Episode }) => (
      <EpisodeCard
        episode={item}
        isRead={readIds.has(item.id)}
        onPress={() => handlePress(item)}
      />
    ),
    [readIds, handlePress]
  );

  const keyExtractor = useCallback((item: Episode) => item.id, []);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const showFilterBar = subsWithInbox.length > 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {isWeb && (
        <View
          style={[
            styles.webHeader,
            { paddingTop: 67, backgroundColor: colors.background, borderBottomColor: colors.border },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Inbox</Text>
        </View>
      )}

      {showFilterBar && (
        <FilterBar
          subscriptions={subsWithInbox}
          filter={filter}
          onChange={setFilter}
        />
      )}

      {isFiltered && displayEpisodes.length > 0 && (
        <Pressable
          style={[styles.playAllRow, { backgroundColor: colors.card, borderBottomColor: colors.border }]}
          onPress={handlePlayAll}
          testID="play-all-button"
        >
          <Ionicons name="play-circle" size={20} color={colors.primary} />
          <Text style={[styles.playAllText, { color: colors.primary }]}>
            Play All
          </Text>
          <Text style={[styles.playAllCount, { color: colors.mutedForeground }]}>
            {displayEpisodes.length} episode{displayEpisodes.length !== 1 ? 's' : ''}
          </Text>
        </Pressable>
      )}

      <FlatList
        data={displayEpisodes}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshInbox}
            tintColor={colors.primary}
          />
        }
        scrollEnabled={displayEpisodes.length > 0}
        ListEmptyComponent={
          <View style={styles.empty}>
            {isFiltered ? (
              <>
                <Ionicons name="filter-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No episodes here
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No episodes match this filter. Try a different one or pull to refresh.
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="mail-outline" size={48} color={colors.mutedForeground} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  Your inbox is empty
                </Text>
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  Search for podcasts in Discover and subscribe to start filling your inbox.
                </Text>
              </>
            )}
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webHeader: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  playAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  playAllText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  playAllCount: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    marginLeft: 'auto',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 12,
  },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', marginTop: 8 },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
});
