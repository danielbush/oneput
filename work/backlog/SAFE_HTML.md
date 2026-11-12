# SAFE_HTML: security report and migration plan

## Executive summary

Oneput must be safe by default. Plain strings must stay text, and rich HTML must require a branded `SafeHtml` value created only by `packages/safe-html`. Oneput must also refuse dangerous attributes, URLs, styles, tags, and icon data at each DOM write, even when a caller bypasses TypeScript. First remove the text-to-HTML conversions in filters and alerts. Then apply the same checked contract to rich content, jsed edits and history, and demo use.
## Scope and evidence

Source review dated 2026-11-12. This report covers `packages/oneput`, `packages/jsed`, `packages/safe-html`, and the demos as example callers. Paths are relative to `/Users/danb/projects/@oneput`. Line numbers describe the files read during the review. Another agent can change them. No application code changed and no runtime security tests ran.

The search covered HTML writes, attributes, dynamic tags, styles, icon factories, and markdown in this repo. Tables group repeated callers of the same sink. HTML getters, comments, types, and assertions are not additional injection points. This source review does not prove that every risk can execute. Notes about the app (@2br and @2br-electron) moved to `@2br/THREAT_MODEL.md`.

## Threat model

Content a calling app passes to Oneput may be untrusted (documents, agent output, config, later AGENT_MENUS). Oneput must preserve that boundary through rendering, filtering, updates, and editing. Script injection can read page content and accessible storage, change UI, and use the page's network and application authority. It does not by itself grant arbitrary local file access.

`FlexParams` and `FChildParams` currently allow arbitrary attributes, tags, mount hooks, and functions (`packages/oneput/src/lib/oneput/types.ts:222`, `:364`). They are executable UI descriptions, not a safe data format for agents. Oneput needs a checked data API as well as safe write points. Cleaning only `innerHTMLUnsafe` leaves other DOM routes open.

Suppose a label contains `<img src=x onerror=...>`. Oneput first displays it as text. A search can then make `WordFilter` or `FuzzyFilter` put that text into `derivedHTML`. This conversion removes the original protection (`packages/oneput/src/lib/oneput/shared/filters/WordFilter.ts:93`, `:99`; `packages/oneput/src/lib/oneput/shared/filters/FuzzyFilter.ts:139`). Highlights must preserve text without parsing it as HTML.

Suppose a reply passed to `chatSessionItem` contains the same bytes. Its text field displays the characters without creating an image (`packages/oneput/src/lib/oneput/shared/ui/menuItems/chatSessionItem.ts:75`). Oneput must keep this text default when adding rich-content features.

## Injection inventory

High means outside data can reach an unchecked active-content surface, or a public surface would be unsafe for such data. Medium means a narrower, generated, or conditional route still needs a boundary. Low means fixed markup, escaped text, or a sanitised route under the stated assumptions. These are review priorities, not exploit scores.

### Oneput sinks and producers

