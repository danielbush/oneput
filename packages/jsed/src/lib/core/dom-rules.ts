import type { JsedDocument } from '../../types.js';

export type ElementSpec = {
  tagName: string;
  children?: ElementSpec[];
};

export type ElementTemplate = {
  id: string;
  label: string;
  spec: ElementSpec;
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

const RULES: { [tagName: string]: string[] } = {
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
  ...FLOW_CONTENT.filter((tagName) => !['ul', 'ol', 'table'].includes(tagName)).map((tagName) => ({
    id: tagName,
    label: `<${tagName}>`,
    spec: { tagName }
  })),
  ...PHRASING_CONTENT.map((tagName) => ({
    id: tagName,
    label: `<${tagName}>`,
    spec: { tagName }
  })),
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
  {
    id: 'li',
    label: 'list item - <li>',
    spec: { tagName: 'li' }
  },
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
    spec: { tagName: 'tr', children: [{ tagName: 'td' }] }
  }),
  defineElementTemplate({
    id: 'tr-heading',
    label: 'Table row with heading',
    spec: { tagName: 'tr', children: [{ tagName: 'th' }] }
  }),
  {
    id: 'td',
    label: '<td>',
    spec: { tagName: 'td' }
  },
  {
    id: 'th',
    label: '<th>',
    spec: { tagName: 'th' }
  }
];

function isLeaf(tagName: string): boolean {
  return LEAF.includes(tagName);
}

export function getAllowableInsertBeforeTags(tagName: string): string[] {
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

export function getAllowableInsertAfterTags(tagName: string): string[] {
  return getAllowableInsertBeforeTags(tagName);
}

export function getAllowableChildTags(tagName: string): string[] {
  const parentTag = tagName.toLowerCase();
  if (isLeaf(tagName)) {
    return [];
  }
  if (PHRASING_CONTENT.includes(parentTag)) {
    return [...PHRASING_CONTENT, ...LEAF];
  }
  if (parentTag in RULES) {
    return RULES[parentTag];
  }
  return [];
}

function getTemplatesForTags(tagNames: string[]): ElementTemplate[] {
  const allowed = new Set(tagNames.map((tagName) => tagName.toLowerCase()));
  return DEFAULT_TEMPLATES.filter((template) => allowed.has(template.spec.tagName.toLowerCase()));
}

export function getAllowableInsertBeforeTemplates(tagName: string): ElementTemplate[] {
  return getTemplatesForTags(getAllowableInsertBeforeTags(tagName));
}

export function getAllowableInsertAfterTemplates(tagName: string): ElementTemplate[] {
  return getTemplatesForTags(getAllowableInsertAfterTags(tagName));
}

export function getAllowableChildTemplates(tagName: string): ElementTemplate[] {
  return getTemplatesForTags(getAllowableChildTags(tagName));
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

/**
 * Some tags are structurally incomplete on their own and need a default child
 * when freshly created — e.g. a `ul`/`ol` needs an `li` to be editable, a
 * `table` needs a `tr`. Returns the default child tag name, or null.
 */
export function getRequiredChildTag(tagName: string): string | null {
  switch (tagName.toLowerCase()) {
    case 'ul':
    case 'ol':
      return 'li';
    default:
      return null;
  }
}

export function getConversionCandidates(_el: HTMLElement): string[] {
  return ['p', 'div', 'section'];
}

export function getWrapCandidates(): string[] {
  return ['em', 'strong', 'i', 'b'];
}
