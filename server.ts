import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Middleware for parsing query strings and body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve API for channels from CricHD API and FanCode Live Events API
app.get("/api/channels", async (req, res) => {
  try {
    // 1. Fetch CricHD channels (Now replaced with playlist_vip.m3u)
    let cricChannels: any[] = [];
    try {
      const response = await fetch(
        "https://raw.githubusercontent.com/lotaji/playlist-vip/refs/heads/main/playlist_vip.m3u"
      );
      if (response.ok) {
        const text = await response.text();
        const lines = text.split(/\r?\n/);
        let currentItem: any = null;
        let channelIndex = 0;

        const finalizeCurrentItem = () => {
          if (currentItem && currentItem.name && currentItem.urls && currentItem.urls.length > 0) {
            const urls = currentItem.urls;
            for (let u = 0; u < urls.length; u++) {
              const num = u + 1;
              const suffix = num === 1 ? "" : String(num);
              currentItem[`link${suffix}`] = urls[u];
              currentItem[`referer${suffix}`] = currentItem.optReferer || "https://executeandship.com/";
              currentItem[`origin${suffix}`] = currentItem.optOrigin || "https://executeandship.com";
              if (currentItem.optUa) {
                currentItem[`ua${suffix}`] = currentItem.optUa;
              }
            }

            currentItem.id = currentItem.tvgId ? `crichd-m3u-${currentItem.tvgId}-${channelIndex}` : `crichd-m3u-${channelIndex}`;

            if (!currentItem.logo) {
              currentItem.logo = "https://images.unsplash.com/photo-1540747737956-378724044453?q=80&w=200&auto=format&fit=crop";
            }

            cricChannels.push(currentItem);
            channelIndex++;
          }
          currentItem = null;
        };

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          if (line.startsWith("#EXTINF:")) {
            finalizeCurrentItem();

            currentItem = {
              urls: [],
              optReferer: "",
              optOrigin: "",
              optUa: ""
            };

            // Extract tvg-logo
            const logoMatch = line.match(/tvg-logo=["']([^"']+)["']/i);
            if (logoMatch) {
              currentItem.logo = logoMatch[1];
            }

            // Extract group-title
            const groupMatch = line.match(/group-title=["']([^"']+)["']/i);
            if (groupMatch) {
              currentItem.group = groupMatch[1];
            }

            // Extract tvg-id
            const idMatch = line.match(/tvg-id=["']([^"']+)["']/i);
            if (idMatch) {
              currentItem.tvgId = idMatch[1];
            }

            // Get the display name (after the last comma)
            const commaIndex = line.lastIndexOf(",");
            if (commaIndex !== -1) {
              currentItem.name = line.substring(commaIndex + 1).trim();
            } else {
              currentItem.name = `M3U Channel ${channelIndex + 1}`;
            }
          } else if (line.startsWith("#EXTVLCOPT:")) {
            if (currentItem) {
              const opt = line.substring("#EXTVLCOPT:".length).trim();
              const eqIdx = opt.indexOf("=");
              if (eqIdx !== -1) {
                const key = opt.substring(0, eqIdx).toLowerCase().trim();
                const val = opt.substring(eqIdx + 1).trim();
                if (key === "http-client-referrer" || key === "http-referrer" || key === "referer") {
                  currentItem.optReferer = val;
                } else if (key === "http-user-agent" || key === "user-agent") {
                  currentItem.optUa = val;
                } else if (key === "http-origin" || key === "origin") {
                  currentItem.optOrigin = val;
                }
              }
            }
          } else if (line.startsWith("#")) {
            // Other comments end the previous channel
            finalizeCurrentItem();
          } else {
            // This is the stream URL
            if (currentItem) {
              currentItem.urls.push(line);
            }
          }
        }
        finalizeCurrentItem();
      } else {
        console.warn(`Failed to fetch CricHD channels from m3u, status: ${response.status}`);
      }
    } catch (err) {
      console.error("Error fetching CricHD channels from m3u:", err);
    }

    // 2. Fetch RoarZone channels (Auto-updating playlist)
    let roarZoneChannels: any[] = [];
    try {
      const roarResponse = await fetch(
        "https://raw.githubusercontent.com/sm-monirulislam/RoarZone-Auto-Update-playlist/refs/heads/main/RoarZone_data.json"
      );
      if (roarResponse.ok) {
        const rawRoarData: any = await roarResponse.json();
        
        let parsedArray: any[] = [];
        if (rawRoarData && rawRoarData.response && Array.isArray(rawRoarData.response)) {
          parsedArray = rawRoarData.response;
        } else if (Array.isArray(rawRoarData)) {
          parsedArray = rawRoarData;
        } else if (rawRoarData && typeof rawRoarData === "object") {
          const firstArrayKey = Object.keys(rawRoarData).find(k => Array.isArray(rawRoarData[k]));
          if (firstArrayKey) {
            parsedArray = rawRoarData[firstArrayKey];
          }
        }

        roarZoneChannels = parsedArray.map((item: any, index: number) => {
          const streamUrl = item.url || item.link || item.stream || item.stream_url || "";
          const logoUrl = item.logo || item.src || item.image || item.thumbnail || "https://images.unsplash.com/photo-1540747737956-378724044453?q=80&w=200&auto=format&fit=crop";
          
          const refererVal = "https://tv.roarzone.net/";
          const originVal = "https://tv.roarzone.net";

          const genreSuffix = item.group ? ` [${item.group.toUpperCase()}]` : "";
          const name = `${item.name || `RoarZone CL ${index + 1}`}${genreSuffix}`;

          return {
            id: String(item.id || `roarzone-${index}`),
            name: name,
            logo: logoUrl,
            link: streamUrl,
            referer: item.referer || item.headers?.Referer || refererVal,
            origin: item.origin || item.headers?.Origin || originVal,
            isRoarZone: true
          };
        }).filter((c: any) => c.link);
      } else {
        console.warn(`Failed to fetch RoarZone channels, status: ${roarResponse.status}`);
      }
    } catch (err) {
      console.error("Error fetching RoarZone channels:", err);
    }

    // Fetch Live Sports HD channels (Auto Update Live Sports Data from M3U playlists)
    let footballHDChannels: any[] = [];
    const m3uPlaylists = [
      "https://raw.githubusercontent.com/sportlive18/Sonyliv-Playlist-Autoupdate/refs/heads/main/sonyliv.m3u",
      "https://raw.githubusercontent.com/srhady/tapmad-bd/refs/heads/main/tapmad_bd.m3u"
    ];

    let channelIndex = 0;
    for (const url of m3uPlaylists) {
      try {
        const fbResponse = await fetch(url);
        if (fbResponse.ok) {
          const text = await fbResponse.text();
          const lines = text.split(/\r?\n/);
          let currentItem: any = null;

          const finalizeCurrentItem = () => {
            if (currentItem && currentItem.name && currentItem.urls && currentItem.urls.length > 0) {
              const urls = currentItem.urls;
              for (let u = 0; u < urls.length; u++) {
                const num = u + 1;
                const suffix = num === 1 ? "" : String(num);
                currentItem[`link${suffix}`] = urls[u];
                currentItem[`referer${suffix}`] = currentItem.optReferer || "https://executeandship.com/";
                currentItem[`origin${suffix}`] = currentItem.optOrigin || "https://executeandship.com";
                if (currentItem.optUa) {
                  currentItem[`ua${suffix}`] = currentItem.optUa;
                }
              }

              currentItem.id = currentItem.tvgId ? `football-m3u-${currentItem.tvgId}-${channelIndex}` : `football-m3u-${channelIndex}`;

              if (!currentItem.logo) {
                currentItem.logo = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=200&auto=format&fit=crop";
              }

              currentItem.status = "LIVE";
              footballHDChannels.push(currentItem);
              channelIndex++;
            }
            currentItem = null;
          };

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line.startsWith("#EXTINF:")) {
              finalizeCurrentItem();

              currentItem = {
                isFootballHDZone: true,
                group: "Football",
                urls: [],
                optReferer: "",
                optOrigin: "",
                optUa: ""
              };

              // Extract tvg-logo
              const logoMatch = line.match(/tvg-logo=["']([^"']+)["']/i);
              if (logoMatch) {
                currentItem.logo = logoMatch[1];
              }

              // Extract group-title
              const groupMatch = line.match(/group-title=["']([^"']+)["']/i);
              if (groupMatch) {
                currentItem.group = groupMatch[1];
              }

              // Extract tvg-id
              const idMatch = line.match(/tvg-id=["']([^"']+)["']/i);
              if (idMatch) {
                currentItem.tvgId = idMatch[1];
              }

              // Get the display name (after the last comma)
              const commaIndex = line.lastIndexOf(",");
              if (commaIndex !== -1) {
                currentItem.name = line.substring(commaIndex + 1).trim();
              } else {
                currentItem.name = `M3U Channel ${channelIndex + 1}`;
              }
            } else if (line.startsWith("#EXTVLCOPT:")) {
              if (currentItem) {
                const opt = line.substring("#EXTVLCOPT:".length).trim();
                const eqIdx = opt.indexOf("=");
                if (eqIdx !== -1) {
                  const key = opt.substring(0, eqIdx).toLowerCase().trim();
                  const val = opt.substring(eqIdx + 1).trim();
                  if (key === "http-client-referrer" || key === "http-referrer" || key === "referer") {
                    currentItem.optReferer = val;
                  } else if (key === "http-user-agent" || key === "user-agent") {
                    currentItem.optUa = val;
                  } else if (key === "http-origin" || key === "origin") {
                    currentItem.optOrigin = val;
                  }
                }
              }
            } else if (line.startsWith("#")) {
              // Other comments end the previous channel
              finalizeCurrentItem();
            } else {
              // This is the stream URL
              if (currentItem) {
                currentItem.urls.push(line);
              }
            }
          }
          finalizeCurrentItem();
        }
      } catch (err) {
        console.error(`Error fetching Live Sports HD channels from ${url}:`, err);
      }
    }

    // Combine both streams
    let combinedChannels = [...cricChannels, ...roarZoneChannels, ...footballHDChannels];

    // 3. (Removed CricHD and AynaOTT playlists as requested)
    const smCricChannels: any[] = [];
    const aynaChannels: any[] = [];

    // 5. Fetch sm-monirulislam Toffee channels (Server 3/Server 2 sources)
    let toffeeChannels: any[] = [];
    try {
      const toffeeResponse = await fetch(
        "https://raw.githubusercontent.com/sm-monirulislam/Toffee-Auto-Update-Playlist/refs/heads/main/toffee_data.json"
      );
      if (toffeeResponse.ok) {
        const toffeeData: any = await toffeeResponse.json();
        if (toffeeData && Array.isArray(toffeeData.response)) {
          toffeeChannels = toffeeData.response;
        } else if (Array.isArray(toffeeData)) {
          toffeeChannels = toffeeData;
        }
      } else {
        console.warn(`Failed to fetch Toffee channels, status: ${toffeeResponse.status}`);
      }
    } catch (err) {
      console.error("Error fetching Toffee channels:", err);
    }

    // Helper clean function for fuzzy string matching
    const cleanChanName = (name: string) => {
      return name.toLowerCase()
        .replace(/\[.*?\]/g, "")
        .replace(/\(.*?\)/g, "")
        .replace(/\s+/g, " ")
        .replace(/[^\w\s\u0980-\u09FF]/gi, "")
        .trim();
    };

    const stripSuffixes = (cl: string) => {
      return cl.replace(/\b(hd|sd|tv|sports|channel)\b/g, "").replace(/\s+/g, " ").trim();
    };

    // Build a map of Server 2 channels by lowercase ID and lowercase clean title
    const smMap = new Map<string, any>();
    for (const smChan of smCricChannels) {
      const idKey = smChan.id ? String(smChan.id).toLowerCase().trim() : "";
      if (idKey) {
        smMap.set(idKey, smChan);
      }
      const titleKey = smChan.title ? String(smChan.title).toLowerCase().trim() : "";
      if (titleKey) {
        smMap.set(titleKey, smChan);
      }
    }

    // Build a map of Server 2 AynaOTT channels for RoarZone by lowercase ID, lowercase clean title, and suffix-stripped key
    const ayMap = new Map<string, any>();
    for (const item of aynaChannels) {
      const rawTitle = String(item.title || "").toLowerCase().trim();
      if (rawTitle) {
        ayMap.set(rawTitle, item);
      }
      const clTitle = cleanChanName(item.title || "");
      if (clTitle) {
        ayMap.set(clTitle, item);
        const st = stripSuffixes(clTitle);
        if (st && !ayMap.has("st:" + st)) {
          ayMap.set("st:" + st, item);
        }
      }
      const idKey = item.id ? String(item.id).toLowerCase().trim() : "";
      if (idKey) {
        ayMap.set(idKey, item);
      }
    }

    // Build a map of Toffee channels by lowercase name, lowercase clean name, and suffix-stripped key
    const tfMap = new Map<string, any>();
    for (const item of toffeeChannels) {
      const rawTitle = String(item.name || "").toLowerCase().trim();
      if (rawTitle) {
        tfMap.set(rawTitle, item);
      }
      const clTitle = cleanChanName(item.name || "");
      if (clTitle) {
        tfMap.set(clTitle, item);
        const st = stripSuffixes(clTitle);
        if (st && !tfMap.has("st:" + st)) {
          tfMap.set("st:" + st, item);
        }
      }
    }

    // Assign Server 2 / Server 3 links to matching channels
    const matchedToffeeLinks = new Set<string>();
    combinedChannels = combinedChannels.map((chan: any) => {
      let updated = { ...chan };
      const idKey = chan.id ? String(chan.id).toLowerCase().trim() : "";
      const nameKey = chan.name ? String(chan.name).toLowerCase().trim() : "";
      const cleanName = cleanChanName(chan.name || "");

      if (chan.isRoarZone) {
        // Match with AynaOTT Server 2
        let matched = ayMap.get(idKey) || ayMap.get(nameKey) || ayMap.get(cleanName);
        if (!matched && chan.name) {
          const stR = stripSuffixes(cleanName);
          if (stR && ayMap.has("st:" + stR)) {
            matched = ayMap.get("st:" + stR);
          }
        }

        if (matched && matched.url) {
          updated.link2 = matched.url;
          updated.referer2 = matched.referer || "https://executeandship.com/";
          updated.origin2 = matched.origin || "https://executeandship.com";
        }
      } else {
        // Match with CricHD Server 2
        let matched = smMap.get(idKey) || smMap.get(nameKey);
        
        // Fuzzy name matching
        if (!matched && chan.name) {
          matched = smMap.get(cleanName);
          if (!matched) {
            for (const smChan of smCricChannels) {
              const cleanSmTitle = cleanChanName(smChan.title || "");
              if (cleanSmTitle && (cleanSmTitle === cleanName || cleanName.includes(cleanSmTitle) || cleanSmTitle.includes(cleanName))) {
                matched = smChan;
                break;
              }
            }
          }
        }

        if (matched && matched.url) {
          let finalLink2 = matched.url;
          try {
            if (chan.link && matched.url) {
              const url1 = new URL(chan.link);
              const url2 = new URL(matched.url);
              const md5 = url1.searchParams.get("md5");
              const expires = url1.searchParams.get("expires");
              if (md5 && expires) {
                url2.searchParams.set("md5", md5);
                url2.searchParams.set("expires", expires);
                finalLink2 = url2.toString();
              }
            }
          } catch (e) {
            console.error("Error migrating token to Server 2 URL:", e);
          }

          updated.link2 = finalLink2;
          updated.referer2 = matched.Referer || matched.referer || "https://executeandship.com/";
          updated.origin2 = matched.Origin || matched.origin || "https://executeandship.com";
        }
      }

      // Match and merge with Toffee Channel
      let toffeeMatch = tfMap.get(idKey) || tfMap.get(nameKey) || tfMap.get(cleanName);
      if (!toffeeMatch && chan.name) {
        const stR = stripSuffixes(cleanName);
        if (stR && tfMap.has("st:" + stR)) {
          toffeeMatch = tfMap.get("st:" + stR);
        }
      }
      if (!toffeeMatch && cleanName) {
        for (const tfChan of toffeeChannels) {
          const cleanTfTitle = cleanChanName(tfChan.name || "");
          if (cleanTfTitle && (cleanTfTitle === cleanName || cleanName.includes(cleanTfTitle) || cleanTfTitle.includes(cleanName))) {
            toffeeMatch = tfChan;
            break;
          }
        }
      }

      if (toffeeMatch && toffeeMatch.link) {
        matchedToffeeLinks.add(toffeeMatch.link);
        const linkVal = toffeeMatch.link;
        const refVal = "https://toffeelive.com/";
        const origVal = "https://toffeelive.com";
        const headers = toffeeMatch.headers || {};
        const cookieVal = headers.cookie || "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1780846724:KeyName=prod_linear:Signature=qw1ZBDwKDO8cVUbNd8jIak3w3SjFHXu9q8jtfYBaxB5gi-Dce5fdVUOykuYyY-8W6P3Xzhoq_CGU3YvIjfkvDg";
        const uaVal = headers["user-agent"] || headers.User_Agent || "Mozilla/5.0 (Linux; Android 14; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        const hostVal = headers.Host || "bldcmprod-cdn.toffeelive.com";

        if (!updated.link2) {
          updated.link2 = linkVal;
          updated.referer2 = refVal;
          updated.origin2 = origVal;
          updated.cookie2 = cookieVal;
          updated.ua2 = uaVal;
          updated.host2 = hostVal;
        } else {
          updated.link3 = linkVal;
          updated.referer3 = refVal;
          updated.origin3 = origVal;
          updated.cookie3 = cookieVal;
          updated.ua3 = uaVal;
          updated.host3 = hostVal;
        }
      }

      return updated;
    });

    const unmatchedToffeeChannels = toffeeChannels
      .filter((tfChan: any) => tfChan && tfChan.link && !matchedToffeeLinks.has(tfChan.link))
      .map((tfChan: any, idx: number) => {
        const headers = tfChan.headers || {};
        const cookieVal = headers.cookie || "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1780846724:KeyName=prod_linear:Signature=qw1ZBDwKDO8cVUbNd8jIak3w3SjFHXu9q8jtfYBaxB5gi-Dce5fdVUOykuYyY-8W6P3Xzhoq_CGU3YvIjfkvDg";
        const uaVal = headers["user-agent"] || headers.User_Agent || "Mozilla/5.0 (Linux; Android 14; SM-A515F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
        const hostVal = headers.Host || "bldcmprod-cdn.toffeelive.com";

        return {
          id: `toffee-direct-${idx}`,
          name: tfChan.name || "Toffee Channel",
          logo: tfChan.logo || "https://images.unsplash.com/photo-1540747737956-378724044432?q=80&w=200&auto=format&fit=crop",
          link: tfChan.link,
          referer: "https://toffeelive.com/",
          origin: "https://toffeelive.com",
          cookie: cookieVal,
          ua: uaVal,
          host: hostVal,
          group: tfChan.category_name || "Toffee TV",
          status: "LIVE"
        };
      });

    combinedChannels = [...combinedChannels, ...unmatchedToffeeChannels];

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json(combinedChannels);
  } catch (error: any) {
    console.error("Error loading channels:", error);
    res.status(500).json({ error: error.message || "Failed to load channels" });
  }
});

