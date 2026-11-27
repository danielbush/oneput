// @vitest-environment jsdom
import { Controller, type MenuItem } from '@oneput/oneput';
import { appObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import { swapInputElement, waitForState } from '@oneput/oneput/shared/test/index.js';
import type { FChildParams } from '@oneput/oneput';
import { OneputAction } from '@oneput/oneput/shared/actions/OneputAction.js';
import { afterEach, describe, expect, it } from 'vitest';
import { safeHtmlText } from '@oneput/safe-html';
import { createActor } from 'xstate';
import { Layout, viewLayouts } from '../../../common/layout.js';
import { DemoDocument } from '../../katex/katex.js';
import { createContent } from '../content.js';
import { createKatexMachine } from '../machine.js';

// tinykeys maps $mod to Meta on a mac and to Control elsewhere.
const mod = /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? { metaKey: true } : { ctrlKey: true };

const controllers: Controller[] = [];

afterEach(() => {
  for (const ctl of controllers) ctl._destroy();
  controllers.length = 0;
});

function row(ctl: Controller, id: string): MenuItem | undefined {
  return ctl.currentProps.menuItems?.find((item) => item.id === id);
}

/** Type a valid formula, so the Insert row is enabled and can get focus. */
async function typeFormula(ctl: Controller) {
  const valid = viewShows(ctl, 'a formula', () => preview(ctl)?.htmlContent !== undefined);
  await ctl.input.typeText('x');
  await valid;
}

/** The preview row's formula child. */
function preview(ctl: Controller) {
  return row(ctl, 'katex-preview')?.children?.[0] as FChildParams | undefined;
}

/** True when the display mode row's checkbox is checked. */
function modeChecked(ctl: Controller) {
  return childById(row(ctl, 'katex-display-mode'), 'katex-display-mode-input')?.attr?.checked;
}

function help(ctl: Controller) {
  return JSON.stringify(row(ctl, 'katex-instructions') ?? null);
}

/** Find the child titled `title` in a layout tree. */
function titled(node: unknown, title: string): FChildParams | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  const child = node as FChildParams & { children?: unknown };
  if (child.attr?.title === title) return child;
  const children = Array.isArray(child.children) ? child.children : [];
  for (const next of children) {
    const found = titled(next, title);
    if (found) return found;
  }
  return undefined;
}

/** Find the child with `id` in a tree. */
function childById(node: unknown, id: string): FChildParams | undefined {
  if (typeof node !== 'object' || node === null) return undefined;
  const child = node as FChildParams & { children?: unknown };
  if (child.id === id) return child;
  const children = Array.isArray(child.children) ? child.children : [];
  for (const next of children) {
    const found = childById(next, id);
    if (found) return found;
  }
  return undefined;
}

/** The text of the key hint that row `id` shows. */
function hint(ctl: Controller, id: string) {
  const html = childById(row(ctl, id), `${id}-binding-hint`)?.htmlContent;
  return html ? safeHtmlText(html) : undefined;
}

function sendDisabled(ctl: Controller) {
  return titled(ctl.currentProps.inputUI?.right, 'Send')?.attr?.disabled;
}

/** Wait until a refresh reaches `reached`. Call it before the step that leads there. */
function viewShows(ctl: Controller, name: string, reached: () => boolean) {
  return waitForState(ctl, 'set-menu-items', {
    name,
    reached,
    seen: () => `preview ${JSON.stringify(preview(ctl))}, help ${help(ctl)}`
  });
}

/** The ID of the row with menu focus. */
function focusedRow(ctl: Controller) {
  const index = ctl.currentProps.menuItemFocus?.[0] ?? -1;
  return ctl.currentProps.menuItems?.[index]?.id;
}

/** Wait until the textarea has native focus, or has lost it. */
function inputFocused(ctl: Controller, focused: boolean) {
  return waitForState(ctl, 'input-focus-change', {
    name: focused ? 'the textarea to have focus' : 'the textarea to lose focus',
    reached: () => ctl.input.isFocused === focused,
    seen: () => `focused ${ctl.input.isFocused}`
  });
}

