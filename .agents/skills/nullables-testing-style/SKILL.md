---
name: nullables-testing-style
description: "Use when refactoring code or writing tests in the Nullables style: choose between `new`, `.create()`, and `.createNull()`, introduce infrastructure wrappers at the environment boundary, add behavior simulation and output tracking, and write narrow, sociable, example-driven, state-based tests without mocks or spies."
---

# Nullables Testing Style

Use this skill when refactoring code or writing tests in the Nullables style.

This skill is inspired by James Shore's writing on Nullables and testing without mocks. It is this project's interpretation of those ideas, adapted for how we build and test code here. It is not an official James Shore document or canonical definition of the pattern.

The focus is practical:

- explicit construction
- `new` for the class under test
- `.createNull()` for dependencies
- light refactoring guidance instead of heavy taxonomy
- infrastructure wrappers at the environment boundary
- output tracking instead of spies
- behavior simulation for pushed events
- narrow, sociable, state-based tests
- example-driven tests that teach the design

The core idea is to test right up to the line of code that calls the environment, without actually hitting the environment. Nullables are production code with an "off" switch, not mocks, and the overall style combines narrow, sociable, state-based tests with nulled infrastructure.

## What Good Looks Like

A good nullable test:

- reads like a concrete example of how the system works
- uses real production classes with nulled dependencies
- avoids mocks, spies, patched methods, and casted partials
- asserts on state or tracked output
- uses explicit `// arrange`, `// act`, `// assert` structure
- stays DAMP rather than aggressively DRY
- illustrates one meaningful behavior, not every branch

The goal is not coverage-by-default. The goal is confidence through a few clear examples.

## Test Shape: AAA And DAMP

Prefer tests with explicit AAA structure:

- `// arrange`
- `// act`
- `// assert`

Keep blank lines between those sections when they are separate.

It is fine to collapse `act` and `assert` when that reads better, especially when:

- the action is a single line
- the assertion immediately explains why that action matters
- splitting them would add ceremony without adding clarity

Typical good shape:

```ts
// act & assert
expect(service.save("hello")).toEqual(ok(true));
```

or:

```ts
// act
cursor.moveNext();

// assert
expect(cursor.getToken()).toBe(nextToken);
```

Prefer DAMP tests ("Descriptive And Meaningful Phrases") over DRY tests. In practice that means:

- repeat a little setup when that makes the example easier to read
- repeat a little assertion logic when that keeps the behavior obvious at the test site
- optimize for local readability over helper reuse

Do not extract helpers just to remove three or four repeated lines. A good test should read top-to-bottom as a worked example without forcing the reader to jump around.

## Test Helpers

Bias toward fewer helpers in tests.

When a helper is worth keeping, it should spell out what it does in domain language. Good helper names are specific:

- `expectFocusedElement(...)`
- `expectRootFocused(...)`
- `expectTrackedWrites(...)`

Avoid vague or over-general helpers such as:

- `expectState(...)`
- `expectFocus(...)`
- `setupThing(...)`

Good helpers usually do one of these:

- remove noisy mechanical setup that is not important to the example
- package a repeated domain assertion with a precise name

Helpers should not hide the interesting part of the test. If a helper bundles several different assertions or obscures which state is being checked, inline those assertions instead.

## Start With The Test You Want

Do not begin by classifying everything.

Start with these questions:

1. What class do I want to test?
2. What dependency makes that class hard to test?
3. Where is the first real line of code that touches the environment?
4. What would I need from a nullable version of that dependency to write a clear state-based test?

Usually the answer is to introduce or improve an infrastructure wrapper.

## Infrastructure Wrappers

Infrastructure wrappers are the lowest-level classes that touch one external system and present a clean API to the rest of the code. In Shore's pattern language, infrastructure wrappers sit at the environment boundary and own the reusable nullability machinery.

Examples:

- `CommandLine` around `process.argv` and `stdout`
- `FileStore` around filesystem access
- `HttpClient` around `fetch`
- `NativeBridge` around `window.ReactNativeWebView`
- `BrowserSelection` around browser selection APIs

Good infrastructure wrappers:

