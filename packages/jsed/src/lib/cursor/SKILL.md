This is a skill file that is intended to be used for code in the same directory. You can invoke it with the local-lens skill.

- For each method in Cursor class in Cursor.ts or the one specified by the user
  - identify which operations in lib/ops/ and lib/core are used; these are the load-bearing operations
  - identify any operations outside lib/{cursor,ops,core}; how many? how heavily are they used
  - look at how well tested each load-bearing operation is and identify any missing cases for these operations and write tests for them (in lib/{ops,core})
  - if the method mutates the DOM, and implements UndoRecord with a static run method...
    - check for the following
      - tests for the static run method of the class
        - don't be exhaustive, rely on the exhaustive testing of the load bearing operations in lib/ops, lib/core
        - focus on testing key happy and sad paths
        - focus on testing for integration issues
      - undo tests
      - reod tests
  - the method (in the Cursor class) should also be tested but focus on
    - obvious happy/sad paths and test integration
    - exhaustive testing should happen on load-bearing operations, not here
    - integration
      - such as the management of multiple undo/redo actions after multiple operations.
