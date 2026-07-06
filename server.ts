import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";

// Disable strict SSL certificate verification for incoming IPTV stream links (many use cheap/expired/unverified certificates or IP addresses)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();
const PORT = 3000;

interface Channel {
  id: string;
  name: string;
  url: string;
  logo: string;
  category: string;
  urls?: string[];
}

// In-memory cache for IPTV channels
let cachedChannels: Channel[] = [];
let cacheTime = 0;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes cache duration

const PLAYLIST_URL = "https://raw.githubusercontent.com/lotaji/playlist-vip/refs/heads/main/playlist_vip.m3u";

// Robust M3U Parser with Grouping / Server Consolidator
function parseM3U(data: string): Channel[] {
  const rawChannels: Channel[] = [];
  const lines = data.split('\n');
  let currentChannel: Partial<Channel> | null = null;
  let index = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      // If we already have an active channel, push it to the list first before starting a new one
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
      
      // Extract tvg-logo
      const logoMatch = line.match(/tvg-logo="([^"]*)"/i);
      currentChannel.logo = logoMatch ? logoMatch[1] : '';

      // Extract group-title (category)
      const categoryMatch = line.match(/group-title="([^"]*)"/i);
      let rawCategory = categoryMatch ? categoryMatch[1].trim() : '';

      if (!rawCategory) {
        const categoryMatch2 = line.match(/group-title=([^,\s]+)/i);
        rawCategory = categoryMatch2 ? categoryMatch2[1].replace(/"/g, '').trim() : 'Others';
      }

      // Standardize categories
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
          // Keep raw category if it's not empty, capitalized nicely
          category = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
        }
      }
      currentChannel.category = category;

      // Extract name
      const lastCommaIndex = line.lastIndexOf(',');
      if (lastCommaIndex !== -1) {
        currentChannel.name = line.substring(lastCommaIndex + 1).trim();
      } else {
        currentChannel.name = 'Unknown Channel';
      }

      // Extract tvg-id if present
      const idMatch = line.match(/tvg-id="([^"]*)"/i);
      currentChannel.id = idMatch ? idMatch[1] : '';

    } else if (line.startsWith('#')) {
      continue;
    } else {
      // This is the URL line
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

  // Handle the last remaining channel after loop
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

// API endpoint to fetch parsed channels with server-side caching
app.get("/api/channels", async (req, res) => {
  try {
    const now = Date.now();
    const forceRefresh = req.query.refresh === 'true';

    if (cachedChannels.length > 0 && (now - cacheTime < CACHE_DURATION) && !forceRefresh) {
      console.log("Serving IPTV channels from cache.");
      return res.json({
        success: true,
        source: 'cache',
        count: cachedChannels.length,
        channels: cachedChannels
      });
    }

    console.log("Fetching fresh IPTV playlist from GitHub...");
    const response = await fetch(PLAYLIST_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch playlist: ${response.statusText}`);
    }

    const playlistData = await response.text();
    const channels = parseM3U(playlistData);

    if (channels.length === 0) {
      throw new Error("No channels could be parsed from the playlist.");
    }

    cachedChannels = channels;
    cacheTime = now;

    console.log(`Successfully parsed ${channels.length} channels.`);
    res.json({
      success: true,
      source: 'live',
      count: channels.length,
      channels: channels
    });
  } catch (error: any) {
    console.error("Error in /api/channels:", error.message);
    
    // Fallback to cache if available
    if (cachedChannels.length > 0) {
      return res.json({
        success: true,
        source: 'stale-cache',
        error: error.message,
        count: cachedChannels.length,
        channels: cachedChannels
      });
    }

    res.status(500).json({
      success: false,
      error: error.message || "Failed to load TV channels"
    });
  }
});

// Stream proxy endpoint to bypass Mixed Content (HTTP vs HTTPS) blocks in browsers
app.get("/api/stream-proxy", async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) {
    return res.status(400).send("Missing stream 'url' parameter");
  }

  try {
    // Set permissive CORS headers for the player
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }

    // Forward client headers (e.g. Range, Accept) to upstream
    const forwardHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    };

    if (req.headers.range) {
      forwardHeaders["Range"] = req.headers.range as string;
    }
    if (req.headers.accept) {
      forwardHeaders["Accept"] = req.headers.accept as string;
    }

    const response = await fetch(targetUrl, {
      headers: forwardHeaders
    });

    if (!response.ok && response.status !== 206) {
      return res.status(response.status).send(`Failed to fetch upstream stream: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";
    const isM3U8 = targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl") || contentType.includes("vnd.apple.mpegurl");

    if (isM3U8) {
      // It's a playlist. Download it as text and rewrite relative/http links to go through our proxy
      const text = await response.text();
      const lines = text.split("\n");
      const rewrittenLines = [];

      // Determine the base URL for relative paths
      let baseUrl = targetUrl;
      if (targetUrl.includes("?")) {
        baseUrl = targetUrl.split("?")[0];
      }
      const lastSlashIndex = baseUrl.lastIndexOf("/");
      const baseDir = lastSlashIndex !== -1 ? baseUrl.substring(0, lastSlashIndex + 1) : baseUrl;

      // Extract the query parameters of the parent playlist to preserve them for relative paths (such as tokens)
      const parentQueryIndex = targetUrl.indexOf("?");
      const parentQuery = parentQueryIndex !== -1 ? targetUrl.substring(parentQueryIndex) : "";

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          rewrittenLines.push("");
          continue;
        }

        const isRelative = !line.startsWith("http://") && !line.startsWith("https://");

        if (line.startsWith("#")) {
          // If it's a URI in a tag like #EXT-X-KEY:METHOD=AES-128,URI="http://..." or #EXT-X-STREAM-INF:BANDWIDTH=...,URI="..."
          let modifiedLine = line;
          const uriMatch = line.match(/URI="([^"]+)"/i);
          if (uriMatch) {
            const relativeUri = uriMatch[1];
            let absoluteUri = resolveUrl(baseDir, relativeUri);
            
            // Preserve token query parameters for relative URLs
            if (parentQuery && isRelative && !relativeUri.includes("?")) {
              absoluteUri += parentQuery;
            }
            
            const proxyUri = `/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}`;
            modifiedLine = line.replace(`URI="${relativeUri}"`, `URI="${proxyUri}"`);
          }
          rewrittenLines.push(modifiedLine);
        } else {
          // This is a direct URL/URI line (usually a segment (.ts) or sub-playlist)
          let absoluteUri = resolveUrl(baseDir, line);
          
          // Preserve token query parameters for relative URLs
          if (parentQuery && isRelative && !line.includes("?")) {
            absoluteUri += parentQuery;
          }
          
          const proxyUri = `/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}`;
          rewrittenLines.push(proxyUri);
        }
      }

      res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
      return res.send(rewrittenLines.join("\n"));
    } else {
      // Forward safe upstream headers to the response
      const headersToForward = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control",
        "expires"
      ];

      for (const h of headersToForward) {
        const val = response.headers.get(h);
        if (val) {
          res.setHeader(h, val);
        }
      }

      // Set correct response status (e.g., 200 OK or 206 Partial Content)
      res.status(response.status);

      // Stream the body using Node standard streams
      if (response.body) {
        try {
          if (typeof Readable.fromWeb === "function") {
            const nodeStream = Readable.fromWeb(response.body as any);
            nodeStream.pipe(res);
          } else {
            // Manual fallback if fromWeb is not available
            const reader = response.body.getReader();
            const nodeStream = new Readable({
              async read() {
                try {
                  const { done, value } = await reader.read();
                  if (done) {
                    this.push(null);
                  } else {
                    this.push(Buffer.from(value));
                  }
                } catch (e) {
                  this.destroy(e as Error);
                }
              }
            });
            nodeStream.pipe(res);
          }
        } catch (streamError) {
          const buffer = await response.arrayBuffer();
          res.send(Buffer.from(buffer));
        }
      } else {
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      }
    }
  } catch (err: any) {
    console.error("Stream proxy error for URL:", targetUrl, err.message);
    res.status(500).send(`Stream Proxy Error: ${err.message}`);
  }
});

