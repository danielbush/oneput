import { describe, expect, test } from "vitest";
import type { ContentPolicy } from "../setHTML.js";
import fixtures from "./math-fixtures.json";

// KaTeX 0.16.28 output with trust:false, strict:error, maxExpand:1000,
// maxSize:20. Keep the compiler source next to each static output string.
export function mathPolicyCases(
  name: string,
  insert: (
    target: HTMLDivElement,
    input: string,
    policy: ContentPolicy,
  ) => void,
): void {
  describe(name, () => {
    test.each(fixtures)("preserves $name", ({ html, selector }) => {
      // arrange
      const target = document.createElement("div");
      const original = document.createElement("div");
      original.innerHTML = html;

      // act
      insert(target, html, "math");

      // assert
      expect(target.isEqualNode(original)).toBe(true);
      expect(target.querySelector(selector)).not.toBeNull();
    });

    test.each([
      ["active HTML", "<script>void 0</script><span>x</span>", "script"],
      [
        "resource",
        '<img src="https://example.com/image"><span>x</span>',
        "img",
      ],
      ["event", '<span onclick="void 0">x</span>', "[onclick]"],
      ["unknown attribute", '<span data-extra="x">x</span>', "[data-extra]"],
      [
        "MathML URL",
        '<math><mi href="https://example.com">x</mi></math>',
        "[href]",
      ],
      [
        "SVG resource",
        '<svg src="https://example.com"><path d="M0 0"/></svg>',
        "[src]",
      ],
      [
        "SVG URL",
        '<svg><path href="https://example.com" xlink:href="https://example.com" d="M0 0"/></svg>',
        "[href], [xlink\\:href]",
      ],
      ["MathML event", '<math><mi onclick="void 0">x</mi></math>', "[onclick]"],
      [
        "MathML unknown attribute",
        '<math><mi constructor="x">x</mi></math>',
        "[constructor]",
      ],
      [
        "MathML integration",
        '<math><annotation-xml encoding="text/html"><span>x</span></annotation-xml></math>',
        "annotation-xml",
      ],
      [
        "SVG link",
        '<svg><a href="https://example.com"><path d="M0 0"/></a></svg>',
        "a",
      ],
      [
        "SVG foreignObject",
        "<svg><foreignObject><span>x</span></foreignObject></svg>",
        "foreignObject",
      ],
      [
        "SVG animation",
        '<svg><animate attributeName="href"/></svg>',
        "animate",
      ],
      ["SVG event", '<svg onload="void 0"><path d="M0 0"/></svg>', "[onload]"],
      ["comment", "<!-- unexpected --><span>x</span>", "script"],
    ])("removes %s", (_name, html, selector) => {
      // arrange
      const target = document.createElement("div");

      // act
      insert(target, html, "math");

      // assert
      expect(target.querySelector(selector)).toBeNull();
      expect(target.innerHTML).not.toContain("<!--");
    });

    test.each([
      ["CSS resource", "background-image:url(https://example.com)"],
      ["CSS custom property", "--formula:URL(https://example.com)"],
      [
        "CSS escaped URL",
        String.raw`background-image:u\72l(https://example.com)`,
      ],
      [
        "CSS escaped URL whitespace",
        String.raw`background-image:\75 rl(https://example.com)`,
      ],
      ["CSS comments", "background-image:u/**/rl(https://example.com)"],
      [
        "CSS comment separator",
        "background-image:u/*;*/rl(https://example.com)",
      ],
      ["CSS fixed", "position:fixed"],
      ["CSS position comment", "position:fi/*;*/xed"],
      ["CSS sticky", "POSITION: STICKY !important"],
      ["CSS escaped position", String.raw`p\6fsition:f\69xed`],
    ])("removes %s declarations", (_name, declaration) => {
      // arrange
      const target = document.createElement("div");
      const html = `<span style="color:red;${declaration};width:2em">x</span>`;

      // act
      insert(target, html, "math");

      // assert
      expect(target.querySelector("span")?.getAttribute("style")).toBe(
        "color:red;width:2em",
      );
      expect(target.textContent).toBe("x");
    });

    test("removes an empty style attribute", () => {
      // arrange
      const target = document.createElement("div");

      // act
      insert(target, '<span style="position:fixed">x</span>', "math");

      // assert
      expect(target.querySelector("span")?.hasAttribute("style")).toBe(false);
      expect(target.textContent).toBe("x");
    });
  });
}
