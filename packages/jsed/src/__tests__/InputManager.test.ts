import { describe, expect, it } from 'vitest';
import { InputManager } from '../InputManager.js';
import { Nav } from '../Nav.js';
import { TokenCursor } from '../TokenCursor.js';
import { NullUserInput } from '../UserInput.js';
import { JSED_ANCHOR_CLASS } from '../lib/constants.js';
import { getValue, quickDescend } from '../lib/token.js';
import { byId, makeRoot, p } from '../test/util.js';

function createInputManagerFixture(params?: {
  html?: string;
  range?: [number | null, number | null];
}) {
  const doc = makeRoot(params?.html ?? p({ id: 'p1' }, 'foo'));
  const line = byId(doc, 'p1');
  const firstToken = quickDescend(line);
  if (!firstToken) {
    throw new Error('expected first token');
  }

  const nav = Nav.createNull(doc);
  const userInput = NullUserInput.createNull({ range: params?.range });
  const cursor = TokenCursor.createNull({
    document: doc,
    token: firstToken,
    onTokenChange: () => {},
    onError: () => {}
  });
  const inputManager = new InputManager(nav, cursor, userInput);

  return { doc, line, nav, cursor, userInput, inputManager };
}

describe('InputManager', () => {
  it('deletes the current TOKEN when the input is cleared', async () => {
    // arrange
    const { inputManager, line } = createInputManagerFixture();

    // act
    await inputManager.handleInputChange('');

    // assert
    expect(line.querySelectorAll('.jsed-token')).toHaveLength(1);
    expect(line.querySelector(`.${JSED_ANCHOR_CLASS}`)).not.toBeNull();
  });

  it('keeps the TOKEN value and writes a trailing space into the INPUT for whitespace-only input', async () => {
    // arrange
    const { inputManager, cursor, userInput } = createInputManagerFixture();

    // act
    await inputManager.handleInputChange(' ');

    // assert
    expect(getValue(cursor.getToken())).toBe('foo');
    expect(userInput.getInputValue()).toBe('foo ');
    expect(userInput.trackEvents().data).toEqual([{ type: 'set-input-value', value: 'foo ' }]);
  });

  it('keeps the CURSOR on the first TOKEN when the selection ends on the first word boundary', async () => {
    // arrange
    const { inputManager, cursor, userInput, line } = createInputManagerFixture({
      html: p({ id: 'p1' }, 'foo'),
      range: [null, 3]
    });

    // act
    await inputManager.handleInputChange('foo bar baz');

    // assert
    expect(
      Array.from(line.querySelectorAll('.jsed-token')).map((token) => token.textContent)
    ).toEqual(['foo', 'bar', 'baz']);
    expect(getValue(cursor.getToken())).toBe('foo');
    expect(userInput.getInputValue()).toBe('foo');
    expect(userInput.trackEvents().data).toEqual([
      { type: 'set-input-value', value: 'foo bar baz' },
      { type: 'focus' },
      { type: 'set-input-value', value: 'foo' },
      { type: 'select-all' },
      { type: 'move-cursor-to-end' }
    ]);
  });

  it('moves the CURSOR to the last appended TOKEN when the selection does not prefer the first word', async () => {
    // arrange
    const { inputManager, cursor, userInput } = createInputManagerFixture({
      html: p({ id: 'p1' }, 'foo'),
      range: [null, 7]
    });

    // act
    await inputManager.handleInputChange('foo bar baz');

    // assert
    expect(getValue(cursor.getToken())).toBe('baz');
    expect(userInput.getInputValue()).toBe('baz');
  });

  it('moves the INPUT cursor to the beginning when the rewritten value starts with whitespace', async () => {
    // arrange
    const { inputManager, userInput } = createInputManagerFixture({
      html: p({ id: 'p1' }, 'foo'),
      range: [null, 0]
    });

    // act
    await inputManager.handleInputChange(' foo bar');

    // assert
    expect(userInput.trackEvents().data).toContainEqual({ type: 'move-cursor-to-beginning' });
  });
});
