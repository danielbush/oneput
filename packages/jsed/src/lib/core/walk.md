# Walk traversal semantics

How the walk module orders nodes — and how that differs from the "reverse
pre-order" behaviour that's easy to fall into by accident.

## Two independent axes

The walk separates two things that are easy to conflate:

- **direction** — which way we enumerate siblings/children: forward
  (`firstChild` → `nextSibling`) or backward (`lastChild` → `previousSibling`).
- **phase** — when a node is announced relative to its own children:
  - `pre` = announce the node **before** descending into it.
  - `post` = announce the node **after** coming back out of it.

Phase is **absolute**: `pre` always means parent-before-children, in _both_
directions. Direction only reverses the order siblings/children are visited — it
never changes what `pre`/`post` mean.

## The four orderings

Two directions × two phases gives four orderings. Same tree throughout:

```
1 ─┬─ 1-1
   └─ 1-2
2 ─── 2-1

forward  pre:   1, 1-1, 1-2, 2, 2-1
forward  post:  1-1, 1-2, 1, 2-1, 2
backward pre:   2, 2-1, 1, 1-2, 1-1
backward post:  2-1, 2, 1-2, 1-1, 1
```

**Forward pre** is how you read a document: a heading, _then_ its contents.
Parent before children, top to bottom.

**Forward post** announces each node only after coming back out of it — so a
parent lands after its children, siblings still left-to-right.

**Backward** never flips a list; it walks the real tree, just visiting children
right-to-left. The phase still decides parent placement: **backward pre** keeps
each parent _before_ its kids (siblings reversed); **backward post** puts each
parent _after_ its kids (siblings reversed).

Note the symmetry: reversing the direction **and** swapping the phase reverses
the whole sequence. So `backward post` is the exact reverse of `forward pre`,
and `backward pre` is the exact reverse of `forward post`.

## A 5th ordering: "reverse pre-order"

We define this ordering as the reverse of "forward pre" (above).

```
2-1, 2, 1-2, 1-1, 1
```

It's also the same as `backward post` above — but only as a _whole-tree_
ordering. When you walk the entire tree, every node is reached by descent, so
each one fires both its pre and its post in their natural spots, and a
`backward post` collector reproduces reverse-pre exactly.

That equivalence holds only while you stay inside subtrees you descend into. It
**breaks** the moment a walk has to **climb** out of `start`'s ancestors — and
the climb is where a single phase (pre or post) can no longer stand in for
reverse-pre.

The reason is an asymmetry in how an ancestor of `start` relates to `start`:

- its **pre** is _before_ `start` (a parent is announced before its children, and
  `start` lives inside it) → so the ancestor **is** a predecessor.
- its **post** is _after_ `start` (you only exit the ancestor once you've passed
  all its children, `start` included) → so the ancestor's post is **not** a
  predecessor.

So an ancestor qualifies as a predecessor **only through its pre event**. That
splits the two collectors:

```
root ─┬─ A ─┬─ A1
      │     └─ A2
      └─ B ─── B1   ← start

reverse-pre predecessors:  B, A2, A1, A      (B is the climbed parent, via its pre)
post collector:            A2, A1, A         (drops B — its post isn't a predecessor)
pre collector:             B, A, A2, A1      (keeps B, but A's subtree is parent-first)
```

Neither single phase reproduces reverse-pre:

- **post** nails the subtree ordering (parent-last) but **drops every climbed
  ancestor**, because an ancestor's post lands after `start`.
- **pre** keeps the ancestors but renders each descended subtree parent-first,
  which isn't reverse-pre's parent-last order.

Inside any single descended subtree, `post` _is_ reverse-pre. It's only the
**ancestors of `start`** — the climb — that no single phase can capture. That's
the deviation: reverse-pre is a one-visit-per-node order that, in a bounded walk,
wants _post_ for descended nodes and _pre_ for climbed ancestors at the same
time. Two phases can't both fire as one collector, so reverse-pre isn't a
primitive here — it's something a consumer reconstructs if it genuinely needs it.

