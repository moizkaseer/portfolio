/**
 * Plain-text safety net for agent answers (the chat renders text, not markdown). Strips stray
 * markdown emphasis / code fences, turns [label](url) into a link, and links bare https URLs and
 * site paths like /work/geolumen. Only http(s) URLs and same-site paths ever become links.
 */
export type AnswerPiece = string | { href: string; label: string; external: boolean };

const TOKEN = /\[([^\]\n]{1,200})\]\(((?:https?:\/\/|\/)[^\s)]+)\)|https?:\/\/[^\s<>"')\]]+|\/(?:work|about|contact)(?:\/[\w-]+)*(?:#[\w-]+)?/g;

export function cleanMarkdown(text: string): string {
  return text
    .replace(/```[\w-]*\n?/g, "")
    .replace(/(\*\*|__)(?=\S)([^*_\n]+?)\1/g, "$2")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[*-]\s+/gm, "• ");
}

export function formatAnswer(text: string): AnswerPiece[] {
  const src = cleanMarkdown(text);
  const out: AnswerPiece[] = [];
  let last = 0;
  for (const m of src.matchAll(TOKEN)) {
    const i = m.index!;
    // a site path only counts at a word boundary ("a/work/b" is not a link); no lookbehind for old Safari
    if (m[0][0] === "/" && i > 0 && /[\w/.]/.test(src[i - 1])) continue;
    let href = m[2] ?? m[0];
    let label = m[1] ?? m[0];
    // a sentence-ending period or comma isn't part of a bare URL
    const trail = m[1] ? "" : (/[.,;:!?]+$/.exec(href)?.[0] ?? "");
    if (trail) href = label = href.slice(0, -trail.length);
    if (i > last) out.push(src.slice(last, i));
    out.push({ href, label, external: href.startsWith("http") });
    last = i + m[0].length - trail.length;
  }
  if (last < src.length) out.push(src.slice(last));
  return out;
}
