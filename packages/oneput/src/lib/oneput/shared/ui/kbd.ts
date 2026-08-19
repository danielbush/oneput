import { isMacOS } from '../../lib/utils.js';

const MODIFIER_LABEL: Record<string, { mac: string; other: string }> = {
  $mod: { mac: '⌘', other: 'Ctrl' },
  meta: { mac: '⌘', other: 'Meta' },
  control: { mac: '⌃', other: 'Ctrl' },
  shift: { mac: '⇧', other: '⇧' },
  alt: { mac: '⌥', other: 'Alt' }
};

/** Glyph keys, which read smaller than a letter at the same font size. */
const SYMBOLS = new Set(['⌘', '⌃', '⇧', '⌥']);

function escapeHtml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function labelForPart(part: string, isMac: boolean) {
  const modifier = MODIFIER_LABEL[part.toLowerCase()];
  if (modifier) {
    return isMac ? modifier.mac : modifier.other;
  }
  return part;
}

/**
 * Turn a tinykeys chord (`$mod+Enter`) into `oneput__kbd` markup.
 *
 * `$mod` becomes `⌘` on macOS and `Ctrl` elsewhere, so a stored binding never
 * shows the raw tinykeys token to a user.
 *
 * A glyph key gets `oneput__kbd-symbol`, which the stylesheet sizes up. Letter
 * keys stay at the normal size — sizing every key for the glyphs made the
 * letters too big.
 */
export function bindingToKbdHtml(binding: string, isMac = isMacOS()) {
  const keys = binding
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => labelForPart(part, isMac))
    .map((label) => {
      const cls = SYMBOLS.has(label) ? ' class="oneput__kbd-symbol"' : '';
      return `<kbd${cls}>${escapeHtml(label)}</kbd>`;
    });
  return `<code>${keys.join('')}</code>`;
}