// Proxy for .m3u8 playlists
function getFullTargetUrl(req: any): string {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return "";

  try {
    const urlObj = new URL(targetUrl);
    // Append any extra query parameters that were parsed by Express
    for (const key of Object.keys(req.query)) {
      if (["url", "referer", "origin", "cookie", "ua", "host"].includes(key)) {
        continue;
      }
      if (!urlObj.searchParams.has(key)) {
        urlObj.searchParams.set(key, req.query[key] as string);
      }
    }
    return urlObj.toString();
  } catch (e) {
    const originalUrl = req.originalUrl || "";
    const qIndex = originalUrl.indexOf("?");
    if (qIndex !== -1) {
      const qs = originalUrl.substring(qIndex + 1);
      const params = new URLSearchParams(qs);
      params.delete("referer");
      params.delete("origin");
      params.delete("cookie");
      params.delete("ua");
      params.delete("host");
      
      const targetUrlBase = params.get("url") || targetUrl;
      params.delete("url");
      
      try {
        const urlObj = new URL(targetUrlBase);
        params.forEach((value, key) => {
          if (!urlObj.searchParams.has(key)) {
            urlObj.searchParams.set(key, value);
          }
        });
        return urlObj.toString();
      } catch (err) {
        let searchToAppend = params.toString();
        if (searchToAppend) {
          return targetUrlBase + (targetUrlBase.includes("?") ? "&" : "?") + searchToAppend;
        }
        return targetUrlBase;
      }
    }
    return targetUrl;
  }
}

