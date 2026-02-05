---
name: nullables
description: "Guide for implementing James Shore's Nullables pattern and A-Frame architecture for testing without mocks. Use when implementing or refactoring code to follow patterns of: (1) Separating logic, infrastructure, and application layers, (2) Creating testable infrastructure with create/createNull factory methods, (3) Writing narrow, sociable, state-based tests without mocks, (4) Implementing value objects, (5) Building infrastructure wrappers that use embedded stubs, or (6) Designing dependency injection through static factory methods."
---

# Nullables and A-Frame Architecture

## Overview

This skill guides implementation of James Shore's Nullables pattern and A-Frame architecture. This approach enables fast, reliable testing without mocks through:

- **A-Frame Architecture**: Separation of Logic, Infrastructure, and Application layers
- **Nullables Pattern**: Production code with an "off switch" for testing
- **Static Factory Methods**: `.create()` for production, `.createNull()` for tests
- **State-Based Testing**: Narrow, sociable tests that verify outputs instead of interactions

## When to Use This Pattern

Apply this pattern when:

- Building new applications or services with testability as a priority
- Refactoring existing code to eliminate mocks and improve test reliability
- Writing tests for code that uses nullable patterns such as classes that use static factory method `.create`.
- Creating infrastructure code that needs both production and test modes
- Designing systems where fast, reliable tests are critical
- Implementing dependency injection without heavy frameworks

## Core Principles

### 1. Three-Layer Architecture

Organize code into distinct layers:

- **Logic**: Pure business logic and value objects (no external dependencies)
- **Infrastructure**: Code interfacing with external systems (network, filesystem, databases)
- **Application**: High-level orchestration coordinating logic and infrastructure

### 2. Dual Factory Methods

Every application and infrastructure class implements:

```javascript
class ServiceClass {
  static create(config) {
    // Production instance - calls .create() on dependencies
    const dependency = Dependency.create();
    return new ServiceClass(dependency);
  }

  static createNull(config = {}) {
    // Test instance - calls .createNull() on dependencies
    const dependency = Dependency.createNull();
    return new ServiceClass(dependency);
  }

  constructor(dependency) {
    // Constructor receives instantiated dependencies
  }
}
```

### 3. Testing Without Mocks

- **Unit tests**: Use `.createNull()` - fast, sociable, no external calls
- **Integration tests**: Use `.create()` sparingly - verify live infrastructure
- Configure responses via factory: `Service.createNull({ response: data })`
- Track outputs: `service.trackSentEmails()`
- Verify state and outputs, not interaction patterns

### 4. Value Objects

- Immutable by default - represent data without behavior
- Mutable value objects allowed - use methods for in-memory transformations only
- Infrastructure operations (network, I/O) should take/return value objects, not be methods on them

## Basic Workflow

### Implementing a New Feature

1. **Identify the layer**:
   - Pure computation? → Logic layer
   - External system interaction? → Infrastructure layer
   - Coordinating workflow? → Application layer

2. **Create the class with factory methods**:
   - Add `static create()` with reasonable defaults
   - Add `static createNull()` for infrastructure and application classes
   - Use constructor for dependency injection

3. **Implement dependencies through factories**:
   - `.create()` calls `.create()` on dependencies
   - `.createNull()` calls `.createNull()` on dependencies
   - Pass instantiated dependencies to constructor

4. **Write tests**:
   - Use `.createNull()` for unit tests
   - Configure responses via factory: `Service.createNull({ response: data })`
   - Track outputs: `service.trackOutput()`
   - Verify state and return values

5. **Add integration tests (sparingly)**:
   - Use `.create()` for a few narrow integration tests
   - Verify infrastructure wrappers correctly mimic third-party behavior

### Refactoring Existing Code

1. **Separate concerns**:
   - Extract logic into pure functions/classes
   - Wrap external dependencies in infrastructure classes
   - Create application layer to orchestrate

2. **Add factory methods**:
   - Replace direct instantiation with `.create()`
   - Add `.createNull()` to infrastructure and application classes
   - Update constructors to receive dependencies

3. **Replace mocks with nullables**:
   - Remove mock setup
   - Use `.createNull()` instances
   - Configure responses on nullable infrastructure

4. **Refactor tests to be state-based**:
   - Remove interaction assertions (verify/toHaveBeenCalled)
   - Add state and output assertions
   - Use event emitters for observable state changes

## Implementation Patterns

### Pattern: Infrastructure Wrapper

Wrap third-party code, not application code. Use an embedded stub that mimics the third-party library:

```javascript
class HttpClient {
  static create() {
    return new HttpClient(realHttp); // Real HTTP library
  }

  static createNull() {
    return new HttpClient(new StubbedHttp()); // Embedded stub
  }

  constructor(http) {
    this._http = http;
  }

  async request(options) {
    return await this._http.request(options);
  }
}

// Embedded stub - mimics third-party library interface
class StubbedHttp {
  async request(options) {
    return { status: 200, body: {} };
  }
}
```

### Pattern: Logic Sandwich

Application code: Read → Process → Write

```javascript
async transfer(fromId, toId, amount) {
  // Read from infrastructure
  const accounts = await this._repo.getAccounts(fromId, toId);

  // Process with logic
  const result = this._logic.transfer(accounts, amount);

  // Write through infrastructure
  await this._repo.saveAccounts(result);
}
```

### Pattern: Event Emitters for State

Expose state changes for testing:

```javascript
class Account extends EventEmitter {
  deposit(amount) {
    this._balance += amount;
    this.emit('balance-changed', { balance: this._balance });
  }
}

// Test by observing events
account.on('balance-changed', (event) => events.push(event));
```

## Detailed Reference

For comprehensive implementation details, see **[nullables-guide.md](references/nullables-guide.md)**:

- Complete A-Frame architecture details
- Nullables pattern implementation
- Value objects (immutable and mutable)
- Testing strategies and examples
- Infrastructure wrappers and embedded stubs
- Configurable responses and output tracking
- Event emitters for state-based tests
- Implementation checklist
