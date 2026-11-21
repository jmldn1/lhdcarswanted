// A car's saved description as blocks for its page: paragraphs, a label
// line ("Highlights:") and bullet lists ("- " lines), the shape the admin's
// AI writes (src/lib/ai.ts) and the dealer can type. A description in any
// other shape is just paragraphs (line breaks inside one are kept).
export type Block = { type: "p"; text: string } | { type: "label"; text: string } | { type: "ul"; items: string[] };

export function descriptionBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.replace(/\r\n/g, "\n").split(/\n\s*\n/)) {
    let para: string[] = [];
    let list: string[] | null = null;
    const flushPara = () => {
      if (para.length) blocks.push({ type: "p", text: para.join("\n") });
      para = [];
    };
    const flushList = () => {
      if (list?.length) blocks.push({ type: "ul", items: list });
      list = null;
    };
    for (const line of chunk.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const bullet = line.match(/^[-•*]\s+(.+)$/);
      if (bullet) {
        flushPara();
        (list ??= []).push(bullet[1]);
        continue;
      }
      flushList();
      // A short line ending in a colon, like "Highlights:", is a label.
      if (/^[^.!?]{2,40}:$/.test(line)) {
        flushPara();
        blocks.push({ type: "label", text: line.slice(0, -1) });
        continue;
      }
      para.push(line);
    }
    flushPara();
    flushList();
  }
  return blocks;
}
