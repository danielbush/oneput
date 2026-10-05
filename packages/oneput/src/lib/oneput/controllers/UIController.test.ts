import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from './controller.js';
import { walk } from '../lib/utils.js';
import type { FChildParams, FlexParams } from '../types.js';
import { StandardLayout } from '../shared/ui/layout/StandardLayout.js';

const icons = {
  Close: 'x',
  Accept: 'check',
  Reject: 'x',
  Send: 'send',
  Back: 'left',
  MenuToggle: 'down'
};

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl.destroy();
  controllers.length = 0;
});

function createNull() {
  const ctl = Controller.createNull();
  controllers.push(ctl);
  ctl.ui.setLayout(StandardLayout.create(ctl, {}, icons));
  return ctl;
}

function sendDisabled(ctl: Controller) {
  let found: FChildParams | undefined;
  walk(ctl.currentProps.inputUI?.right as FlexParams, (child) => {
    if (child.type === 'fchild' && child.attr?.title === 'Send') found = child as FChildParams;
  });
  if (!found) throw new Error('no Send button');
  return found.attr?.disabled;
}

describe('invalidate', () => {
  test('enabled changed - shown after invalidate', () => {
    // arrange
    const ctl = createNull();
    let enabled = false;
    ctl.ui.update({ params: { inputSend: { run: () => {}, enabled: () => enabled } } });

    // act
    enabled = true;
    ctl.ui.invalidate();

    // assert
    expect(sendDisabled(ctl)).toBe(false);
  });

  test('keeps params', () => {
    // arrange
    const ctl = createNull();
    ctl.ui.update({ params: { inputTextArea: { rows: 5 } } });

    // act
    ctl.ui.invalidate();

    // assert
    expect(ctl.currentProps.inputUI?.textArea).toEqual({ rows: 5 });
  });

  test('writes over setInputUI', () => {
    // arrange
    const ctl = createNull();
    ctl.ui.update({});
    ctl.ui.setInputUI((current) => ({ ...current, textArea: { rows: 5 } }));

    // act
    ctl.ui.invalidate();

    // assert
    expect(ctl.currentProps.inputUI?.textArea).toBeUndefined();
  });
});
