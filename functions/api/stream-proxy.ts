function resolveUrl(baseDir: string, relativeUrl: string): string {
  try {
    if (relativeUrl.startsWith("http://") || relativeUrl.startsWith("https://")) {
      return relativeUrl;
    }
    if (relativeUrl.startsWith("/")) {
      const urlObj = new URL(baseDir);
      return `${urlObj.protocol}//${urlObj.host}${relativeUrl}`;
    }
    return new URL(relativeUrl, baseDir).href;
  } catch (e) {
    return relativeUrl;
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

    if (context.request.method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: corsHeaders
      });
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    if (!upstreamRes.ok) {
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
      if (contentType) corsHeaders.set("Content-Type", contentType);
      const contentLength = upstreamRes.headers.get("content-length");
      if (contentLength) corsHeaders.set("Content-Length", contentLength);

      return new Response(upstreamRes.body, {
        status: 200,
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
