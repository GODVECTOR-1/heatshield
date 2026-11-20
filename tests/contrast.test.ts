// check:contrast (spec 09): every level's text/background pair in app/globals.css is at least 7:1.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('app/globals.css', 'utf8');
const token = (name: string) => {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`missing --color-${name}`);
  return m[1];
};
const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = Number.parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('level tokens', () => {
  it.each([0, 1, 2, 3, 4])('L%s text on background is at least 7:1', (n) => {
    expect(ratio(token(`l${n}`), token(`on-l${n}`))).toBeGreaterThanOrEqual(7);
  });
  it('WCAG formula sanity: black on white is 21:1', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
  });
});
