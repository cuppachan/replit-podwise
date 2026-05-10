import type { Episode, Podcast } from '@/types/podcast';

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}`
  : '';

function hashStr(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

function extractText(xml: string, tag: string): string {
  const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRe);
  if (cdataMatch) return cdataMatch[1].trim();
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].replace(/<[^>]+>/g, '').trim() : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const re = new RegExp(`<${tag}[^>]*\\s${attr}=["']([^"']*)["'][^>]*/?>`, 'i');
  const m = xml.match(re);
  return m ? m[1] : '';
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDuration(duration: string): string {
  if (!duration) return '';
  if (duration.includes(':')) return duration;
  const secs = parseInt(duration, 10);
  if (isNaN(secs) || secs <= 0) return '';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function fetchFeedXML(feedUrl: string): Promise<string> {
  const url = `${API_BASE}/api/rss?url=${encodeURIComponent(feedUrl)}`;
  const res = await fetch(url, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
  });
  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  return res.text();
}

export interface ChannelMeta {
  title: string;
  author: string;
  description: string;
  artwork: string;
}

export function parseChannelMeta(xml: string): ChannelMeta {
  const channelMatch = xml.match(/<channel[^>]*>([\s\S]*?)(?=<item[ >]|$)/i);
  const ch = channelMatch ? channelMatch[1] : xml;

  const title = stripHtml(extractText(ch, 'title'));
  const author = stripHtml(extractText(ch, 'itunes:author') || extractText(ch, 'managingEditor'));
  const description = stripHtml(
    extractText(ch, 'itunes:summary') || extractText(ch, 'description')
  ).slice(0, 500);

  const itunesImg = ch.match(/<itunes:image[^>]*\shref=["']([^"']*)["'][^>]*\/?>/i);
  const imgUrl = ch.match(/<image[^>]*>[\s\S]*?<url>([^<]+)<\/url>/i);
  const artwork = itunesImg?.[1] ?? imgUrl?.[1] ?? '';

  return { title, author, description, artwork };
}

export async function fetchEpisodes(podcast: Podcast, maxEpisodes = 25): Promise<Episode[]> {
  const xml = await fetchFeedXML(podcast.feedUrl);
  const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  const episodes: Episode[] = [];
  let result: RegExpExecArray | null;
  let count = 0;

  while ((result = itemRe.exec(xml)) !== null && count < maxEpisodes) {
    const item = result[1];
    const title = stripHtml(extractText(item, 'title'));
    if (!title) continue;
    const audioUrl = extractAttr(item, 'enclosure', 'url');
    if (!audioUrl) continue;

    const desc = stripHtml(
      extractText(item, 'itunes:summary') || extractText(item, 'description')
    ).slice(0, 600);
    const pubDate = extractText(item, 'pubDate');
    const ts = pubDate ? new Date(pubDate).getTime() : Date.now() - count * 86400000;
    const duration = formatDuration(extractText(item, 'itunes:duration'));
    const guid = stripHtml(extractText(item, 'guid')) || `${podcast.id}_${count}`;

    episodes.push({
      id: `${podcast.id}_${hashStr(guid)}`,
      podcastId: podcast.id,
      podcastTitle: podcast.title,
      podcastArtwork: podcast.artwork,
      title,
      description: desc,
      audioUrl,
      duration,
      pubDate,
      publishedAt: isNaN(ts) ? Date.now() - count * 86400000 : ts,
      isRead: false,
    });
    count++;
  }

  return episodes;
}
