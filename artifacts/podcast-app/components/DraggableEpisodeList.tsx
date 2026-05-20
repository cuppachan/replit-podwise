import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { EpisodeCard } from '@/components/EpisodeCard';
import { useColors } from '@/hooks/useColors';
import type { Episode } from '@/types/podcast';

const ITEM_HEIGHT = 88;

interface Props {
  episodes: Episode[];
  readIds: Set<string>;
  lockedSection?: boolean;
  onPress: (episode: Episode) => void;
  onLockToggle: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
}

interface DragState {
  item: Episode;
  fromIndex: number;
  currentIndex: number;
}

function DragHandleDots({ color }: { color: string }) {
  const dot = {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: color,
  } as const;
  return (
    <View style={handleStyles.dots}>
      <View style={handleStyles.row}>
        <View style={dot} />
        <View style={dot} />
      </View>
      <View style={handleStyles.row}>
        <View style={dot} />
        <View style={dot} />
      </View>
      <View style={handleStyles.row}>
        <View style={dot} />
        <View style={dot} />
      </View>
    </View>
  );
}

const handleStyles = StyleSheet.create({
  dots: { gap: 3, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', gap: 3 },
});

export function DraggableEpisodeList({
  episodes,
  readIds,
  lockedSection = false,
  onPress,
  onLockToggle,
  onReorder,
}: Props) {
  const colors = useColors();

  const dragStartIdxRef = useRef(-1);
  const dragCurrentIdxRef = useRef(-1);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleDragStart = useCallback(
    (index: number) => {
      dragStartIdxRef.current = index;
      dragCurrentIdxRef.current = index;
      setDragState({ item: episodes[index], fromIndex: index, currentIndex: index });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    },
    [episodes],
  );

  const handleDragUpdate = useCallback(
    (translationY: number) => {
      if (dragStartIdxRef.current < 0) return;
      const slotsMoved = Math.round(translationY / ITEM_HEIGHT);
      const newIdx = Math.max(
        0,
        Math.min(episodes.length - 1, dragStartIdxRef.current + slotsMoved),
      );
      dragCurrentIdxRef.current = newIdx;
      setDragState((prev) =>
        prev && prev.currentIndex !== newIdx ? { ...prev, currentIndex: newIdx } : prev,
      );
    },
    [episodes.length],
  );

  const handleDragEnd = useCallback(() => {
    if (dragStartIdxRef.current < 0) return;
    const from = dragStartIdxRef.current;
    const to = dragCurrentIdxRef.current;
    dragStartIdxRef.current = -1;
    dragCurrentIdxRef.current = -1;
    setDragState(null);
    if (from !== to) onReorder(from, to);
  }, [onReorder]);

  const gestures = useMemo(
    () =>
      episodes.map((_, index) =>
        Gesture.Pan()
          .activateAfterLongPress(500)
          .onStart(() => {
            runOnJS(handleDragStart)(index);
          })
          .onUpdate((e) => {
            runOnJS(handleDragUpdate)(e.translationY);
          })
          .onEnd(() => {
            runOnJS(handleDragEnd)();
          })
          .onFinalize(() => {
            runOnJS(handleDragEnd)();
          }),
      ),
    [episodes, handleDragStart, handleDragUpdate, handleDragEnd],
  );

  const displayItems = useMemo(() => {
    if (!dragState) return episodes;
    const others = episodes.filter((e) => e.id !== dragState.item.id);
    const insertAt = Math.min(dragState.currentIndex, others.length);
    return [...others.slice(0, insertAt), dragState.item, ...others.slice(insertAt)];
  }, [episodes, dragState]);

  if (episodes.length === 0) return null;

  return (
    <View>
      {displayItems.map((episode) => {
        const originalIndex = episodes.findIndex((e) => e.id === episode.id);
        const isDragging = dragState?.item.id === episode.id;
        const gesture = gestures[originalIndex] ?? gestures[0];

        return (
          <View
            key={episode.id}
            style={[styles.row, isDragging && { opacity: 0.85 }]}
          >
            <EpisodeCard
              episode={episode}
              isRead={readIds.has(episode.id)}
              isLocked={lockedSection}
              onPress={() => onPress(episode)}
              onLockToggle={() => onLockToggle(episode.id)}
              isDragging={isDragging}
            />
            <GestureDetector gesture={gesture}>
              <View style={[styles.handle, { backgroundColor: colors.card, borderBottomColor: colors.border }]} testID={`drag-handle-${episode.id}`}>
                <DragHandleDots color={colors.mutedForeground} />
              </View>
            </GestureDetector>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  handle: {
    width: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
  },
});
