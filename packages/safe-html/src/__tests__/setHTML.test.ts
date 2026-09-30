// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { setHTML } from "../setHTML.js";

describe("setHTML", () => {
  test("fallback: inserts safe formatting", () => {
    // arrange
    const element = document.createElement("div");

    // act
    setHTML(element, "<p>Hello <strong>Dan</strong>.</p><ul><li>One</li></ul>");

    // assert
    expect(element.innerHTML).toBe(
      "<p>Hello <strong>Dan</strong>.</p><ul><li>One</li></ul>",
    );
  });

  test("fallback: removes active content and structure attributes", () => {
    // arrange
    const element = document.createElement("div");

    // act
    setHTML(
      element,
      '<p data-chat onclick="alert(1)">Hello <a href="javascript:alert(1)">Dan</a></p><script>alert(1)</script>',
    );

    // assert
    expect(element.innerHTML).toBe("<p>Hello <a>Dan</a></p>");
  });

  test("fallback: replaces old content", () => {
    // arrange
    const element = document.createElement("div");
    element.textContent = "Old";

    // act
    setHTML(element, "<p>New</p>");

    // assert
    expect(element.innerHTML).toBe("<p>New</p>");
  });
});
