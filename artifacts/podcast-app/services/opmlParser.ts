export interface OPMLEntry {
  title: string;
  feedUrl: string;
}

export function parseOPML(text: string): OPMLEntry[] {
  const entries: OPMLEntry[] = [];
  const regex = /<outline[^>]*xmlUrl=["']([^"']+)["'][^>]*>/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const xmlUrl = match[1];
    const outlineXml = match[0];
    const textMatch = outlineXml.match(/\btext=["']([^"']+)["']/i);
    const titleMatch = outlineXml.match(/\btitle=["']([^"']+)["']/i);
    entries.push({
      title: textMatch?.[1] ?? titleMatch?.[1] ?? xmlUrl,
      feedUrl: xmlUrl,
    });
  }
  return entries;
}
