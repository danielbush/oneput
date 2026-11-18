import { expect, test } from 'vitest';
import { DOMUpdater } from './DOMUpdater.js';

test('status text cannot create elements', () => {
  // arrange
  const node = document.createElement('div');
  const status = new DOMUpdater();
  status.onMount(node);
  const selected = 'Selected: <img src=x onerror=bad> & hello';

  // act
  status.setText('Fetching data...');
  status.setText(selected);

  // assert
  expect(node.textContent).toBe(selected);
  expect(node.children).toHaveLength(0);
});