- keep environment-specific code in one place
- expose behavior in the application's vocabulary
- provide `.create()` for the real environment
- provide `.createNull()` for the nulled environment
- provide configurable responses for incoming data when needed
- provide output tracking for observable writes
- provide behavior simulation when the environment pushes events inward

Shore's `CommandLine` example is the model: the wrapper owns configurable input, tracked output, and the real/null switch in production code.

### Embedded stubs

An **embedded stub** is the nulled implementation that lives *inside* the production infrastructure wrapper. It is not a test-local fake and it is not a mock. It is production code that the wrapper uses in `.createNull()`.

For example:

- `ViewportScroller.create()` uses the real browser APIs
- `ViewportScroller.createNull()` uses an embedded stub that does not scroll the real page, but can return configured element rects and track scroll requests

Why this matters:

- the real/null switch stays in production code, not scattered through tests
- tests do not patch methods or cast partial objects
- the same nullable implementation can be reused by many tests

The embedded stub should usually do three things:

1. return safe default values with no real I/O
2. accept configurable responses when tests need controlled inputs
3. record observable outputs when tests need to assert what would have happened

### Configurable responses

A **configurable response** is test-controlled input returned by a nullable dependency. Instead of rewriting production code to make testing easier, configure the nullable dependency to answer in a specific way.

Examples:

- a nullable repository returns a specific user
- a nullable command-line wrapper returns specific args
- a nullable viewport wrapper returns a specific rect for a matching element
- a nullable clock returns a chosen current time

Prefer configuring responses at construction time, close to the test, for example:

```ts
const repo = UserRepo.createNull({
  findById: (id) => (id === 'u1' ? user : null)
});
```

Sometimes a nullable dependency needs to return different values over time. In that case a queue of return values is fine:

```ts
const clock = Clock.createNull({
  now: [t1, t2, t3]
});
```

Use a queue only when the response genuinely changes over time and matching by input is not enough. Prefer matching by input when the behavior is really "return this value for this request".

## Preflight

Before writing tests, verify:

1. The class under test has `.create()` and `.createNull()` if it participates in the nullable graph.
2. Constructor dependencies also have `.createNull()`.
3. `.createNull()` can be instantiated without real I/O.
4. Observable writes can be asserted via tracking instead of call counts.
5. External pushed events can be simulated without patching internals.

If any of these fail, refactor toward the patterns below before writing more tests.

## Light Refactoring Guide

### Move down to the environment boundary

When code is hard to test, move downward through its dependencies until you find the first line that actually touches the environment.

Wrap that line in a small infrastructure wrapper.

### Then build the nullable from the bottom up

Preferred progression:

1. Extract the environment call into an infrastructure wrapper.
2. Add `.create()` and `.createNull()`.
3. Put the real environment dependency in `.create()`.
4. Put an embedded stub in `.createNull()`.
5. Add configurable responses if tests need controlled inputs.
6. Add output tracking if tests need to observe writes.
7. Add behavior simulation if the environment pushes events inward.
8. Inject the wrapper into higher-level classes.

The most reusable machinery tends to live at this lower boundary layer.

In practice, steps 4 and 5 are where many tests become dramatically simpler:

- the **embedded stub** gives you a reusable nulled environment implementation
- the **configurable responses** let the test describe what the environment should say back

Together they replace most situations where people reach for mocks, spies, patched methods, or special-case production code.

### Keep the advice light

Do not spend time forcing every class into a taxonomy before you can improve the test.

Prefer:

- one small wrapper
- one real `.create()`
- one real `.createNull()`
- one tracker if output matters
- one simulator if pushed events matter
- one or two example tests that prove the design works

## Construction Rules

### Constructors are dumb

Constructors receive already-built dependencies.

- Do not instantiate collaborators in constructors.
- Do not branch between real and null dependencies in constructors.
- Wiring callbacks and subscriptions is fine.

### Factories choose the graph

`.create()` and `.createNull()` decide whether collaborators are real or nulled.

```ts
static create() {
  return new Foo(Bar.create(), Baz.create());
}

static createNull() {
  return new Foo(Bar.createNull(), Baz.createNull());
}
```

If something must be built first, build it in the factory and pass it into `new`.

If a collaborator has its own real/null branching, keep that branching in its factory instead of pushing it into the consumer's constructor.

### Use `new` for the class under test

When testing `Foo`, prefer:

```ts
const repo = Repo.createNull({ user: existingUser });
const bus = MessageBus.createNull();
const foo = new Foo(repo, bus);
```

Why:

- the test owns the setup
- configuration is visible at the test site
- the test is not coupled to `Foo.createNull()` defaults

### Use `.createNull()` for dependencies

When `Foo` is only a collaborator of the class under test, use `Foo.createNull()`.

This keeps higher-level tests focused.

### Delayed child creation

Prefer eager instantiation by default.

Use delayed child creation only when a dependency is optional and only needed on a later path such as a click, menu action, route change, mode change, or child-flow launch.

Typical fit:

- settings screens that may open one of many child screens
- menus that launch optional tools or editors
- routers that create child app objects on demand
- flows with many possible branches where most children are never opened

Preferred shape:

```ts
static create(ctl) {
  return new Settings(ctl, {
    BindingsEditor: (params) => BindingsEditor.create(ctl, params),
    FiltersUI: () => FiltersUI.create(ctl)
  });
}
```

Pass a small `create` object into the constructor, then call `create.X()` only when the user triggers that path.

Use this pattern only when all of these are true:

- the dependency is not needed for startup
- it is only used on specific later paths
- eager construction would add meaningful cost, setup noise, or unnecessary state
- the factory object keeps the constructor clearer than eagerly building many optional children

Do not use it when:

- the dependency is cheap and almost always used
- the factory object would make the constructor harder to understand
- the laziness has no real payoff
- the factory is only hiding muddled design

## Infrastructure Wrapper Example

Copy this shape first:

```ts
class CommandLine {
  static create() {
    return new CommandLine(process);
  }

  static createNull({ args = [] } = {}) {
    return new CommandLine(new StubbedProcess(args));
  }

  constructor(proc) {
    this.proc = proc;
    this.output = [];
  }

  args() {
    return this.proc.argv.slice(2);
  }

  writeOutput(text) {
    this.proc.stdout.write(text);
    this.output.push(text);
  }

  trackOutput() {
    return { data: this.output };
  }
}
```

This closely follows Shore's `CommandLine` example, where the wrapper owns configurable responses and output tracking.

## Output Tracking

Use output tracking when code causes a collaborator to do something observable.

Examples:

- app changed
- message sent
- notification shown
- record logged
- file written

Track behavior objects, not function calls. Output tracking is a first-class nullable pattern specifically for observing what would have been sent to the environment without locking tests to call mechanics.

Good:

```ts
const appChanges = ctl.app.trackAppChanges();

expect(appChanges.data).toEqual([
  { previous: null, current: editDocument }
]);
```

Bad:

```ts
expect(runSpy).toHaveBeenCalledTimes(1);
```

## Behavior Simulation

Use behavior simulation when an external system pushes an event into the code under test.

Examples:

- browser click
- websocket message
- timer firing
- native container event

Simulation methods belong on the nullable dependency:

- `simulateElementClick(...)`
- `simulateMessage(...)`
- `simulateTimeout(...)`

They should reuse the real event path as much as possible. Shore's behavior simulation pattern is specifically about simulating environment behavior through the nullable rather than patching the consumer or inventing a disconnected path.

Preferred shape:

```ts
private handleElementClick(target: Element) {
  this.REQUEST_FOCUS(target, { scrollIntoView: false });
}

connect() {
  root.addEventListener("mousedown", (evt) => {
    evt.preventDefault();
    this.handleElementClick(evt.target as Element);
  });
}

simulateElementClick(target: Element) {
  this.handleElementClick(target);
}
```

If you are already calling the real domain API of the collaborator, that is not behavior simulation. It is just using the collaborator normally.

## State-Based Assertions

Prefer asserting:

- returned values
- resulting state
- tracked output
- domain-visible changes

Avoid asserting:

- method call counts
- private helper usage
- patched method behavior
- exact interactions unless the interaction record itself is the behavior

When asserting, prefer a few direct expectations over one opaque "state" helper. The reader should be able to see what changed without reverse-engineering a utility function.

Object interactions are implementation details; the consequences of those interactions are what the tests should care about.

## Example Pattern

Use examples that show the design clearly.