/** Wait until the row `id` has menu focus. */
function rowFocused(ctl: Controller, id: string) {
  return waitForState(ctl, 'menu-item-focus', {
    name: `row "${id}" to have menu focus`,
    reached: () => focusedRow(ctl) === id,
    seen: () => `row "${focusedRow(ctl)}"`
  });
}

/** Press $mod+`key` (j: next, k: previous) until the row `id` has menu focus. */
async function focusByKeyboard(ctl: Controller, id: string, key: 'j' | 'k' = 'j') {
  for (let step = 0; step < 4 && focusedRow(ctl) !== id; step++) {
    await ctl.simulateKey(key, mod);
  }
}

/**
 * Run the KaTeX machine as an AppObject, with a page root to insert into. The
 * input is in the document, so it can get native focus.
 */
async function runKatex({ swapToTextarea = false } = {}) {
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  const input = ctl.currentProps.inputElement as HTMLElement;
  document.body.appendChild(input);
  ctl.onDestroy(() => input.remove());
  ctl.app.run({ layout: { layout: Layout.create, params: {} } });
  // The root menu's single-line input has focus.
  input.focus();
  const page = document.createElement('div');
  const actor = createActor(createKatexMachine(DemoDocument.createNull(page)));
  const shown = viewShows(
    ctl,
    'the empty preview',
    () => preview(ctl)?.textContent === '(preview)'
  );
  ctl.app.run(appObjectActor(ctl, actor, createContent(), viewLayouts));
  // The view sets the rows, then queues the textarea focus.
  await shown;
  if (swapToTextarea) {
    // As in a browser: the textarea replaces the focused input before the
    // queued focus runs, and the old input's removal blurs it.
    const focused = inputFocused(ctl, true);
    swapInputElement(ctl, 'textarea');
    await focused;
  }
  // Let the queued focus run, thus it cannot reach the test's steps.
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { ctl, page };
}

describe('declarative KaTeX AppObject', () => {
  it('shows a preview of valid katex and keeps it while the source is invalid', async () => {
    // arrange
    const { ctl } = await runKatex();
    const disabledAtStart = sendDisabled(ctl);
    const valid = viewShows(ctl, 'a formula', () => preview(ctl)?.htmlContent !== undefined);
    await ctl.input.typeText('x^2');
    await valid;
    const validHtml = preview(ctl)?.htmlContent;
    const insertEnabled = row(ctl, 'katex-insert')?.attr?.disabled;
    const sendEnabled = sendDisabled(ctl);
    const invalid = viewShows(ctl, 'the error', () => help(ctl).includes('Invalid katex'));

    // act
    await ctl.input.typeText('x^');
    await invalid;

    // assert
    expect(disabledAtStart).toBe(true);
    expect(insertEnabled).toBe(false);
    expect(sendEnabled).toBe(false);
    expect(validHtml).toBeDefined();
    expect(preview(ctl)?.htmlContent).toBe(validHtml);
    expect(row(ctl, 'katex-insert')?.attr?.disabled).toBe(true);
    expect(sendDisabled(ctl)).toBe(true);
  });

  it('toggles display mode from its row and from $mod+d', async () => {
    // arrange
    const { ctl } = await runKatex();
    const on = viewShows(ctl, 'display mode on', () => modeChecked(ctl) === true);
    ctl.simulateMenuItemClick('katex-display-mode');
    await on;
    const off = viewShows(ctl, 'display mode off', () => modeChecked(ctl) === false);

    // act
    await ctl.simulateKey('d', mod);
    await off;

    // assert
    expect(modeChecked(ctl)).toBe(false);
  });

  it('inserts a display formula with $mod+Enter and clears the input', async () => {
    // arrange
    const { ctl, page } = await runKatex();
    const declined = await ctl.simulateKey('Enter', mod);
    await ctl.simulateKey('d', mod);
    const valid = viewShows(ctl, 'a formula', () => preview(ctl)?.htmlContent !== undefined);
    await ctl.input.typeText('x');
    await valid;
    const cleared = viewShows(
      ctl,
      'the empty preview',
      () => preview(ctl)?.textContent === '(preview)'
    );

    // act
    const inserted = await ctl.simulateKey('Enter', mod);
    await cleared;

    // assert
    expect(declined.defaultPrevented).toBe(false);
    expect(inserted.defaultPrevented).toBe(true);
    expect(page.querySelector('.katex-display')).not.toBeNull();
    expect(page.querySelector('p')).toBeNull();
    expect(ctl.input.getInputValue()).toBe('');
  });
});

