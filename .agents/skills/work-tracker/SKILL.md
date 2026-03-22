---
name: work-tracker
description: "Create and manage work items, tickets, and tracking artifacts in a project's work/ directory. Also handles session continuity, summarisation, and searching past work. Use when the human wants to create a ticket, track work, log a decision, review the backlog, move items between statuses, scan what's in flight, summarise what was done in a session, recall past work and decisions, or continue from a previous session. Triggers on phrases like: 'create a ticket', 'let's track this', 'create a work item', 'what's in the backlog', 'what's active', 'move this to done', 'summarise this session', 'write up what we did', 'remember when we...', 'what did we do with...', 'let's continue', 'where were we', 'what was I working on'. Bootstraps the work/ directory structure on first use if it doesn't exist."
---

# Work Tracker

Create and manage work items in a project's `work/` directory. Also summarises sessions and searches past work. Sits on top of the project's vocabulary and architecture (in `docs/`) — work-tracker handles what you were doing recently and last time, what was on your mind, and what was bothering you. The vocabulary and architecture layer handles what the project is about and how it works.

## Bootstrap

If `work/` doesn't exist in the project root, create the full structure before doing anything else:

```
work/
  active/       → items being worked on
  done/         → completed items (moved here, not deleted)
  discussion/   → clarifying ideas and ongoing high-level thinking
  backlog/      → prioritised queues of future work
.sessions/      → per-user session logs (can be committed or gitignored)
```

### Backlog files

- **Single project**: `work/backlog/main.md`
- **Monorepo / workspace**: `work/backlog/{package-name}.md` — one file per package

On bootstrap, create `work/backlog/main.md`. If the project is a monorepo or workspace (multiple packages), create one file per package instead.

Each backlog file gets this header:

