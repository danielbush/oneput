// @vitest-environment happy-dom

import { expect, test } from "vitest";
import { setHTML, sanitiseHtml } from "../setHTML.js";

test("fallback: refuses a DOM that DOMPurify cannot walk", () => {
  // arrange
  const element = document.createElement("div");

  // act
  const run = () => setHTML(element, '<p>One</p><p onclick="alert(1)">Two</p>');

  // assert
  expect(run).toThrow("HTML sanitization is unavailable in this environment.");
  expect(element.textContent).toBe("Content unavailable");
});

test("SafeHtml refuses the same broken DOM without retaining raw input", () => {
  // arrange
  const input = "<img src=x onerror=bad><b>text</b>";

  // act
  const result = sanitiseHtml(input, "ui");

  // assert
  expect(result.isErr()).toBe(true);
});

import { documentPolicyCases } from "./document-cases.js";
documentPolicyCases();
