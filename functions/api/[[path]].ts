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

      // Fetch Football HD Zone channels (Auto Update Live Sports Data)
      let footballHDChannels: any[] = [];
      try {
        const fbResponse = await fetch(
          "https://raw.githubusercontent.com/sm-monirulislam/Upcoming-and-Live-Sports-Data/refs/heads/main/Sports_data.json"
        );
        if (fbResponse.ok) {
          const fbData: any = await fbResponse.json();
          let parsedMatches: any[] = [];
          if (fbData && Array.isArray(fbData.matches)) {
            parsedMatches = fbData.matches;
          } else if (Array.isArray(fbData)) {
            parsedMatches = fbData;
          }
          
          footballHDChannels = parsedMatches
            .filter((item: any) => {
              if (!item) return false;
              const cat = String(item.Category || "").toLowerCase().trim();
              const name = String(item.event_name || item.title || "").toLowerCase();
              
              // Explicitly match football/friendlies/soccer categories
              if (cat === "football" || cat === "friendlies" || cat === "soccer" || cat === "friendly") {
                return true;
              }
              
              // If it's a completely different sport (like cricket, tennis, badminton, kabaddi), do not match
              // UNLESS the name explicitly contains a major football keyword
              if (cat === "cricket" || cat === "tennis" || cat === "badminton" || cat === "kabaddi" || cat === "basketball") {
                const strongFootballTerms = ["football", "soccer", "fifa", "uefa", "laliga", "premier league", "serie a", "bundesliga", "ligue 1", "champions league", "copa america", "euro 2026", "euro 2024", "world cup qualifiers", "european qualifiers"];
                return strongFootballTerms.some(kw => name.includes(kw));
              }
              
              // Otherwise (category is empty, "sports", "live", "other", "undefined", or anything else), match against extensive football keywords:
              const keywords = [
                "football", "soccer", "fifa", "uefa", "laliga", "la liga", "premier league", 
                "serie a", "serie-a", "bundesliga", "ligue 1", "ligue-1", "champions league", 
                "europa league", "world cup", "copa america", "euro 2026", "euro 2024", 
                "friendlies", "friendly", "club friendly", "qualifiers", "european qualifiers",
                "italy", "saudi", "pro league", "spl", "fc ", " fc", "inter miami", "al hilal", 
                "al nassr", "chelsea", "real madrid", "barcelona", "manchester", "man city", 
                "liverpool", "bayern", "juventus", "milan", "arsenal", "atletico", "psg", 
                "tottenham", "dortmund", "inter milan", "ac milan", "bengaluru fc", "mohun bagan"
              ];
              
              return keywords.some(kw => name.includes(kw));
            })
            .map((item: any, index: number) => {
              const streamsList = Array.isArray(item.streams) ? item.streams : [];
              let mainLink = "";
              let altLink = "";
              let thirdLink = "";
              
              let referer1 = "";
              let referer2 = "";
              let referer3 = "";
              
              let origin1 = "";
              let origin2 = "";
              let origin3 = "";
              
              const itemReferer = item.referer || item.headers?.Referer || item.headers?.referer || "";
              const itemOrigin = item.origin || item.headers?.Origin || item.headers?.origin || "https://bd-mc-fblive.fancode.com";
              
              if (streamsList.length > 0) {
                const s1 = streamsList[0] || {};
                mainLink = s1.stream_url || s1["stream_url 1"] || s1["stream_url 2"] || s1.url || s1.link || "";
                referer1 = s1.stream_referer || s1.referer || s1.headers?.Referer || s1.headers?.referer || s1.stream_headers?.Referer || s1.stream_headers?.referer || itemReferer || "https://bd-mc-fblive.fancode.com/";
                origin1 = s1.stream_origin || s1.origin || s1.headers?.Origin || s1.headers?.origin || s1.stream_headers?.Origin || s1.stream_headers?.origin || itemOrigin;
                
                if (streamsList.length > 1) {
                  const s2 = streamsList[1] || {};
                  altLink = s2.stream_url || s2["stream_url 1"] || s2["stream_url 2"] || s2.url || s2.link || "";
                  referer2 = s2.stream_referer || s2.referer || s2.headers?.Referer || s2.headers?.referer || s2.stream_headers?.Referer || s2.stream_headers?.referer || itemReferer || referer1;
                  origin2 = s2.stream_origin || s2.origin || s2.headers?.Origin || s2.headers?.origin || s2.stream_headers?.Origin || s2.stream_headers?.origin || s1.stream_origin || s1.origin || s1.headers?.Origin || s1.headers?.origin || itemOrigin;
                }
                
                if (streamsList.length > 2) {
                  const s3 = streamsList[2] || {};
                  thirdLink = s3.stream_url || s3["stream_url 1"] || s3["stream_url 2"] || s3.url || s3.link || "";
                  referer3 = s3.stream_referer || s3.referer || s3.headers?.Referer || s3.headers?.referer || s3.stream_headers?.Referer || s3.stream_headers?.referer || itemReferer || referer1;
                  origin3 = s3.stream_origin || s3.origin || s3.headers?.Origin || s3.headers?.origin || s3.stream_headers?.Origin || s3.stream_headers?.origin || s1.stream_origin || s1.origin || s1.headers?.Origin || s1.headers?.origin || itemOrigin;
                }
              }
              
              const teamALogo = item.eventInfo?.teamAFlag || "";
              const teamBLogo = item.eventInfo?.teamBFlag || "";
              const logoUrl = teamALogo || teamBLogo || "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=200&auto=format&fit=crop";
              const eventName = item.event_name || item.title || `Match ${index + 1}`;
              const categoryName = item.Category || "Football";
              
              return {
                id: String(item.id || `football-hd-zone-${index}`),
                name: eventName,
                logo: logoUrl,
                link: mainLink,
                link2: altLink,
                link3: thirdLink,
                referer: referer1,
                referer2: referer2,
                referer3: referer3,
                origin: origin1,
                origin2: origin2,
                origin3: origin3,
                isFootballHDZone: true,
                group: categoryName,
                status: item.status || "",
                teamA: item.eventInfo?.teamA || "",
                teamB: item.eventInfo?.teamB || "",
                teamAFlag: teamALogo,
                teamBFlag: teamBLogo,
                startTime: item.eventInfo?.startTime || ""
              };
            });
        }
      } catch (err) {
        console.error("Cloudflare: Error fetching Football HD Zone channels:", err);
      }

      // Compose combination list
      let combinedChannels = [...cricChannels, ...roarZoneChannels, ...footballHDChannels];

      // 3. Fetch server 2 CricHD sources
      let smCricChannels: any[] = [];
      try {
        const smResponse = await fetch(
          "https://raw.githubusercontent.com/sm-monirulislam/CricHD-Auto-Update-Playlist/main/crichd_data.json"
        );
        if (smResponse.ok) {
          const smData: any = await smResponse.json();
          if (smData && Array.isArray(smData.response)) {
            smCricChannels = smData.response;
          } else if (Array.isArray(smData)) {
            smCricChannels = smData;
          }
        }
      } catch (err) {
        console.error("Cloudflare: Error fetching SM CricHD channels:", err);
      }

      // 4. Fetch server 2 AynaOTT sources
      let aynaChannels: any[] = [];
      try {
        const aynaResponse = await fetch(
          "https://raw.githubusercontent.com/sm-monirulislam/AynaOTT-auto-update-playlist/refs/heads/main/AynaOTT.json"
        );
        if (aynaResponse.ok) {
          const aynaData: any = await aynaResponse.json();
          if (aynaData && Array.isArray(aynaData)) {
            aynaChannels = aynaData;
          } else if (aynaData && Array.isArray(aynaData.response)) {
            aynaChannels = aynaData.response;
          }
        }
      } catch (err) {
        console.error("Cloudflare: Error fetching AynaOTT channels:", err);
      }

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
    const referer = url.searchParams.get("referer") || "https://executeandship.com/";
    const origin = url.searchParams.get("origin") || "https://executeandship.com";
    const cookieVal = url.searchParams.get("cookie") || "";
    const uaVal = url.searchParams.get("ua") || "";
    const hostVal = url.searchParams.get("host") || "";

    if (!targetUrl) {
      return new Response("Missing target m3u8 URL", { status: 400 });
    }

    try {
      const bdIp = "103.108.140.1";
      const headers: Record<string, string> = {
        "User-Agent": uaVal || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": origin,
        "Referer": referer,
        "X-Forwarded-For": bdIp,
        "X-Real-IP": bdIp,
        "Client-IP": bdIp,
        "CF-Connecting-IP": bdIp,
        "True-Client-IP": bdIp,
      };
      if (cookieVal) {
        headers["Cookie"] = cookieVal;
      }
      if (hostVal) {
        headers["Host"] = hostVal;
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
            const proxiedUri = `/api/hls/chunk.ts?url=${encodeURIComponent(absoluteUri)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}${suffix}`;
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
          return `/api/hls/stream.m3u8?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}${suffix}`;
        } else {
          return `/api/hls/chunk.ts?url=${encodeURIComponent(absoluteUrl)}&referer=${encodeURIComponent(referer)}&origin=${encodeURIComponent(origin)}${suffix}`;
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
    const referer = url.searchParams.get("referer") || "https://executeandship.com/";
    const origin = url.searchParams.get("origin") || "https://executeandship.com";
    const cookieVal = url.searchParams.get("cookie") || "";
    const uaVal = url.searchParams.get("ua") || "";
    const hostVal = url.searchParams.get("host") || "";

    if (!targetUrl) {
      return new Response("Missing target chunk URL", { status: 400 });
    }

    try {
      const bdIp = "103.108.140.1";
      const headers: Record<string, string> = {
        "User-Agent": uaVal || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Origin": origin,
        "Referer": referer,
        "Connection": "keep-alive",
        "X-Forwarded-For": bdIp,
        "X-Real-IP": bdIp,
        "Client-IP": bdIp,
        "CF-Connecting-IP": bdIp,
        "True-Client-IP": bdIp,
      };
      if (cookieVal) {
        headers["Cookie"] = cookieVal;
      }
      if (hostVal) {
        headers["Host"] = hostVal;
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
