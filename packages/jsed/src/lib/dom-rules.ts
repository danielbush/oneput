import type { JsedDocument } from '../types.js';

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
  tr: ['th', 'td'],
  th: [...PHRASING_CONTENT],
  td: [...PHRASING_CONTENT, ...FLOW_CONTENT]
};

function isLeaf(tagName: string): boolean {
  return LEAF.includes(tagName);
}

function getAllowedChildTags(tagName: string): string[] {
  const ltagname = tagName.toLowerCase();
  if (isLeaf(tagName)) {
    return [];
  }
  // Exclude leaf phrasing in the test for ltagname but include in the output:
  if (PHRASING_CONTENT.includes(ltagname)) {
    return [...PHRASING_CONTENT, ...LEAF].filter((t) => t !== ltagname);
  }
  if (ltagname in RULES) {
    return RULES[ltagname];
  }
  return [];
}

export function getAllowableChildTags(tagName: string): string[] {
  const ltagname = tagName.toLowerCase();
  return getAllowedChildTags(tagName).filter((t) => t !== ltagname);
}

export function canContainChildTag(parentTagName: string, childTagName: string): boolean {
  return getAllowedChildTags(parentTagName).includes(childTagName.toLowerCase());
}

export function getDefaultInsertChildTag(tagName: string): string | null {
  const ltagname = tagName.toLowerCase();
  const allowed = getAllowedChildTags(ltagname);
  if (allowed.length === 0) {
    return null;
  }

  if (allowed.includes(ltagname)) {
    return ltagname;
  }

  if (allowed.length === 1) {
    return allowed[0] ?? null;
  }

  return null;
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
 * TODO: we could look at parent node to determine what is valid eg ul -> li etc
 */
export function getConversionCandidates(_el: HTMLElement): string[] {
  return ['p', 'div', 'section'];
}
