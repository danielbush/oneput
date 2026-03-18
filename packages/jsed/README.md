# jsed

## Usage

See Taskfile.yml .

## Notes

- cli/convert.ts
  - convert existing markdown files which is a format used in an early prototype of the 2br system (a separate piece of software that motivated the creation of jsed and jsed-ui)
  - convert takes markdown files (used in the prototype project "fold") and converts them and the 2br constructs into html that can then be navigated and edited. The conversion is one-way, there is no going back.
  - hasn't been looked at in a while
  - bun run build:cli
    - adds cli to `dist/`
