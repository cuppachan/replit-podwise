import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePodcast } from '@/context/PodcastContext';
import { useColors } from '@/hooks/useColors';
import { fetchEpisodes } from '@/services/rssFetcher';
import type { Episode, Podcast } from '@/types/podcast';

export default function PodcastDetailScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    author: string;
    artwork: string;
    feedUrl: string;
    genre: string;
  }>();

  const { subscriptions, subscribe, unsubscribe, isSubscribed } = usePodcast();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const podcast: Podcast = {
    id: params.id,
    title: params.title ?? '',
    author: params.author ?? '',
    description: '',
    artwork: params.artwork ?? '',
    feedUrl: params.feedUrl ?? '',
    genre: params.genre ?? undefined,
    subscribedAt: Date.now(),
  };

  const subscribed = isSubscribed(params.id);

  useEffect(() => {
    if (!params.feedUrl) return;
    setLoading(true);
    fetchEpisodes(podcast, 50)
      .then(setEpisodes)
      .catch(() => setError('Could not load episodes. Check your connection.'))
      .finally(() => setLoading(false));
  }, [params.feedUrl]);

  const handleToggleSubscribe = useCallback(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (subscribed) {
      await unsubscribe(params.id);
    } else {
      await subscribe(podcast);
    }
  }, [subscribed, params.id, podcast, subscribe, unsubscribe]);

  const isWeb = Platform.OS === 'web';
  const topInset = isWeb ? 67 : insets.top;

  const renderEpisode = useCallback(
    ({ item }: { item: Episode }) => (
      <Pressable
        style={({ pressed }) => [
          styles.episodeRow,
          { borderBottomColor: colors.border, opacity: pressed ? 0.75 : 1 },
        ]}
        onPress={() => {}}
      >
        <View style={styles.episodeInfo}>
          <Text style={[styles.episodeTitle, { color: colors.foreground }]} numberOfLines={2}>
            {item.title}
          </Text>
          {item.description ? (
            <Text style={[styles.episodeDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
              {item.description}
            </Text>
          ) : null}
          <Text style={[styles.episodeMeta, { color: colors.mutedForeground }]}>
            {new Date(item.publishedAt).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
            {item.duration ? `  ·  ${item.duration}` : ''}
          </Text>
        </View>
        <Ionicons name="play-circle-outline" size={32} color={colors.primary} />
      </Pressable>
    ),
    [colors]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        style={[styles.backBtn, { top: topInset + 8 }]}
        onPress={() => router.back()}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={28} color="#fff" />
      </Pressable>

      <FlatList
        data={episodes}
        renderItem={renderEpisode}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: isWeb ? 34 + 84 : 84 }}
        ListHeaderComponent={
          <View>
            <View style={styles.heroContainer}>
              <Image
                source={{ uri: params.artwork }}
                style={styles.heroArtwork}
                contentFit="cover"
              />
              <LinearGradient
                colors={['transparent', colors.background]}
                style={styles.gradient}
              />
            </View>
            <View style={styles.metaContainer}>
              <Image
                source={{ uri: params.artwork }}
                style={[styles.smallArtwork, { borderRadius: colors.radius }]}
                contentFit="cover"
              />
              <View style={styles.metaText}>
                <Text style={[styles.podcastTitle, { color: colors.foreground }]} numberOfLines={2}>
                  {params.title}
                </Text>
                <Text style={[styles.podcastAuthor, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {params.author}
                </Text>
                {params.genre ? (
                  <View style={[styles.genreBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.genreText, { color: colors.mutedForeground }]}>
                      {params.genre}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={[
                  styles.subscribeBtn,
                  { backgroundColor: subscribed ? colors.secondary : colors.primary, borderRadius: colors.radius },
                ]}
                onPress={handleToggleSubscribe}
                testID="detail-subscribe-button"
              >
                <Ionicons
                  name={subscribed ? 'checkmark' : 'add'}
                  size={18}
                  color={subscribed ? colors.foreground : '#fff'}
                />
                <Text
                  style={[
                    styles.subscribeBtnText,
                    { color: subscribed ? colors.foreground : '#fff' },
                  ]}
                >
                  {subscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              </Pressable>
            </View>
            <Text style={[styles.episodesLabel, { color: colors.foreground, borderBottomColor: colors.border }]}>
              Episodes
            </Text>
            {loading && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.primary} />
              </View>
            )}
            {!!error && (
              <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
            )}
          </View>
        }
        scrollEnabled={!!episodes.length || loading}
        ListEmptyComponent={
          !loading && !error ? (
            <View style={styles.emptyEpisodes}>
              <Text style={[styles.emptyEpisodesText, { color: colors.mutedForeground }]}>
                No episodes found.
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContainer: { height: 280, position: 'relative' },
  heroArtwork: { width: '100%', height: 280 },
  gradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 120 },
  metaContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: -40,
    gap: 14,
    alignItems: 'flex-end',
  },
  smallArtwork: { width: 88, height: 88 },
  metaText: { flex: 1, paddingBottom: 4, gap: 3 },
  podcastTitle: { fontSize: 18, fontFamily: 'Inter_700Bold', lineHeight: 24 },
  podcastAuthor: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  genreBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
  },
  genreText: { fontSize: 11, fontFamily: 'Inter_500Medium' },
  actions: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  subscribeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
  },
  subscribeBtnText: { fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  episodesLabel: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginTop: 8,
  },
  loadingRow: { paddingVertical: 32, alignItems: 'center' },
  errorText: { padding: 16, fontSize: 14, fontFamily: 'Inter_400Regular' },
  episodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  episodeInfo: { flex: 1, gap: 4 },
  episodeTitle: { fontSize: 15, fontFamily: 'Inter_500Medium', lineHeight: 21 },
  episodeDesc: { fontSize: 13, fontFamily: 'Inter_400Regular', lineHeight: 18 },
  episodeMeta: { fontSize: 12, fontFamily: 'Inter_400Regular', marginTop: 2 },
  emptyEpisodes: { padding: 32, alignItems: 'center' },
  emptyEpisodesText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
});
