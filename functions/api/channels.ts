interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
  urls?: string[];
}

function parseM3U(data: string): Channel[] {
  const rawChannels: Channel[] = [];
  const lines = data.split('\n');
  let currentChannel: Partial<Channel> | null = null;
  let index = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      if (currentChannel && currentChannel.url) {
        if (!currentChannel.id || currentChannel.id.trim() === '') {
          currentChannel.id = `ch-${index}`;
        } else {
          currentChannel.id = `${currentChannel.id}-${index}`;
        }
        rawChannels.push(currentChannel as Channel);
        index++;
      }

      currentChannel = {
        urls: []
      };
      
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      currentChannel.logo = logoMatch ? logoMatch[1] : '';

      const categoryMatch = line.match(/group-title="([^"]*)"/i);
      let rawCategory = categoryMatch ? categoryMatch[1].trim() : '';

      if (!rawCategory) {
        const categoryMatch2 = line.match(/group-title=([^,\s]+)/i);
        rawCategory = categoryMatch2 ? categoryMatch2[1].replace(/"/g, '').trim() : 'Others';
      }

      let category = 'Others';
      if (rawCategory) {
        const catLower = rawCategory.toLowerCase();
        if (catLower === 'bangla' || catLower === 'bangladeshi' || catLower.includes('bangla')) {
          category = 'Bangla';
        } else if (catLower === 'sports' || catLower.includes('cricket') || catLower.includes('fifa')) {
          category = 'Sports';
        } else if (catLower === 'movies' || catLower.includes('movie') || catLower.includes('cine')) {
          category = 'Movies';
        } else if (catLower === 'music' || catLower.includes('beat')) {
          category = 'Music';
        } else if (catLower === 'kids' || catLower.includes('cartoon') || catLower.includes('gopal')) {
          category = 'Kids';
        } else if (catLower === 'documentary' || catLower.includes('earth') || catLower.includes('discovery') || catLower.includes('geo')) {
          category = 'Documentary';
        } else if (catLower === 'islamic' || catLower.includes('relagion') || catLower.includes('quran') || catLower.includes('peace')) {
          category = 'Islamic';
        } else if (catLower === 'news') {
          category = 'News';
        } else if (catLower === 'hindi' || catLower.includes('entertainment')) {
          category = 'Hindi';
        } else {
          category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
        }
      }
      currentChannel.category = category;

      const lastCommaIndex = line.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        currentChannel.name = line.substring(lastCommaIndex + 1).trim();
      } else {
        currentChannel.name = 'Unknown Channel';
      }

      const idMatch = line.match(/tvg-id="([^"]*)"/i);
      currentChannel.id = idMatch ? idMatch[1] : '';

    } else if (line.startsWith('#')) {
      continue;
    } else {
      if (currentChannel) {
        if (!currentChannel.url) {
          currentChannel.url = line;
        }
        if (currentChannel.urls) {
          currentChannel.urls.push(line);
        } else {
          currentChannel.urls = [line];
        }
      }
    }
  }

  if (currentChannel && currentChannel.url) {
    if (!currentChannel.id || currentChannel.id.trim() === '') {
      currentChannel.id = `ch-${index}`;
    } else {
      currentChannel.id = `${currentChannel.id}-${index}`;
    }
    rawChannels.push(currentChannel as Channel);
  }

  // Deduplicate and group channels with the same name to form "Servers"
  const grouped: Channel[] = [];
  const nameMap = new Map<string, Channel>();

  rawChannels.forEach(ch => {
    const key = ch.name.trim().toLowerCase();
    const existing = nameMap.get(key);
    if (existing) {
      if (ch.url && !existing.urls?.includes(ch.url)) {
        existing.urls = [...(existing.urls || [existing.url]), ch.url];
      }
    } else {
      const newChan: Channel = {
        ...ch,
        urls: ch.urls && ch.urls.length > 0 ? ch.urls : [ch.url]
      };
      nameMap.set(key, newChan);
      grouped.push(newChan);
    }
  });

  return grouped;
}

export async function onRequest(context: any) {
  try {
    const requestUrl = new URL(context.request.url);
    const forceRefresh = requestUrl.searchParams.get('refresh') === 'true';

    // CORS headers for response
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*",
      "Content-Type": "application/json"
    };

    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    const PLAYLIST_URL = "https://raw.githubusercontent.com/lotaji/playlist-vip/refs/heads/main/playlist_vip.m3u";
    const playlistRes = await fetch(PLAYLIST_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!playlistRes.ok) {
      return new Response(JSON.stringify({ success: false, error: `Upstream error: ${playlistRes.statusText}` }), {
        status: playlistRes.status,
        headers: corsHeaders
      });
    }

    const playlistText = await playlistRes.text();
    const channels = parseM3U(playlistText);

    return new Response(JSON.stringify({
      success: true,
      source: 'live',
      count: channels.length,
      channels: channels
    }), {
      status: 200,
      headers: corsHeaders
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Failed to load TV channels"
    }), {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json"
      }
    });
  }
}
