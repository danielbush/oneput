# Vocabulary

Terms are UPPER_SNAKE_CASE. Use them in agent output to stay in the shared conceptual frame.

## Architecture

### DEEP_MODULE
A module whose public interface is simple relative to the complexity it absorbs internally. Top-level files show *what* (the interface); `lib/` or internals show *how* (the implementation). Callers get a small, stable surface; complexity is hidden behind it. The opposite — a shallow module — exposes most of its complexity through its interface, pushing the burden onto callers.

## Side-Effect Boundaries

Code is classified by where its side effects reach. This is the primary lens for deciding what needs the nullable treatment.

### PURE
Code with no side effects. Given the same inputs, always produces the same outputs, touches nothing else. Functions, computations, transformations. No special treatment needed.

### IN_MEMORY
Code that mutates things passed to it or held in memory, but never crosses the process boundary. Examples: manipulating a DOM node passed as an argument, mutating a data structure, updating in-memory state. Fine as-is — no nullable machinery needed. Mutable VALUE_OBJECTs live here too.

### OUTSIDE_WORLD
Code that performs I/O across the process boundary: network calls, disk access, database queries, environment reads, third-party service calls. **This is the target for the nullables pattern.** OUTSIDE_WORLD code needs to be wrapped, made nullable, and injected.

## Code Entities

The kinds of code units the agent encounters, grouped by their relationship to OUTSIDE_WORLD side effects.

### Talks to the outside world

#### INFRASTRUCTURE_WRAPPER
A class whose sole purpose is to interface with one external system (network, disk, database, environment). Provides a clean API matching the application's needs. Has DUAL_FACTORY. Contains an EMBEDDED_STUB for its NULLABLE form. Also called a "Client" (e.g., `HttpClient`, `DiskClient`). This is the leaf of the dependency graph — where OUTSIDE_WORLD code lives after refactoring.

#### NULLABLE_CLASS
An infrastructure or application class that has DUAL_FACTORY and receives INFRASTRUCTURE_WRAPPERs (or other NULLABLE_CLASSes) as INJECTED_INFRA. Does not contain OUTSIDE_WORLD code directly — instead, it orchestrates injected dependencies that do. `.createNull()` injects NULLABLE versions of those dependencies. An application-level class is effectively a high-level NULLABLE_CLASS because it holds instances that ultimately talk to the outside world.

### Does not talk to the outside world

#### PURE code
Functions or classes in the PURE category. No DUAL_FACTORY needed. If stateless, plain functions are fine. If stateful (in-memory manipulation only), a class with `.create()` is fine but no `.createNull()` required.

#### VALUE_OBJECT
An immutable (or mutable-for-IN_MEMORY-ops) class representing data. Has `.create()` (may require all params) and `.createTestInstance()` (sets convenient defaults). No `.createNull()` needed because VALUE_OBJECTs don't do I/O. Mutable VALUE_OBJECTs that manipulate in-memory state are fine — they're IN_MEMORY, not OUTSIDE_WORLD.

## Refactoring Concepts

### HARDWIRED_INFRA
OUTSIDE_WORLD code that is imported and used directly inside a class or function rather than injected through the CREATE_BOUNDARY_RULE. PURE and IN_MEMORY code is not HARDWIRED_INFRA — only code that crosses the process boundary. This is the primary refactoring target: extract into an INFRASTRUCTURE_WRAPPER and inject it. The opposite is INJECTED_INFRA.

### INJECTED_INFRA
An OUTSIDE_WORLD dependency that has been properly extracted into an INFRASTRUCTURE_WRAPPER (or NULLABLE_CLASS) and is injected through the CREATE_BOUNDARY_RULE. The "after" state of refactoring HARDWIRED_INFRA. For the class under test to be testable, every piece of INJECTED_INFRA must itself have `.createNull()` — if it doesn't, you need to recursively refactor that dependency first, bottoming out at INFRASTRUCTURE_WRAPPERs with EMBEDDED_STUBs.

### CREATE_BOUNDARY_RULE
The rule that all dependency `.create()` calls must be lexically inside the class's own static `.create()` method (and correspondingly `.createNull()` calls inside `.createNull()`). The static factory is the boundary where dependencies are born and injected into the constructor. Finding a `.create()` call inside an instance method or constructor is a CREATE_BOUNDARY_RULE violation — the fix is either immediate instantiation in the static factory or DELAYED_INSTANTIATION via a FACTORY_OBJECT.

## Nullables Pattern

### NULLABLE
An instance created via `.createNull()`. Executes the same code paths as a production instance, line for line, but never interacts with the outside world. The "off switch" for OUTSIDE_WORLD communication.

### DUAL_FACTORY
The pair of static methods `.create()` and `.createNull()` on a class. `.create()` returns a production instance; `.createNull()` returns a NULLABLE. Required on INFRASTRUCTURE_WRAPPERs and NULLABLE_CLASSes.

### EMBEDDED_STUB
A stub implementation of the third-party code, placed in the same file as the INFRASTRUCTURE_WRAPPER. Used inside `.createNull()` to replace the real external dependency. Stubs only the third-party interface, not your own code. Implements the minimum needed. In statically-typed languages, use a Thin Wrapper (custom interface matching only the methods actually used).

### CONFIGURABLE_RESPONSE
Parameters accepted by `.createNull()` that control what the NULLABLE returns. Described from the perspective of observable behavior, not implementation. A human reading the test should see at a glance what outcome is being configured. The EMBEDDED_STUB translates these into the low-level responses the real system would produce.

### FACTORY_OBJECT
An object of factory functions passed to a constructor for DELAYED_INSTANTIATION: `{ Bar: (...) => Bar.create(...), Baz: (...) => Baz.create(...) }`. The instance calls `create.Bar(...)` when it needs a `Bar`. `.createNull()` passes a version with nulled factories. Factories can accept runtime parameters from the instance, keeping decision logic in the factory rather than the instance.

### DELAYED_INSTANTIATION
Pattern where a dependency is not created upfront in `.create()` but deferred via a FACTORY_OBJECT. Used when a dependency is only needed conditionally or after some event. Contrast with immediate instantiation where `.create()` calls `Dependency.create()` and passes the instance to the constructor directly.

## Testing

### OUTPUT_TRACKING
Pattern for verifying that interactions with the outside world occurred (and in what order) without mocks. An INFRASTRUCTURE_WRAPPER emits events when external interactions happen. A `trackX()` method returns a Tracker that listens for those events. `tracker.data` exposes the recorded events. Keeps tests state-based and outcome-focused.

### BEHAVIOR_SIMULATION
Methods on a NULLABLE (typically `simulateX()`) that trigger the same code paths as real external events (e.g., a client connection arriving). Shares code with real event handlers to ensure consistency between real and nulled behavior.
