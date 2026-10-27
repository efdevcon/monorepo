/**
 * Minimal XML reader for Figma's SVG exports: elements, attributes and
 * nesting, nothing else (no namespaces, no CDATA, no DTD). Figma writes one
 * element per line with double-quoted attributes; anything stranger fails
 * loudly rather than silently mis-parsing geometry.
 */
export type XmlNode = { tag: string; attrs: Record<string, string>; children: XmlNode[] };

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, body: string) => {
    if (body[0] === "#") {
      const code = body[1].toLowerCase() === "x" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[body.toLowerCase()] ?? m;
  });
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([\w:.-]+)\s*=\s*"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) attrs[m[1]] = decodeEntities(m[2]);
  return attrs;
}

export function parseXml(source: string): XmlNode {
  const root: XmlNode = { tag: "#root", attrs: {}, children: [] };
  const stack: XmlNode[] = [root];
  const re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<!DOCTYPE[^>]*>|<\/([\w:.-]+)\s*>|<([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*"[^"]*")*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source))) {
    const [token, close, open, attrRaw, selfClose, text] = m;
    if (text !== undefined) {
      if (text.trim() !== "") throw new Error(`Unexpected text content: "${text.trim().slice(0, 40)}"`);
      continue;
    }
    if (token.startsWith("<?") || token.startsWith("<!")) continue;
    if (close) {
      const node = stack.pop();
      if (!node || node.tag !== close) throw new Error(`Mismatched closing tag </${close}>`);
      continue;
    }
    if (open) {
      const node: XmlNode = { tag: open, attrs: parseAttrs(attrRaw ?? ""), children: [] };
      stack[stack.length - 1].children.push(node);
      if (!selfClose) stack.push(node);
      continue;
    }
    throw new Error(`Unparseable token near "${token.slice(0, 40)}"`);
  }
  if (stack.length !== 1) throw new Error(`Unclosed <${stack[stack.length - 1].tag}>`);
  if (root.children.length !== 1) throw new Error("Expected exactly one root element");
  return root.children[0];
}
