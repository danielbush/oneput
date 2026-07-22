# Testing policy

This document outlines the testing policy.

## Motivation

Tests should buy us confidence to

- upgrade code
- avoid regressions when adding or changing something
- give us confidence in the event we need to swap out the reactivity engine (currently svelte/sveltekit)

## Use nullable objects for infrastructure code

See the nullable-architecture skill. Dependency injection is assumed.

## Test for outcomes not interactions:

- passing a spy or a programmed mock is not ideal for testing as it tests interactions
- that means when we inject nulled infrastructure we should avoid programming it like a mock or a double; we're not testing if it gets called or interacted with;
- instead we use state-based testing (think: outcomes instead of interactions) by emitting and tracking events as a result of exercising the code
- only resort to emitting and tracking events if there is no other way eg we can't test the result because it doesn't test that a side-effect occurred
- it goes without saying that monkey patching or module mocking is strictly forbidden; this is doubly-heinous in that you are testing interactions (not outcomes) and manually reaching into the code

## Attack the problem from 2 sides.

From the top:

- playwright / e2e tests could be used on oneput-demo and the visual mockups
  - these tests are a pain to write, maintain and diagnose
  - only have a few
  - treat as smoke tests and sanity checks
- top-level integration tests
  - we create a test AppObject
  - we then run it and test what we can
  - we can test behaviours like
    - "AppObject menu() is pulled when we resume"
      - we could test it indirectly by contriving things to make the pull significant
      - or we use state based testing as referred to in nullable-architecture skill.

From the bottom

When possible, we isolate and extract key low-level functionality out of the controllers and other high-level constructs in Oneput and make them functions (call these "operations"). Store them in `src/lib/ops/*`. We test these exhaustively. If it makes sense to extract encapsulated units of code in the form of helper classes, we can do that to and test these heavily like oeprations. The benefit is that we make the high level code leaner as well as more reliable because it leans on well-tests lower level operations.

## Consumer tests

Provide a test controller that allows the consumer to run and exercise their AppObjects.
