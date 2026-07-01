import type { JsedDocument } from '../../types.js';

export type ElementSpec = {
  tagName: string;
  children?: ElementSpec[];
};

export type ElementTemplate = {
  id: string;
  label: string;
  spec: ElementSpec;
  placement?: {
    appendInside?: string[];
    insertInside?: string[];
  };
};

// https://developer.mozilla.org/en-US/docs/Web/HTML/Content_categories
const LEAF = ['br', 'hr', 'img'];
const PHRASING_CONTENT = [
  'b',
  'i',
  'em',
  'strong',
  'code',
  'span',
  'sub',
  'sup',
  'dfn',
  'abbr',
  's',
  'a',
  'cite'
];
const FLOW_CONTENT = [
  'div',
  'p',
  'blockquote',
  'pre',
  //
  'section',
  'article',
  'aside',
  'nav',
  //
  'header',
  'footer',
  //
  'hgroup',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  //
  'ul',
  'ol',
  //
  'table'
];

const ALLOWED_CHILD_TAGS: { [tagName: string]: string[] } = {
  div: [...FLOW_CONTENT, ...PHRASING_CONTENT],
  p: [...PHRASING_CONTENT],
  blockquote: [...PHRASING_CONTENT],
  pre: ['code'],
  //
  body: [...FLOW_CONTENT],
  main: [...FLOW_CONTENT],
  //
  section: [...FLOW_CONTENT, ...PHRASING_CONTENT],
  article: [...FLOW_CONTENT, ...PHRASING_CONTENT],
  aside: [...FLOW_CONTENT, ...PHRASING_CONTENT],
  nav: [...FLOW_CONTENT, ...PHRASING_CONTENT],
  //
  header: [...FLOW_CONTENT],
  footer: [...FLOW_CONTENT],
  //
  hgroup: [...FLOW_CONTENT, ...PHRASING_CONTENT],
  h1: [...PHRASING_CONTENT],
  h2: [...PHRASING_CONTENT],
  h3: [...PHRASING_CONTENT],
  h4: [...PHRASING_CONTENT],
  h5: [...PHRASING_CONTENT],
  h6: [...PHRASING_CONTENT],
  //
  ul: ['li'],
  ol: ['li'],
  li: [...FLOW_CONTENT, ...PHRASING_CONTENT],
  //
  table: ['thead', 'tbody', 'tfoot', 'tr'],
  thead: ['tr'],
  tbody: ['tr'],
  tfoot: ['tr'],
  tr: ['th', 'td'],
  th: [...PHRASING_CONTENT],
  td: [...PHRASING_CONTENT, ...FLOW_CONTENT]
};

/**
 * Return contextless child tags that can be inserted.
 *
 * eg Doesn't take into account if table already has a thead.
 */