function resolveUrl(baseDir: string, relativeUrl: string): string {
  try {
    // If it's already an absolute URL, return it
    if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
      return relativeUrl;
    }

    // Detect if baseDir has a double slash after the protocol, e.g. "http://host:port//path/"
    let protocol = "";
    let rest = baseDir;
    if (baseDir.startsWith("http://")) {
      protocol = "http://";
      rest = baseDir.substring(7);
    } else if (baseDir.startsWith("https://")) {
      protocol = "https://";
      rest = baseDir.substring(8);
    }

    // Check if the rest of baseDir contains a double slash "//" (in the path part)
    const doubleSlashIndex = rest.indexOf("//");
    const hasDoubleSlash = doubleSlashIndex !== -1;

    let resolved = "";
    if (relativeUrl.startsWith("/")) {
      // Root-relative URL (e.g. /Somoy-TV/segment.ts)
      const urlObj = new URL(baseDir);
      resolved = `${urlObj.protocol}//${urlObj.host}${relativeUrl}`;
    } else {
      // Relative URL (e.g. segment.ts)
      resolved = new URL(relativeUrl, baseDir).href;
    }

    // If the original baseDir had a double slash in its path, but the resolved one doesn't,
    // we must restore the double slash in the resolved path.
    if (hasDoubleSlash) {
      let resolvedRest = resolved;
      let resolvedProto = "";
      if (resolved.startsWith("http://")) {
        resolvedProto = "http://";
        resolvedRest = resolved.substring(7);
      } else if (resolved.startsWith("https://")) {
        resolvedProto = "https://";
        resolvedRest = resolved.substring(8);
      }

      // The host ends at the first slash of the resolved URL
      const firstSlashIdx = resolvedRest.indexOf("/");
      if (firstSlashIdx !== -1) {
        const hostPart = resolvedRest.substring(0, firstSlashIdx);
        let pathPart = resolvedRest.substring(firstSlashIdx);
        
        // Ensure pathPart starts with "//" and not just "/"
        if (pathPart.startsWith("/") && !pathPart.startsWith("//")) {
          pathPart = "/" + pathPart;
        }
        resolved = resolvedProto + hostPart + pathPart;
      }
    }

    return resolved;
  } catch (e) {
    // Basic string concatenation fallback
    if (baseDir.endsWith("/")) {
      return baseDir + relativeUrl;
    }
    return baseDir + "/" + relativeUrl;
  }
}

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
