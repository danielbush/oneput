---
status: done
completed: 2026-03-14
summary: Created walk2.ts with independent visit/descend params, replacing walk.ts's conflated filter/ignoreDescendents. All original tests ported plus new tests for visit/descend separation.
---

I want to create a new version of packages/jsed/src/lib/walk.ts (OLD_WALK) .
To minimize disruption I want to create a parallel version packages/jsed/src/lib/walk2.ts (NEW_WALK)

The key change is the recursive walking interface.

OLD_WALK has params

- filter - determines what can get visited and descent
- ignoreDescendents - determine whether to descend filtered nodes
  
What I want instead is

NEW_WALK has params

- visit - determines what gets visited but does not control descent
- descend - determines whether to descend node regardless of whether it was visited

So the interface becomes

```ts
export function* findNextNode(
  start: ParentNode | ChildNode,
  // Rename `limit` in OLD_WALK to `ceiling` in NEW_WALK.
  ceiling: ParentNode | null,
  params: {
    visit?: (node: ParentNode | ChildNode) => boolean,
    descend?: (node: ParentNode | ChildNode) => boolean,
    visitStart?: boolean, // defaults to false
    visitCeiling?: boolean // defaults to false
  },
  _recurse = false
): IterableIterator<ParentNode | ChildNode>
```

Similarly for findPreviousNode.

The initial work would be

- create packages/jsed/src/lib/__tests__/walk2.test.ts
- transform the tests in packages/jsed/src/lib/__tests__/walk.test.ts to the new interface but keeping their intent
- create packages/jsed/src/lib/walk2.ts and implement the same export functions from OLD_WALK with the new parameters
- make the tests for walk2 pass
