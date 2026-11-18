import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('No raw HTML entities in JS/TSX strings or i18n dictionaries', () => {
  it('contains no &amp;, &lt;, &gt;, &quot;, &apos;, or &nbsp; in string literals or JSX &amp; text', () => {
    const srcRoot = path.resolve(process.cwd(), 'src');
    const files = walk(srcRoot);
    const bad: string[] = [];
    const entityRe = /&(amp|lt|gt|quot|apos|nbsp);/;

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (!entityRe.test(content)) continue;

      const sf = ts.createSourceFile(
        file,
        content,
        ts.ScriptTarget.Latest,
        true,
        file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
      );

      const visit = (node: ts.Node) => {
        if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
          if (entityRe.test(node.text)) {
            bad.push(`${path.relative(srcRoot, file)}: string "${node.text.slice(0, 60)}"`);
          }
        } else if (ts.isJsxText(node)) {
          if (/&amp;/.test(node.getText(sf))) {
            bad.push(`${path.relative(srcRoot, file)}: jsxText "${node.getText(sf).trim().slice(0, 60)}"`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sf);
    }

    expect(bad).toEqual([]);
  });
});