app.get("/api/hls/stream.m3u8", async (req, res) => {
  const targetUrl = getFullTargetUrl(req);
  let referer = (req.query.referer as string) || "https://executeandship.com/";
  let origin = (req.query.origin as string) || "https://executeandship.com";
  const cookieVal = (req.query.cookie as string) || "";
  const uaVal = (req.query.ua as string) || "";
  const hostVal = (req.query.host as string) || "";

  if (!targetUrl) {
    return res.status(400).send("Missing target m3u8 URL");
  }

  // Dynamic origin/referer resolution to prevent CDN 403 Forbidden blocks on standard streams
  if (referer.includes("executeandship.com") || referer === "null") {
    referer = "";
  }
  if (origin.includes("executeandship.com") || origin === "null") {
    origin = "";
  }

  try {
    const bdIp = "103.108.140.1";
    const headers: Record<string, string> = {
      "User-Agent": uaVal || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "X-Forwarded-For": bdIp,
      "X-Real-IP": bdIp,
      "Client-IP": bdIp,
      "CF-Connecting-IP": bdIp,
      "True-Client-IP": bdIp,
    };
    if (origin) {
      headers["Origin"] = origin;
    }
    if (referer) {
      headers["Referer"] = referer;
    }
    if (cookieVal) {
      headers["Cookie"] = cookieVal;
    }
    if (hostVal) {
      headers["Host"] = hostVal;
    }

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch playlist: ${response.statusText}`);
    }

    const finalUrl = response.url || targetUrl;
    const text = await response.text();

    let suffix = "";
    if (cookieVal) suffix += `&cookie=${encodeURIComponent(cookieVal)}`;
    if (uaVal) suffix += `&ua=${encodeURIComponent(uaVal)}`;
    if (hostVal) suffix += `&host=${encodeURIComponent(hostVal)}`;

    // Parse and rewrite HLS playlist
    const lines = text.split(/\r?\n/);
    const rewrittenLines = lines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        // Support inline URIs like #EXT-X-KEY:METHOD=AES-128,URI="https://..."
        let modifiedLine = line;
        const uriMatch = line.match(/URI=["']([^"']+)["']/);
        if (uriMatch) {
          const rawUri = uriMatch[1];
          let absoluteUri = rawUri;
          try {
            const resolvedUri = new URL(rawUri, finalUrl);
            const finalUrlObj = new URL(finalUrl);
            if (!resolvedUri.search && finalUrlObj.search) {
              resolvedUri.search = finalUrlObj.search;
            }
            absoluteUri = resolvedUri.toString();
          } catch (e) {
            if (!rawUri.startsWith("http://") && !rawUri.startsWith("https://")) {
              const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
              const finalUrlObj = new URL(finalUrl);
              absoluteUri = baseUrl + rawUri + finalUrlObj.search;
            }
          }
          const isPlaylist = absoluteUri.includes(".m3u8");
          const proxiedUri = `${isPlaylist ? "/api/hls/stream.m3u8" : "/api/hls/chunk.ts"}?url=${encodeURIComponent(absoluteUri)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}${suffix}`;
          modifiedLine = line.replace(rawUri, proxiedUri);
        }
        return modifiedLine;
      }

      // Resolve relative path to absolute
      let absoluteUrl = "";
      try {
        const resolvedUrl = new URL(trimmed, finalUrl);
        const finalUrlObj = new URL(finalUrl);
        if (!resolvedUrl.search && finalUrlObj.search) {
          resolvedUrl.search = finalUrlObj.search;
        }
        absoluteUrl = resolvedUrl.toString();
      } catch (err) {
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          absoluteUrl = trimmed;
        } else {
          const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf("/") + 1);
          const finalUrlObj = new URL(finalUrl);
          absoluteUrl = baseUrl + trimmed + finalUrlObj.search;
        }
      }

      // Rewrite sub-playlists or segments
      if (absoluteUrl.includes(".m3u8")) {
        return `/api/hls/stream.m3u8?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}${suffix}`;
      } else {
        return `/api/hls/chunk.ts?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}${suffix}`;
      }
    });

    res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    res.send(rewrittenLines.join("\n"));
  } catch (err: any) {
    console.error("Error proxying m3u8 stream:", err);
    res.status(500).send(`Stream proxy error: ${err.message}`);
  }
});

// A memory cache for HLS chunks to serve retries instantly other clients or fast rewinds
const chunkCache = new Map<string, { buffer: Buffer; contentType: string; addedAt: number }>();
const MAX_CACHE_SIZE = 120;

// Proxy for .ts video segments and other binary static pieces
app.get("/api/hls/chunk.ts", async (req, res) => {
  const targetUrl = getFullTargetUrl(req);
  let referer = (req.query.referer as string) || "https://executeandship.com/";
  let origin = (req.query.origin as string) || "https://executeandship.com";
  const cookieVal = (req.query.cookie as string) || "";
  const uaVal = (req.query.ua as string) || "";
  const hostVal = (req.query.host as string) || "";

  if (!targetUrl) {
    return res.status(400).send("Missing target chunk URL");
  }

  // Dynamic origin/referer resolution to prevent CDN 403 Forbidden blocks on standard chunks
  if (referer.includes("executeandship.com") || referer === "null") {
    referer = "";
  }
  if (origin.includes("executeandship.com") || origin === "null") {
    origin = "";
  }

  // Serve from cache instantly if hit
  if (chunkCache.has(targetUrl)) {
    const cached = chunkCache.get(targetUrl)!;
    res.setHeader("Content-Type", cached.contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Cache", "HIT");
    return res.send(cached.buffer);
  }

  try {
    const bdIp = "103.108.140.1";
    const headers: Record<string, string> = {
      "User-Agent": uaVal || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Connection": "keep-alive",
      "X-Forwarded-For": bdIp,
      "X-Real-IP": bdIp,
      "Client-IP": bdIp,
      "CF-Connecting-IP": bdIp,
      "True-Client-IP": bdIp,
    };
    if (origin) {
      headers["Origin"] = origin;
    }
    if (referer) {
      headers["Referer"] = referer;
    }
    if (cookieVal) {
      headers["Cookie"] = cookieVal;
    }
    if (hostVal) {
      headers["Host"] = hostVal;
    }

    const response = await fetch(targetUrl, { headers });
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch chunk: ${response.statusText}`);
    }

    const contentType = response.headers.get("Content-Type") || "video/mp2t";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Cache", "MISS");

    // Modern fetch streaming to bypass buffering lag
    if (response.body && typeof (response.body as any).getReader === "function") {
      const reader = (response.body as any).getReader();
      const chunks: Uint8Array[] = [];
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value);
          res.write(value);
        }
        res.end();

        // Compile combined chunk for caching
        const totalSize = chunks.reduce((acc, c) => acc + c.length, 0);
        const fullBuffer = Buffer.alloc(totalSize);
        let offset = 0;
        for (const c of chunks) {
          fullBuffer.set(c, offset);
          offset += c.length;
        }

        // Clean cache space
        if (chunkCache.size >= MAX_CACHE_SIZE) {
          const oldestKey = chunkCache.keys().next().value;
          if (oldestKey !== undefined) {
            chunkCache.delete(oldestKey);
          }
        }
        // Save to cache
        chunkCache.set(targetUrl, {
          buffer: fullBuffer,
          contentType,
          addedAt: Date.now()
        });

      } catch (streamErr) {
        console.error("HLS Chunk streaming transfer error:", streamErr);
        if (!res.headersSent) {
          res.status(502).end();
        }
      }
    } else {
      // Stream interface fallback
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      if (chunkCache.size >= MAX_CACHE_SIZE) {
        const oldestKey = chunkCache.keys().next().value;
        if (oldestKey !== undefined) {
          chunkCache.delete(oldestKey);
        }
      }
      chunkCache.set(targetUrl, { buffer, contentType, addedAt: Date.now() });
      
      res.send(buffer);
    }
  } catch (err: any) {
    console.error("Error proxying chunk:", err);
    if (!res.headersSent) {
      res.status(500).send(`Chunk proxy error: ${err.message}`);
    }
  }
});

async function start() {
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(distPath);

  // If explicitly in development OR built assets don't exist yet, run as dev server.
  // Otherwise, serve pre-compiled high-performance assets statically.
  if (process.env.NODE_ENV === "development" || !hasDist) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

start();
