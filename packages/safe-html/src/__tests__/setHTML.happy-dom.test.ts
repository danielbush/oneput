// @vitest-environment happy-dom

import { expect, test } from "vitest";
import { setHTML } from "../setHTML.js";

test("fallback: refuses a DOM that DOMPurify cannot walk", () => {
  // arrange
  const element = document.createElement("div");

  // act
  const run = () => setHTML(element, '<p>One</p><p onclick="alert(1)">Two</p>');

  // assert
  expect(run).toThrow("HTML sanitization is unavailable in this environment.");
  expect(element.innerHTML).toBe("");
});