## Reconstructing reverse-pre

You don't need a new phase. reverse-pre is just `findPreviousNode`'s own two-part
shape — a **climb** up `start`'s ancestors and a **descend** into each previous
sibling's subtree — with the right emit in each part:

- **descend phase** (the previous-sibling subtrees): emit each node _after_ its
  children — i.e. `post`, parent-last. That's reverse-pre's order within a subtree.
- **climb phase** (the ancestors of `start`): emit each ancestor as you exit it —
  i.e. `pre`. Their `post` lands after `start`, so it never participates.

So we just wrap `findPreviousNode` and route each phase to a single `visit` —
`post` for everything descended into, `pre` only for the climbed ancestors
(guarded by `node.contains(start)`). `visit` keeps `findPreviousNode`'s contract:
return `undefined` to keep walking, or a `Node` to stop early and return it:

```ts
function reversePreOrder(
  start: Node,
  ceiling: Node,
  visit: (node: Node) => Node | undefined
): Node | undefined {
  return findPreviousNode(start, {
    ceiling,
    pre(node) {
      // climbed ancestors only — their post never fires (it lands after start)
      if (node.contains(start)) return visit(node);
      return undefined; // keep walking
    },
    post(node) {
      // descended nodes, parent-last
      return visit(node);
    }
  });
}
```

Trace on a small tree:

```
root ─┬─ A ─┬─ A1
      │     └─ A2
      └─ B ─── B1   ← start

climb B:   pre(B),  B contains B1 ✓ → emit B
sib A:     pre(A),  A contains B1 ✗ → skip
           post(A2) → emit A2
           post(A1) → emit A1
           post(A)  → emit A
result:    B, A2, A1, A          (= reverse-pre)
```

This leans on three things `findPreviousNode` must guarantee — they're the
clean-design invariants, so the wrapper doubles as a conformance check:

1. it fires `pre` on each **climbed ancestor** (that's the only way ancestors
   enter the sequence — their `post` lands after `start`);
2. it fires `post` on **descended nodes**, parent-last, children reversed;
3. it does **not visit `start`** — otherwise `pre(start)` passes the
   `contains(start)` guard and the cut point leaks into the result.

So reverse-pre stays a derived ordering: `post` for the descended subtrees, `pre`
for the climbed ancestors. Keep it in this wrapper, not in the walk core.

## Why cursor motion doesn't need reverse-pre

Cursor motion is the main backward consumer, and it never needs this 5th ordering.
The reason: moving the CURSOR back asks **"what is the nearest preceding seat?"** —
a single LINE_SIBLING — not "give me every predecessor in a particular order." So
it's a **find-first**, not an enumeration: `findPreviousNode` with a `pre` that
returns the node as soon as it's a seat.

The whole reverse-pre vs clean-pre distinction is about where a **parent** lands
relative to its **children**. But for seat-finding that placement is invisible:

- Every node the walk descends through or climbs past on the way to a seat is a
  **non-seat container** — a LINE, an INLINE_FLOW, a transparent wrapper, an
  ancestor. The seat predicate returns `undefined` for all of them, so they're
  skipped no matter which phase they'd be announced in.
- A node that **is** a seat (TOKEN, OPAQUE) is always a leaf or opaque — it has no
  seat-children to be ordered before or after. So "parent before vs after its
  kids" simply never applies to a seat.

What _does_ matter — reaching the **nearest** seat first — comes for free from
walking **backward** (children enumerated last-to-first). The first seat the walk
hits is the closest preceding one, regardless of how the skipped containers around
it are ordered.

So cursor motion just uses `findPreviousNode` with a seat predicate. reverse-pre
only earns its keep when a consumer needs the full parent-and-child sequence
materialised in that exact order — which cursor motion never does.
