# Oneput threat model

Oneput provides a shared input, menus, and controls. Host apps and library integrations call its controllers and UI builders. Content from a calling app can be untrusted: documents, agent output, config values, and future DECLARATIVE_APPOBJECTS or AGENT_MENUS descriptions. Oneput must be safe by default. It must not depend on callers to avoid mistakes.

This source review covers content rendering. It does not prove runtime exploitation. Paths below are relative to `packages/oneput/`. Review date: 2026-11-12.

## Still to add

- Key bindings and global shortcuts, including dispatch from other controls (`src/lib/oneput/controllers/KeysController.ts:99`).
- Clipboard access and host clipboard integrations; no direct clipboard API use was found in this package.
- Storage, stored value validation, and binding stores (`src/lib/oneput/shared/bindings/BindingsIDB.ts:28`).
- The Fetch helper and other network paths, including destination and response limits (`src/lib/oneput/shared/Fetch.ts:12`).
- Focus and input claims that can receive typed secrets (`src/lib/oneput/controllers/helpers/InputClaims.ts:61`).
- Future declarative descriptions: action grants, schema checks, and separation from executable builders.
- Denial of service from large menus, inputs, and nested UI trees.

## Trust boundary and current findings

The earlier security notes named three concerns: HTML through FChild and Flex, `innerHTMLUnsafe`, and icons. All remain open. FChild inserts raw HTML. Flex nests FChild and accepts dynamic tags, attributes, styles, and hooks. Icon registration selects a renderer but does not validate its output.

Plain `textContent` uses Svelte text interpolation. This protection does not survive all later operations: both filters can convert text to unchecked highlight HTML. Alert also puts caller strings inside HTML. Script injection can read page content and accessible storage, change controls, and use the host app's authority.

Builder callbacks and mount hooks run code by design. They are not a safe data format for agent descriptions. Raw HTML, SVG, links, and styles need separate checks. A registered icon name alone does not make its renderer safe.

## Threats

| Asset                               | Entry point                             | Threat                                                               | Current protection                                                          | Gap                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page content and app authority      | FChild content                          | Active markup from caller data                                       | Text interpolation at `src/lib/oneput/shared/components/FChild.svelte:67`   | Raw HTML at `src/lib/oneput/shared/components/FChild.svelte:56`, `:60`, `:64` has no sanitiser.                                                                            |
| Labels and search results           | Word and fuzzy filters                  | Text becomes active HTML during search                               | Initial text rendering                                                      | Unescaped highlight parts at `src/lib/oneput/shared/filters/WordFilter.ts:93`, `:99` and `src/lib/oneput/shared/filters/FuzzyFilter.ts:139`.                               |
| Alert controls and page content     | Alert message and additional text       | Caller strings become markup                                         | Fixed surrounding tags                                                      | No escaping at `src/lib/oneput/shared/ui/Alert.ts:78`, `:82`.                                                                                                              |
| UI integrity and resource privacy   | FChild and Flex descriptions            | Unsafe tags, URLs, attributes, or styles; controls hidden or covered | Typed builder fields                                                        | No package allow-list at `src/lib/oneput/shared/components/FChild.svelte:35`, `:41`, `:48`, `:50`; `src/lib/oneput/shared/components/Flex.svelte:40`, `:49`, `:64`, `:70`. |
| Page content and icon controls      | Icon registry                           | Raw SVG or factory output adds active content                        | Name lookup; fixed missing-icon markup at `src/lib/oneput/lib/icons.ts:103` | Raw string insertion at `src/lib/oneput/lib/icons.ts:77`; unchecked factory nodes at `:87`. Empty clearing at `:57` has no outside content.                                |
| App authority                       | Mount hooks and attachments             | Agent data gains code execution                                      | Hooks are explicit code APIs                                                | No checked data boundary at `src/lib/oneput/shared/components/FChild.svelte:19`; `src/lib/oneput/shared/components/Flex.svelte:26`, `:71`.                                 |
| Page integrity and resource privacy | NativeController messages, when started | Outside sender inserts images or changes UI                          | Message type dispatch                                                       | No origin, source, payload, or URL checks at `src/lib/oneput/controllers/NativeController.ts:19`, `:27`, `:32`.                                                            |

## Known risks and plan

The detailed plan is [SAFE_HTML](../../work/backlog/SAFE_HTML.md). These controls are planned, not implemented:

- Keep strings as text, including filters and Alert. Use fixed nodes for emphasis.
- Accept rich content only as `SafeHtml` made by `packages/safe-html`. Check its origin at runtime. The current safe-html API inserts content and returns `void`; it does not yet provide this type (`packages/safe-html/src/setHTML.ts:26`, relative to the repo root).
- Check tags, attributes, URLs, and styles at each DOM write, including updates and nested content. Refuse forbidden values in production too.
- Render icons through an allow-list renderer. Use a separate checked policy for document SVG.
- Give declarative descriptions a checked data API with registered actions and bounded input.
- Add refusal tests for unsafe values, forged rich content, icons, updates, and text-to-HTML conversions. Assert final DOM state.

Until these changes are complete, raw content paths remain unsafe for untrusted data. Caller care is not the target protection.