export function getAllowableChildTags(tagName: string): string[] {
  const parentTag = tagName.toLowerCase();
  if (isLeaf(tagName)) {
    return [];
  }
  if (PHRASING_CONTENT.includes(parentTag)) {
    return [...PHRASING_CONTENT, ...LEAF];
  }
  if (parentTag in ALLOWED_CHILD_TAGS) {
    return ALLOWED_CHILD_TAGS[parentTag];
  }
  return [];
}

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
function getAllowableSiblings(tagName: string): string[] {
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

function isValidElementSpec(spec: ElementSpec): boolean {
  for (const child of spec.children ?? []) {
    if (!getAllowableChildTags(spec.tagName).includes(child.tagName.toLowerCase())) {
      return false;
    }
    if (!isValidElementSpec(child)) {
      return false;
    }
  }
  return true;
}

function defineElementTemplate(template: ElementTemplate): ElementTemplate {
  if (!isValidElementSpec(template.spec)) {
    throw new Error(`Invalid element template: ${template.id}`);
  }
  return template;
}

const DEFAULT_TEMPLATES: ElementTemplate[] = [
  ...FLOW_CONTENT.filter((tagName) => !['ul', 'ol', 'table'].includes(tagName)).map((tagName) =>
    defineElementTemplate({
      id: tagName,
      label: `<${tagName}>`,
      spec: { tagName }
    })
  ),
  ...PHRASING_CONTENT.map((tagName) =>
    defineElementTemplate({
      id: tagName,
      label: `<${tagName}>`,
      spec: { tagName }
    })
  ),
  defineElementTemplate({
    id: 'ul',
    label: 'List',
    spec: { tagName: 'ul', children: [{ tagName: 'li' }] }
  }),
  defineElementTemplate({
    id: 'ul-paragraph',
    label: 'List with paragraph',
    spec: { tagName: 'ul', children: [{ tagName: 'li', children: [{ tagName: 'p' }] }] }
  }),
  defineElementTemplate({
    id: 'ol',
    label: 'Numbered list',
    spec: { tagName: 'ol', children: [{ tagName: 'li' }] }
  }),
  defineElementTemplate({
    id: 'ol-paragraph',
    label: 'Numbered list with paragraph',
    spec: { tagName: 'ol', children: [{ tagName: 'li', children: [{ tagName: 'p' }] }] }
  }),
  defineElementTemplate({
    id: 'li',
    label: 'list item - <li>',
    spec: { tagName: 'li' }
  }),
  defineElementTemplate({
    id: 'table-body-cell',
    label: 'Table with body',
    spec: {
      tagName: 'table',
      children: [
        {
          tagName: 'tbody',
          children: [{ tagName: 'tr', children: [{ tagName: 'td' }, { tagName: 'td' }] }]
        }
      ]
    }
  }),
  defineElementTemplate({
    id: 'table-head-body',
    label: 'Table with head and body',
    spec: {
      tagName: 'table',
      children: [
        {
          tagName: 'thead',
          children: [{ tagName: 'tr', children: [{ tagName: 'th' }, { tagName: 'th' }] }]
        },
        {
          tagName: 'tbody',
          children: [{ tagName: 'tr', children: [{ tagName: 'td' }, { tagName: 'td' }] }]
        }
      ]
    }
  }),
  defineElementTemplate({
    id: 'thead',
    label: 'Table header',
    spec: { tagName: 'thead', children: [{ tagName: 'tr', children: [{ tagName: 'th' }] }] }
  }),
  defineElementTemplate({
    id: 'tbody',
    label: 'Table body',
    spec: { tagName: 'tbody', children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }] }
  }),
  defineElementTemplate({
    id: 'tfoot',
    label: 'Table footer',
    spec: { tagName: 'tfoot', children: [{ tagName: 'tr', children: [{ tagName: 'td' }] }] }
  }),
  defineElementTemplate({
    id: 'tr-cell',
    label: 'Table row with cell',
    spec: { tagName: 'tr', children: [{ tagName: 'td' }] },
    placement: {
      appendInside: ['table', 'tbody', 'tfoot'],
      insertInside: ['table', 'tbody', 'tfoot']
    }
  }),
  defineElementTemplate({
    id: 'tr-heading',
    label: 'Table row with heading',
    spec: { tagName: 'tr', children: [{ tagName: 'th' }] },
    placement: {
      appendInside: ['thead'],
      insertInside: ['thead']
    }
  }),
  defineElementTemplate({
    id: 'td',
    label: '<td>',
    spec: { tagName: 'td' }
  }),
  defineElementTemplate({
    id: 'th',
    label: '<th>',
    spec: { tagName: 'th' }
  })
];

function isLeaf(tagName: string): boolean {
  return LEAF.includes(tagName);
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

function isValidTableChildSequence(tagNames: string[]): boolean {
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
  //
  // Example: existingTags=[tbody], candidate=tfoot, insertionIndex=1
  // produces candidateTags=[tbody, tfoot], which is valid.
  //
  // Example: existingTags=[tbody], candidate=thead, insertionIndex=1
  // produces candidateTags=[tbody, thead], which is invalid.

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

function getTemplatesForTags(
  tagNames: string[],
  placement: keyof NonNullable<ElementTemplate['placement']>,
  contextTagName: string
): ElementTemplate[] {
  const allowed = new Set(tagNames.map((tagName) => tagName.toLowerCase()));
  const context = contextTagName.toLowerCase();
  return DEFAULT_TEMPLATES.filter((template) => {
    if (!allowed.has(template.spec.tagName.toLowerCase())) {
      return false;
    }
    const allowedContexts = template.placement?.[placement];
    if (!allowedContexts) {
      return true;
    }
    return allowedContexts.includes(context);
  });
}

export function getAllowableInsertBeforeTemplates(target: HTMLElement): ElementTemplate[] {
  if (!target.parentElement) {
    return [];
  }
  return getTemplatesForTags(
    getAllowableInsertBeforeTags(target),
    'insertInside',
    target.parentElement.tagName
  );
}

export function getAllowableInsertAfterTemplates(target: HTMLElement): ElementTemplate[] {
  if (!target.parentElement) {
    return [];
  }
  return getTemplatesForTags(
    getAllowableInsertAfterTags(target),
    'insertInside',
    target.parentElement.tagName
  );
}

export function getAllowableChildTemplates(tagName: string): ElementTemplate[] {
  return getTemplatesForTags(getAllowableChildTags(tagName), 'appendInside', tagName);
}

/**
 * Return true if newly created tagName should have an ANCHOR.
 */
export function canCreateWithAnchor(tagName: string): boolean {
  tagName = tagName.toLowerCase();
  if (PHRASING_CONTENT.includes(tagName)) {
    return true;
  }
  if (['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
    return true;
  }
  return false;
}

export function canDelete(el: HTMLElement, doc: JsedDocument): boolean {
  if (el === doc.root) {
    return false;
  }
  if (el === doc.document.body) {
    return false;
  }
  if (el.contains(doc.document.body)) {
    return false;
  }
  return true;
}

export function getConversionCandidates(_el: HTMLElement): string[] {
  return ['p', 'div', 'section'];
}

export function getWrapCandidates(): string[] {
  return ['em', 'strong', 'i', 'b'];
}
