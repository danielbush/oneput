---
name: local-lens
description: "Use when reviewing, auditing, improving, or analysing code in a specific directory, especially when the user says `/review path/to/dir`, asks to apply the Local Lens, or points at a directory that may contain local guidance. This skill looks for a `SKILL.md` file in the target directory and applies those directory-specific instructions before working with the code."
user_invocable: true
---

# Local Lens

Use this skill to review, audit, improve, or analyse code using guidance that lives beside the code.

A Local Lens is a `SKILL.md` file in a code directory. It is the source of truth for that directory's focused guidance. This skill is only the generic adapter that finds it, reads it, and applies it.

## Workflow

1. Identify the target from the user's request.
   - With no argument, discover Local Lens files in the project.
   - For `/review path/to/dir`, use `path/to/dir`.
   - For "apply the Local Lens to path/to/dir", use `path/to/dir`.
   - For "$local-lens cursor" or "apply the Local Lens for cursor", search for Local Lens files in project paths that include `cursor`, case-insensitively.
   - If the user points at a file, use that file's containing directory unless they explicitly say otherwise.
2. Check for `SKILL.md` in the target directory.
3. If `SKILL.md` exists, read it completely before reviewing code.
4. Apply the local `SKILL.md` instructions to the code in that same directory.
5. If the local instructions name specific files, methods, edge cases, or test strategy, follow those details.
6. Generate a report of actions needed.
7. Store the report as `REPORT.YYYYMMDD.md` in the target directory, using the current local date.
8. Present findings in normal review style: bugs and risks first, then open questions, then brief summary.

## Discovery Mode

When the user invokes Local Lens without a target:

1. Search the project for `SKILL.md` files that are Local Lens files.
2. Exclude agent skill directories such as `.agents/skills/**`, `.codex/skills/**`, and user/global skill directories.
3. Exclude generated or dependency directories such as `node_modules/**`, `dist/**`, `build/**`, `.svelte-kit/**`, and coverage output.
4. Show the matching directories and a one-line summary if the file has one.
5. Ask the human which Local Lens to apply, unless there is exactly one match.

The goal is to help the human discover focused subsystem guidance without accidentally treating installed agent skills as codebase Local Lens files.

## Fuzzy Target Mode

When the user provides a short argument that is not an existing path, treat it as a case-insensitive path search term.

For example:

- `$local-lens cursor` matches directories whose path contains `cursor` and have a `SKILL.md`
- `$local-lens selection` matches directories whose path contains `selection` and have a `SKILL.md`

If there is exactly one match, apply that Local Lens.

If there are multiple matches, offer two choices:

- disambiguate by choosing one matching directory
- apply all matching Local Lens files at the same time with subagents, if subagent tools are available

If subagent tools are not available, say so and offer to apply them one at a time.

## Missing Local Guidance

If the target directory does not contain `SKILL.md`, say that no Local Lens was found for that directory.

Then ask the human whether they want one of these:

- review the directory using the project's normal review standards
- look in a parent directory for broader `SKILL.md` guidance
- create a new Local Lens for that directory

Do not silently invent directory-specific rules when the local file is missing.

## Applying Local Guidance

Local guidance may be narrow and concrete. Treat it as intentionally specific to the directory.

For example, a directory-level `SKILL.md` may say to:

- focus on specific public methods
- identify load-bearing lower-level operations
- add missing edge-case tests
- keep top-level orchestration tests sparse
- test undo/redo behavior only for operations that mutate state

Keep those rules scoped to the target directory unless the local file says otherwise.

## Report Output

When applying a Local Lens, write a report to `REPORT.YYYYMMDD.md` in the same directory as the local `SKILL.md`, unless the human explicitly asks for a different output. Use the current local date for `YYYYMMDD`.

The report should capture:

- the Local Lens target and scope
- findings, bugs, risks, and unclear expectations
- actions needed
- relevant test results if tests were run
- suggested follow-up tests or implementation work

If a report for the current date already exists, replace it with the current report unless the human asks to append or preserve history.

## Review Boundaries

Prefer reading enough code to understand the behavior under review:

- start with files named by the local `SKILL.md`
- follow imports into lower-level operations when the local guidance asks for load-bearing behavior
- inspect nearby tests before recommending new ones
- avoid broad refactors unless they directly address a review finding

If the review requires code changes or test writing, ask the human how they want to proceed before editing.
