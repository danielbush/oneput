# Oneput threat model

Oneput provides input, menus and controls. Host apps and library integrations
call its controllers and UI builders. Documents, agent output and config can
be untrusted. Oneput must keep that content within checked boundaries.

This source review covers content rendering. Review date: 2026-11-12.
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
