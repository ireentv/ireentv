import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Proxy Route to bypass CORS and Mixed Content (HTTP on HTTPS pages) blocking
  app.get("/api/proxy", async (req, res) => {
    const targetUrl = req.query.url as string;
    const isClean = req.query.clean === "true";
    if (!targetUrl) {
      return res.status(400).send("Missing target url parameter");
    }

    try {
      const decodedUrl = targetUrl;
      const incomingRange = req.headers.range;

      let currentUrl = decodedUrl;
      let response;
      let redirectCount = 0;
      const maxRedirects = 5;

      while (redirectCount < maxRedirects) {
        // Fetch the insecure or cross-origin stream/media/playlist with custom headers to bypass streaming blocks
        const requestHeaders: Record<string, string> = {
          "User-Agent": isClean
            ? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            : "oxoo/1.3.9.d (Linux;Android 7.1.2) ExoPlayerLib/2.14.1",
          "Accept": "*/*",
          "Connection": "keep-alive"
        };

        let fetchUrl = currentUrl;
        try {
          const urlObj = new URL(currentUrl);

          // Use dynamic referer and origin to avoid blocking from standard streaming servers (like Akamai)
          if (currentUrl.includes("fawanews")) {
            requestHeaders["Referer"] = "http://www.fawanews.sc/";
            requestHeaders["Origin"] = "http://www.fawanews.sc";
          } else {
            requestHeaders["Referer"] = urlObj.origin + "/";
            requestHeaders["Origin"] = urlObj.origin;
          }

          const cookieParam = urlObj.searchParams.get("cookie");
          const uaParam = urlObj.searchParams.get("user-agent") || urlObj.searchParams.get("User-Agent");
          const hostParam = urlObj.searchParams.get("host") || urlObj.searchParams.get("Host");

          if (cookieParam) {
            requestHeaders["Cookie"] = cookieParam;
            urlObj.searchParams.delete("cookie");
          } else if (!isClean && currentUrl.includes("toffeelive.com")) {
            requestHeaders["Cookie"] = "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1785009637:KeyName=prod_linear:Signature=I2SEXR5mjgAcXkg--cW5_6o4Mr60cdPTJquJ6sTQsmMesXdG19HbE1i449ANnMJ1SByFfTDX9sMWX-L7-KkTCQ";
          }

          if (uaParam) {
            requestHeaders["User-Agent"] = uaParam;
            urlObj.searchParams.delete("user-agent");
            urlObj.searchParams.delete("User-Agent");
          }
          if (hostParam) {
            requestHeaders["Host"] = hostParam;
            urlObj.searchParams.delete("host");
            urlObj.searchParams.delete("Host");
          }

          fetchUrl = urlObj.toString();
        } catch (e) {
          if (!isClean && currentUrl.includes("toffeelive.com")) {
            requestHeaders["Cookie"] = "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1785009637:KeyName=prod_linear:Signature=I2SEXR5mjgAcXkg--cW5_6o4Mr60cdPTJquJ6sTQsmMesXdG19HbE1i449ANnMJ1SByFfTDX9sMWX-L7-KkTCQ";
          }
        }

        // Forward incoming Range headers if present (essential for streaming media seek/buffer)
        if (incomingRange) {
          requestHeaders["Range"] = incomingRange;
        }

        // Fetch with redirect: "manual" to prevent the platform from stripping authorization/cookie headers on cross-origin redirects
        response = await fetch(fetchUrl, {
          headers: requestHeaders,
          redirect: "manual"
        });

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("Location");
          if (!location) {
            break;
          }
          // Resolve relative redirect URLs against the current active URL
          currentUrl = new URL(location, currentUrl).href;
          redirectCount++;
        } else {
          break;
        }
      }

      if (!response.ok) {
        return res.status(response.status).send(`Failed to proxy URL: ${response.statusText}`);
      }

      // Add CORS headers so the browser client is always allowed to read this stream resource
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "*");

      const contentType = response.headers.get("content-type") || "";
      const lowerUrl = decodedUrl.toLowerCase();

      // Check if this is an HLS playlist (M3U8)
      if (
        lowerUrl.includes(".m3u8") ||
        contentType.includes("mpegurl") ||
        contentType.includes("application/x-mpegurl") ||
        contentType.includes("application/vnd.apple.mpegurl")
      ) {
        const playlistText = await response.text();

        // Rewrite relative URLs and absolute HTTP URLs inside the playlist to go through our secure proxy
        const lines = playlistText.split("\n");
        const rewrittenLines = lines.map((line) => {
          const trimmed = line.trim();
          if (trimmed === "") {
            return line;
          }

          // Helper to safely resolve relative/absolute segment URLs and proxy them
          const proxyUrl = (rawUrl: string) => {
            try {
              const parentUrlObj = new URL(decodedUrl);
              const resolvedUrlObj = new URL(rawUrl, decodedUrl);

              // Always forward special headers as query parameters to child playlists and segments
              const specialParams = ["cookie", "user-agent", "host", "User-Agent", "Host"];
              specialParams.forEach(param => {
                const val = parentUrlObj.searchParams.get(param);
                if (val) {
                  resolvedUrlObj.searchParams.set(param, val);
                }
              });

              // Also copy any other parent query parameters (like tokens) if they do not exist on the child URL
              parentUrlObj.searchParams.forEach((val, key) => {
                if (!resolvedUrlObj.searchParams.has(key)) {
                  resolvedUrlObj.searchParams.set(key, val);
                }
              });

              let resolvedUrl = resolvedUrlObj.href;

              // Preserve double-slashes if the parent URL path includes double slashes (e.g. :8097//Somoy-TV)
              if (decodedUrl.includes("://") && decodedUrl.split("://")[1].includes("//")) {
                const protocol = decodedUrl.split("://")[0];
                const restOfParent = decodedUrl.split("://")[1];
                const hostPart = restOfParent.split("/")[0]; // e.g. 180.94.28.28:8097
                
                const singleSlashPrefix = `${protocol}://${hostPart}/`;
                const doubleSlashPrefix = `${protocol}://${hostPart}//`;
                if (resolvedUrl.startsWith(singleSlashPrefix) && !resolvedUrl.startsWith(doubleSlashPrefix)) {
                  resolvedUrl = doubleSlashPrefix + resolvedUrl.substring(singleSlashPrefix.length);
                }
              }

              return `/api/proxy?url=${encodeURIComponent(resolvedUrl)}${isClean ? "&clean=true" : ""}`;
            } catch (e) {
              return rawUrl;
            }
          };

          // If the line is a tag comment (starts with #) it could still contain relative URIs in properties (e.g. URI="init.mp4")
          if (trimmed.startsWith("#")) {
            // Find patterns like URI="something" or URI='something'
            return line.replace(/(URI=["'])([^"']*)(["'])/g, (match, prefix, urlVal, suffix) => {
              if (urlVal.startsWith("/api/proxy")) {
                return match;
              }
              return `${prefix}${proxyUrl(urlVal)}${suffix}`;
            });
          }

          // Otherwise, it is a direct HLS segment or child stream playlist URL line
          if (trimmed.startsWith("/api/proxy")) {
            return line;
          }
          return proxyUrl(trimmed);
        });

        res.setHeader("Content-Type", "application/vnd.apple.mpegurl");
        return res.send(rewrittenLines.join("\n"));
      }

      // For TS / fMP4 video segments or other file streams, transfer directly
      if (contentType) {
        res.setHeader("Content-Type", contentType);
      }

      const contentRange = response.headers.get("Content-Range");
      if (contentRange) {
        res.setHeader("Content-Range", contentRange);
      }
      const acceptRanges = response.headers.get("Accept-Ranges");
      if (acceptRanges) {
        res.setHeader("Accept-Ranges", acceptRanges);
      }
      const contentLength = response.headers.get("Content-Length");
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }

      // Read as buffer and send to browser (fastest and most reliable for TS segments)
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);

    } catch (error: any) {
      console.error("Proxy error for URL:", targetUrl, error);
      return res.status(500).send(`Internal Proxy Error: ${error?.message || error}`);
    }
  });

  // General server health check API
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date() });
  });

  // Vite middleware setup for Development vs Production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
