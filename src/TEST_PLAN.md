## Definitions

- F_ELEM (focusable element)
  - an F_REC or F_NONREC
  - an element the user can navigate to and perform operations on
- F_REC (focusable recursable element)
  - an F_ELEM that we can focus on and navigate into
  - usually an F_REC's text-bearing DOM nodes are editable
- F_NONREC (focusable non-recursable element)
  - an F_ELEM that we cannot navigate within; we can focus on the element itself but not recurse into it or focus on the contents; as a result we cannot edit the text-bearing nodes; these elements may require special edit behaviours
  - use F_NONREC's to create islands in the DOM that are managed/modified outside of jsed
  - example
    - dom subtrees that were rendered by katex

## Behaviours

### Navigation

- TAB_FOCUS
  - describes the ability to hit tab or shift+tab and traverse all F_ELEM's recursively depth-first (for F_NONREC's we don't recurse into their child elements)
  - we can achieve this by just setting but `tabIndex="0"` on elements that are not already focusable
- TAB_FOCUS_NONREC_FOCUSABLE
  - F_NONREC's that contain already-focusable elements will still be accessible via the tab key
  - TODO: we may need to handle this situation
- SIB_HIGHLIGHT
  - when a user focuses on an element via TAB_FOCUS or an action like REC_NEXT etc
