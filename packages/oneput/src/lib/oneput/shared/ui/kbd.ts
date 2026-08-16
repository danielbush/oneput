import { isMacOS } from '../../lib/utils.js';

const MODIFIER_LABEL: Record<string, { mac: string; other: string }> = {
  $mod: { mac: '⌘', other: 'Ctrl' },
  meta: { mac: '⌘', other: 'Meta' },
  control: { mac: 'Ctrl', other: 'Ctrl' },
  shift: { mac: '⇧', other: '⇧' },
  alt: { mac: '⌥', other: 'Alt' }
};

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
 */
export function bindingToKbdHtml(binding: string, isMac = isMacOS()) {
  const keys = binding
    .split('+')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => `<kbd>${escapeHtml(labelForPart(part, isMac))}</kbd>`);
  return `<code>${keys.join('')}</code>`;
}
