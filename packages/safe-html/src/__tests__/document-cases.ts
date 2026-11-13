import { describe, expect, test } from "vitest";
import {
  setHTML,
  sanitiseDocumentNodes,
  checkDocumentNodes,
  isDocumentTagAllowed,
  documentMarkupForExport,
} from "../setHTML.js";

/** Run the same document cases in each supported DOM. */
export function documentPolicyCases(): void {
  describe("document policy", () => {
    test.each([
      "<script>bad()</script>",
      '<iframe srcdoc="<script>bad()</script>"></iframe>',
      '<frame src="https://example.com">',
      '<object data="https://example.com"></object>',
      '<embed src="https://example.com">',
      '<base href="https://example.com">',
      '<meta http-equiv=" Refresh " content="0;url=https://example.com">',
      '<svg><script href="https://example.com/bad.js"></script><foreignObject><p>bad</p></foreignObject></svg>',
      '<svg><a><animate attributeName="href" values="javascript:bad()"></animate></a></svg>',
      '<template><script>bad()</script><img onerror="bad()" src="data:text/html,bad"></template>',
      '<form><input name="attributes"><input name="childNodes"><img src="x" onerror="bad()"></form>',
    ])("active nodes: %s", (html) => {
      // arrange
      const target = document.createElement("div");

      // act
      setHTML(target, html, "document");

      // assert
      expect(
        target.querySelector(
          "script,iframe,frame,object,embed,base,foreignObject,animate",
        ),
      ).toBeNull();
      expect(target.querySelector("[onerror],[srcdoc]")).toBeNull();
      expect(checkDocumentNodes(target)).toBe(true);
      const template = target.querySelector("template");
      expect(
        template?.content.querySelector("script,[onerror],[src]") ?? null,
      ).toBeNull();
    });

    test.each([
      "javascript:bad()",
      "JaVaScRiPt:bad()",
      " java\nscript:bad()",
      "vbscript:bad()",
      "data:text/html,<script>bad()</script>",
      "data:image/svg+xml,<svg onload='bad()'/>",
    ])("active URL: %s", (url) => {
      // arrange
      const fragment = document.createDocumentFragment();
      const link = document.createElement("a");
      const image = document.createElement("img");
      link.setAttribute("href", url);
      image.setAttribute("src", url);
      fragment.append(link, image);

      // act
      sanitiseDocumentNodes(fragment);

      // assert
      expect(link.hasAttribute("href")).toBe(false);
      expect(image.hasAttribute("src")).toBe(false);
    });

    test("normal document content and identity", () => {
      // arrange
      const target = document.createElement("div");
      const html =
        '<style>.note { color: red; background: url(https://example.com/bg.png) }</style><link rel="stylesheet" href="https://example.com/a.css"><meta name="description" content="Note"><article class="note" id="note" data-task="todo" aria-label="Note" style="display:grid;--accent:red"><p>Hello <em>world</em> <strong>today</strong></p><table><tbody><tr><td colspan="2">Cell</td></tr></tbody></table><img src="https://example.com/photo.png"><svg viewBox="0 0 16 16"><use href="#icon"></use><path d="M0 0L1 1"></path></svg><math><mi>x</mi></math><form><input name="title"></form><!-- note --></article>';

      // act
      setHTML(target, html, "document");
      const article = target.querySelector("article");
      sanitiseDocumentNodes(target);

      // assert
      expect(target.innerHTML).toBe(html);
      expect(target.querySelector("article")).toBe(article);
    });

    test.each(["png", "jpeg", "gif", "webp"])("raster data: %s", (type) => {
      // arrange
      const target = document.createElement("div");
      const html = `<img src="data:image/${type};base64,AAAA"><img src="data:image/${type},raster">`;

      // act
      setHTML(target, html, "document");

      // assert
      expect(target.innerHTML).toBe(html);
    });

    test("safe SVG link animation", () => {
      // arrange
      const target = document.createElement("div");
      const html =
        '<svg><a href="#one"><set attributeName="href" to="#two"></set></a></svg>';

      // act
      setHTML(target, html, "document");

      // assert
      expect(target.innerHTML).toBe(html);
    });

    test("URL lists and SVG script links", () => {
      // arrange
      const target = document.createElement("div");

      // act
      setHTML(
        target,
        '<img srcset="ok.png 1x, data:text/html,bad 2x"><a ping="https://example.com javascript:bad()">link</a><svg><use xlink:href="javascript:bad()"></use><a href="data:text/html,bad">link</a></svg>',
        "document",
      );

      // assert
      expect(target.innerHTML).toBe(
        "<img><a>link</a><svg><use></use><a>link</a></svg>",
      );
    });

    test("caller-built SVG with a different XLink prefix", () => {
      // arrange
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const link = document.createElementNS("http://www.w3.org/2000/svg", "a");
      const script = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "script",
      );
      link.setAttributeNS(
        "http://www.w3.org/1999/xlink",
        "other:href",
        "javascript:bad()",
      );
      svg.append(link, script);

      // act
      sanitiseDocumentNodes(svg);

      // assert
      expect(svg.firstChild).toBe(link);
      expect(svg.querySelector("script")).toBeNull();
      expect(link.hasAttributeNS("http://www.w3.org/1999/xlink", "href")).toBe(
        false,
      );
    });

    test("table export keeps its context", () => {
      // arrange
      const table = document.createElement("table");
      table.innerHTML = "<tbody><tr><td>Cell</td></tr></tbody>";

      // act
      const result = documentMarkupForExport(table);

      // assert
      expect(result._unsafeUnwrap()).toBe(
        "<tbody><tr><td>Cell</td></tr></tbody>",
      );
    });

    test("export checks both noscript parsing modes", () => {
      // arrange
      const root = document.createElement("div");
      const noscript = document.createElement("noscript");
      const p = document.createElement("p");
      p.setAttribute("title", '</noscript><img src=x onerror="bad()">');
      noscript.append(p);
      root.append(noscript);

      // act
      const result = documentMarkupForExport(root);
      const template = document.createElement("template");
      template.innerHTML = result._unsafeUnwrap();

      // assert
      expect(checkDocumentNodes(template.content)).toBe(true);
      expect(template.content.querySelector("[onerror]")).toBeNull();
    });

    test("root refusal and template checks", () => {
      // arrange
      const script = document.createElement("script");
      const template = document.createElement("template");
      template.innerHTML = "<script>bad()</script>";

      // act & assert
      expect(sanitiseDocumentNodes(script)).toBe(false);
      expect(() => setHTML(script, "bad()", "document")).toThrow(
        "Active document target refused",
      );
      expect(script.textContent).toBe("");
      expect(checkDocumentNodes(template)).toBe(false);
      expect(template.content.querySelector("script")).not.toBeNull();
      expect(isDocumentTagAllowed("ScRiPt")).toBe(false);
      expect(isDocumentTagAllowed("iframe")).toBe(false);
      expect(isDocumentTagAllowed("p onclick=bad()")).toBe(false);
      expect(isDocumentTagAllowed("TABLE")).toBe(true);
    });
  });
}
