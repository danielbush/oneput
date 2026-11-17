import { describe, expect, test } from "vitest";
import { checkFindings, scanSource } from "./sinks.mjs";

describe("raw HTML sinks", () => {
  test.each([
    "node.innerHTML = input",
    'const key = "innerHTML"; node[key] = input',
    'const first = "inner"; const last = "HTML"; node[first + last] = input',
    'const first = "outer"; node[`${first}HTML`] = input',
    'const key = "innerHTML"; function write() { node[key] = input }',
    'const key = "title"; { const key = "innerHTML"; node[key] = input }',
    'const key = "innerHTML"; ({ value: node[key] } = input)',
    "({ value: [node.innerHTML] } = input)",
    "[node.outerHTML = fallback] = input",
    "for (node.innerHTML of inputs) {}",
    "Object.assign(node, { innerHTML: input })",
    'const key = "srcdoc"; Object.assign(frame, { [key]: input })',
    'Reflect.set(node, "innerHTML", input)',
    'const { key } = { key: "innerHTML" }; node[key] = input',
    'const [key] = ["outerHTML"]; node[key] = input',
    'const { nested: { key } } = { nested: { key: "srcdoc" } }; node[key] = input',
    "const payload = { innerHTML: input }; Object.assign(node, payload)",
    "declare const node: HTMLElement; Object.assign(node, payload)",
    "declare const node: HTMLElement; Object.assign(node, { ...payload })",
    "declare const node: HTMLElement | null; node[key] = input",
    'const key = "outerHTML"; Reflect.set(node, key, input)',
    'const node = document.createElement("div"); node[key] = input',
    "declare const node: HTMLElement; ({ value: node[key] } = input)",
    "declare const node: HTMLElement; Object.assign(node, { [key]: input })",
    "declare const node: HTMLElement; Reflect.set(node, key, input)",
    'const key = "insertAdjacentHTML"; node[key]("beforeend", input)',
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
    'const key = "innerHTML"; function read(key: string) { return node[key] }',
    'const key = "innerHTML"; { const key = "title"; node[key] = input }',
    'const key = "innerHTML"; function write(key: string) { node[key] = input }',
    "const values: Record<string, string> = {}; values[key] = input",
    "const values: string[] = []; values[index] = input",
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
    '<script>const key="innerHTML";</script>{@const text = node[key] = input}<div>{text}</div>',
    '<script>const key="innerHTML"</script><button onclick={()=>node[key]=input}>Text</button>',
    '<script module>const key="title";</script><script>const key="innerHTML";</script><button onclick={()=>node[key]=input}>Text</button>',
    '<script module>const key="innerHTML";</script><button onclick={()=>node[key]=input}>Text</button>',
    '<script>const key="title";</script>{#if show}{@const key="innerHTML"}<button onclick={()=>node[key]=input}>Text</button>{/if}',

    "{#each items as item (node.innerHTML = input)}<p>{item}</p>{/each}",
    "{#snippet content(value = node.innerHTML = input)}{value}{/snippet}",
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

  test.each([
    '<script>const key="innerHTML";</script>{#each items as key}<button onclick={()=>node[key]=input}>Text</button>{/each}',
    '<script>const key="innerHTML";</script>{#snippet content(key)}<button onclick={()=>node[key]=input}>Text</button>{/snippet}',
    '<script>const key="innerHTML";</script>{#await value then key}<button onclick={()=>node[key]=input}>Text</button>{/await}',
    '<script module>const key="innerHTML";</script><script>const key="title";</script><button onclick={()=>node[key]=input}>Text</button>',
    '<script>const key="innerHTML";</script>{#if show}{@const key="title"}<button onclick={()=>node[key]=input}>Text</button>{/if}',
  ])("Svelte local binding: %s", (source) => {
    // arrange
    const path = "New.svelte";

    // act
    const findings = scanSource(path, source);

    // assert
    expect(findings).toEqual([]);
  });

  test("Svelte script comment marker", () => {
    // arrange
    const source =
      '<script>const marker = "<!--";</script>\n{@html input}\n<!-- markup comment -->';

    // act
    const findings = scanSource("New.svelte", source);

    // assert
    expect(findings).toEqual([
      { kind: "@html", line: 2, source: "{@html input}", owner: undefined },
    ]);
  });

  test("Svelte HTML expression with braces", () => {
    // arrange
    const source = '{@html render({ value: "}" })}';

    // act
    const findings = scanSource("New.svelte", source);

    // assert
    expect(findings).toEqual([
      { kind: "@html", line: 1, source, owner: undefined },
    ]);
  });

  test("Svelte strings and text", () => {
    // arrange
    const source =
      '<script>const example = "{@html input}";</script><p>node.innerHTML = input</p><!-- {@html input} -->';

    // act
    const findings = scanSource("New.svelte", source);

    // assert
    expect(findings).toEqual([]);
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
