This is a skill file that is intended to be used for code in the same directory. You can invoke it with the review skill: /review path/to/this/dir

- Take each method for Cursor in Cursor.ts or the ones the user wants to focus on...
  - identify the key operations in lib/ops/ and lib/core; these are the load-bearing operations
  - identify any missing edge cases for these operations and write tests for them
  - in addition, if the method mutates the DOM, and implements UndoRecords with a static run method...
    - test the static run method
      - don't be exhaustive, rely on the exhaustive testing of the load bearing operations in lib/ops, lib/core
      - focus on testing key happy and sad paths
      - focus on testing for integration issues
    - test we can undo
    - test we can redo
- tests for Cursor.ts itself should be even less exhuastive, and should just test integration, such as the management of undo across multiple operations.
