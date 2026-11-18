import { describe, expect, test } from 'vitest';
import { ChevronDown, icons as lucideIcons } from 'lucide';
import {
  checkIconGeometry,
  registerIcon,
  registerIcons,
  renderIcon,
  type IconDefinition
} from './icons.js';

describe('icon DOM', () => {
  test('registered Lucide geometry', () => {
    // arrange
    const target = document.createElement('div');
    target.textContent = 'old';
    const icons = registerIcons({ TestChevron: ChevronDown });

    // act
    renderIcon(icons.TestChevron, target);

    // assert
    expect(icons).toEqual({ TestChevron: 'TestChevron' });
    expect(target.childNodes).toHaveLength(1);
    expect(target.firstElementChild?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(target.querySelector('path')?.getAttribute('d')).toBe(ChevronDown[0][1].d);
    expect(target.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(target.querySelector('svg')?.getAttribute('stroke')).toBe('currentColor');
  });

  test('all bundled Lucide data fits the contract', () => {
    // arrange
    const refused: string[] = [];

    // act
    for (const [name, data] of Object.entries(lucideIcons)) {
      if (checkIconGeometry(data).isErr()) refused.push(name);
    }

    // assert
    expect(refused).toEqual([]);
  });

  test.each(
    [
      'unknown-icon',
      '<svg onload="bad()"/>',
      [['foreignObject', {}]],
      [['path', { onload: 'bad()' }]],
      () => document.createElement('script')
    ].map((input) => ({ input }))
  )('fixed fallback: $input', ({ input }) => {
    // arrange
    const target = document.createElement('div');
    target.appendChild(document.createElement('span'));

    // act
    renderIcon(input as unknown as IconDefinition, target);

    // assert
    expect(target.children).toHaveLength(1);
    expect(Array.from(target.querySelector('svg')!.children, (node) => node.tagName)).toEqual([
      'rect',
      'line'
    ]);
    expect(target.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(target.querySelector('[onload], foreignObject, script, span')).toBeNull();
  });

  test('direct geometry replaces prior icon', () => {
    // arrange
    const target = document.createElement('div');
    renderIcon('missing', target);

    // act
    renderIcon({ viewBox: [0, 0, 48, 48], nodes: [['circle', { r: 4 }]] }, target);

    // assert
    expect(target.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 48 48');
    expect(target.querySelector('circle')?.getAttribute('r')).toBe('4');
    expect(target.querySelector('rect')).toBeNull();
  });

  test('registration copies data and refusal replaces a previous registration', () => {
    // arrange
    const target = document.createElement('div');
    const data: IconDefinition = [['circle', { r: 4 }]];
    registerIcon('ReplaceTest', data);
    (data[0][1] as Record<string, number>).r = 99;
    renderIcon('ReplaceTest', target);
    const registeredRadius = target.querySelector('circle')?.getAttribute('r');

    // act
    const refused = registerIcon('ReplaceTest', '<svg/>' as unknown as IconDefinition);
    renderIcon('ReplaceTest', target);

    // assert
    expect(registeredRadius).toBe('4');
    expect(refused.isErr()).toBe(true);
    expect(target.querySelector('circle')).toBeNull();
    expect(target.querySelector('rect')).not.toBeNull();
  });

  // @ts-expect-error SVG strings are not icon data.
  registerIcon('TypeRefusal', '<svg/>');
  // @ts-expect-error Executable renderers are not icon data.
  registerIcon('FactoryRefusal', () => document.createElement('svg'));
});
