import { FLOW_CONTENT, getAllowableChildTags, PHRASING_CONTENT } from './html-content.js';
import { getElementTemplatesForTags, type ElementTemplate } from './element-templates.js';

/**
 * Return the contextless sibling tags for `tagName`.
 *
 * These are the generic symmetric before/after rules. Live DOM rules that
 * depend on a specific insertion slot, such as table section ordering, are
 * applied by `getAllowableInsertBeforeTags` / `getAllowableInsertAfterTags`.
 *
 * Examples:
 * - `tr` returns `['tr']`; a row can sit beside another row inside `thead`,
 *   `tbody`, `tfoot`, or directly under `table`.
 * - `td` returns `['td']`; a cell can sit beside another cell inside a row.
 * - `tbody` returns `[]` here; table section siblings like `thead`/`tbody`/
 *   `tfoot` require live table-child ordering and are handled by the public
 *   insert-before/after functions.
 */
export function getAllowableSiblings(tagName: string): string[] {
  const normTagName = tagName.toLowerCase();
  if (['li', 'tr', 'td'].includes(normTagName)) return [normTagName];
  if (PHRASING_CONTENT.includes(normTagName)) {
    return PHRASING_CONTENT;
  }
  if (FLOW_CONTENT.includes(normTagName)) {
    return FLOW_CONTENT;
  }
  return [];
}

type InsertDirection = 'before' | 'after';
type TableChildGroup = 'head' | 'body' | 'foot';

const TABLE_CHILD_GROUP_ORDER: TableChildGroup[] = ['head', 'body', 'foot'];

function getTableChildGroup(tagName: string): TableChildGroup | null {
  switch (tagName.toLowerCase()) {
    case 'thead':
      return 'head';
    case 'tbody':
    case 'tr':
      return 'body';
    case 'tfoot':
      return 'foot';
    default:
      return null;
  }
}

export function isValidTableChildSequence(tagNames: string[]): boolean {
  let previousGroupIndex = -1;
  let theadCount = 0;
  let tfootCount = 0;

  for (const tagName of tagNames) {
    const normalized = tagName.toLowerCase();
    const group = getTableChildGroup(normalized);
    if (!group) {
      return false;
    }
    const groupIndex = TABLE_CHILD_GROUP_ORDER.indexOf(group);
    if (groupIndex < previousGroupIndex) {
      return false;
    }
    previousGroupIndex = groupIndex;
    if (normalized === 'thead') {
      theadCount++;
    }
    if (normalized === 'tfoot') {
      tfootCount++;
    }
  }

  return theadCount <= 1 && tfootCount <= 1;
}

/**
 * Return table child tags that can be inserted before/after a live table child.
 *
 * @param target Existing child of a `<table>` that defines the insertion slot.
 * @param direction Whether the candidate would be inserted before or after `target`.
 */
function getAllowableTableChildInsertTags(
  target: HTMLElement,
  direction: InsertDirection
): string[] {
  if (target.parentElement?.tagName.toLowerCase() !== 'table') {
    return [];
  }

  const children = Array.from(target.parentElement.children);
  const targetIndex = children.indexOf(target);

  // A live table child should appear in parent.children. If it does not, the
  // insertion slot is inconsistent, so assume no allowable tags.
  if (targetIndex < 0) {
    return [];
  }

  // Simulate inserting the candidate into this slot; keep it only if the
  // resulting table child order is still valid.
  const insertionIndex = direction === 'before' ? targetIndex : targetIndex + 1;
  const existingTags = children.map((child) => child.tagName.toLowerCase());
  return getAllowableChildTags('table').filter((candidate) => {
    const candidateTags = [...existingTags];
    candidateTags.splice(insertionIndex, 0, candidate);
    return isValidTableChildSequence(candidateTags);
  });
}

export function getAllowableInsertBeforeTags(target: HTMLElement): string[] {
  if (!target.parentElement) {
    return [];
  }
  if (target.parentElement.tagName.toLowerCase() === 'table') {
    return getAllowableTableChildInsertTags(target, 'before');
  }
  return getAllowableSiblings(target.tagName);
}

export function getAllowableInsertAfterTags(target: HTMLElement): string[] {
  if (!target.parentElement) {
    return [];
  }
  if (target.parentElement.tagName.toLowerCase() === 'table') {
    return getAllowableTableChildInsertTags(target, 'after');
  }
  return getAllowableSiblings(target.tagName);
}

export function getAllowableInsertBeforeTemplates(target: HTMLElement): ElementTemplate[] {
  if (!target.parentElement) {
    return [];
  }
  return getElementTemplatesForTags(
    getAllowableInsertBeforeTags(target),
    'insertInside',
    target.parentElement.tagName
  );
}

export function getAllowableInsertAfterTemplates(target: HTMLElement): ElementTemplate[] {
  if (!target.parentElement) {
    return [];
  }
  return getElementTemplatesForTags(
    getAllowableInsertAfterTags(target),
    'insertInside',
    target.parentElement.tagName
  );
}

export function getAllowableChildTemplates(tagName: string): ElementTemplate[] {
  return getElementTemplatesForTags(getAllowableChildTags(tagName), 'appendInside', tagName);
}
