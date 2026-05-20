import React, { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';
import type { InboxFilter } from '@/services/inboxBuilder';
import type { Podcast } from '@/types/podcast';

interface Props {
  subscriptions: Podcast[];
  filter: InboxFilter;
  onChange: (filter: InboxFilter) => void;
}

function isActive(filter: InboxFilter, type: string, value?: string): boolean {
  if (type === 'all') return filter.type === 'all';
  if (type === 'tag') return filter.type === 'tag' && (filter as { type: 'tag'; tag: string }).tag === value;
  if (type === 'podcast') return filter.type === 'podcast' && (filter as { type: 'podcast'; podcastId: string }).podcastId === value;
  return false;
}

interface PillProps {
  label: string;
  active: boolean;
  onPress: () => void;
}

function Pill({ label, active, onPress }: PillProps) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: active ? colors.primary : colors.input,
          opacity: pressed ? 0.75 : 1,
        },
      ]}
      testID={`filter-pill-${label}`}
    >
      <Text
        style={[
          styles.pillText,
          { color: active ? colors.primaryForeground : colors.mutedForeground },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function FilterBar({ subscriptions, filter, onChange }: Props) {
  const colors = useColors();

  const allTags = Array.from(
    new Set(subscriptions.flatMap((p) => p.tags))
  ).sort();

  const handleAll = useCallback(() => onChange({ type: 'all' }), [onChange]);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={[styles.bar, { borderBottomColor: colors.border }]}
      keyboardShouldPersistTaps="handled"
    >
      <Pill label="All" active={isActive(filter, 'all')} onPress={handleAll} />

      {allTags.map((tag) => (
        <Pill
          key={`tag:${tag}`}
          label={tag}
          active={isActive(filter, 'tag', tag)}
          onPress={() => onChange({ type: 'tag', tag })}
        />
      ))}

      {subscriptions.map((p) => (
        <Pill
          key={`pod:${p.id}`}
          label={p.title.length > 18 ? `${p.title.slice(0, 16)}\u2026` : p.title}
          active={isActive(filter, 'podcast', p.id)}
          onPress={() => onChange({ type: 'podcast', podcastId: p.id })}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexGrow: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pill: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
});
