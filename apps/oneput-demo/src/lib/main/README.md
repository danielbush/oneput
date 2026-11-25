# Main demo

The `/` demo is the original `STACK_MODE` app, built before `ROUTED_MODE` and declarative AppObjects existed.

## Structure

- **Imperative stack**: An imperative `Root` AppObject sits at the bottom of the stack and pushes child AppObjects with `ctl.app.run`.
- **Feature showcase**: Most children are imperative screens — settings, outline navigation, tomato timer, `LIVE_EDIT` demos, file and directory pickers, KaTeX, date picker, ELIZA, and alerts/confirms — alongside the shared declarative async search launched via `appObjectActor`.
- **Compared with the other demos**: `/routed` uses `ROUTED_MODE` to mix imperative and declarative screens under one machine, and `/declarative` is an all-declarative `ROUTED_MODE` app.
