import { describe, expect, test } from 'vitest';
import {
  getAllowableChildOptions,
  getAllowableInsertAfterTags,
  getAllowableInsertAfterOptions,
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

describe('element insert options', () => {
  test('thead appends heading rows', () => {
    expect(ids(getAllowableChildOptions('thead'))).toEqual(['tr-heading']);
  });

  test('tbody appends cell rows', () => {
    expect(ids(getAllowableChildOptions('tbody'))).toEqual(['tr-cell']);
  });

  test('tfoot appends cell rows', () => {
    expect(ids(getAllowableChildOptions('tfoot'))).toEqual(['tr-cell']);
  });

  test('phrasing parent append includes bare leaf options', () => {
    expect(ids(getAllowableChildOptions('span'))).toContain('br');
  });

  test('tr sibling inside thead uses heading rows', () => {
    expect(ids(getAllowableInsertAfterOptions(childIn('thead', 'tr')))).toEqual(['tr-heading']);
  });

  test('tr sibling inside tbody uses cell rows', () => {
    expect(ids(getAllowableInsertAfterOptions(childIn('tbody', 'tr')))).toEqual(['tr-cell']);
  });

  test('detached target has no sibling options', () => {
    expect(ids(getAllowableInsertAfterOptions(document.createElement('tr')))).toEqual([]);
  });

  test('tbody can insert table footer after it', () => {
    const tbody = tableChild('tbody');

    expect(getAllowableInsertAfterTags(tbody)).toEqual(['tbody', 'tfoot', 'tr']);
    expect(ids(getAllowableInsertAfterOptions(tbody))).toContain('tfoot');
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
