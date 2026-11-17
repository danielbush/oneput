import { describe, expect, test } from "vitest";
import { checkFindings, scanSource } from "./sinks.mjs";

describe("raw HTML sinks", () => {
  test.each([
    "node.innerHTML = input",
    "node.innerHTML += input",
    "node.outerHTML = input",
    "node['innerHTML'] = input",
    "node[`outerHTML`] = input",
    "node['inner' + 'HTML'] = input",
    'node?.insertAdjacentHTML?.("beforeend", input)',
    "node['insertAdjacentHTML']('beforeend', input)",
    "document.write(input)",
    "document.writeln(input)",
    "new DOMParser()",
    "new window.DOMParser()",
    "range.createContextualFragment(input)",
    'parser.parseFromString(input, "text/html")',
    "element.setHTMLUnsafe(input)",
    "Document.parseHTMLUnsafe(input)",
    "frame.srcdoc = input",
    'frame.setAttribute("srcdoc", input)',
    'frame.setAttributeNS(null, "srcdoc", input)',
    "const insert = node.insertAdjacentHTML",
    "const Parser = DOMParser",
    "const { insertAdjacentHTML: insert } = element",
    'const { ["createContextualFragment"]: parse } = range',
  ])("%s", (source) => {
    // arrange
    const path = "new-file.ts";

    // act
    const findings = scanSource(path, source);

    // assert
    expect(findings.length).toBeGreaterThan(0);
    expect(checkFindings(path, findings, [], {})).not.toEqual([]);
  });

  test.each([
    "const saved = node.innerHTML;",
    "expect(node.outerHTML).toBe(input)",
    '/** {@html example} */ const description = "node.innerHTML = input";',
    '// new DOMParser()\nconst content = "<b>hello</b>";',
  ])("read or comment: %s", (source) => {
    // arrange
    const path = "source.ts";

    // act
    const findings = scanSource(path, source);

    // assert
    expect(findings).toEqual([]);
  });

  test("Svelte markup and script", () => {
    // arrange
    const source =
      '<script lang="ts">node["innerHTML"] = input;</script>\n{@html input}';

    // act
    const findings = scanSource("New.svelte", source);

    // assert
    expect(findings.map(({ kind, line }) => ({ kind, line }))).toEqual([
      { kind: "innerHTML", line: 1 },
      { kind: "@html", line: 2 },
    ]);
  });

  test.each([
    "<button onclick={() => node.innerHTML = input}>Text</button>",
    "{#if show}<button onclick={() => { node.innerHTML = input }}>Text</button>{/if}",
    "{#each items as item}<div onclick={() => node.innerHTML = item}></div>{/each}",
    "<iframe srcdoc={input}></iframe>",
    "{#snippet content()}<iframe srcdoc={input}></iframe>{/snippet}",
    "<div dangerouslySetInnerHTML={{__html: input}} />",
  ])("template sink: %s", (source) => {
    // arrange
    const path = "New.svelte";

    // act
    const findings = scanSource(path, source);

    // assert
    expect(findings.length).toBeGreaterThan(0);
  });

  test("Svelte comments", () => {
    // arrange
    const source =
      "<!-- {@html example} <script>node.innerHTML = input</script> --><script>/** {@html example} */</script><p>Text</p>";

    // act
    const findings = scanSource("New.svelte", source);

    // assert
    expect(findings).toEqual([]);
  });
});

describe("reviewed exceptions", () => {
  test("one occurrence in the named function", () => {
    // arrange
    const path = "boundary.ts";
    const allowed = [
      {
        path,
        kind: "innerHTML",
        source: "template.innerHTML",
        owner: "checked",
      },
    ];
    const source =
      "function checked() { template.innerHTML = input; template.innerHTML = extra; }";

    // act
    const errors = checkFindings(path, scanSource(path, source), allowed, {});

    // assert
    expect(errors).toEqual([
      "boundary.ts:1: unlisted innerHTML: template.innerHTML",
    ]);
  });

  test("stale exception", () => {
    // arrange
    const allowed = [
      { path: "boundary.ts", kind: "innerHTML", source: "template.innerHTML" },
    ];

    // act
    const errors = checkFindings("boundary.ts", [], allowed, {});

    // assert
    expect(errors).toEqual([
      "boundary.ts: stale sink exception: template.innerHTML",
    ]);
  });

  test("explicit fixture path only", () => {
    // arrange
    const fixtures = { "fixture.test.ts": "Raw test document." };
    const source = "node.innerHTML = input";

    // act
    const approved = checkFindings(
      "fixture.test.ts",
      scanSource("fixture.test.ts", source),
      [],
      fixtures,
    );
    const unlisted = checkFindings(
      "new.test.ts",
      scanSource("new.test.ts", source),
      [],
      fixtures,
    );

    // assert
    expect(approved).toEqual([]);
    expect(unlisted).toEqual([
      "new.test.ts:1: unlisted innerHTML: node.innerHTML",
    ]);
  });
});
