import type { JsedCursor } from '$lib/jsed/index.js';
import * as jsed from '$lib/jsed/index.js';

export function calcInputChange({
  value: inputValue,
  cursor,
  inputWrapper
}: {
  value: string;
  cursor: JsedCursor;
  inputWrapper: {
    setInputValue: (value: string) => void;
    getRange: () => [number | null, number | null];
    moveCursorToBeginning: () => void;
    moveCursorToEnd: () => void;
  };
}) {
  // "foo" => " " => "foo "
  const isReplacedWithSpace = /^\s+$/.test(inputValue); // " "
  const value = isReplacedWithSpace
    ? jsed.utils.token.getValue(cursor.getToken()) + ' ' // "foo" + " "
    : inputValue;
  // Apply rewrite:
  inputWrapper.setInputValue(value);

  // part0 can be undefined if we split on whitespace:
  const [part0, ...parts] = value.split(/\s+/).filter(Boolean);
  /**
   * "|foo" => " |foo" => "| foo"
   */
  const prependedSpace = /^\s+/.test(value);
  /**
   * true: "foo|a" => "foo |a" => "foo|"
   * false: "foo a|" => "a|" etc
   * false: "foo a" (pasted) => "a|"
   */
  let preferFirstPart = false;
  const containsSpace = value.match(/^(\S+)(\s+)\S/); // "foo a..."
  if (containsSpace) {
    const firstWord = containsSpace[1];
    const firstSpace = containsSpace[2];
    const [, stop] = inputWrapper.getRange();
    preferFirstPart = firstWord.length === stop || stop == firstWord.length + firstSpace.length;
  }
  let lastToken: HTMLElement | null = null;

  // Update document.
  if (value === '') {
    cursor.delete();
  } else {
    cursor.replace(part0);
    for (const part of parts.reverse()) {
      const token = cursor.append(part);
      if (!lastToken) {
        lastToken = token;
      }
    }
  }

  // Update TOKEN_FOCUS and input.
  if (prependedSpace) {
    inputWrapper.moveCursorToBeginning();
  }
  if (preferFirstPart) {
    const firstToken = cursor.getToken();
    cursor.setToken(firstToken);
    inputWrapper.moveCursorToEnd();
  } else {
    if (lastToken) {
      cursor.setToken(lastToken);
      inputWrapper.moveCursorToEnd();
    }
  }
}