| Path:line | What flows in; controller | Current protection | Risk |
|---|---|---|---|
| `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:56` | `derivedHTML`; filters or callers | Raw `@html` | High |
| `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:60` | `htmlContentUnsafe`; host, document, future agent | Raw `@html` | High |
| `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:64` | `innerHTMLUnsafe`; host or icon/content producer | Raw `@html` | High |
| `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:35`, `:44`, `:41`, `:50` | Dynamic tag and spread attributes; tree builder | No tag, attribute, or URL allowlist | High for outside trees |
| `packages/oneput/src/lib/oneput/shared/components/Flex.svelte:40`, `:49`, `:53`, `:70` | Same for containers, including nested groups | No sanitiser | High for outside trees |
| `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:17`, `:39`, `:48`; `packages/oneput/src/lib/oneput/shared/components/Flex.svelte:43`, `:64`; `packages/oneput/src/lib/oneput/lib/utils.ts:94` | Free styles/classes; builder | DOM style serialisation, not a security policy | Medium |
| `packages/oneput/src/lib/oneput/lib/icons.ts:77`, `:103` | `unsafeHTML(svgString)` and fixed missing-icon SVG | No sanitiser; fallback string is code-owned | High for caller strings; low for fallback |
| `packages/oneput/src/lib/oneput/lib/icons.ts:57` | Empty string to clear target | No outside input | Low |
| `packages/oneput/src/lib/oneput/lib/icons.ts:87`; `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:29` | Registered element factory or renderer callback | Code-owned registry; no validation of resulting nodes | Low for bundled icons; high for untrusted factories |
| `packages/oneput/src/lib/oneput/shared/filters/FuzzyFilter.ts:139` | Menu `textContent` inside highlight HTML | Callback concatenates unescaped parts | High |
| `packages/oneput/src/lib/oneput/shared/filters/WordFilter.ts:93`, `:99` | Matched and unmatched text tokens inside HTML | No escaping | High |
| `packages/oneput/src/lib/oneput/shared/ui/Alert.ts:78`, `:82` | Message/additional text; callers, service errors | Interpolation into heading/paragraph | High |
| `packages/oneput/src/lib/oneput/shared/ui/menuItems/setTimeMenuItem.ts:129` | Caller `hourLabel`, generated hour digits | Label is not escaped | Medium |
| `packages/oneput/src/lib/oneput/shared/ui/menuItems/stdMenuItem.ts:155`, `:212` | Main and bottom HTML fields; caller | Pass-through to FChild | High for outside HTML |
| `packages/oneput/src/lib/oneput/shared/ui/menuItems/stdMenuItem.ts:171`; `packages/oneput/src/lib/oneput/shared/appObjects/BindingsEditor.ts:100`, `:103`, `:147`, `:152` | Binding hints, numeric count, fixed when labels | `bindingToKbdHtml` escapes text; other values bounded (`shared/ui/kbd.ts:16`, `:36`) | Low |
| `packages/oneput/src/lib/oneput/shared/ui/menuItems/stdSkeletonMenuItems.ts:25` | Skeleton HTML, class and width | Fixed widths and markup | Low |
| `packages/oneput/src/lib/oneput/shared/ui/menuItems/chatSessionItem.ts:95` | Thinking indicator | Three fixed spans; turn text uses a separate text field | Low |
| `packages/oneput/src/lib/oneput/controllers/NativeController.ts:20`, `:27`, `:32` | Message payload URL to image `src`; sender | No source/origin/schema/URL check when `start()` is used | Medium; activation not found in this scan |
| `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:19`; `packages/oneput/src/lib/oneput/shared/components/Flex.svelte:29`, `:71` | Mount hooks and attachments | Arbitrary code by design | High if exposed to agent/plugin data |

### Demos, jsed, and safe-html

