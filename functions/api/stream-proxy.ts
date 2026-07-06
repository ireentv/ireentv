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

export async function onRequest(context: any) {
  try {
    const requestUrl = new URL(context.request.url);
    const targetUrl = requestUrl.searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing stream 'url' parameter", { status: 400 });
    }

    const corsHeaders = new Headers();
    corsHeaders.set("Access-Control-Allow-Origin", "*");
    corsHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
    corsHeaders.set("Access-Control-Allow-Headers", "*");
    corsHeaders.set("Access-Control-Expose-Headers", "*");

    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    // Forward Range and Accept headers from client to upstream
    const clientHeaders = context.request.headers;
    const forwardHeaders: Record<string, string> = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    };

    const range = clientHeaders.get("range");
    if (range) {
      forwardHeaders["Range"] = range;
    }
    const accept = clientHeaders.get("accept");
    if (accept) {
      forwardHeaders["Accept"] = accept;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: forwardHeaders
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return new Response(`Failed to fetch upstream stream: ${upstreamRes.statusText}`, {
        status: upstreamRes.status,
        headers: corsHeaders
      });
    }

    const contentType = upstreamRes.headers.get("content-type") || "";
    const isM3U8 = targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("application/x-mpegurl") || contentType.includes("vnd.apple.mpegurl");

    if (isM3U8) {
      const text = await upstreamRes.text();
      const lines = text.split("\n");
      const rewrittenLines: string[] = [];

      let baseUrl = targetUrl;
      if (targetUrl.includes("?")) {
        baseUrl = targetUrl.split("?")[0];
      }
      const lastSlashIndex = baseUrl.lastIndexOf("/");
      const baseDir = lastSlashIndex !== -1 ? baseUrl.substring(0, lastSlashIndex + 1) : baseUrl;

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
          let modifiedLine = line;
          const uriMatch = line.match(/URI="([^"]+)"/i);
          if (uriMatch) {
            const relativeUri = uriMatch[1];
            let absoluteUri = resolveUrl(baseDir, relativeUri);

            if (parentQuery && isRelative && !relativeUri.includes("?")) {
              absoluteUri += parentQuery;
            }

            const proxyUri = `/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}`;
            modifiedLine = line.replace(`URI="${relativeUri}"`, `URI="${proxyUri}"`);
          }
          rewrittenLines.push(modifiedLine);
        } else {
          let absoluteUri = resolveUrl(baseDir, line);

          if (parentQuery && isRelative && !line.includes("?")) {
            absoluteUri += parentQuery;
          }

          const proxyUri = `/api/stream-proxy?url=${encodeURIComponent(absoluteUri)}`;
          rewrittenLines.push(proxyUri);
        }
      }

      corsHeaders.set("Content-Type", "application/vnd.apple.mpegurl");
      return new Response(rewrittenLines.join("\n"), {
        status: 200,
        headers: corsHeaders
      });
    } else {
      // Forward safe response headers to client
      const headersToForward = [
        "content-type",
        "content-length",
        "content-range",
        "accept-ranges",
        "cache-control",
        "expires"
      ];

      for (const h of headersToForward) {
        const val = upstreamRes.headers.get(h);
        if (val) {
          corsHeaders.set(h, val);
        }
      }

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers: corsHeaders
      });
    }
  } catch (err: any) {
    return new Response(`Stream Proxy Error: ${err.message}`, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
