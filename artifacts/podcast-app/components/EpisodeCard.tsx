import { Image } from 'expo-image';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { Episode } from '@/types/podcast';

function formatDate(ts: number): string {
  const diffDays = Math.floor((Date.now() - ts) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Props {
  episode: Episode;
  isRead: boolean;
  onPress: () => void;
}

export function EpisodeCard({ episode, isRead, onPress }: Props) {
  const colors = useColors();

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      onPress={onPress}
      testID="episode-card"
    >
      <Image
        source={{ uri: episode.podcastArtwork }}
        style={styles.artwork}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.content}>
        <Text style={[styles.podcastName, { color: colors.primary }]} numberOfLines={1}>
          {episode.podcastTitle}
        </Text>
        <Text
          style={[
            styles.title,
            { color: isRead ? colors.mutedForeground : colors.foreground },
          ]}
          numberOfLines={2}
        >
          {episode.title}
        </Text>
        <View style={styles.meta}>
          {!isRead && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
            {formatDate(episode.publishedAt)}
            {episode.duration ? `  ·  ${episode.duration}` : ''}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  artwork: {
    width: 64,
    height: 64,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    flexShrink: 0,
  },
  content: { flex: 1, gap: 3 },
  podcastName: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_500Medium',
    lineHeight: 21,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
});
