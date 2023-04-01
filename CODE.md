# How this code is organised and tested

90% of the tests should be fast, deterministic  and easy to write.  This usually means no network calls.

**The main principle is to try make as much of the code as possible deterministic and isolate and separate anything that isn't.**

In practice this often means functions that always return the same output given the same inputs.  This excludes functions with side-effects such as calls to the network or file system.   Because this is javascript, we include functions that take global state (state that lives between function calls on the heap) as an input to be transformed into an output (via mutation) because javascript is single-threaded so there are no race conditions or memory corruption.

On the flip side, we try to quarantine and keep as small as possible the following types of code: 

- code with side-effects (network calls, "invisible" modifications to global state such as setting up event handlers etc)
- code that initializes state and environment, sets things up, and configures other code, sets up event handlers (side-effects), creates or sets up global state, sets ups up side-effects (to talk to the outside world)
- any non-deterministic code

As an example of the thing we are trying to avoid:  consider a class that performs both deterministic calculations but also side-effects (such as network calls) that could result in unpredictable behaviour or states in the class.  Mixing theses 2 types of code into a class like this makes it harder to read and reason through the class and how it behaves in the context of the rest of the system especially if there are other similar classes.  If side-effects need to be called in a complex sequence, we could do this perhaps in a function always striving to extract and encapsulate any determininstic implementation logic so as to keep it as clear and bare as possible.

- `src/app/` contains "non-deterministic" code.
- `src/lib/` contains "deterministic" code.

I've had issues following the testing-library philosophy and trying to test the whole system in a behavioural way, including symptoms such as: things not working and exorbitant amounts of time spent arranging and executing tests that try to stand a whole system up as much as possible whether the network is mocked or not. See RTL_FAIL in ISSUES.md. This has led to the above approach to code organisation and leads to the following testing approach:

- Tests for "deterministic" code should be very easy to write and fast to run because they're "deterministic" (using the above definition).  We always try to test "through" deterministic code (including 3rd part dependencies) and test from the highest level of code that is directly configured by the "non-deterministic" code.  This is so that are tests are as close as possible to a real scenario.  If necessary we can then test lower level code if it helps clarify, document or bring certainty.
- Tests for "non-deterministic" code may be unashamedly superficial with lots of code mocks that make assumptions about the code.  Remember that we strive to minimize and isolate this type of code as much as possible.  If a piece of code organises other code, we test how it organises but may code mock the results and side-effects.

We can write more complex "end-to-end" tests that test the "whole system" using cypress or karma, but if we do there will be a lot less of these because live tests are painful: slow(er) to write, slower to run and slower to diagnose/fix.  My hope is that organising the code as described above in a way reminiscent to functional programming will mostly offset any loss of certainty from this testing approach.
