// Cloudflare Pages Function - Catch-All API Endpoint for Channels and Stream Proxying
// Supports direct stream and segment rewriting to bypass geo-blocks and CORS restrictions right on Cloudflare's edge CDN.

export async function onRequest(context: { request: Request; env: any; params: any }) {
  const request = context.request;
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Handle CORS Preflight Options
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Route 1: FETCH channels (equivalent to /api/channels in server.ts)
  if (pathname === "/api/channels") {
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
              currentItem.link = urls[0];
              if (urls.length > 1) {
                currentItem.link2 = urls[1];
              }
              if (urls.length > 2) {
                currentItem.link3 = urls[2];
              }

              currentItem.id = currentItem.tvgId ? `crichd-m3u-${currentItem.tvgId}-${channelIndex}` : `crichd-m3u-${channelIndex}`;

              if (!currentItem.logo) {
                currentItem.logo = "https://images.unsplash.com/photo-1540747737956-378724044453?q=80&w=200&auto=format&fit=crop";
              }

              currentItem.referer = currentItem.optReferer || "https://executeandship.com/";
              currentItem.origin = currentItem.optOrigin || "https://executeandship.com";
              if (currentItem.optUa) {
                currentItem.ua = currentItem.optUa;
              }

              if (currentItem.link2) {
                currentItem.referer2 = currentItem.optReferer || "https://executeandship.com/";
                currentItem.origin2 = currentItem.optOrigin || "https://executeandship.com";
                if (currentItem.optUa) currentItem.ua2 = currentItem.optUa;
              }

              if (currentItem.link3) {
                currentItem.referer3 = currentItem.optReferer || "https://executeandship.com/";
                currentItem.origin3 = currentItem.optOrigin || "https://executeandship.com";
                if (currentItem.optUa) currentItem.ua3 = currentItem.optUa;
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
          console.warn(`Cloudflare: Failed to fetch CricHD channels from m3u, status: ${response.status}`);
        }
      } catch (err) {
        console.error("Cloudflare: Error fetching CricHD channels from m3u:", err);
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
        }
      } catch (err) {
        console.error("Cloudflare: Error fetching RoarZone channels:", err);
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
                currentItem.link = urls[0];
                if (urls.length > 1) {
                  currentItem.link2 = urls[1];
                }
                if (urls.length > 2) {
                  currentItem.link3 = urls[2];
                }

                currentItem.id = currentItem.tvgId ? `football-m3u-${currentItem.tvgId}-${channelIndex}` : `football-m3u-${channelIndex}`;

                if (!currentItem.logo) {
                  currentItem.logo = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=200&auto=format&fit=crop";
                }

                currentItem.referer = currentItem.optReferer || "https://executeandship.com/";
                currentItem.origin = currentItem.optOrigin || "https://executeandship.com";
                if (currentItem.optUa) {
                  currentItem.ua = currentItem.optUa;
                }

                if (currentItem.link2) {
                  currentItem.referer2 = currentItem.optReferer || "https://executeandship.com/";
                  currentItem.origin2 = currentItem.optOrigin || "https://executeandship.com";
                  if (currentItem.optUa) currentItem.ua2 = currentItem.optUa;
                }

                if (currentItem.link3) {
                  currentItem.referer3 = currentItem.optReferer || "https://executeandship.com/";
                  currentItem.origin3 = currentItem.optOrigin || "https://executeandship.com";
                  if (currentItem.optUa) currentItem.ua3 = currentItem.optUa;
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
          console.error(`Cloudflare: Error fetching Live Sports HD channels from ${url}:`, err);
        }
      }

      // Compose combination list
      let combinedChannels = [...cricChannels, ...roarZoneChannels, ...footballHDChannels];

      // 3. (Removed CricHD and AynaOTT playlists as requested)
      const smCricChannels: any[] = [];
      const aynaChannels: any[] = [];

      // 5. Fetch Toffee auto-updating channels
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
        }
      } catch (err) {
        console.error("Cloudflare: Error fetching Toffee channels:", err);
      }

      // Helper string match cleaners
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

      // Build mapping structures
      const smMap = new Map<string, any>();
      for (const smChan of smCricChannels) {
        const idKey = smChan.id ? String(smChan.id).toLowerCase().trim() : "";
        if (idKey) smMap.set(idKey, smChan);
        const titleKey = smChan.title ? String(smChan.title).toLowerCase().trim() : "";
        if (titleKey) smMap.set(titleKey, smChan);
      }

      const ayMap = new Map<string, any>();
      for (const item of aynaChannels) {
        const rawTitle = String(item.title || "").toLowerCase().trim();
        if (rawTitle) ayMap.set(rawTitle, item);
        const clTitle = cleanChanName(item.title || "");
        if (clTitle) {
          ayMap.set(clTitle, item);
          const st = stripSuffixes(clTitle);
          if (st && !ayMap.has("st:" + st)) {
            ayMap.set("st:" + st, item);
          }
        }
        const idKey = item.id ? String(item.id).toLowerCase().trim() : "";
        if (idKey) ayMap.set(idKey, item);
      }

      const tfMap = new Map<string, any>();
      for (const item of toffeeChannels) {
        const rawTitle = String(item.name || "").toLowerCase().trim();
        if (rawTitle) tfMap.set(rawTitle, item);
        const clTitle = cleanChanName(item.name || "");
        if (clTitle) {
          tfMap.set(clTitle, item);
          const st = stripSuffixes(clTitle);
          if (st && !tfMap.has("st:" + st)) {
            tfMap.set("st:" + st, item);
          }
        }
      }

      // Align Server 2 secondary streams
      const matchedToffeeLinks = new Set<string>();
      combinedChannels = combinedChannels.map((chan: any) => {
        let updated = { ...chan };
        const idKey = chan.id ? String(chan.id).toLowerCase().trim() : "";
        const nameKey = chan.name ? String(chan.name).toLowerCase().trim() : "";
        const cleanName = cleanChanName(chan.name || "");

        if (chan.isRoarZone) {
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
          let matched = smMap.get(idKey) || smMap.get(nameKey);
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
              console.error("Error migrating token to Server 2 on edge:", e);
            }
            updated.link2 = finalLink2;
            updated.referer2 = matched.Referer || matched.referer || "https://executeandship.com/";
            updated.origin2 = matched.Origin || matched.origin || "https://executeandship.com";
          }
        }

        // Match with Toffee Channel
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

      const sanitizeDisplayName = (name: string): string => {
        if (!name) return "";
        return name
          .replace(/\[\s*(crichd|roarzone)\s*\]/gi, "")
          .replace(/\(\s*(crichd|roarzone)\s*\)/gi, "")
          .replace(/\b(crichd|roarzone)\b/gi, "")
          .replace(/\[\s*\]/g, "")
          .replace(/\(\s*\)/g, "")
          .replace(/^\s*[|:\-–—\s]+/g, "")
          .replace(/[|:\-–—\s]+\s*$/g, "")
          .replace(/\s+/g, " ")
          .trim() || name;
      };

      const cleanedCombinedChannels = combinedChannels.map((c: any) => ({
        ...c,
        name: sanitizeDisplayName(c.name || "")
      }));

      return new Response(JSON.stringify(cleanedCombinedChannels), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ error: err.message || "Failed to process channels" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }
  }

  // Route 2: PROXY m3u8 stream playlists (/api/hls/stream.m3u8)
  if (pathname === "/api/hls/stream.m3u8") {
    const targetUrl = url.searchParams.get("url");
    let referer = url.searchParams.get("referer") || "https://executeandship.com/";
    let origin = url.searchParams.get("origin") || "https://executeandship.com";
    const cookieVal = url.searchParams.get("cookie") || "";
    const uaVal = url.searchParams.get("ua") || "";
    const hostVal = url.searchParams.get("host") || "";

    if (!targetUrl) {
      return new Response("Missing target m3u8 URL", { status: 400 });
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

      const hlsRes = await fetch(targetUrl, { headers });
      if (!hlsRes.ok) {
        return new Response(`Failed to fetch playlist: ${hlsRes.statusText}`, { status: hlsRes.status });
      }

      const finalUrl = hlsRes.url || targetUrl;
      const text = await hlsRes.text();

      let suffix = "";
      if (cookieVal) suffix += `&cookie=${encodeURIComponent(cookieVal)}`;
      if (uaVal) suffix += `&ua=${encodeURIComponent(uaVal)}`;
      if (hostVal) suffix += `&host=${encodeURIComponent(hostVal)}`;

      // Transform stream addresses dynamically so all TS segments point to our edge proxy
      const lines = text.split(/\r?\n/);
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
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

        if (absoluteUrl.includes(".m3u8")) {
          return `/api/hls/stream.m3u8?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}${suffix}`;
        } else {
          return `/api/hls/chunk.ts?url=${encodeURIComponent(absoluteUrl)}${referer ? `&referer=${encodeURIComponent(referer)}` : ""}${origin ? `&origin=${encodeURIComponent(origin)}` : ""}${suffix}`;
        }
      });

      return new Response(rewrittenLines.join("\n"), {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (err: any) {
      return new Response(`Stream playlist proxy error on Cloudflare Edge: ${err.message}`, { status: 500 });
    }
  }

  // Route 3: PROXY segment chunks (/api/hls/chunk.ts)
  if (pathname === "/api/hls/chunk.ts") {
    const targetUrl = url.searchParams.get("url");
    let referer = url.searchParams.get("referer") || "https://executeandship.com/";
    let origin = url.searchParams.get("origin") || "https://executeandship.com";
    const cookieVal = url.searchParams.get("cookie") || "";
    const uaVal = url.searchParams.get("ua") || "";
    const hostVal = url.searchParams.get("host") || "";

    if (!targetUrl) {
      return new Response("Missing target chunk URL", { status: 400 });
    }

    // Dynamic origin/referer resolution to prevent CDN 403 Forbidden blocks on standard chunks
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

      const chunkRes = await fetch(targetUrl, { headers });
      if (!chunkRes.ok) {
        return new Response(`Failed to fetch chunk: ${chunkRes.statusText}`, { status: chunkRes.status });
      }

      const contentType = chunkRes.headers.get("Content-Type") || "video/mp2t";

      // Instantly stream the body back chunk-by-chunk using Cloudflare's ultra-low latency streams
      return new Response(chunkRes.body, {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400",
        },
      });
    } catch (err: any) {
      return new Response(`Chunk proxy error on Cloudflare Edge: ${err.message}`, { status: 500 });
    }
  }

  return new Response("API Route Not Found on Edge", { status: 404 });
}
