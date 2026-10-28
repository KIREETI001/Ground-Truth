import test from 'node:test';
import assert from 'node:assert/strict';
import { parseReferenceMarkdown, referenceLink } from '../lib/learning/reference-markdown.ts';

test('reference notes preserve code literally and keep raw HTML as text', () => {
  const blocks = parseReferenceMarkdown('# Reading code\n\n<script>alert(1)</script>\n\n```js\nconst html = "<img onerror=run()>";\n```');
  assert.deepEqual(blocks, [
    { kind: 'heading', depth: 1, text: 'Reading code', id: 'reading-code' },
    { kind: 'paragraph', text: '<script>alert(1)</script>' },
    { kind: 'code', language: 'js', text: 'const html = "<img onerror=run()>";' },
  ]);
});

test('reference links accept HTTPS documents and known notes while refusing active or unknown destinations', () => {
  assert.equal(referenceLink('javascript:alert(1)', 'javascript'), null);
  assert.equal(referenceLink('//attacker.test/path', 'javascript'), null);
  assert.equal(referenceLink('https://user:pass@example.org', 'javascript'), null);
  assert.equal(referenceLink('../../.env', 'javascript'), null);
  assert.equal(referenceLink('missing.md', 'javascript'), null);
  assert.equal(referenceLink('https://developer.mozilla.org/en-US/docs/Web/JavaScript', 'javascript'), 'https://developer.mozilla.org/en-US/docs/Web/JavaScript');
  assert.equal(referenceLink('02_language_basics.md', 'javascript'), '/learn/library?language=javascript&note=02_language_basics');
  assert.equal(referenceLink('#10-destructuring--spread', 'javascript'), '#10-destructuring-spread');
});

test('reference blocks keep lists, tables and duplicate headings readable', () => {
  const blocks = parseReferenceMarkdown('## Types\n\n- String\n- Number\n\n| Value | Type |\n|---|---|\n| 1 | number |\n\n## Types');
  assert.deepEqual(blocks[1], { kind: 'list', ordered: false, items: ['String', 'Number'] });
  assert.deepEqual(blocks[2], { kind: 'table', rows: [['Value', 'Type'], ['1', 'number']] });
  assert.deepEqual(blocks[3], { kind: 'heading', depth: 2, text: 'Types', id: 'types-2' });
});

test('supplied TypeScript table rows preserve escaped union types in their original column', () => {
  const blocks = parseReferenceMarkdown('| Option | Type | Meaning |\n|---|---|---|\n| noUncheckedIndexedAccess | `T \\| undefined` | Check indexed reads |\n| exactOptionalPropertyTypes | `string \\| undefined` | Make the union explicit |');
  assert.deepEqual(blocks, [{ kind: 'table', rows: [
    ['Option', 'Type', 'Meaning'],
    ['noUncheckedIndexedAccess', '`T | undefined`', 'Check indexed reads'],
    ['exactOptionalPropertyTypes', '`string | undefined`', 'Make the union explicit'],
  ] }]);
});
