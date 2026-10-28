import { referenceNotes } from './reference.ts';

export type ReferenceBlock =
  | { kind: 'heading'; depth: number; text: string; id: string }
  | { kind: 'paragraph' | 'quote'; text: string }
  | { kind: 'code'; language: string; text: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'table'; rows: string[][] }
  | { kind: 'rule' };

export function referenceLink(value: string, language: string): string | null {
  if (value.startsWith('#') && /^#[\w-]+$/.test(value)) return value.replace(/-+/g, '-').replace(/-$/, '');
  if (value.startsWith('https://')) {
    try { const url = new URL(value); return url.username || url.password ? null : url.href; }
    catch { return null; }
  }
  const match = value.match(/^(?:\.\/)?([A-Za-z0-9_]+)\.md(?:#[\w-]+)?$/);
  if (!match) return null;
  const note = referenceNotes.find(item => item.language === language && item.slug === match[1]);
  return note ? `/learn/library?language=${note.language}&note=${note.slug}` : null;
}

/** A small text-only renderer grammar. Raw HTML is never interpreted. */
export function parseReferenceMarkdown(markdown: string): ReferenceBlock[] {
  const lines = markdown.slice(0, 200_000).replace(/\r\n?/g, '\n').split('\n');
  const blocks: ReferenceBlock[] = [];
  const ids = new Map<string, number>();
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index++; continue; }
    const fence = line.match(/^\s*```([\w+#.-]*)/);
    if (fence) {
      const code: string[] = []; index++;
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index++;
      blocks.push({ kind: 'code', language: fence[1], text: code.join('\n') }); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const slug = heading[2].toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-') || 'section';
      const count = (ids.get(slug) ?? 0) + 1; ids.set(slug, count);
      blocks.push({ kind: 'heading', depth: heading[1].length, text: heading[2], id: count === 1 ? slug : `${slug}-${count}` }); index++; continue;
    }
    if (/^\s*(?:-{3,}|\*{3,})\s*$/.test(line)) { blocks.push({ kind: 'rule' }); index++; continue; }
    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (index < lines.length && lines[index].trim().startsWith('|')) {
        const row = lines[index++].trim().replace(/^\||\|$/g, '').split(/(?<!\\)\|/).map(cell => cell.trim().replace(/\\\|/g, '|'));
        if (!row.every(cell => /^:?-{2,}:?$/.test(cell))) rows.push(row);
      }
      blocks.push({ kind: 'table', rows }); continue;
    }
    const list = line.match(/^\s*(?:(\d+)\.|([-*]))\s+(.+)$/);
    if (list) {
      const ordered = !!list[1]; const items: string[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:(\d+)\.|([-*]))\s+(.+)$/);
        if (!item || !!item[1] !== ordered) break;
        items.push(item[3]); index++;
      }
      blocks.push({ kind: 'list', ordered, items }); continue;
    }
    if (/^>\s?/.test(line)) {
      const parts: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) parts.push(lines[index++].replace(/^>\s?/, ''));
      blocks.push({ kind: 'quote', text: parts.join(' ') }); continue;
    }
    const parts = [line]; index++;
    while (index < lines.length && lines[index].trim() && !/^(?:#{1,6}\s|\s*```|\s*[-*]\s|\s*\d+\.\s|\s*\||>)/.test(lines[index])) parts.push(lines[index++]);
    blocks.push({ kind: 'paragraph', text: parts.join(' ') });
  }
  return blocks;
}
