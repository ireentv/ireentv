import { Channel, CategoryType } from './types';

export const PRIORITY_URL_1 = '#';
export const PRIORITY_URL_2 = '#';
export const UNIFIED_URL = '#';

export function normalizeChannelName(name: string): string {
  if (!name) return Math.random().toString();
  return name.toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\b(fhd|hd|sd|4k|live|tv|bd|hq|vip|1080p|720p)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export function parseM3U(data: string): Array<{ name: string; logo: string; category: string; url: string }> {
  const lines = data.split('\n');
  const channels: Array<{ name: string; logo: string; category: string; url: string }> = [];

  let lastLogo = "https://via.placeholder.com/400x120/111111/00ffcc.png?text=TV";
  let lastCategory = "Others";
  let lastName = "Unknown Channel";

  lines.forEach(line => {
    line = line.trim();
    if (line === '') return;

    if (line.startsWith('#EXTINF')) {
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      if (logoMatch) {
        lastLogo = logoMatch[1];
      } else {
        lastLogo = "https://via.placeholder.com/400x120/111111/00ffcc.png?text=TV";
      }

      const groupMatch = line.match(/group-title="([^"]+)"/i);
      if (groupMatch) {
        lastCategory = groupMatch[1].trim();
      } else {
        lastCategory = "Others";
      }

      const nameIndex = line.lastIndexOf(',');
      if (nameIndex !== -1) {
        lastName = line.substring(nameIndex + 1).trim() || "Unknown Channel";
      }
    } else if (!line.startsWith('#')) {
      channels.push({
        name: lastName,
        logo: lastLogo,
        category: lastCategory,
        url: line
      });
    }
  });
  return channels;
}

export async function fetchAndParseM3U(url: string): Promise<Array<{ name: string; logo: string; category: string; url: string }>> {
  try {
    const noCacheUrl = `${url}?t=${new Date().getTime()}`;
    const response = await fetch(noCacheUrl);
    if (!response.ok) return [];
    const data = await response.text();
    return parseM3U(data);
  } catch (error) {
    console.error("Failed to load: " + url, error);
    return [];
  }
}

export const CATEGORY_KEYWORDS: Record<Exclude<CategoryType, 'Home' | 'All'>, string[]> = {
  Sports: ['sport', 'cricket', 'football', 'fifa', 'wwe', 'star sports', 'tsports', 'willow', 'bein', 'espn', 'sony ten', 'ten sports', 'ten 1', 'ten 2', 'ten 3', 'ten 5', 'ten hd', 'ten sd', 'tensports', 'sky sports', 'sky-sports', 'skysports', 'ptv sports', 'ptvsports'],
  Bangla: ['bangla', 'bengali', 'bd', 'somoy', 'jamuna', 'ekattor', 'ntv', 'rtv', 'atn', 'channel i', 'toffee', 'dhaka', 'bteb', 'gazi', 'dipto', 'independent', 'boishakhi'],
  Hindi: ['hindi', 'india', 'star plus', 'colors', 'zee tv', 'sony entertainment', 'sony sab', 'and tv', 'bindass', 'mtv india', 'hum', 'set india'],
  Entertainment: ['entertainment', 'entertain', 'drama', 'serial', 'show', 'star jalsha', 'zee bangla', 'colors bangla', 'sony pal', 'star utsav', 'dangal', 'sab', 'jalsha', 'general'],
  Movie: ['movie', 'cinema', 'film', 'star gold', 'zee cinema', 'sony max', 'hbo', 'cine', 'action', 'thrills', 'hollywood', 'bollywood', 'blockbuster'],
  Music: ['music', 'song', 'mtv', 'vh1', '9xm', 'b4u', 'zoom', 'jalwa', 't-series'],
  Kids: ['kid', 'cartoon', 'nick', 'pogo', 'disney', 'anime', 'cn', 'chutti', 'discovery kids', 'baby'],
  Documentary: ['docu', 'discover', 'nat geo', 'history', 'animal', 'science', 'wild', 'earth']
};

export function filterChannels(channels: Channel[], category: CategoryType): Channel[] {
  if (category === 'All' || category === 'Home') return channels;

  const keywords = CATEGORY_KEYWORDS[category as Exclude<CategoryType, 'Home' | 'All'>];
  if (!keywords) return channels;

  return channels.filter(c => {
    const catLower = c.category.toLowerCase();
    const nameLower = c.name.toLowerCase();
    return keywords.some(kw => catLower.includes(kw) || nameLower.includes(kw));
  });
}
