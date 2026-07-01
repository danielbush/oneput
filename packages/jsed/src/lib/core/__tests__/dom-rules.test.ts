import { describe, expect, test } from 'vitest';
import {
  getAllowableChildTemplates,
  getAllowableInsertAfterTags,
  getAllowableInsertAfterTemplates,
  getAllowableInsertBeforeTags
} from '../dom-rules';

function ids(items: Array<{ id: string }>): string[] {
  return items.map((item) => item.id);
}

function childIn(parentTagName: string, childTagName: string): HTMLElement {
  const parent = document.createElement(parentTagName);
  const child = document.createElement(childTagName);
  parent.appendChild(child);
  return child;
}

function tableChild(...tagNames: string[]): HTMLElement {
  const table = document.createElement('table');
  const children = tagNames.map((tagName) => document.createElement(tagName));
  for (const child of children) {
    table.appendChild(child);
  }
  return children[Math.floor(children.length / 2)];
}

describe('element templates', () => {
  test('thead appends heading rows', () => {
    expect(ids(getAllowableChildTemplates('thead'))).toEqual(['tr-heading']);
  });

  test('tbody appends cell rows', () => {
    expect(ids(getAllowableChildTemplates('tbody'))).toEqual(['tr-cell']);
  });

  test('tfoot appends cell rows', () => {
    expect(ids(getAllowableChildTemplates('tfoot'))).toEqual(['tr-cell']);
  });

  test('tr sibling inside thead uses heading rows', () => {
    expect(ids(getAllowableInsertAfterTemplates(childIn('thead', 'tr')))).toEqual(['tr-heading']);
  });

  test('tr sibling inside tbody uses cell rows', () => {
    expect(ids(getAllowableInsertAfterTemplates(childIn('tbody', 'tr')))).toEqual(['tr-cell']);
  });

  test('detached target has no sibling templates', () => {
    expect(ids(getAllowableInsertAfterTemplates(document.createElement('tr')))).toEqual([]);
  });

  test('tbody can insert table footer after it', () => {
    const tbody = tableChild('tbody');

    expect(getAllowableInsertAfterTags(tbody)).toEqual(['tbody', 'tfoot', 'tr']);
    expect(ids(getAllowableInsertAfterTemplates(tbody))).toContain('tfoot');
  });

  test('tbody can insert table header before it when missing', () => {
    const tbody = tableChild('tbody');

    expect(getAllowableInsertBeforeTags(tbody)).toEqual(['thead', 'tbody', 'tr']);
  });

  test('tbody does not offer duplicate table header or footer', () => {
    const tbody = tableChild('thead', 'tbody', 'tfoot');

    expect(getAllowableInsertBeforeTags(tbody)).toEqual(['tbody', 'tr']);
    expect(getAllowableInsertAfterTags(tbody)).toEqual(['tbody', 'tr']);
  });
});
