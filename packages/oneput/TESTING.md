This document outlines the testing policy.

We want to use nullable objects for infrastructure code - see the nullable-architecture skill. The key thing is we never reach in and modify the code in order to test it.

We can attach the problem from 2 sides.

From the top:

- playwright / e2e tests could be used on teh demo
  - these tests are a pain to write, maintain and diagnose
  - only have a few
  - treat as smoke tests and sanity checks
- top-level integration tests
  - we create a test AppObject
  - we then run it and test what we can
  - we can test behaviours like
    - "AppObject menu() is pulled when we resume"
      - we could test it indirectly by contriving things to make the pull significant

From the bottom

When possible, we isolate and extract key low-level functionality out of the controllers and other high-level constructs in Oneput and make them functions (call these "operations"). Store them in `src/lib/ops/*`. We test these exhaustively. If it makes sense to extract encapsulated units of code in the form of helper classes, we can do that to and test these heavily like oeprations. The benefit is that we make the high level code leaner as well as more reliable because it leans on well-tests lower level operations.
