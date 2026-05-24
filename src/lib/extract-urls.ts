const URL_REGEX = /https?:\/\/[^\s<>"']+(?:\/[^\s<>"']*)?/gi;

export function extractUrls(text: string): string[] {
  const matches = text.match(URL_REGEX);
  return matches ?? [];
}
