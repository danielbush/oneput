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
      [
        "SVG paint URL",
        '<svg><path d="M0 0" fill="url(https://example.com)"/></svg>',
      ],
      ["SVG path", '<svg><path d="not geometry"/></svg>'],
      ["SVG viewBox", '<svg viewBox="0 0 1 nope"></svg>'],
      ["SVG aspect ratio", '<svg preserveAspectRatio="none"></svg>'],
      ["SVG length", '<svg width="auto"></svg>'],
      [
        "CSS resource",
        '<span style="background-image:url(https://example.com)">x</span>',
      ],
      [
        "CSS custom property",
        '<span style="--formula:url(https://example.com)">x</span>',
      ],
      ["CSS position", '<span style="position:fixed">x</span>'],
      ["CSS function", '<span style="width:var(--width)">x</span>'],
      ["CSS escape", '<span style="c\\6flor:red">x</span>'],
      ["CSS colour", '<span style="color:rgb(1,2,3)">x</span>'],
      [
        "border width",
        '<math><mpadded style="border: 1em solid red">x</mpadded></math>',
      ],
      [
        "border function",
        '<math><mpadded style="border: 0.04em solid var(--red)">x</mpadded></math>',
      ],
      ["MathML length", '<math><mpadded width="+6vh">x</mpadded></math>'],
      ["MathML token", '<math display="other"><mi>x</mi></math>'],
      ["MathML colour", '<math mathcolor="url(x)"><mi>x</mi></math>'],
      ["MathML boolean", '<math><mo stretchy="yes">x</mo></math>'],
      ["HTML namespace attributes", '<span width="1em">x</span>'],
      ["MathML namespace attributes", '<math x1="1"></math>'],
      ["class", '<span class="x:y">x</span>'],
      ["namespace", '<math xmlns="http://example.com"><mi>x</mi></math>'],
      ["depth limit", "<span>".repeat(66) + "x" + "</span>".repeat(66)],
      ["node limit", "<span>x</span>".repeat(5001)],
    ])("refuses %s", (_name, html) => {
      // arrange
      const target = document.createElement("div");
      target.textContent = "previous";

      // act
      let error: unknown;
      try {
        insert(target, html, "math");
      } catch (caught) {
        error = caught;
      }

      // assert
      expect(error).toBeInstanceOf(Error);
      expect(target.textContent).toBe("Content unavailable");
      expect(target.children).toHaveLength(0);
    });
  });
}
