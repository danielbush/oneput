# Oneput threat model

Oneput provides input, menus and controls. Host apps and library integrations
call its controllers and UI builders. Documents, agent output and config can
be untrusted. Oneput must keep that content within checked boundaries.

This source review covers content rendering. Review date: 2026-11-13.
It does not prove runtime exploitation or browser policy parity.

## Trust boundary and protections

Script injection can read page content and accessible storage, change controls,
and use the host app's authority.

- Strings stay text, including messages, filter highlights and labels.
- Rich UI fields require `SafeHtml` from `sanitiseHtml`. Runtime provenance
  and insertion-context checks refuse forged values.
- FChild and Flex check tags, attributes, URLs and styles before server
  output, mount and update.
- UI icons use bounded geometry. Registration stores checked copies;
  rendering checks again. Unknown or invalid icons use a fixed fallback.
- Builder handlers, hooks and attachments run code by design. They are not
  a checked data format for agent descriptions. Apps control IDs and classes.

See [Safe content in Oneput](docs/safe-content.md) for the APIs, policy rules,
refusals and warning behaviour. These UI checks do not secure editor documents.

## Most at risk now

The bounded KaTeX demo checks compiler output with an independent formula
policy before insertion. `task check` enforces a read-only HTML sink scan.
Raw parsing boundaries and test fixtures have explicit exceptions.

Production build DOM refusal is tested separately. Browser document cases,
UI native/fallback parity, CSP and Trusted Types tests are written but have
not been run. Browser behaviour remains unverified. See
[SAFE_HTML step 6](../../work/backlog/SAFE_HTML.md#6-enforce-the-contract).

The active-content gaps in jsed load, paste, creation, conversion and export
are closed with one document policy. Node checks preserve FOCUS and identity;
export checks detached clones. UI SafeHtml remains a separate boundary.

Remote images and CSS loading are accepted document risks for now. A sender
can learn that a file was opened; document CSS can change the host page's
appearance. A later option could **block remote content in files from
elsewhere**, as email clients do. That option is not built.
CLI conversion has no DOM check and is out of scope because it runs on the user's own files.
See [Jsed's document boundary](../jsed/THREAT_MODEL.md#most-at-risk-now).

## Remaining work

[SAFE_HTML](../../work/backlog/SAFE_HTML.md#recommendation-and-small-releases)
is the single release plan and remaining-sink inventory. It includes current
source locations, completed commits and open work. Keep that list there.

## Other review areas

These areas need a separate threat review:

- Key bindings and global shortcuts, including dispatch from other controls.
- Clipboard access and host clipboard integrations.
- Storage and validation of stored binding values.
- Network destinations, response handling and size limits.
- Focus and input claims that can receive typed secrets.
- Denial of service from large menus, inputs and nested UI trees.
