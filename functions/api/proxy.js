export async function onRequest(context) {
  const { request } = context;
  const requestUrl = new URL(request.url);
  const targetUrl = requestUrl.searchParams.get("url");

  if (!targetUrl) {
    return new Response("Missing target url parameter", { status: 400 });
  }

  try {
    const decodedUrl = targetUrl;
    const incomingRange = request.headers.get("range");

    let currentUrl = decodedUrl;
    let response;
    let redirectCount = 0;
    const maxRedirects = 5;

    while (redirectCount < maxRedirects) {
      // Construct headers to match the node server and forward authorization
      const requestHeaders = {
        "User-Agent": "oxoo/1.3.9.d (Linux;Android 7.1.2) ExoPlayerLib/2.14.1",
        "Referer": "http://www.fawanews.sc/",
        "Origin": "http://www.fawanews.sc",
        "Accept": "*/*"
      };

      // Apply Toffee authentication cookie if target is Toffee
      if (currentUrl.includes("toffeelive.com")) {
        requestHeaders["Cookie"] = "Edge-Cache-Cookie=URLPrefix=aHR0cHM6Ly9ibGRjbXByb2QtY2RuLnRvZmZlZWxpdmUuY29t:Expires=1783429674:KeyName=prod_linear:Signature=HZtNVAyK1LMOPqW7aB2jhFqujEX_UxctjdNePQiddJo50YamKsqbSJZM_ArDi45DFYq10c8W229I6TfdVwNAAg";
      }

      // Forward incoming Range headers if present (essential for streaming media seek/buffer)
      if (incomingRange) {
        requestHeaders["Range"] = incomingRange;
      }

      // Fetch with redirect: "manual" to prevent the platform from stripping authorization/cookie headers on cross-origin redirects
      response = await fetch(currentUrl, {
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
      return new Response(`Failed to proxy URL: ${response.statusText}`, { status: response.status });
    }

    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "*"
    };

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

        const proxyUrl = (rawUrl) => {
          try {
            const parentUrlObj = new URL(decodedUrl);
            const resolvedUrlObj = new URL(rawUrl, decodedUrl);

            if (resolvedUrlObj.search === "" && parentUrlObj.search !== "") {
              resolvedUrlObj.search = parentUrlObj.search;
            }

            let resolvedUrl = resolvedUrlObj.href;

            if (decodedUrl.includes("://") && decodedUrl.split("://")[1].includes("//")) {
              const protocol = decodedUrl.split("://")[0];
              const restOfParent = decodedUrl.split("://")[1];
              const hostPart = restOfParent.split("/")[0];

              const singleSlashPrefix = `${protocol}://${hostPart}/`;
              const doubleSlashPrefix = `${protocol}://${hostPart}//`;
              if (resolvedUrl.startsWith(singleSlashPrefix) && !resolvedUrl.startsWith(doubleSlashPrefix)) {
                resolvedUrl = doubleSlashPrefix + resolvedUrl.substring(singleSlashPrefix.length);
              }
            }

            return `/api/proxy?url=${encodeURIComponent(resolvedUrl)}`;
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

      return new Response(rewrittenLines.join("\n"), {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl"
        }
      });
    }

    // For TS / fMP4 video segments or other file streams, transfer directly
    const responseHeaders = {
      ...corsHeaders
    };
    if (contentType) {
      responseHeaders["Content-Type"] = contentType;
    }

    // Copy range response headers if present (essential for partial content delivery)
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