| Path:line | What flows in; controller | Current protection | Risk |
|---|---|---|---|
| `apps/oneput-demo/src/lib/main/KatexDemo.ts:37`, `:299` | User formula → KaTeX HTML → append and preview | `renderToString` at `:72`; `throwOnError: true`, no enabled trust option; no final sanitiser | Medium |
| `apps/oneput-demo/src/lib/main/AsyncSearchExample.ts:45`, `:72`, `:101` | Status messages | Fixed strings | Low |
| `apps/oneput-demo/src/lib/main/AsyncSearchExample.ts:56` | Selected service result interpolated into HTML | Current result is a plain object, normally stringifies as `[object Object]`; no escaping contract | Medium |
| `apps/oneput-demo/src/lib/main/tomatoTimer/TomatoTimer.ts:536` | Session label, time values | User label interpolated without escaping | High |
| `apps/oneput-demo/src/lib/main/Root.ts:307`; `packages/oneput/src/routes/_ui.ts:93` | Example markup | Fixed strings | Low |
| `packages/oneput/src/routes/+page.svelte:132`, `:137`, `:184`, `:189` | Example alert/confirm HTML | Fixed strings | Low |
| `packages/oneput/src/routes/stdMenuItem/+page.svelte:114`, `:144`, `:148`, `:152`, `:171`, `:192`, `:214`, `:241`, `:264` | Key hints and Lucide placeholders | Fixed strings | Low |
| `packages/oneput/src/routes/mockups/breadcrumb/_breadcrumbs.ts:120`; `packages/jsed/src/ui/oneput/lib/navcrumb/NavCrumbs.ts:76` | Breadcrumb label/qualifier, including document IDs | Both interpolated values escaped | Low |
| `apps/jsed-demo/src/lib/jsed/services/TestDocService.ts:28` | Fetched `/api/docs/test_doc` response | Raw `innerHTML`; same-origin fetch is not sanitisation | High |
| `packages/jsed/src/lib/ops/focusable/elementPatch.ts:138`, `:150` | Patch attributes and HTML; editor caller | Direct `setAttribute` and `innerHTML` | High |
| `packages/jsed/src/lib/ops/focusable/elementPatch.ts:162`, `:171` | Undo snapshot; prior DOM | Restores raw attributes/HTML, no renewed boundary | High if prior state was unsafe |
| `packages/jsed/src/lib/ops/focusable/create.ts:11`; `packages/jsed/src/lib/ops/focusable/convert.ts:14` | Element spec or destination tag; caller | UI candidates constrain normal use; low-level creation itself is not a security allowlist | Medium |
| `packages/jsed/src/lib/convert/convert.ts:8`, `:10`, `:33`, `:40`, `:44` | Markdown raw HTML, description, title → generated page | `html: true`; template metadata unescaped; no sanitiser | High when exported output is opened |
| `packages/safe-html/src/setHTML.ts:33`, `:40`, `:44` | Outside HTML to native sanitiser or DOMPurify fragment | Explicit policy; fallback self-check | Low for covered script risks; policy gaps below |
| `packages/jsed/src/ui/oneput/lib/icons.ts:42`; `apps/oneput-demo/src/lib/common/_icons.ts:52`; `packages/oneput/src/routes/_icons.ts:26` | Bundled Lucide data → DOM elements | Code-owned data and Lucide factory; no raw HTML | Low |

`EditorFocusOps.patchElement` exposes the patch path (`packages/jsed/src/editor/lib/EditorFocusOps.ts:176`). Undo is not a separate trust source, but can replay one. `EditorState.ts:282`, `:296` in `packages/jsed/src/editor/lib/` only reads HTML for export. The requested scan found no production `outerHTML` assignment, `srcdoc`, `DOMParser`, `createContextualFragment`, or `document.write` in this repo. `insertAdjacentHTML` occurred in a test only.

### Test-only writes

All rows below are low risk with code-owned fixtures. They need separate treatment when enforcing Trusted Types, but are not app content entry points. Getter assertions elsewhere were excluded.

| Path:line | Input and protection |
|---|---|
| `packages/jsed/src/test/util.ts:43`, `:193` | Fixture HTML into body; no sanitiser |
| `packages/jsed/src/editor/lib/ops/__tests__/PatchElement.test.ts:111` | Fixed fixture |
| `packages/jsed/src/lib/ops/focusable/__tests__/elementPatch.test.ts:87`, `:114` | Fixed fixtures |
| `packages/jsed/src/lib/ops/focusable/__tests__/retention.test.ts:57` | Fixed insertion fixture |
| `packages/jsed/src/lib/ops/__tests__/indicator.test.ts:7`; `packages/jsed/src/lib/ops/__tests__/focus.test.ts:63`; `packages/jsed/src/lib/ops/__tests__/ignorable.test.ts:9` | Fixture strings |
| `packages/oneput/src/lib/oneput/shared/components/Oneput.test.ts:9`; `packages/oneput/src/lib/oneput/controllers/AppController.test.ts:70` | Empty-body cleanup |
| `packages/oneput/src/lib/oneput/controllers/InputController.test.ts:39`, `:216`; `packages/oneput/src/lib/oneput/controllers/helpers/InputClaims.test.ts:6` | Empty-body cleanup |
| `packages/oneput/src/lib/oneput/shared/behaviors/liveEdit/MenuLiveEdit.test.ts:9`; `packages/oneput/src/lib/oneput/shared/behaviors/liveEdit/FocusedMenuLiveEdit.test.ts:9` | Empty-body cleanup |

## Sanitisation options

