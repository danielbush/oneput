import { afterEach, describe, expect, test } from 'vitest';
import { Controller } from '../../../controllers/controller.js';
import { walk } from '../../../lib/utils.js';
import type { FChildParams, FlexParams } from '../../../types.js';
import { StandardLayout, type StandardLayoutParams } from './StandardLayout.js';

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

describe('inputTextArea', () => {
  test('rows - in inputUI', () => {
    // arrange
    const layout = createLayout({ inputTextArea: { rows: 5 } });

    // act
    const { textArea } = layout.inputUI;

    // assert
    expect(textArea).toEqual({ rows: 5 });
  });

  test('replace without it - removed', () => {
    // arrange
    const layout = createLayout({ inputTextArea: { rows: 5 } });

    // act
    layout.configure({ params: { menuTitle: 'Next' }, replace: true });

    // assert
    expect(layout.inputUI.textArea).toBeUndefined();
  });

  test('merge without it - kept', () => {
    // arrange
    const layout = createLayout({ inputTextArea: { rows: 5 } });

    // act
    layout.configure({ params: { menuTitle: 'Same app' } });

    // assert
    expect(layout.inputUI.textArea).toEqual({ rows: 5 });
  });
});

describe('Back button', () => {
  function backButton(ctl: Controller) {
    const layout = StandardLayout.create(ctl, {}, icons);
    let found: FChildParams | undefined;
    walk(layout.menuUI.layoutHeader as FlexParams, (child) => {
      if (child.type === 'fchild' && child.attr?.title === 'Back') found = child as FChildParams;
    });
    return found;
  }

  function nullController() {
    const ctl = Controller.createNull();
    controllers.push(ctl);
    return ctl;
  }

  test('root, no back level - hidden', () => {
    // arrange
    const ctl = nullController();
    ctl.app.run({});

    // act
    const button = backButton(ctl);

    // assert
    expect(button).toBeUndefined();
  });

  test('child - shown', () => {
    // arrange
    const ctl = nullController();
    ctl.app.run({});
    ctl.app.run({});

    // act
    const button = backButton(ctl);

    // assert
    expect(button).toBeDefined();
  });

  test('root, hasBackLevel - shown', () => {
    // arrange
    const ctl = nullController();
    ctl.app.run({ hasBackLevel: () => true });

    // act
    const button = backButton(ctl);

    // assert
    expect(button).toBeDefined();
  });
});