```ts
describe('EditDocument', () => {
  it('stays in the same app object when focus moves into editing', () => {
    // arrange
    const ctl = Controller.createNull();
    const appChanges = ctl.app.trackAppChanges();
    const doc = JsedDocument.createNull(root);
    const editManager = EditManager.createNull({
      document: doc,
      userInput: ctl.input,
      onError: (err) => editDocument.handleEditError(err)
    });
    const editDocument = new EditDocument(ctl, doc, editManager);
    const p1 = byId(doc, 'p1');

    editDocument.onStart();
    editManager.nav.REQUEST_FOCUS(p1);

    // act
    editManager.nav.REQUEST_FOCUS(p1);

    // assert
    expect(editManager.getMode()).toBe('editing');
    expect(appChanges.data).toEqual([]);
  });
});
```

What this example illustrates:

- explicit `new` for the class under test
- `.createNull()` for dependencies
- output tracking instead of spying on `app.run`
- assertion on resulting mode and tracked app changes

## Refactor Example

If code directly calls an environment API:

```ts
class SaveDocument {
  save(text) {
    localStorage.setItem("draft", text);
  }
}
```

Refactor toward:

```ts
class DraftStore {
  static create() {
    return new DraftStore(localStorage);
  }

  static createNull() {
    return new DraftStore(new StubbedStorage());
  }

  constructor(storage) {
    this.storage = storage;
    this.writes = [];
  }

  save(text) {
    this.storage.setItem("draft", text);
    this.writes.push({ key: "draft", value: text });
  }

  trackWrites() {
    return { data: this.writes };
  }
}

class SaveDocument {
  static create() {
    return new SaveDocument(DraftStore.create());
  }

  static createNull() {
    return new SaveDocument(DraftStore.createNull());
  }

  constructor(draftStore) {
    this.draftStore = draftStore;
  }

  save(text) {
    this.draftStore.save(text);
  }
}
```

Then test with:

```ts
const draftStore = DraftStore.createNull();
const writes = draftStore.trackWrites();
const saveDocument = new SaveDocument(draftStore);

saveDocument.save("hello");

expect(writes.data).toEqual([{ key: "draft", value: "hello" }]);
```

## What To Test

Choose a few tests that teach the system.

### For orchestrators and app-layer classes

Test:

- the main behavior
- one or two important edge cases
- tracked outputs on dependencies
- externally visible state changes

### For infrastructure wrappers

Test:

- `.createNull()` works with defaults
- configurable responses drive the right behavior
- output tracking records observable writes
- behavior simulation covers pushed external events

### For pure/value code

Use plain inputs and outputs. Do not force nullables where they do not help.

## What Not To Do

- do not use mocks
- do not use spies
- do not patch methods in tests
- do not cast hand-built objects to richer types
- do not assert call counts
- do not hide important setup in vague helpers
- do not collapse AAA structure into large setup helpers
- do not extract generic assertion helpers when a few direct expects would read more clearly
- do not use `.create()` in unit tests unless you intentionally want real infrastructure
- do not spend time inventing a classification taxonomy when a small wrapper and one good example test would clarify the design faster

## Review Checklist

When reviewing a nullable test or refactor, ask:

1. Is the class under test instantiated explicitly with `new`?
2. Are dependencies coming from `.createNull()`?
3. Is any spy or mock being used where tracking would be better?
4. Is any pushed event being faked by patching internals instead of simulation?
5. Do the assertions describe behavior instead of interactions?
6. Does the test teach something real about the design?
7. Is the lowest environment boundary wrapped in a small nullable infrastructure wrapper?
8. Does the test use clear AAA structure?
9. Are helper names specific enough to explain what they assert or set up?
10. Would the test be easier to read if one of the helpers were inlined?

## Response Pattern

When asked to apply this style:

1. Identify the class under test.
2. Identify the lowest environment boundary that makes the code hard to test.
3. Introduce or improve an infrastructure wrapper there.
4. Instantiate the class under test with `new` when the test is about that class.
5. Replace hand-built doubles with `.createNull()` dependencies.
6. Add output tracking where the test wants to know what changed.
7. Add behavior simulation where the test wants to model incoming external events.
8. Rewrite assertions to focus on state and tracked outputs.
9. Keep only the smallest set of examples that make the design clear.
