// @vitest-environment jsdom
import { Controller, type MenuItem } from '@oneput/oneput';
import { appObjectActor } from '@oneput/oneput/shared/declarative/appObjectActor.js';
import { waitForState } from '@oneput/oneput/shared/test/index.js';
import type { FChildParams } from '@oneput/oneput';
import { afterEach, describe, expect, it } from 'vitest';
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

/** The preview row's formula child. */
function preview(ctl: Controller) {
  return row(ctl, 'katex-preview')?.children?.[0] as FChildParams | undefined;
}

/** The value that the display mode row shows: Off or On. */
function modeShown(ctl: Controller) {
  const shown = JSON.stringify(row(ctl, 'katex-display-mode') ?? null);
  return shown.includes('"textContent":"On"')
    ? 'On'
    : shown.includes('"textContent":"Off"')
      ? 'Off'
      : undefined;
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

/** Run the KaTeX machine as an AppObject, with a page root to insert into. */
async function runKatex() {
  const ctl = Controller.createNull({ menuOpen: true });
  controllers.push(ctl);
  ctl.app.run({ layout: { layout: Layout.create, params: {} } });
  const page = document.createElement('div');
  const actor = createActor(createKatexMachine(DemoDocument.createNull(page)));
  const shown = viewShows(
    ctl,
    'the empty preview',
    () => preview(ctl)?.textContent === '(preview)'
  );
  ctl.app.run(appObjectActor(ctl, actor, createContent(), viewLayouts));
  await shown;
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
    const on = viewShows(ctl, 'display mode on', () => modeShown(ctl) === 'On');
    ctl.simulateMenuItemClick('katex-display-mode');
    await on;
    const off = viewShows(ctl, 'display mode off', () => modeShown(ctl) === 'Off');

    // act
    await ctl.simulateKey('d', mod);
    await off;

    // assert
    expect(modeShown(ctl)).toBe('Off');
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