describe('declarative KaTeX focus (INPUT_ROW)', () => {
  it('keeps typing when the textarea replaces the focused input at start', async () => {
    // arrange
    const { ctl } = await runKatex({ swapToTextarea: true });
    const changes: boolean[] = [];
    ctl.input.subscribeFocusChange((focused) => changes.push(focused));

    // act
    for (let task = 0; task < 3; task++) await new Promise((resolve) => setTimeout(resolve, 0));

    // assert
    expect(changes).toEqual([]);
    expect(ctl.currentProps.inputElement?.tagName).toBe('TEXTAREA');
    expect(ctl.input.isFocused).toBe(true);
    expect(focusedRow(ctl)).toBe('katex-preview');
  });

  it('starts with the textarea and the preview row focused', async () => {
    // arrange
    const { ctl } = await runKatex();

    // assert
    expect(ctl.input.isFocused).toBe(true);
    expect(focusedRow(ctl)).toBe('katex-preview');
  });

  it('blurs the textarea on keyboard focus of Insert and focuses it again on the preview', async () => {
    // arrange
    const { ctl } = await runKatex();
    await typeFormula(ctl);
    const blurred = inputFocused(ctl, false);
    await focusByKeyboard(ctl, 'katex-insert');
    await blurred;
    const rowAfterMove = focusedRow(ctl);
    const refocused = inputFocused(ctl, true);

    // act
    await focusByKeyboard(ctl, 'katex-preview', 'k');
    await refocused;

    // assert
    expect(rowAfterMove).toBe('katex-insert');
    expect(focusedRow(ctl)).toBe('katex-preview');
    expect(ctl.input.isFocused).toBe(true);
  });

  it('moves menu focus back to the preview when the user focuses the textarea', async () => {
    // arrange
    const { ctl } = await runKatex();
    await typeFormula(ctl);
    const blurred = inputFocused(ctl, false);
    await focusByKeyboard(ctl, 'katex-insert');
    await blurred;
    const onPreview = rowFocused(ctl, 'katex-preview');

    // act
    (ctl.currentProps.inputElement as HTMLElement).focus();
    await onPreview;

    // assert
    expect(focusedRow(ctl)).toBe('katex-preview');
  });

  it('writes a newline on Enter while typing, also with Insert under the pointer', async () => {
    // arrange
    const { ctl, page } = await runKatex();
    await typeFormula(ctl);
    const index = ctl.currentProps.menuItems?.findIndex((item) => item.id === 'katex-insert');
    ctl.menu.focusMenuItemByIndex(index as number, false, 'pointer');
    const rowUnderPointer = focusedRow(ctl);

    // act
    const enter = await ctl.simulateKey('Enter');

    // assert
    expect(rowUnderPointer).toBe('katex-insert');
    expect(enter.defaultPrevented).toBe(false);
    expect(page.querySelector('.katex')).toBeNull();
  });

  it('keeps the textarea and focuses the preview after a click on Insert while typing', async () => {
    // arrange
    const { ctl, page } = await runKatex();
    await typeFormula(ctl);
    // The click moves menu focus to Insert. The insert disables the row, and
    // Oneput moves focus off a disabled row to the first row, the preview.
    const onPreview = rowFocused(ctl, 'katex-preview');

    // act
    ctl.simulateMenuItemClick('katex-insert');
    await onPreview;

    // assert
    expect(page.querySelector('.katex')).not.toBeNull();
    expect(ctl.input.isFocused).toBe(true);
    expect(focusedRow(ctl)).toBe('katex-preview');
  });

  it('focuses the textarea again after a click on Insert', async () => {
    // arrange
    const { ctl, page } = await runKatex();
    await typeFormula(ctl);
    // A click on a row blurs the textarea before the click runs the row.
    const blurred = inputFocused(ctl, false);
    (ctl.currentProps.inputElement as HTMLElement).blur();
    await blurred;
    const refocused = inputFocused(ctl, true);

    // act
    ctl.simulateMenuItemClick('katex-insert');
    await refocused;

    // assert
    expect(page.querySelector('.katex')).not.toBeNull();
    expect(ctl.input.isFocused).toBe(true);
    expect(focusedRow(ctl)).toBe('katex-preview');
  });
});