```markdown
# Backlog

Items near the top get worked on first. Each item is an initial draft — improve wording and break out into individual files when ready to work on.

Grep-friendly: `grep -A 3 "^## " work/backlog/*.md` gives a quick index across all backlogs.

---
```

## Work item format

Each work item is a markdown file with frontmatter:

```markdown
---
id: SHORT_UPPER_SNAKE_CASE__WORK
status: active | done | discussion
created: YYYY-MM-DD
summary: one-line summary
outcome: written when closing — what actually happened, what didn't, what was absorbed elsewhere
---

# type: Title

Body text — the initial proposal, plan, or discussion.

## Changes

Track important changes as they happen — decisions made, approaches tried, things learned. This is the ticket's own history. Use vocabulary terms where applicable. Each entry should be dated.

- **2026-03-20** — decided X because Y
- **2026-03-21** — switched approach from A to B; A didn't work because...

## Tasks

- [ ] First thing to do
- [ ] Second thing to do
- [x] Already done

## Housekeeping

Optional. Things to do in addition to the main work — cleanup, follow-ups, related chores that don't warrant their own ticket.

```

### Fields

- **id** — short, unique, UPPER_SNAKE_CASE with `__WORK` suffix (double underscore to visually separate). Used for cross-referencing between items (e.g. "see SHARED_UNDERSTANDING__WORK"). Keep it descriptive but brief.
- **status** — matches the directory it lives in: `active`, `done`, or `discussion`
- **created** — date the item was created
- **summary** — one line, used for scanning
- **outcome** — written when closing the ticket. What actually happened, what didn't, what was absorbed elsewhere. A future reader should be able to read `summary:` (the intent) and `outcome:` (the result) and understand the full arc.

### Title prefix

Use conventional commit style prefixes: `feat:`, `refactor:`, `fix:`, `chore:`, `docs:`. If the type isn't obvious, leave it unclassified.

### File naming

`YYYYMMDD.<type>.<slug>.md`

Examples:
- `20260320.feat.entry-point-questions.md`
- `20260320.chore.explore-pi-harness.md`

In a monorepo with packages, add the package name: `YYYYMMDD.<package>.<type>.<slug>.md`

## Discussion items (`work/discussion/`)

Discussion items serve two purposes:

1. **Clarifying ideas before action** — when an idea isn't yet concrete enough for a backlog item or active ticket, it lives here while the human and agent work out what it means and what actionable outcomes it leads to.
2. **Ongoing high-level thinking** — some discussions are never "done" in the way a ticket is. They capture thematic, strategic ways of thinking that evolve over time and inform other work without being work items themselves.

Discussion items use the same format as other work items (frontmatter, status, changes) but with `status: discussion`. They don't need tasks or a clear endpoint. When a discussion crystallises into something actionable, create a new item in `active/` or the relevant backlog file and reference the discussion.

## Session log

Each user has a session log at `.sessions/$USER.md` (e.g. `.sessions/danb.md`). Determine `$USER` from the system environment or ask on first use.

The session log has a different focus from work items. Work items track *what's being built* — changes, decisions, tasks. The session log tracks *where the human's head is at* — what they were thinking about, what's bothering them, what concerns cut across tickets or don't belong to any ticket. It may reference work items but doesn't have to.

### Format

```markdown
## YYYY-MM-DD

### What happened
- Brief summary of the session — what was discussed, explored, decided
- Can reference work items but doesn't need to mirror their Changes sections

### On my mind
- What the human was thinking about, concerned with, or mulling over
- Open questions, unresolved tensions, things that feel off
- Cross-cutting concerns that span multiple tickets or no ticket at all
- This is the headspace that work items don't capture

### Open threads
- TICKET_ID__WORK — brief note (optional, only if relevant)
```

### Rotation

Rotate by month: `.sessions/danb.2026-03.md`. When a new month starts, begin a new file. The agent should only read the current month's file (and optionally the tail of the previous month if the session is near the boundary). This keeps context usage bounded.

### When to write

Append to the session log at the end of a session — when the human says "summarise", "write up what we did", or when the conversation is clearly wrapping up. The session log and work item updates can happen in the same operation.

## Operations

### Start / continue a session

When the human says "let's continue", "where were we", "what was I working on", or starts a new session:

1. Read the `summary:` frontmatter from the project's theme docs (e.g. `docs/discussion-driven-development.md`, `docs/themes.md`) if they exist. Briefly remind the human what the project is about.
2. Read the last entry in `.sessions/$USER.md` — this tells you what happened, what was on their mind, and which threads were open.
3. Scan `work/active/` — read the Status section and checked/unchecked Tasks from each active item. This tells you the factual state of work across recent sessions.
4. Present a summary that covers:
   - **Last session**: what happened and what was on the human's mind
   - **Current state of work**: which active items have progress, which are stalled, what's next
5. Offer options:
   - Pick up a thread (if multiple are active)
   - **Review the backlog?** — `grep -A 3 "^## " work/backlog/*.md` for a quick index
   - **Dive into the themes?** — read the full theme docs and walk through them

The session log gives you the *feel* of where they left off. The work items give you the *facts*.

### Create a work item

When the human says "create a ticket", "let's track this", "create a work item", or similar:

1. If it's future work (not something to start now), add it to a backlog file. Otherwise, create a file in `work/active/`.
   - **Which backlog?** If there's only `main.md`, use it. If multiple backlogs exist, infer the package from context (file being discussed, directory, etc.) or ask.
2. Draft the item with frontmatter, a title, and body from what the human described.
3. If it belongs in the backlog:

```markdown
## type: Title
- id: THE_ID
- drafted: YYYY-MM-DD
- summary: one-line summary

Body text.
```

### Move an item

When the human says "this is done", "close the ticket", "promote this to active", or similar:

1. Update the `status:` in frontmatter
2. Move the file to the matching directory (`work/active/` or `work/done/`)

When closing a ticket (moving to done):
1. Draft an `outcome:` line for the frontmatter — what actually happened, what didn't, what was absorbed elsewhere
2. Present the draft outcome to the human for review before writing it
3. Once confirmed, add the `outcome:` field, update `status: done`, and move to `work/done/`

When promoting a backlog item to active:
1. Remove it from its backlog file (glob `work/backlog/*.md` to find it if needed)
2. Create a file in `work/active/`

### Scan / review

When the human says "what's active", "what's in flight", "show me the backlog", or similar:

- **Active items**: list files in `work/active/`, show id + summary from frontmatter
- **Backlog**: run `grep -A 3 "^## " work/backlog/*.md` for a quick index across all backlogs. If the human asks about a specific package, target that file.
- **All statuses**: scan both directories

### Cross-referencing

Items can reference each other by id (e.g. "relates to SHARED_UNDERSTANDING__WORK"). When creating an item that relates to another, mention the id in the body. Don't over-formalise this — a mention is enough.

### Summarise a session

When the human says "summarise this session", "write up what we did", "capture this", or at the end of a session, do two things:

**1. Update work items** — for each active ticket that was worked on:
- Update the Status section to reflect current state
- Check off completed Tasks
- Update the frontmatter `summary:` if it's shifted
- If no ticket exists for this work, create one in `work/active/`

**2. Append to session log** — add an entry to `.sessions/$USER.md` with:
- **What happened** — conceptual changes, grouped by theme. Use vocabulary terms (UPPER_SNAKE_CASE) from `docs/vocab/` when they apply.
- **On my mind** — what the human was thinking about, concerned with, open questions. Capture the headspace, not just the deliverables.
- **Open threads** — which work items are active and where they stand.

Keep both concise. Focus on decisions and the why; the what is in the code. The frontmatter `summary:` on work items is the most important line — optimise it for scanning.

### Search past work

When the human says "remember when we...", "what did we do with...", or asks about previous sessions, past decisions, or earlier implementations:

1. Glob for files across `work/done/`, `work/active/`, and `work/backlog/`.
2. Match the query against filenames first (fast path) — the filename scheme encodes type and topic.
3. If filename matches are found, read their frontmatter summaries. Present matches with status, date, and summary so the human can pick which to dive into.
4. If no filename matches, grep the files for the query term in their content, including vocabulary terms (UPPER_SNAKE_CASE).
5. Only read the full body if the human asks to go deeper. If multiple matches, list them and let the human choose.

## Conventions

- Keep items concise. The initial version is a draft — it gets refined as work progresses.
- Don't delete items. Move to `work/done/` when complete.
- The backlog is ordered by priority — items near the top get worked on first.
- When an item is too big, break it into smaller items and link them via id references.
