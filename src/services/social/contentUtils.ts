import xss from "xss";

export function extractHashtags(text: string): string[] {
  const matches = text.match(/#([\p{L}0-9_]+)/gu) || [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}

export function extractMentions(text: string): string[] {
  const matches = text.match(/@([a-zA-Z0-9_]{3,30})/g) || [];
  return [...new Set(matches.map((m) => m.slice(1)))] as string[];
}

export function sanitizeContent(text: string): string {
  return xss(text, {
    whiteList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ["script"],
  });
}
