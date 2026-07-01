// https://developer.mozilla.org/en-US/docs/Web/HTML/Content_categories
export const LEAF = ['br', 'hr', 'img'];

export const PHRASING_CONTENT = [
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

export const FLOW_CONTENT = [
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

export function isLeaf(tagName: string): boolean {
  return LEAF.includes(tagName);
}

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
