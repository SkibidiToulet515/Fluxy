const express = require("express");

const router = express.Router();

function isHttpUrl(value) {
  try {
    const parsed = new URL(String(value || "").trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function injectProxyEnhancements(html, targetUrl, engine) {
  const baseTag = `<base href="${targetUrl}">`;
  const marker = "__FLUXY_PROXY_INJECTED__";
  const script = `
<script>
if (!window.${marker}) {
  window.${marker} = true;
  const proxyBase = "/api/proxy?engine=${encodeURIComponent(engine)}&url=";
  const toAbsolute = (value) => {
    try { return new URL(value, "${targetUrl}").toString(); } catch { return null; }
  };
  const toProxy = (value) => {
    const absolute = toAbsolute(value);
    if (!absolute) return null;
    return proxyBase + encodeURIComponent(absolute);
  };

  document.addEventListener("click", (event) => {
    const link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
    if (!link) return;
    const href = link.getAttribute("href");
    if (!href || href.startsWith("javascript:") || href.startsWith("#")) return;
    const proxied = toProxy(href);
    if (!proxied) return;
    event.preventDefault();
    window.location.href = proxied;
  }, true);

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form || !form.tagName || form.tagName.toLowerCase() !== "form") return;
    event.preventDefault();
    const action = form.getAttribute("action") || window.location.href;
    const method = (form.getAttribute("method") || "get").toLowerCase();
    const target = toAbsolute(action);
    if (!target) return;
    const data = new FormData(form);
    const params = new URLSearchParams();
    for (const [key, value] of data.entries()) params.append(key, value);
    const nextUrl = method === "get"
      ? target + (target.includes("?") ? "&" : "?") + params.toString()
      : target;
    const proxied = toProxy(nextUrl);
    if (!proxied) return;
    window.location.href = proxied;
  }, true);
}
</script>`;

  const withoutMetaCsp = html.replace(/<meta[^>]+http-equiv=["']content-security-policy["'][^>]*>/gi, "");
  if (/<head[^>]*>/i.test(withoutMetaCsp)) {
    return withoutMetaCsp.replace(/<head[^>]*>/i, (match) => `${match}${baseTag}${script}`);
  }
  return `${baseTag}${script}${withoutMetaCsp}`;
}

router.get("/", async (req, res) => {
  const target = String(req.query.url || "").trim();
  const engine = String(req.query.engine || "uv").trim().toLowerCase();

  if (!isHttpUrl(target)) {
    res.status(400).json({ error: "Invalid url. Use http:// or https://." });
    return;
  }

  try {
    const response = await fetch(target, {
      redirect: "follow",
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        accept: req.get("accept") || "*/*",
        "accept-language": req.get("accept-language") || "en-US,en;q=0.9",
      },
    });

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const finalUrl = response.url || target;

    res.removeHeader("x-frame-options");
    res.removeHeader("content-security-policy");
    res.setHeader("x-proxy-engine", engine);
    res.setHeader("x-proxy-target", finalUrl);
    res.setHeader("cache-control", "no-store, no-cache, must-revalidate, proxy-revalidate");

    if (contentType.includes("text/html")) {
      const html = await response.text();
      const enhanced = injectProxyEnhancements(html, finalUrl, engine);
      res.status(response.status).type("html").send(enhanced);
      return;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.status(response.status).setHeader("content-type", contentType).send(buffer);
  } catch (error) {
    res.status(502).json({
      error: "Proxy request failed.",
      details: error && error.message ? error.message : "Unknown error",
    });
  }
});

module.exports = router;
