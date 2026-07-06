import { Channel, CategoryType } from './types';

export const PRIORITY_URL_1 = 'https://raw.githubusercontent.com/sportlive18/Sonyliv-Playlist-Autoupdate/refs/heads/main/sonyliv.m3u';
export const PRIORITY_URL_2 = 'https://raw.githubusercontent.com/srhady/tapmad-bd/refs/heads/main/tapmad_bd.m3u';
export const TOFFEE_URL = 'https://raw.githubusercontent.com/lotaji/playlist-vip/refs/heads/main/playlist_vip.m3u';
export const DEFAULT_URL = 'https://raw.githubusercontent.com/sm-monirulislam/SM-Live-TV/refs/heads/main/Combined_Live_TV.m3u';

export function normalizeChannelName(name: string): string {
  if (!name) return Math.random().toString();
  return name.toLowerCase()
    .replace(/\[.*?\]|\(.*?\)/g, '')
    .replace(/\b(fhd|hd|sd|4k|live|tv|bd|hq|vip|1080p|720p)\b/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export interface M3UChannel {
  name: string;
  logo: string;
  category: string;
  url: string;
  headers?: Record<string, string>;
}

export function parseM3U(data: string): Array<M3UChannel> {
  const lines = data.split('\n');
  const channels: Array<M3UChannel> = [];

  let lastLogo = "https://via.placeholder.com/400x120/111111/00ffcc.png?text=TV";
  let lastCategory = "Others";
  let lastName = "Unknown Channel";
  let currentHeaders: Record<string, string> = {};

  lines.forEach(line => {
    line = line.trim();
    if (line === '') return;

    if (line.startsWith('#EXTINF')) {
      currentHeaders = {};

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

      const uaMatch = line.match(/http-user-agent="([^"]+)"/i);
      if (uaMatch) currentHeaders['User-Agent'] = uaMatch[1];

      const refMatch = line.match(/http-referrer="([^"]+)"/i) || line.match(/http-referer="([^"]+)"/i);
      if (refMatch) currentHeaders['Referer'] = refMatch[1];

      const nameIndex = line.lastIndexOf(',');
      if (nameIndex !== -1) {
        lastName = line.substring(nameIndex + 1).trim() || "Unknown Channel";
      }
    } else if (line.startsWith('#EXTVLCOPT:')) {
      const opt = line.substring('#EXTVLCOPT:'.length).trim();
      if (opt.startsWith('http-user-agent=')) {
        currentHeaders['User-Agent'] = opt.substring('http-user-agent='.length).trim();
      } else if (opt.startsWith('http-referrer=')) {
        currentHeaders['Referer'] = opt.substring('http-referrer='.length).trim();
      } else if (opt.startsWith('http-referer=')) {
        currentHeaders['Referer'] = opt.substring('http-referer='.length).trim();
      }
    } else if (line.startsWith('#EXTHTTP:')) {
      const httpStr = line.substring('#EXTHTTP:'.length).trim();
      try {
        const httpObj = JSON.parse(httpStr);
        if (httpObj.cookie) currentHeaders['Cookie'] = httpObj.cookie;
        if (httpObj['User-Agent']) currentHeaders['User-Agent'] = httpObj['User-Agent'];
        if (httpObj['user-agent']) currentHeaders['User-Agent'] = httpObj['user-agent'];
        if (httpObj['Referer']) currentHeaders['Referer'] = httpObj['Referer'];
        if (httpObj['referer']) currentHeaders['Referer'] = httpObj['referer'];
      } catch (e) {
        console.error('Failed to parse EXTHTTP JSON:', httpStr, e);
      }
    } else if (!line.startsWith('#')) {
      channels.push({
        name: lastName,
        logo: lastLogo,
        category: lastCategory,
        url: line,
        headers: Object.keys(currentHeaders).length > 0 ? { ...currentHeaders } : undefined
      });
      currentHeaders = {};
    }
  });
  return channels;
}

export async function fetchAndParseM3U(url: string): Promise<Array<M3UChannel>> {
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

export const CATEGORY_KEYWORDS: Record<Exclude<CategoryType, 'All'>, string[]> = {
  Sports: ['sport', 'cricket', 'football', 'fifa', 'wwe', 'ten', 'star sports', 'tsports', 'ptv', 'willow', 'bein', 'espn', 'sky', 'sports'],
  Bangla: ['bangla', 'bengali', 'bd', 'somoy', 'jamuna', 'ekattor', 'ntv', 'rtv', 'atn', 'channel i', 'toffee', 'dhaka', 'bteb', 'gazi', 'dipto', 'independent', 'boishakhi'],
  Hindi: ['hindi', 'india', 'star plus', 'colors', 'zee tv', 'sony entertainment', 'sony sab', 'and tv', 'bindass', 'mtv india', 'hum', 'set india'],
  Movie: ['movie', 'cinema', 'film', 'star gold', 'zee cinema', 'sony max', 'hbo', 'cine', 'action', 'thrills', 'hollywood', 'bollywood', 'blockbuster'],
  Music: ['music', 'song', 'mtv', 'vh1', '9xm', 'b4u', 'zoom', 'jalwa', 't-series'],
  Kids: ['kid', 'cartoon', 'nick', 'pogo', 'disney', 'anime', 'cn', 'chutti', 'discovery kids', 'baby'],
  Documentary: ['docu', 'discover', 'nat geo', 'history', 'animal', 'science', 'wild', 'earth']
};

export function filterChannels(channels: Channel[], category: CategoryType): Channel[] {
  if (category === 'All') return channels;

  const keywords = CATEGORY_KEYWORDS[category];
  return channels.filter(c => {
    const catLower = c.category.toLowerCase();
    const nameLower = c.name.toLowerCase();
    return keywords.some(kw => catLower.includes(kw) || nameLower.includes(kw));
  });
}
