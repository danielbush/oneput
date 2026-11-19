// @vitest-environment jsdom
import { Controller, type FChildParams, type FlexChildren, type MenuItemAny } from '@oneput/oneput';
import { isSafeHtml } from '@oneput/safe-html';
import { describe, expect, it } from 'vitest';
import { createActor } from 'xstate';
import { DemoDocument } from '../../main/FormulaMarkup.js';
import type { OneputView } from '../interpreter.js';
import { createKatexAppObject } from './appObject.js';
import { createKatexMachine } from './machine.js';

function leaves(children: FlexChildren = []): FChildParams[] {
  return children.flatMap((child) =>
    !child ? [] : child.type === 'fchild' ? [child] : leaves(child.children)
  );
}

function content(children?: FlexChildren) {
  return leaves(children).map((child) => child.htmlContent ?? child.textContent ?? '');
}

describe('KaTeX AppObject', () => {
  it('keeps the preview and menu through a bad edit, then inserts the corrected formula', async () => {
    // arrange
    const ctl = Controller.createNull();
    const page = document.createElement('div');
    let view: OneputView | undefined;
    const app = createKatexAppObject(
      ctl,
      (_, next) => {
        view = next;
      },
      DemoDocument.createNull(page)
    );
    ctl.app.run(app);
    await Promise.resolve();
    const rows = () => view?.menu.items.filter((row): row is MenuItemAny => Boolean(row)) ?? [];
    const checkboxRow = rows().find(({ id }) => id === 'katex-display-mode-checkbox');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    const unmount = leaves(checkboxRow?.children)
      .find(({ tag }) => tag === 'input')
      ?.onMount?.(checkbox, { pull: ctl.pull });
    const actions = typeof app.actions === 'function' ? app.actions() : app.actions;

    // act
    app.onInputChange?.({ value: String.raw`\frac{a}{b}` });
    await Promise.resolve();

    // assert
    const accepted = rows()[0];
    const preview = content(accepted?.children).find(isSafeHtml);
    expect(preview).toBeDefined();
    expect(view?.layout.input).toEqual({ kind: 'textarea', rows: 5 });
    expect(view?.layout.inputSend?.enabled?.()).toBe(true);
    const rowIds = rows().map(({ id }) => id);

    // act
    app.onInputChange?.({ value: String.raw`\frac{` });
    await Promise.resolve();

    // assert
    expect(rows().map(({ id }) => id)).toEqual(rowIds);
    expect(view?.menu.focusBehaviour).toBe('none');
    expect(content(rows()[0]?.children)).toContain(preview);
    expect(content(rows()[0]?.children)).toContainEqual(expect.stringContaining('Invalid katex:'));
    const insert = rows().find(({ id }) => id === 'katex-insert');
    expect(insert?.action).toBeUndefined();
    expect(insert?.attr).toMatchObject({ 'aria-disabled': 'true' });
    expect(view?.layout.inputSend?.enabled?.()).toBe(false);
    expect(page.childNodes).toHaveLength(0);

    // act
    app.onInputChange?.({ value: String.raw`\frac{a}{b}` });
    await Promise.resolve();
    actions?.TOGGLE_DISPLAY_MODE?.action(ctl);
    view?.layout.inputSend?.run();
    await Promise.resolve();

    // assert
    expect(page.querySelector('.katex-display annotation')?.textContent).toBe(
      String.raw`\frac{a}{b}`
    );
    expect(checkbox.checked).toBe(true);
    expect(view?.input).toMatchObject({ value: '' });
    expect(content(rows()[0]?.children)).toContain('(preview)');
    expect(view?.layout.inputSend?.enabled?.()).toBe(false);
    unmount?.();
    ctl.app.exit();
  });

  it('rejects over-limit input and a sanitiser refusal until the next edit', () => {
    // arrange
    const page = document.createElement('div');
    const doc = DemoDocument.createNull(page, {
      sanitiseErrors: [new Error('Math policy refused output.')]
    });
    const actor = createActor(createKatexMachine(doc)).start();

    // act
    actor.send({ type: 'INPUT_CHANGED', value: 'x'.repeat(4097) });
    const overLimit = actor.getSnapshot();
    actor.send({ type: 'INPUT_CHANGED', value: 'x' });
    const refused = actor.getSnapshot();
    actor.send({ type: 'INSERT_FORMULA' });

    // assert
    expect(overLimit.context.error).toBe('Formula source is too large.');
    expect(refused.context.error).toBe('Math policy refused output.');
    expect(refused.context.preview).toBeNull();
    expect(page.childNodes).toHaveLength(0);

    // act
    actor.send({ type: 'INPUT_CHANGED', value: 'y' });

    // assert
    expect(actor.getSnapshot().matches({ ready: 'previewing' })).toBe(true);
    expect(isSafeHtml(actor.getSnapshot().context.preview)).toBe(true);
    actor.stop();
  });
});
