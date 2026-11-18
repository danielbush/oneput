// @vitest-environment jsdom
import { describe, expect, test } from "vitest";
import {
  sanitiseHtml,
  safeHtmlMarkup,
  safeHtmlText,
  isSafeHtml,
  insertSafeHtml,
  type SafeHtml,
  type ContentPolicy,
} from "../SafeHtml.js";

const policies: ContentPolicy[] = ["display", "ui"];

describe.each(policies)("%s content", (policy) => {
  test.each([
    "script",
    "style",
    "iframe",
    "object",
    "embed",
    "form",
    "base",
    "meta",
    "link",
    "img",
    "video",
    "audio",
    "source",
    "svg",
    "math",
    "template",
  ])("forbidden tag: %s", (tag) => {
    // arrange
    const input = `<${tag} src="https://example.com/a" onload="x()">bad</${tag}><b>ok</b>`;
    const root = document.createElement("div");

    // act
    const result = sanitiseHtml(input, policy);
    root.innerHTML = result.isOk()
      ? safeHtmlMarkup(result.value, "div")
      : "Content unavailable";

    // assert
    expect(result.isOk()).toBe(true);
    expect(root.querySelector(tag)).toBeNull();
    expect(root.querySelector("b")?.textContent).toBe("ok");
  });

  test.each([
    "onclick",
    "onerror",
    "srcdoc",
    "src",
    "srcset",
    "action",
    "formaction",
    "ping",
    "style",
    "id",
    "data-widget",
  ])("forbidden attribute: %s", (name) => {
    // arrange
    const root = document.createElement("div");

    // act
    const result = sanitiseHtml(
      `<a ${name}="javascript:alert(1)">text</a>`,
      policy,
    );
    root.innerHTML = result.isOk() ? safeHtmlMarkup(result.value, "div") : "";

    // assert
    expect(result.isOk()).toBe(true);
    expect(root.querySelector("a")?.hasAttribute(name)).toBe(false);
  });

  test.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    "data:text/html,bad",
    "data:image/png;base64,AAAA",
    "vbscript:msgbox(1)",
    "file:///tmp/a",
    "blob:https://example.com/a",
  ])("forbidden link: %s", (url) => {
    // arrange
    const root = document.createElement("div");

    // act
    const result = sanitiseHtml(`<a href="${url}">text</a>`, policy);
    root.innerHTML = result.isOk() ? safeHtmlMarkup(result.value, "div") : "";

    // assert
    expect(result.isOk()).toBe(true);
    expect(root.querySelector("a")?.hasAttribute("href")).toBe(false);
  });

  test.each([
    "https://example.com/a",
    "http://example.com",
    "/local",
    "#anchor",
    "mailto:a@example.com",
    "tel:+123",
  ])("safe link: %s", (url) => {
    // arrange
    const root = document.createElement("div");

    // act
    const result = sanitiseHtml(`<a href="${url}">text</a>`, policy);
    root.innerHTML = result.isOk() ? safeHtmlMarkup(result.value, "div") : "";

    // assert
    expect(root.querySelector("a")?.getAttribute("href")).toBe(url);
  });
});

describe("SafeHtml provenance", () => {
  test.each([
    false,
    0,
    "",
    undefined,
    {},
    { html: "<img src=x onerror=x()>" },
    "<script>x()</script>",
    null,
  ])("forged value: %j", (forged) => {
    // arrange
    const value = forged as SafeHtml;

    // act
    const markup = safeHtmlMarkup(value, "div");

    // assert
    expect(isSafeHtml(value)).toBe(false);
    expect(markup).toBe("Content unavailable");
  });

  test("clone and serialisation lose authority", () => {
    // arrange
    const result = sanitiseHtml("<b>hello &amp; goodbye</b>");
    if (result.isErr()) throw result.error;

    // act
    const clone = { ...result.value };
    const json = JSON.parse(JSON.stringify(result.value));

    // assert
    expect(isSafeHtml(result.value)).toBe(true);
    expect(safeHtmlText(result.value)).toBe("hello & goodbye");
    expect(isSafeHtml(clone)).toBe(false);
    expect(isSafeHtml(json)).toBe(false);
    expect(Object.isFrozen(result.value)).toBe(true);
  });

  test("UI keyboard markup and class restriction", () => {
    // arrange
    const input = '<code><kbd class="oneput__kbd-symbol evil">⌘</kbd></code>';

    // act
    const ui = sanitiseHtml(input, "ui");
    const display = sanitiseHtml(input, "display");

    // assert
    expect(ui.isOk() && safeHtmlMarkup(ui.value, "div")).toBe(
      '<code><kbd class="oneput__kbd-symbol">⌘</kbd></code>',
    );
    expect(display.isOk() && safeHtmlMarkup(display.value, "div")).toBe(
      "<code>⌘</code>",
    );
  });

  test("unknown policy", () => {
    // arrange
    const policy = { elements: ["script"] } as unknown as ContentPolicy;

    // act
    const result = sanitiseHtml("<script>x()</script>", policy);

    // assert
    expect(result.isErr()).toBe(true);
  });

  test("wrong insertion context", () => {
    // arrange
    const result = sanitiseHtml("<b>hello</b>");
    if (result.isErr()) throw result.error;

    // act
    const markup = safeHtmlMarkup(result.value, "script" as "div");

    // assert
    expect(markup).toBe("Content unavailable");
  });
});

describe("checked node insertion", () => {
  test("cloned nodes do not change stored authority", () => {
    // arrange
    const result = sanitiseHtml("<b>hello</b>");
    if (result.isErr()) throw result.error;
    const first = document.createElement("div");
    const second = document.createElement("div");

    // act
    insertSafeHtml(first, result.value);
    first.querySelector("b")!.setAttribute("onclick", "bad");
    insertSafeHtml(second, result.value);

    // assert
    expect(second.innerHTML).toBe("<b>hello</b>");
  });

  test("forged node content and wrong context", () => {
    // arrange
    const div = document.createElement("div");
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "div");
    const result = sanitiseHtml("<b>hello</b>");
    if (result.isErr()) throw result.error;

    // act
    const forged = insertSafeHtml(div, {} as SafeHtml);
    const wrongContext = insertSafeHtml(svg, result.value);

    // assert
    expect(forged).toBe(false);
    expect(wrongContext).toBe(false);
    expect(div.textContent).toBe("Content unavailable");
    expect(svg.textContent).toBe("Content unavailable");
  });
});
