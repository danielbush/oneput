Currently TokenCursor only traverses TOKEN's, ignoring all other elements.
We need to change it so that it also focuses on F_NONINLINE elements making sure to retain the existing behaviour of automatically recursing into the text tokens of F_INLINE elements.

How I see this happening:

- getNextLineSibling walks tokens and tokens in partOfLine and non-partOfLine
- moveNext has to check if it got a token or an F_NONINLINE
- If F_NONINLINE, the cursor still calls onTokenChange with the F_NONINLINE element
- handleTokenChange in EditManager now has to check if it's a TOKEN of an F_NONINLINE; if an F_NONINLINE , it can get the `Nav` instance to FOCUS it.
- At this point the cursor is focused on the F_NONINLINE and so is the Nav instance.
- In EditDocument (apps/jsed-demo) hitting enter would do a tokenize (TokenManager) on it
- continuing to moveNext would move us past the F_NONINLINE (not recursing into it) and continuing on to the next LINE_SIBLING .

Additional considerations

- When the cursor is focused on the F_NONINLINE We should signal to the UserInput instance that it should be disabled and set the placeholder; this means
  - we need to extend the UserInput type
  - upating packages/oneput and specifically the InputController since it is used to supply an instance of UserInput


You can use jcodemunch-mcp to search on symbols, make sure to reindex the whole workspace first.
