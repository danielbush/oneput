---
name: codebase-docs
description: "Use when setting up, applying or tidying a project's guiding documents (OUTCOMES.md, NFR.md, CODE.md, CONCEPTS.md, REVIEW.md, MANAGER.md), when deciding which file a rule or decision belongs in, or when briefing a worker or reviewer agent on a codebase."
---

# Codebase docs

A small, fixed set of documents that tells humans and agents what the project is for, how it must be built, and how to tell that work is done. The human steers in plain language, agents do the work, and these files hold what both sides agree on.

The backlog, the tickets and the session notes can be messy. These files must not be. Each holds one kind of thing, so a rule has exactly one home.

## The files

Each file answers one question. If a sentence answers a different question, it belongs in a different file.

| File | The question it answers | Example (from a desktop and phone app) |
| --- | --- | --- |
| `OUTCOMES.md` | What can users do? | "I can use the app on my phone" |
| `NFR.md` | How must the system be built, whatever it does? | "runs on desktop and phone (eg Electron, Capacitor), with local and cloud data" |
| `CODE.md` | What must the code be, and which practices get it there? | "almost every line is tested fast, with no I/O; wrap the outside world" |
| `CONCEPTS.md` | What are things called? | the names used in all of the above |
| `REVIEW.md` | How do we tell that work was done well? | "every path through a state machine is tested" |
| `MANAGER.md` | How does the managing agent help the human decide? | "recommend one option, tied to an outcome" |

CODE.md is an extension of NFR.md: each coding practice serves an NFR.

The difference between NFR.md and CODE.md: NFR.md states a requirement ("almost every line can be tested quickly with no I/O"). CODE.md holds the practices that meet it ("wrap the outside world and inject a null form").

`AGENTS.md` (or `CLAUDE.md`) stays thin: it is loaded automatically, so it points to these files and keeps only operational details such as tooling, dev servers and session start and end.

## What goes in each file

### OUTCOMES.md

- Builds on the ontology in CONCEPTS.md: it identifies the key functional outcomes, written in the terms CONCEPTS.md defines.
- Outcomes are grouped under named headings (for example `THEMING_OUTCOMES`, `AGENT_CONNECTIVITY_OUTCOMES`), each a checklist of "I can …" statements, ticked when they hold. COMMENTs record the human's thinking.
- Writing them is the moment to prioritise: the order of the groups, and of the outcomes in a group, is the priority.
- They are high-level feature invariants. An unticked outcome is a goal, reached through tasks in the backlog. Once it is achieved and ticked, it is maintained: later work must not break it. They give an immediate sense of direction.
- A feature's own outcomes can live in its plan, wherever the project keeps plans, until they are settled.
- Template: [templates/OUTCOMES.md](templates/OUTCOMES.md).

### NFR.md

- How the system must be built, whatever it does: representation (declarative, visual), testability, platforms and transports, responsiveness, telemetry, errors, concurrency.
- An NFR states the requirement. Where the project has chosen a technology to meet it, the NFR can name that choice as an example ("telemetry (eg effect-ts)").
- Platform lines name the combinations explicitly (kind of app + where the data lives) and what each one implies.
- Template: [templates/NFR.md](templates/NFR.md).

### CONCEPTS.md

- ONTOLOGICAL_THINKING: the human builds an ontology of the system, so that both sides can think and program at the level of natural language. CONCEPTS.md is that ontology.
- Each term is UPPER_SNAKE_CASE, with a short definition, where it lives in the code, and how it relates to other terms. It can also hold the system's rules (for example "data flows one way").
- It is the human's file. Terms come from the human, or go by the human: an agent never adds, renames or redefines a term on its own. It may propose one, with the definition, and wait for agreement. Agents leave the human's COMMENTs alone.
- Until the human agrees to a term, an agent writes the thing with its ordinary type or file name, not in UPPER_SNAKE_CASE.
- Agents use only these upper-case names in their output, so both sides stay in the same frame. A name that is not in CONCEPTS.md is written as an ordinary type or file name.
- Larger projects have one CONCEPTS.md per package plus a root inventory.

### MANAGER.md

- The style the main (managing) agent adopts so that the human reaches the right outcomes and makes the right decisions: how it explains, what it puts in front of the human to decide, how it frames risk, and how it runs the work around those decisions.
- The manager applies REVIEW.md when working with the human, not only to finished work: it questions the human's ideas and requests with the same parsimony and scepticism.
- The manager delegates the work, small edits included, to the cheapest agent that fits, so its own context stays free for the human's decisions.
- See [templates/MANAGER.md](templates/MANAGER.md) for the defaults learned so far.

### REVIEW.md

- General review principles (parsimony, kaizen, scepticism, strong foundations) plus the project's own checkable rules for the tools and patterns it has chosen.
- Work must also follow CODE.md, so workers check their work against REVIEW.md and CODE.md before reporting, and reviewers review against both. A brief to a worker or reviewer names both.
- Template: [templates/REVIEW.md](templates/REVIEW.md).

### CODE.md

- An offshoot of NFR.md: the coding practices the project has chosen to meet its non-functional requirements. NFR.md says what the system must be (testable without I/O, inspectable as diagrams); CODE.md says how the code achieves it (wrappers and nullable I/O, state-based tests, state machines and signal graphs, a file system that shows the outline).
- Each CODE.md principle names the NFR it serves, so a practice with no NFR behind it is easy to question.
- These are the project's choices, not part of this scheme. The scheme only says that they live here, in one place, and that workers follow them.
- Template: [templates/CODE.md](templates/CODE.md), the big principles distilled. A project adjusts them and adds its own detail under each.

## Keep only what gets used

These files are worth having only while they help the human and the agents stay clear about the project. They are not paperwork.

- Create a file only when it has something to say. A small project can start with OUTCOMES.md and CODE.md, and add the others when content for them turns up.
- A file earns its place if someone reads it to make a decision: a planner checks a plan against OUTCOMES.md, a worker follows CODE.md, a reviewer checks against REVIEW.md. If nobody would notice it was gone, merge it into its neighbour or delete it.
- Short beats complete. One line per outcome, requirement or decision; detail lives in plans and code.
- Once in a while, ask of each file: did it change a decision recently? If not, trim it.

## Working with the files

- **Planning:** read OUTCOMES.md, NFR.md and CONCEPTS.md. Say which outcome the work serves. If a plan conflicts with an outcome or an NFR, say so before going on.
- **Briefing a worker or reviewer:** name CODE.md and REVIEW.md, the outcome served, and the CONCEPTS.md files that matter. Ask the worker to list what it did not test.
- **Done:** a worker checks against REVIEW.md and CODE.md, and a second reviewer (another agent or model) checks against both before the work is called ready.
- **New rule or decision:** put it in the one file whose kind it is. Do not copy it into another file; link instead.

## Applying the scheme to an existing project

Do it in small steps that the human reviews one at a time:

1. Inventory the project's current guiding files (AGENTS.md or CLAUDE.md, README, CODE.md, REVIEW.md, CONCEPTS.md, PRD, backlog) and map each section to one of the six files. Show the map to the human before moving anything.
2. Move content one file at a time, one commit per file. Move, do not duplicate. Leave a link where the content used to be only if readers would otherwise look for it there.
3. Last, trim AGENTS.md to pointers and operational details, and add the "Project docs" section from [templates/AGENTS-pointer.md](templates/AGENTS-pointer.md). AGENTS.md is loaded in every session, so this section is what makes later sessions use this skill when a rule is added or moved.
4. Note anything that does not fit any file; the human decides where it goes or whether it goes.
