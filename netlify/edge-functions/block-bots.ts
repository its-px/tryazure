import type { Context } from "https://edge.netlify.com/v1/index.ts";

// User-agent substrings to block (case-insensitive). Add/remove as needed.
const BLOCKED_UA_PATTERNS = [
  // AI / LLM crawlers
  "gptbot",
  "chatgpt-user",
  "ccbot",
  "claudebot",
  "claude-web",
  "anthropic-ai",
  "google-extended",
  "perplexitybot",
  "youbot",
  "bytespider",
  "diffbot",
  "cohere-ai",
  "omgilibot",
  "facebookbot",
  "meta-externalagent",

  // generic scrapers / HTTP libraries
  "curl/",
  "wget/",
  "python-requests",
  "python-urllib",
  "scrapy",
  "go-http-client",
  "libwww-perl",
  "httpclient",
  "okhttp",
  "node-fetch",
  "axios/",
];

export default async (request: Request, context: Context) => {
  const ua = request.headers.get("user-agent")?.toLowerCase() ?? "";

  // No UA at all is a common scraper tell.
  const isBlocked = ua === "" || BLOCKED_UA_PATTERNS.some((p) => ua.includes(p));

  if (isBlocked) {
    return new Response("Forbidden", { status: 403 });
  }

  return context.next();
};

export const config = { path: "/*" };
