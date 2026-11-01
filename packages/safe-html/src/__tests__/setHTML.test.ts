// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { setHTML, untrustedDocumentPolicy } from "../setHTML.js";

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

describe("setHTML with untrustedDocumentPolicy", () => {
  test("fallback: keeps structure markup", () => {
    // arrange
    const element = document.createElement("div");
    const html =
      '<article class="task" data-task="todo" aria-label="Task"><button type="button">Done</button><svg width="16" height="16"><path d="M0 0"></path></svg><!-- note --></article>';

    // act
    setHTML(element, html, untrustedDocumentPolicy);

    // assert
    expect(element.innerHTML).toBe(html);
  });

  test("fallback: removes active content and elements that load or change the page", () => {
    // arrange
    const element = document.createElement("div");

    // act
    setHTML(
      element,
      '<h1 onclick="alert(1)">Hi</h1><a href="javascript:alert(1)">x</a><script>alert(1)</script><iframe src="https://example.com"></iframe><form action="https://example.com"><p>in form</p></form><base href="https://example.com/"><meta http-equiv="refresh" content="0"><style>body{display:none}</style><link rel="stylesheet" href="https://example.com/a.css">',
      untrustedDocumentPolicy,
    );

    // assert
    expect(element.innerHTML).toBe("<h1>Hi</h1><a>x</a>");
  });
});
