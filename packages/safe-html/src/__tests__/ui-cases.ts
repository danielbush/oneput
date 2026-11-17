import { describe, expect, test } from "vitest";
import type { ContentPolicy } from "../setHTML.js";

export const uiCases: {
  name: string;
  input: string;
  policy: ContentPolicy;
  expected: string;
}[] = [
  {
    name: "formatting and active content",
    input:
      '<p onclick="bad()">Hello <strong>world</strong></p><script>bad()</script>',
    policy: "display",
    expected: "<p>Hello <strong>world</strong></p>",
  },
  {
    name: "links and attributes",
    input:
      '<a href="javascript:bad()" title="note" data-value="x">bad</a><a href="/safe">safe</a>',
    policy: "display",
    expected: '<a title="note">bad</a><a href="/safe">safe</a>',
  },
  {
    name: "foreign content and resources",
    input:
      '<svg><circle onload="bad()"></circle></svg><math><mi>x</mi></math><img src="/x"><span style="color:red">text</span>',
    policy: "display",
    expected: "<span>text</span>",
  },
  {
    name: "UI classes",
    input:
      '<kbd class="oneput__kbd-symbol other">Enter</kbd><span class="other oneput__kbd-symbol">key</span>',
    policy: "ui",
    expected:
      '<kbd class="oneput__kbd-symbol">Enter</kbd><span class="oneput__kbd-symbol">key</span>',
  },
  {
    name: "display classes",
    input: '<span class="oneput__kbd-symbol">key</span>',
    policy: "display",
    expected: "<span>key</span>",
  },
];

export function uiPolicyCases(
  name: string,
  insert: (
    target: HTMLDivElement,
    input: string,
    policy: ContentPolicy,
  ) => void,
): void {
  describe(name, () => {
    test.each(uiCases)("$name", ({ input, policy, expected }) => {
      // arrange
      const target = document.createElement("div");

      // act
      insert(target, input, policy);

      // assert
      expect(target.innerHTML).toBe(expected);
    });
  });
}
