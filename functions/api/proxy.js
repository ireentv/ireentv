export async function onRequest(context) {
  const { request } = context;

  // Handle CORS preflight immediately
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  const requestUrl = new URL(request.url);
  const targetUrl = requestUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing target url parameter", { status: 400 });
  }

  // Detect if the target URL uses a custom port (non-standard ports other than 80 or 443)
  let hasCustomPort = false;
  try {
    const parsedTarget = new URL(targetUrl);
    if (parsedTarget.port && parsedTarget.port !== "80" && parsedTarget.port !== "443") {
      hasCustomPort = true;
    }
  } catch (e) {
    // ignore
  }

  // To prevent country-blocking issues (e.g., Bangladesh local channels blocking foreign IPs like Google Cloud/Singapore),
  // we ONLY forward requests to the Cloud Run proxy if:
  // 1. The user has explicitly configured the PROXY_BACKEND_URL environment variable in Cloudflare, OR
  // 2. The stream requires a custom port which Cloudflare Workers are known to block, and we fallback to the default Cloud Run proxy.
  // Otherwise, standard port streams are proxied DIRECTLY by the Cloudflare Worker closest to the user (e.g., in Bangladesh) to bypass regional blockades.
  const hasExplicitBackend = !!context.env?.PROXY_BACKEND_URL;
  const proxyBackendUrl = context.env?.PROXY_BACKEND_URL || "https://ais-pre-lba6jarckqdljkk2qw6the-361905524472.asia-southeast1.run.app";

  if (proxyBackendUrl && (hasExplicitBackend || hasCustomPort)) {
    try {
      const targetBackend = `${proxyBackendUrl.replace(/\/$/, "")}/api/proxy?${requestUrl.searchParams.toString()}`;
      const headers = new Headers(request.headers);
      headers.delete("host");
      
      const backendResponse = await fetch(targetBackend, {
        method: request.method,
        headers: headers
      });

      return new Response(backendResponse.body, {
        status: backendResponse.status,
        headers: backendResponse.headers
      });
    } catch (e) {
      console.error("Failed to forward request to proxy backend:", e);
      // Fallback to direct fetching if backend proxy fails
    }
  }

  try {
    const referer = requestUrl.searchParams.get("referer");
    const userAgent = requestUrl.searchParams.get("userAgent");
    const cookie = requestUrl.searchParams.get("cookie");
    const incomingRange = request.headers.get("range");

    let currentUrl = targetUrl;
    let response;
    let redirectCount = 0;
    const maxRedirects = 5;

    while (redirectCount < maxRedirects) {
      let safeOrigin = "http://www.fawanews.sc";
      if (referer) {
        try {
          safeOrigin = new URL(referer).origin;
        } catch (e) {
          try {
            safeOrigin = new URL("http://" + referer).origin;
          } catch (err) {
            // fallback stays
          }
        }
      }

      const requestHeaders = {
        "User-Agent": userAgent || "oxoo/1.3.9.d (Linux;Android 7.1.2) ExoPlayerLib/2.14.1",
        "Referer": referer || "http://www.fawanews.sc/",
        "Origin": safeOrigin,
        "Accept": "*/*"
      };

      if (cookie) {
        requestHeaders["Cookie"] = cookie;
      } else if (currentUrl.includes("toffeelive.com")) {
        requestHeaders["Cookie"] = "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1783429674:KeyName=prod_linear:Signature=HZtNVAyK1LMOPqW7aB2jhFqujEX_UxctjdNePQiddJo50YamKsqbSJZM_ArDi45DFYq10c8W229I6TfdVwNAAg";
      }

      if (incomingRange) {
        requestHeaders["Range"] = incomingRange;
      }

      response = await fetch(currentUrl, {
        headers: requestHeaders,
        redirect: "manual"
      });

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location");
        if (!location) {
          break;
        }
        currentUrl = new URL(location, currentUrl).href;
        redirectCount++;
      } else {
        break;
      }
    }

    if (!response.ok) {
      // If direct fetch from Cloudflare fails (like 403 Forbidden for wrong country),
      // we fall back to the secure Cloud Run proxy to serve the stream data!
      if (proxyBackendUrl && !hasExplicitBackend && !hasCustomPort) {
        try {
          const targetBackend = `${proxyBackendUrl.replace(/\/$/, "")}/api/proxy?${requestUrl.searchParams.toString()}`;
          const headers = new Headers(request.headers);
          headers.delete("host");
          
          const backendResponse = await fetch(targetBackend, {
            method: request.method,
            headers: headers
          });

          return new Response(backendResponse.body, {
            status: backendResponse.status,
            headers: backendResponse.headers
          });
        } catch (backendErr) {
          console.error("Backup Cloud Run proxy failed:", backendErr);
        }
      }

      return new Response(`Failed to proxy URL: ${response.statusText}`, { status: response.status });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    };

    const contentType = response.headers.get("content-type") || "";
    const lowerUrl = targetUrl.toLowerCase();

    // Check if this is an HLS playlist (M3U8)
    if (
      lowerUrl.includes(".m3u8") ||
      contentType.includes("mpegurl") ||
      contentType.includes("application/x-mpegurl") ||
      contentType.includes("application/vnd.apple.mpegurl")
    ) {
      const playlistText = await response.text();

      // Rewrite relative URLs and absolute HTTP URLs inside the playlist to go through our Cloudflare proxy
      const lines = playlistText.split("\n");
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (trimmed === "") {
          return line;
        }

        const proxyUrl = (rawUrl) => {
          try {
            const parentUrlObj = new URL(targetUrl);
            const resolvedUrlObj = new URL(rawUrl, targetUrl);

            // Copy parent query parameters (like tokens) to the segments if they are not already present
            const parentParams = parentUrlObj.searchParams;
            const resolvedParams = resolvedUrlObj.searchParams;
            for (const [key, value] of parentParams.entries()) {
              if (!resolvedParams.has(key)) {
                resolvedParams.set(key, value);
              }
            }

            let resolvedUrl = resolvedUrlObj.href;

            // Preserve double-slashes if the parent URL path includes double slashes (e.g. :8097//Somoy-TV)
            if (targetUrl.includes("://") && targetUrl.split("://")[1].includes("//")) {
              const protocol = targetUrl.split("://")[0];
              const restOfParent = targetUrl.split("://")[1];
              const hostPart = restOfParent.split("/")[0];

              const singleSlashPrefix = `${protocol}://${hostPart}/`;
              const doubleSlashPrefix = `${protocol}://${hostPart}//`;
              if (resolvedUrl.startsWith(singleSlashPrefix) && !resolvedUrl.startsWith(doubleSlashPrefix)) {
                resolvedUrl = doubleSlashPrefix + resolvedUrl.substring(singleSlashPrefix.length);
              }
            }

            let proxyQuery = `url=${encodeURIComponent(resolvedUrl)}`;
            if (referer) {
              proxyQuery += `&referer=${encodeURIComponent(referer)}`;
            }
            if (userAgent) {
              proxyQuery += `&userAgent=${encodeURIComponent(userAgent)}`;
            }
            if (cookie) {
              proxyQuery += `&cookie=${encodeURIComponent(cookie)}`;
            }
            const proxyOrigin = new URL(request.url).origin;
            return `${proxyOrigin}/api/proxy?${proxyQuery}`;
          } catch (e) {
            return rawUrl;
          }
        };

        if (trimmed.startsWith("#")) {
          return line.replace(/(URI=["'])([^"']*)(["'])/g, (match, prefix, urlVal, suffix) => {
            if (urlVal.startsWith("/api/proxy")) {
              return match;
            }
            return `${prefix}${proxyUrl(urlVal)}${suffix}`;
          });
        }

        if (trimmed.startsWith("/api/proxy")) {
          return line;
        }
        return proxyUrl(trimmed);
      });

      const responseHeaders = {
        ...corsHeaders,
        "Content-Type": "application/vnd.apple.mpegurl"
      };

      return new Response(rewrittenLines.join("\n"), {
        status: 200,
        headers: responseHeaders
      });
    }

    // For TS / fMP4 video segments or other file streams, transfer directly
    const responseHeaders = {
      ...corsHeaders,
      "Content-Type": contentType || "video/mp2t"
    };

    const contentRange = response.headers.get("Content-Range");
    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }
    const acceptRanges = response.headers.get("Accept-Ranges");
    if (acceptRanges) {
      responseHeaders["Accept-Ranges"] = acceptRanges;
    }
    const contentLength = response.headers.get("Content-Length");
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    console.error("Proxy error for URL:", targetUrl, error);
    return new Response(`Internal Proxy Error: ${error.message || error}`, { status: 500 });
  }
}