describe('declarative KaTeX key hints', () => {
  /** Wait until a menu refresh shows the Display mode key hint, or now if it does. */
  function displayModeHintShown(ctl: Controller) {
    const state = {
      name: 'the Display mode key hint',
      reached: () => hint(ctl, 'katex-display-mode') !== undefined,
      seen: () => `hint ${hint(ctl, 'katex-display-mode')}`
    };
    return state.reached() ? Promise.resolve() : waitForState(ctl, 'set-menu-items', state);
  }

  it('shows the submit and display mode keys at start', async () => {
    // arrange
    const { ctl } = await runKatex();

    // act
    // The first render reads the keys before Oneput sets $mod+d; its event redraws.
    await displayModeHintShown(ctl);

    // assert
    expect(ctl.input.getPlaceholder()).toBe('Type some katex and hit $mod+Enter...');
    expect(help(ctl)).toContain('insert it with $mod+Enter or Send');
    // $mod shows as the platform's key, Ctrl or ⌘.
    expect(hint(ctl, 'katex-insert')).toMatch(/Enter$/);
    expect(hint(ctl, 'katex-display-mode')).toMatch(/d$/);
  });

  it('shows a new submit key after a rebind, and no key when it has none', async () => {
    // arrange
    const { ctl } = await runKatex();
    await displayModeHintShown(ctl);
    const insertHint = hint(ctl, 'katex-insert');
    const defaults = ctl.keys.getDefaultBindings();
    const rebind = (bindings: string[]) =>
      ctl.keys.setDefaultBindings({
        ...defaults,
        [OneputAction.SUBMIT]: { ...defaults[OneputAction.SUBMIT], bindings }
      });
    // A rebind resets to the default keys, thus $mod+d is gone until Oneput
    // sets this app's actions again, and their event redraws.
    const placeholderShows = (text: string) =>
      viewShows(
        ctl,
        `placeholder "${text}" with the Display mode hint`,
        () => ctl.input.getPlaceholder() === text && hint(ctl, 'katex-display-mode') !== undefined
      );
    const rebound = placeholderShows('Type some katex and hit $mod+i...');

    // act
    rebind(['$mod+i']);
    await rebound;
    const atRebind = { help: help(ctl), insertHint: hint(ctl, 'katex-insert') };
    const unbound = placeholderShows('Type some katex...');
    rebind([]);
    await unbound;

    // assert
    expect(atRebind.help).toContain('insert it with $mod+i or Send');
    expect(insertHint).toMatch(/Enter$/);
    expect(atRebind.insertHint).toMatch(/i$/);
    expect(help(ctl)).toContain('insert it with Send');
    expect(hint(ctl, 'katex-insert')).toBeUndefined();
    expect(hint(ctl, 'katex-display-mode')).toMatch(/d$/);
  });
});
