/**
 * Markdown simple -> HTML (titres, listes, gras, italique, code). Le texte est échappé avant la mise
 * en forme : le contenu généré par l'IA ne peut pas injecter de HTML.
 */
export function markdownToHtml(raw: string | null | undefined): string {
  if (!raw) return '';
  const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const codeBlocks: string[] = [];
  let text = raw.replace(/\r\n/g, '\n').replace(/```[a-zA-Z0-9]*\n([\s\S]*?)```/g, (_m, code: string) => {
    codeBlocks.push(`<pre class="md-code"><code>${escape(code.trim())}</code></pre>`);
    return `\n@@CODE${codeBlocks.length - 1}@@\n`;
  });
  text = escape(text);

  const inline = (s: string) => s
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');

  const out: string[] = [];
  let paragraph: string[] = [];
  let list: { tag: 'ul' | 'ol'; items: string[] } | null = null;
  const flushParagraph = () => {
    if (paragraph.length) out.push(`<p>${inline(paragraph.join(' '))}</p>`);
    paragraph = [];
  };
  const flushList = () => {
    if (list) out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i)}</li>`).join('')}</${list.tag}>`);
    list = null;
  };

  for (const line of text.split('\n')) {
    const t = line.trim();
    const code = t.match(/^@@CODE(\d+)@@$/);
    if (code) { flushParagraph(); flushList(); out.push(codeBlocks[Number(code[1])]); continue; }
    const heading = t.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(5, heading[1].length + 2);
      out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
      continue;
    }
    const bullet = t.match(/^[-*•]\s+(.*)$/);
    const numbered = t.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || numbered) {
      flushParagraph();
      const tag = bullet ? 'ul' : 'ol';
      if (!list || list.tag !== tag) { flushList(); list = { tag, items: [] }; }
      list.items.push((bullet || numbered)![1]);
      continue;
    }
    if (!t) { flushParagraph(); flushList(); continue; }
    flushList();
    paragraph.push(t);
  }
  flushParagraph();
  flushList();
  return out.join('');
}
