# jsed

## Working with an agent

Type `/jsed` to orient the agent on the codebase — it will read the architecture narrative, vocabulary, and explain how the system works.

Other useful prompts:
- "What are jsed's vocabulary terms?"
- "How does EditManager wire everything together?"


## Usage

See Taskfile.yml .

## Notes

- cli/convert.ts
  - convert existing markdown files which is a format used in an early prototype of the 2br system (a separate piece of software that motivated the creation of jsed and jsed-ui)
  - convert takes markdown files (used in the prototype project "fold") and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.
  - hasn't been looked at in a while
  - bun run build:cli
    - adds cli to `dist/`
