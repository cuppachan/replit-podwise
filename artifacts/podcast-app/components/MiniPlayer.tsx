import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useColors } from '@/hooks/useColors';
import { useAudioPlayer } from '@/context/AudioPlayerContext';

function secsToDisplay(secs: number): string {
  const s = Math.floor(secs);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, '0')}`;
}

export function MiniPlayer() {
  const colors = useColors();
  const { episode, isPlaying, isLoading, position, duration, togglePlayPause, dismiss } =
    useAudioPlayer();

  if (!episode) return null;

  const progress = duration > 0 ? position / duration : 0;

  const handleTap = () => {
    router.push({
      pathname: '/episode/[id]',
      params: {
        id: episode.id,
        title: episode.title,
        podcastTitle: episode.podcastTitle,
        podcastArtwork: episode.podcastArtwork,
        audioUrl: episode.audioUrl,
        duration: episode.duration,
      },
    });
  };

  return (
    <View style={[styles.wrapper, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
      <View style={[styles.progressBar, { backgroundColor: colors.border }]} pointerEvents="none">
        <View
          style={[
            styles.progressFill,
            { backgroundColor: colors.primary, width: `${progress * 100}%` },
          ]}
        />
      </View>

      <Pressable
        style={({ pressed }) => [styles.row, { opacity: pressed ? 0.8 : 1 }]}
        onPress={handleTap}
      >
        <Image
          source={{ uri: episode.podcastArtwork }}
          style={[styles.artwork, { borderRadius: colors.radius / 2 }]}
          contentFit="cover"
        />
        <View style={styles.info}>
          <Text style={[styles.title, { color: colors.foreground }]} numberOfLines={1}>
            {episode.title}
          </Text>
          <Text style={[styles.sub, { color: colors.mutedForeground }]} numberOfLines={1}>
            {episode.podcastTitle}
            {duration > 0 ? `  ·  ${secsToDisplay(position)} / ${secsToDisplay(duration)}` : ''}
          </Text>
        </View>

        <Pressable
          style={[styles.controlBtn, { borderColor: colors.border }]}
          onPress={(e) => {
            e.stopPropagation();
            togglePlayPause();
          }}
          hitSlop={8}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={20} color={colors.foreground} />
          )}
        </Pressable>

        <Pressable
          style={[styles.controlBtn, { borderColor: colors.border }]}
          onPress={(e) => {
            e.stopPropagation();
            dismiss();
          }}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color={colors.mutedForeground} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  progressBar: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  artwork: {
    width: 44,
    height: 44,
    backgroundColor: '#2a2a2a',
    flexShrink: 0,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
  },
  sub: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  controlBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
});
