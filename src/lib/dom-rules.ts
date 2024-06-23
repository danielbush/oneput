// https://developer.mozilla.org/en-US/docs/Web/HTML/Content_categories
const PHRASING_CONTENT = [
  'em',
  'strong',
  'code',
  'br',
  'span',
  'sub',
  'sup',
  'dfn',
  'abbr',
  's',
  'a',
  'cite',
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
  'table',
];

export const RULES = {
  div: [FLOW_CONTENT, PHRASING_CONTENT],
  p: [PHRASING_CONTENT],
  blockquote: [PHRASING_CONTENT],
  pre: ['code'],
  //
  section: [FLOW_CONTENT, PHRASING_CONTENT],
  article: [FLOW_CONTENT, PHRASING_CONTENT],
  aside: [],
  nav: [],
  //
  header: [FLOW_CONTENT],
  footer: [FLOW_CONTENT],
  //
  hgroup: [FLOW_CONTENT, PHRASING_CONTENT],
  //
  ul: ['li'],
  ol: ['li'],
  li: [FLOW_CONTENT, PHRASING_CONTENT],
  //
  table: ['thead', 'tbody', 'tfoot', 'tr'],
  tr: ['th', 'td'],
  th: [PHRASING_CONTENT],
  td: [PHRASING_CONTENT, FLOW_CONTENT],
};

/**
 * Return true if new created tagName should have an ANCHOR.
 */
export function createWithAnchor(tagName: string): boolean {
  if (PHRASING_CONTENT.includes(tagName)) {
    return true;
  }
  if (
    ['p', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(
      tagName,
    )
  ) {
    return true;
  }
  return false;
}