| Option | Benefit | Cost and limits | Decision |
|---|---|---|---|
| Existing safe-html display policy | Small HTML allowlist; only `href` and `title`; no classes, styles, SVG, images, or data attributes | Drops `kbd` and KaTeX structure; Oneput must also enforce URL rules at insertion | Default for untrusted rich text |
| A less restrictive named policy | Can keep required app markup, such as `kbd` and selected classes | Every added feature widens the contract; free styles/data attributes affect more than script execution | Add only proven needs; keep distinct from document policy |
| Existing document policy | Preserves editable structure, SVG, IDs, classes, aria/data attributes, comments | Broad blocklist, retains inline style and resource-capable markup; not an isolated document viewer | Keep for file loading while tightening resource/style rules |
| Native `Element.setHTML` | Parses and removes script-capable content at insertion; understands destination context | Browser availability and engine differences; does not stop all resource loads or UI deception | Prefer when available behind safe-html |
| DOMPurify fallback | Already implemented; supports HTML, SVG, and MathML | Library updates and DOM implementation matter; policy translation needs tests | Keep fallback; do not add a second wrapper |
| DOMPurify as the main path | More stable policy implementation across engines | Dependency and update burden on every browser; loses native-only simplicity | Consider if policy parity cannot be achieved |
| Trusted Types with CSP | Detects/rejects string writes to covered DOM injection sinks | Does not sanitise by itself; integration can break Svelte/library writes; does not validate every URL/style/attribute | Add after sink migration, first in Chromium validation |
| Whitelist icon renderer | No HTML parser; narrow geometry data; testable without DOM | Supports less SVG than a general sanitiser | Preferred for chrome icons |
| Remove string HTML fields, or require branded `SafeHtml` | Makes raw strings a compile-time error; smaller public API | Type assertions/JavaScript can bypass a TypeScript brand; current safe-html API sets DOM and returns `void` | Remove avoidable HTML; require checked rich content and runtime validation |

The existing package is more complete than the backlog implies. It exports `setHTML(element, unsafeHTML, policy?)` and two policies. It uses native `setHTML` when present, otherwise DOMPurify with a returned fragment and `replaceChildren` (`packages/safe-html/src/setHTML.ts:26`). It already depends on DOMPurify (`packages/safe-html/package.json:17`). There is no `SafeHtml` type or public sanitise-to-string API today.

