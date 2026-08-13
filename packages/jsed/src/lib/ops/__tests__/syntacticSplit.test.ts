import { describe, expect, test } from 'vitest';
import { syntacticSplitter } from '../syntacticSplit.js';
import { nullSplitter, tokenParts } from '../splitter.js';

describe('syntacticSplitter', () => {
  test.each([
    ['foo-bar.', ['foo', '-', 'bar', '.']],
    ['foo', ['foo']],
    ['foo...', ['foo', '...']],
    ['...', ['...']],
    ['...!', ['...', '!']],
    ['...a', ['...', 'a']],
    ['(x)', ['(', 'x', ')']],
    ['a+b', ['a', '+', 'b']],
    ['c=d', ['c', '=', 'd']],
    ['foo--bar', ['foo', '--', 'bar']],
    ['foo-!bar', ['foo', '-', '!', 'bar']],
    ['lie,"', ['lie', ',', '"']],
    ['what?!', ['what', '?', '!']],
    ['(x),', ['(', 'x', ')', ',']],
    ['', []],
    ['well-known', ['well', '-', 'known']],
    // An APOSTROPHE never splits, wherever it sits.
    ["don't", ["don't"]],
    ["dogs'", ["dogs'"]],
    ["don''t", ["don''t"]],
    ["d'on", ["d'on"]],
    ['dell’Aquila', ['dell’Aquila']],
    ['it’s', ['it’s']],
    // Elision — leading, trailing, and both.
    ["'tis", ["'tis"]],
    ["'em", ["'em"]],
    ["'90s", ["'90s"]],
    ["'n'", ["'n'"]],
    // Single-quoted text does not split. The accepted cost of the above.
    ["'quoted'", ["'quoted'"]],
    ["'don't'", ["'don't'"]],
    ['’smart’', ['’smart’']],
    ["'", ["'"]],
    ["''", ["''"]],
    // A quote still separates from surrounding punctuation.
    ["'quoted',", ["'quoted'", ',']],
    // Not an apostrophe — a double quote splits normally.
    ['"quoted"', ['"', 'quoted', '"']],
    ["don't-stop", ["don't", '-', 'stop']]
  ])('%s', (text, expected) => {
    // arrange, act
    const parts = syntacticSplitter(text);

    // assert
    expect(parts).toEqual(expected);
  });

  test('round-trips — parts rejoin to the original', () => {
    // arrange
    const text = 'https://example.com/a/b?c=d';

    // act
    const parts = syntacticSplitter(text);

    // assert
    expect(parts.join('')).toBe(text);
  });

  test('idempotent — splitting a part again yields itself', () => {
    // arrange
    const parts = syntacticSplitter('foo-bar...');

    // act
    const again = parts.flatMap((part) => syntacticSplitter(part));

    // assert
    expect(again).toEqual(parts);
  });
});

describe('syntacticSplitter whitespace', () => {
  test.each([
    ['foo bar', ['foo', ' ', 'bar']],
    ['foo-bar baz', ['foo', '-', 'bar', ' ', 'baz']],
    ['  foo', ['  ', 'foo']],
    ['foo  ', ['foo', '  ']],
    ['a, b', ['a', ',', ' ', 'b']]
  ])('%s', (text, expected) => {
    // arrange, act
    const parts = syntacticSplitter(text);

    // assert
    expect(parts).toEqual(expected);
  });

  test('applying it to a whole LINE matches applying it word by word', () => {
    // arrange
    const text = 'the "sleeping" dogs don\'t lie, he said;';

    // act
    const whole = syntacticSplitter(text);
    const wordByWord = nullSplitter(text).flatMap((part) => syntacticSplitter(part));

    // assert
    expect(whole).toEqual(wordByWord);
  });
});

describe('tokenParts', () => {
  test('marks a SEPARATOR only where whitespace was', () => {
    // arrange, act
    const parts = tokenParts(syntacticSplitter, 'foo-bar baz');

    // assert
    expect(parts).toEqual([
      { text: 'foo', separatorBefore: false },
      { text: '-', separatorBefore: false },
      { text: 'bar', separatorBefore: false },
      { text: 'baz', separatorBefore: true }
    ]);
  });

  test('nullSplitter separates every part', () => {
    // arrange, act
    const parts = tokenParts(nullSplitter, 'foo-bar baz');

    // assert
    expect(parts).toEqual([
      { text: 'foo-bar', separatorBefore: false },
      { text: 'baz', separatorBefore: true }
    ]);
  });
});
