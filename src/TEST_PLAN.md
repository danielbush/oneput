## Definitions

- F_ELEM (focusable element)
  - an element the user can navigate to and perform operations on
  - usually focusable elements are editable
  - includes F_REC and F_NONREC
- F_REC (focusable recursable element)
  - an F_ELEM that we can navigate into
  - usually an F_REC's contests are editable
- F_NONREC (focusable non-recursable element)
  - an F_ELEM that is non-recursable; we can focus on the outer element but not recurse into it or edit the contents using the normal dom editing provided by jsed
  - use F_NONREC's to create islands in the DOM that are managed/modified outside of jsed
  - these elements may require special edit behaviours
  - example
    - dom subtrees that were rendered by katex

## Behaviours

### Navigation

- TAB_FOCUS
  - hitting tab or shift+tab recurses depth-first
- HI_SIB
  - when a user focuses on an element via TAB_FOCUS or an action like REC_NEXT etc