The native safe method strips script-capable content even if a custom policy allows it. Do not replace it with `setHTMLUnsafe`: that method has a different contract. See [MDN Sanitizer API](https://developer.mozilla.org/en-US/docs/Web/API/HTML_Sanitizer_API) and [MDN setHTML](https://developer.mozilla.org/en-US/docs/Web/API/Element/setHTML).

Browser support recorded in the original review: MDN compatibility data lists Chrome/Edge from 146 and Firefox from 148. Safari and iOS Safari have no support. Keep feature detection and test native and fallback paths. Source: [MDN compatibility data](https://github.com/mdn/browser-compat-data/blob/main/api/Element.json).

Existing tests cover safe formatting, replacement, event/script/JavaScript-URL removal, document structure, and failure in happy-dom (`packages/safe-html/src/__tests__/setHTML.test.ts:6`, `:47`; `setHTML.happy-dom.test.ts:8`; `setHTML.browser.test.ts:5`, `:26`). Browser tests require native support and use local Chrome (`packages/safe-html/vitest.browser.config.ts:11`). They do not establish Safari fallback or exact native/fallback parity.

Policy changes need care:

- The fallback self-check expects both `<i>` and `<b>` to survive. A valid new policy that excludes either will fail this check. Change the health check design before adding a narrow SVG-only policy (`packages/safe-html/src/setHTML.ts:14`, `:81`).
- Policies contain mutable arrays. The fallback caches health by object identity. Make package-owned policies immutable and accept only registered policy names in the data API.
- The document policy removes `style` elements, but does not remove `style` attributes, images, or all SVG resource features (`packages/safe-html/src/policies/untrustedDocumentPolicy.ts:15`). Its comment overstates resource removal. DOMPurify does not provide a CSS safety policy for inline style. Test privacy and presentation rules separately from script removal.
- Native and DOMPurify defaults differ. For example, native `setHTML` always removes SVG `use`; broad DOMPurify configurations need an explicit shared restriction. Prefer an explicit common subset over assumptions about defaults.

DOMPurify supports the required markup families and fragment output. Its maintainers warn that changing sanitised markup later can remove its protection, and that DOM implementations must be kept safe and current. Keep the insertion boundary small and update the library promptly. See [DOMPurify documentation](https://github.com/cure53/DOMPurify).

## Icons and SVG

Oneput should resolve registered icon names through an allow-list renderer. Bundled Lucide geometry already uses element factories (`packages/jsed/src/ui/oneput/lib/icons.ts:42`; `apps/oneput-demo/src/lib/common/_icons.ts:52`; `packages/oneput/src/routes/_icons.ts:26`). Validate geometry tags, attributes, paint values, view boxes, finite numbers, and input bounds before creating nodes. Unknown icons must produce a fixed safe fallback. Remove the raw SVG helper and replace empty `innerHTML` clearing with `replaceChildren` (`packages/oneput/src/lib/oneput/lib/icons.ts:57`, `:77`). SVG text must pass through safe-html with a named SVG policy.

General document SVG is a different use case. DOMPurify can support it, but this does not replace the small icon contract. Document SVG may need links, text, gradients, or larger geometry. Decide those needs separately; forbid external references, animation, embedded HTML, and resource features unless explicitly required. Rich chat does not need SVG merely because icons do.

## Safe by default

This is the proposed Oneput API contract. It is not the current implementation. Safety must come from Oneput's types and runtime checks, not from caller care.

- **Text is the default everywhere.** Plain strings go to `textContent` or text nodes. They never become HTML. Filters return text segments and fixed emphasis nodes. Alert messages use text fields.
- **HTML requires `SafeHtml`.** Rich-content fields accept only a branded `SafeHtml` type. Only the sanitiser in `packages/safe-html` can create it after applying a registered policy. Passing a raw string is a compile-time error. The package keeps construction private and checks provenance and insertion context at runtime, so JavaScript, type assertions, and deserialised objects cannot forge authority. The current `setHTML` returns `void`; this needs a new API, not a type alias over strings (`packages/safe-html/src/setHTML.ts:26`).
- **Unsafe HTML is loud.** Remove the raw string fields. If a temporary escape hatch must remain, name it `dangerouslySetHtmlWithoutSanitising`, keep uses rare, and make each use easy to find with a scan or lint rule. It is an explicit opt-out, never the default or a fallback after sanitiser failure. Remove it after migration.
- **Validate at every write point.** Oneput drops forbidden attributes and styles before DOM insertion and emits a development warning. Apply this in production too; only the warning is development-only. Cover initial render, updates, attribute spreads, nested nodes, and any server-rendered output. Refuse string `on*` attributes, `srcdoc`, `javascript:` URLs, unsafe `data:` URLs, and other attributes outside an element-specific allow-list. Parse and normalise URLs before checking them. Check `href`, `src`, `srcset`, `action`, `formaction`, and SVG links. Reject `data:` by default; any image exception needs a narrow media-type and content rule.
- **Styles and tags are checked too.** Drop free style strings and dangerous style values, including resource URLs and rules that can cover or hide controls. Provide bounded style values and named theme tokens. Use an allow-list of tags and reserve renderer-owned IDs, classes, and attributes. Preserve correct boolean and aria semantics. A style attribute must not bypass the typed style checks.
- **Keep code separate from data.** Existing builder helpers create function handlers (`packages/oneput/src/lib/oneput/lib/builder.ts:173`, `:194`). String handlers are always refused. A separate declarative API accepts only registered event and widget names; it rejects functions, hooks, attachments, arbitrary tags, and unknown fields. Oneput checks these descriptions before building nodes and bounds tree depth, node count, and text size.
- **Icons and SVG are checked.** Accept icon names or geometry through the allow-list renderer. SVG markup requires the sanitiser. No icon field silently parses a plain string as SVG.
- **Prove each refusal.** Use type checks for raw strings in HTML fields. Use Vitest tests with detached DOM nodes for each forbidden attribute, URL, style, tag, forged `SafeHtml` value, and icon input. Assert the final DOM and tracked warnings. Use no network, file I/O, mocks, spies, or patched globals. Also check updates and jsed history replay.

The current attribute spreads permit string, boolean, and function values and can override renderer-owned values (`packages/oneput/src/lib/oneput/types.ts:224`, `:370`; `packages/oneput/src/lib/oneput/shared/components/FChild.svelte:35`, `:44`; `packages/oneput/src/lib/oneput/shared/components/Flex.svelte:40`, `:49`). TypeScript alone cannot protect these writes.

Suppose a caller passes `attr: { onclick: "alert(1)", href: "javascript:alert(1)", srcdoc: "<script>...</script>" }`. Oneput drops all three values and warns in development before writing the node. The result must be the same when the input comes from JavaScript or a type assertion. Suppose the caller passes `'<b>Hello</b>'` as text. Oneput shows those exact characters. A rich-content field rejects that raw string; only a sanitiser-created `SafeHtml` value can render permitted markup.

The same checks must cover jsed `ElementPatch.attributes`, HTML, and undo/redo. Sanitising only on file open cannot protect later editor calls. Validate before taking a history entry, keep history within the checked document contract, and test that replay cannot restore forbidden content. Do not sanitise the whole live editor DOM on every keystroke: that can break node identity, focus, and undo.

KaTeX output needs its own plan. The display policy removes classes, inline styles, and MathML, so applying it blindly will break rendering. Keep KaTeX trust disabled and use a registered formula widget with checked source/options, bounded input, and a reviewed output policy. The append path also reparses old content with `innerHTML +=`; append a checked fragment instead (`apps/oneput-demo/src/lib/main/KatexDemo.ts:37`). KaTeX documents the trust option and expansion/size limits in [its options reference](https://katex.org/docs/options.html).

Markdown conversion currently enables raw HTML. Disable it unless required, then sanitise the final rendered output because plugins also emit HTML. Escape exported title and description in their own contexts. Sanitising body content does not secure document metadata or the generated page template (`packages/jsed/src/lib/convert/convert.ts:8`, `:33`, `:40`). This follows the context-specific approach in [OWASP DOM XSS guidance](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html).

## Recommendation and small releases

Keep one safe-html package with native sanitisation and DOMPurify fallback. Make Oneput safe by default through the API and the write-point checks above. Keep document, rich-text, formula, and icon policies separate.

1. **Close text conversions.** Render Alert messages with `tag` plus `textContent`, as Confirm already does (`packages/oneput/src/lib/oneput/shared/ui/Confirm.ts:73`). Build highlights from text segments and fixed emphasis nodes. Convert demo timer labels, time labels, skeletons, thinking dots, and async status to text or fixed builder structure.
2. **Define checked content.** Add the package-owned `SafeHtml` constructor through sanitisation and runtime provenance checks. Make rich-content fields require it. Remove caller-supplied `derivedHTML` and raw string HTML fields. Resolve the fallback self-check and mutable-policy issues. Define URL, style, and resource rules for each named policy.
3. **Enforce writes.** Add one checked path for attributes, URLs, styles, and tags in FChild and Flex. Drop forbidden values and warn in development. Apply checks on mount, update, removal, and any server-rendered path. Validate `SafeHtml` at insertion; never fall back to raw HTML. If sanitisation fails, show a fixed unavailable state or the original input as text.
4. **Migrate icons and documents.** Replace `unsafeHTML` icons with checked geometry or sanitiser-created SVG. Use the same contract for demo document fetches, final markdown output, jsed patches, and undo/redo. Escape export metadata separately. Preserve valid document structure and formula rendering in regression cases.
5. **Add safe declarative data.** Define a separate checked schema for future AGENT_MENUS and DECLARATIVE_APPOBJECTS. Oneput resolves registered names and rejects forbidden fields before rendering. Keep executable builder hooks outside this data format. This follows `work/backlog/DECLARATIVE_APPOBJECTS.md:72`, section “3a. Chrome as data”.
6. **Enforce the contract.** Add the refusal tests below and a read-only sink scan with explicit fixture exceptions. A retained unsafe escape hatch must be visible to that scan. Check compatibility with browser Trusted Types as extra detection; a TypeScript `SafeHtml` brand is distinct from browser `TrustedHTML` and neither replaces attribute checks. See [MDN Trusted Types CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/require-trusted-types-for).

### Test plan

Before implementation, agree on the most important orchestration cases. Use Vitest with arrange, act, and assert sections. Assert final state and tracked output, not calls. Use `describe/test` for policy cases and a few `describe/it` integration cases.

- Refusal tests: cover each rule in “Safe by default”, including development warnings and production refusal. No network or file I/O, mocks, spies, or patched globals. Use compile-time cases to prove that raw strings fail in `SafeHtml` fields.
- Pure tests: reject unknown declarative fields and functions; check URL normalisation and protocol rules; check icon geometry and bounds; preserve highlight text exactly, including angle brackets and ampersands. No I/O is needed.
- Real DOM tests: run safe-html against detached elements in jsdom and supported real browsers. Check the resulting nodes and attributes. Cover handlers, forbidden elements, unsafe URL schemes, SVG/MathML boundaries, style/resource rules, comments, replacement, and failure. Do not simulate sanitisation with a stub and call that security coverage.
- Native/fallback parity: run the same shared policy cases in native Chromium and in a browser without native support. Test context-sensitive table content and SVG differences. Keep the existing happy-dom refusal case; do not weaken it to make a UI test pass.
- UI integration: one hostile-label filter case per filter, Alert text, rich-content update/removal, chatSessionItem text rendering, KaTeX preview/insert, and document patch → undo → redo. Assert no forbidden DOM survives and expected text/formatting remains.
- Use existing `.createNull()` dependencies, configurable responses, and tracked outputs for demo behaviour. For example, `DemoDocument.createNull()` can check formula append output without touching the page (`apps/oneput-demo/src/lib/main/KatexDemo.ts:31`). Keep real sanitiser tests separate. No mocks, spies, patched globals, or interaction-count checks.

The `jsed-test-cases` skill can turn a document fixture or failing test into an interactive route under `apps/jsed-demo/src/routes/test-cases/` for manual review. That is a later optional aid, not work done for this report.

### Content for packages/oneput/THREAT_MODEL.md

Maintain the threat model (`packages/oneput/THREAT_MODEL.md:1`) with:

- Trust sources and owners; text is the default; no agent output is trusted code.
- A table of supported content policies, allowed markup, resources, links, and failure behaviour.
- The single rich-content boundary and safe API examples; separate names for package `SafeHtml` and browser `TrustedHTML`.
- Icon registration rules and the checked geometry path.
- Attribute, tag, URL, style, class, ID, event, and widget rules for code-owned trees versus outside descriptions.
- Document load, patch, history, export, and markdown rules; known preservation limits.
- Browser support and native/fallback tests; dependency update responsibility.

Keep package internals in source comments and the cross-system flow in architecture docs. Link this report for the migration rationale.

## Open questions and residual risks

- Does chat need rich HTML at all, or only plain text and checked markdown? Current replies are text. Preserve that default until a concrete need exists.
- Which document features must survive: inline CSS, images, SVG references, MathML, forms, comments, and jsed data attributes? Sanitised does not mean private, visually isolated, or inert.
- Does Oneput render rich content on the server? Its checked boundary must cover initial output as well as browser updates.
- What is the minimum attribute and action grant set for each AGENT_MENUS description? Do not use the current builder types as its schema.
- Test native/fallback policy parity before broadening policies. An allowlist that looks equivalent in TypeScript can have different parser and namespace behaviour in each engine.
- Keep dependencies and browser engines current. Bound large documents, formulas, SVG paths, and description trees to reduce denial-of-service risk.
- This review did not execute payloads or prove runtime exploitability. It identifies source-level trust failures and controls that need runtime validation. Recheck line references and current source before implementation because parallel work can change them.
