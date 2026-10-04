import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { walk } from '../../../lib/utils.js';
import type { FChildParams, FlexParams } from '../../../types.js';
import { StandardLayout, type StandardLayoutParams } from './StandardLayout.js';

const icons = {
  X: 'x',
  Check: 'check',
  SendHorizontal: 'send',
  ArrowLeft: 'left',
  ChevronDown: 'down'
};

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl.destroy();
  controllers.length = 0;
});

function createLayout(params: StandardLayoutParams) {
  const ctl = Controller.createNull();
  controllers.push(ctl);
  return StandardLayout.create(ctl, params, icons);
}

function findButton(layout: StandardLayout, title: string): FChildParams {
  let found: FChildParams | undefined;
  walk(layout.inputUI.right as FlexParams, (child) => {
    if (child.type === 'fchild' && child.attr?.title === title) found = child as FChildParams;
  });
  if (!found) throw new Error(`no button with title ${title}`);
  return found;
}

describe('inputSend / inputAccept / inputReject: enabled', () => {
  test('enabled: omitted - button enabled', () => {
    // arrange
    const layout = createLayout({ inputSend: { run: () => {} } });

    // act
    const button = findButton(layout, 'Send');

    // assert
    expect(button.attr?.disabled).toBe(false);
  });

  test('enabled: () => false - button disabled', () => {
    // arrange
    const layout = createLayout({ inputSend: { run: () => {}, enabled: () => false } });

    // act
    const button = findButton(layout, 'Send');

    // assert
    expect(button.attr?.disabled).toBe(true);
  });

  test('enabled: () => value - read again on each build', () => {
    // arrange
    let enabled = false;
    const layout = createLayout({ inputSend: { run: () => {}, enabled: () => enabled } });
    findButton(layout, 'Send');

    // act
    enabled = true;
    const button = findButton(layout, 'Send');

    // assert
    expect(button.attr?.disabled).toBe(false);
  });

  test('enabled: () => false - accept and reject disabled too', () => {
    // arrange
    const layout = createLayout({
      inputAccept: { run: () => {}, enabled: () => false },
      inputReject: { run: () => {}, enabled: () => false }
    });

    // act
    const accept = findButton(layout, 'Accept');
    const reject = findButton(layout, 'Reject');

    // assert
    expect(accept.attr?.disabled).toBe(true);
    expect(reject.attr?.disabled).toBe(true);
  });
});
