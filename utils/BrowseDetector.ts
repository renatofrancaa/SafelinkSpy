import { detectAdSource, AdSource } from "./detectSource";

export function isFacebookOrInstagramBrowser(
  headers: Headers,
  url?: string
): boolean {
  return detectAdSource(headers, url) === "meta";
}

export function isGoogleOrYouTubeBrowser(
  headers: Headers,
  url?: string
): boolean {
  const source = detectAdSource(headers, url);
  return source === "google" || source === "youtube";
}

export function isAdSourceBrowser(headers: Headers, url?: string): boolean {
  return detectAdSource(headers, url) !== "unknown";
}

export function getAdSource(headers: Headers, url?: string): AdSource {
  return detectAdSource(headers, url);
}
