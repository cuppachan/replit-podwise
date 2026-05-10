import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PodcastCard } from '@/components/PodcastCard';
import { useColors } from '@/hooks/useColors';
import { searchPodcasts, type ItunesResult } from '@/services/itunesApi';

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ItunesResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isWeb = Platform.OS === 'web';
  const topPad = isWeb ? 67 : 0;
  const bottomPad = isWeb ? 34 + 84 : 84;

  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      setError('');
      return;
    }
    setLoading(true);
    setError('');
    setSearched(true);
    try {
      const data = await searchPodcasts(q.trim());
      setResults(data);
    } catch {
      setError('Search failed. Check your connection and try again.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = useCallback(
    (text: string) => {
      setQuery(text);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(text), 500);
    },
    [doSearch]
  );

  const handleClear = useCallback(() => {
    setQuery('');
    setResults([]);
    setSearched(false);
    setError('');
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: ItunesResult }) => <PodcastCard result={item} />,
    []
  );

  const keyExtractor = useCallback((item: ItunesResult) => String(item.collectionId), []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: isWeb ? topPad : insets.top + 8,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        {isWeb && (
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Discover</Text>
        )}
        <View style={[styles.searchBar, { backgroundColor: colors.input, borderRadius: 12 }]}>
          <Ionicons name="search" size={18} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search podcasts..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={handleChangeText}
            returnKeyType="search"
            onSubmitEditing={() => doSearch(query)}
            autoCorrect={false}
            autoCapitalize="none"
            testID="search-input"
          />
          {query.length > 0 && (
            <Pressable onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={40} color={colors.mutedForeground} />
          <Text style={[styles.emptyTitle, { color: colors.foreground, marginTop: 12 }]}>
            Search failed
          </Text>
          <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={{ paddingBottom: bottomPad }}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={!!results.length}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons
                name={searched ? 'sad-outline' : 'headset-outline'}
                size={48}
                color={colors.mutedForeground}
              />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                {searched ? 'No results found' : 'Discover podcasts'}
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {searched
                  ? 'Try a different search term.'
                  : 'Search by name, topic, or creator to find your next favourite show.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    padding: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    marginTop: 4,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
    lineHeight: 21,
  },
});
