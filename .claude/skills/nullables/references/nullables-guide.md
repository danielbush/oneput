# Nullables and A-Frame Architecture Guide

## Overview

This guide covers James Shore's Nullables pattern and A-Frame architecture, enabling fast, reliable testing without mocks through sociable, state-based tests.

## A-Frame Architecture

A-Frame separates code into three distinct layers:

### 1. Logic Layer (Business Logic & Value Objects)

Pure, algorithmic code with no external dependencies. Contains business rules, calculations, and data transformations.

**Characteristics:**

- No network calls, file I/O, or external system interactions
- Fast, deterministic, purely in-memory operations
- Can be tested directly without any special setup

**Value Objects:**

- Immutable by default - once created, state doesn't change
- Mutable value objects are acceptable - can be instantiated with `.create()` and modified with methods, but methods only perform algorithmic in-memory operations
- Operations requiring network/infrastructure should be handled by infrastructure code that takes/returns value objects

### 2. Infrastructure Layer

Code that directly interfaces with the outside world (network, filesystem, databases, external APIs).

**Two types:**

- **Infrastructure Wrappers**: Low-level code that directly interfaces with external systems (HTTP clients, database connectors, filesystem operations)
- **High-level Infrastructure**: Code that depends on infrastructure wrappers (API clients, repositories, service clients)

**All infrastructure classes should implement the Nullables pattern** (see below).

### 3. Application Layer

High-level orchestration code that coordinates infrastructure and logic layers.

**Characteristics:**

- Orchestrates infrastructure calls and logic operations
- Implements business workflows
- Uses "Logic Sandwiches" pattern: read from infrastructure → process with logic → write to infrastructure
- Also implements Nullables pattern

## The Nullables Pattern

Nullables are production code with an "off switch" - they function normally except external interactions can be disabled for testing.

### Core Implementation

Every application and infrastructure class implements **two static factory methods**:

```javascript
class ApiClient {
  static create(config) {
    // Production instance with real external calls
    const httpClient = HttpClient.create(config.apiUrl);
    return new ApiClient(httpClient);
  }

  static createNull(config = {}) {
    // Test instance with nulled external calls
    const httpClient = HttpClient.createNull();
    return new ApiClient(httpClient);
  }

  constructor(httpClient) {
    this._httpClient = httpClient;
  }

  async fetchUser(userId) {
    return await this._httpClient.get(`/users/${userId}`);
  }
}
```

### Key Principles

**1. Static Factory Methods Over Constructors**

- Always use `.create()` for production instances
- Always use `.createNull()` for test instances
- Never call constructors directly from outside the class

**2. Zero-Impact Instantiation**

- Constructors should do no significant work
- Don't connect to external systems, start services, or perform long calculations in constructors
- Use separate methods like `connect()` or `start()` for initialization that has side effects
- This ensures instantiating dependency chains remains fast and predictable

**3. Parameterless Instantiation**

- `.create()` and `.createNull()` should work with no arguments (or optional arguments only)
- Provide sensible production defaults so callers don't need to specify everything
- For value objects, consider `createTestInstance()` with optional, named parameters

**4. Signature Shielding**

- Hide constructor complexity behind factory methods
- Tests call factory methods, not constructors directly
- When signatures change, only factory methods need updating (not all test call sites)

**5. Dependency Injection Through Factories**

- `.create()` calls `.create()` on dependencies
- `.createNull()` calls `.createNull()` on dependencies
- Dependencies are passed to the constructor

**6. Infrastructure Wrapper Pattern**

Low-level infrastructure wrappers use "Embedded Stubs" - they stub third-party libraries, not application code:

```javascript
class HttpClient {
  static create() {
    return new HttpClient(realHttp); // Real HTTP library (e.g., Node.js http module)
  }

  static createNull() {
    return new HttpClient(new StubbedHttp()); // Stubbed HTTP library
  }

  constructor(http) {
    this._http = http;
  }

  async request(options) {
    const response = await this._http.request(options);
    return response.body;
  }
}

// StubbedHttp - embedded stub that mimics the third-party HTTP library
class StubbedHttp {
  async request(options) {
    // Returns a canned response with default values
    return {
      status: 200,
      headers: {},
      body: {}
    };
  }
}
```

## Testing Approach

### Test Philosophy

**Narrow, Sociable, State-Based Tests:**

- **Narrow**: Each test focuses on a specific function or behavior
- **Sociable**: Tests use real dependencies (via `.createNull()`), not mocks
- **State-Based**: Tests verify outputs and observable state, not interaction patterns

### Unit Tests

```javascript
describe('ApiClient', () => {
  it('fetches user data', async () => {
    // Configure response via createNull - behavior-focused, not implementation
    const client = ApiClient.createNull({
      users: [{ id: 123, name: 'Alice' }]
    });

    // Test the behavior
    const user = await client.fetchUser(123);

    // Verify state/output
    expect(user.name).toBe('Alice');
  });

  it('handles missing user', async () => {
    // Configure only what this test cares about
    const client = ApiClient.createNull({
      users: [] // No users configured
    });

    const user = await client.fetchUser(999);

    expect(user).toBeNull();
  });
});
```

**Characteristics:**

- Use `.createNull()` instances exclusively
- Configure responses via factory parameters (behavior-focused)
- Verify outputs and state changes
- Fast execution (no real external calls)
- Sociable (hit real logic and nullable infrastructure)

### Narrow Integration Tests

Narrow integration tests verify that infrastructure wrappers correctly communicate with real external systems. They document actual system behavior and ensure embedded stubs accurately mimic it.

```javascript
describe('HttpClient (Narrow Integration)', () => {
  it('makes real HTTP requests', async () => {
    // Use .create() for live tests
    const client = HttpClient.create();

    // Hit real API
    const response = await client.request({
      method: 'GET',
      url: 'https://api.example.com/health'
    });

    // Verify it works
    expect(response.status).toBe(200);
  });

  it('handles network errors', async () => {
    const client = HttpClient.create();

    // Verify error handling matches what stub will simulate
    await expect(client.request({ url: 'https://invalid.localhost' })).rejects.toThrow();
  });
});
```

**Purpose:**

- Verify infrastructure wrappers communicate correctly with external systems
- Document actual system behavior for creating accurate embedded stubs
- Catch incompatibilities between test and production environments

**Characteristics:**

- Use `.create()` instances to test live infrastructure
- Run against isolated test systems (not shared environments)
- Small number of tests - just enough to verify wrapper behavior
- May be slower, may require test environment setup
- Keep them narrow (focused on specific infrastructure behavior)

### Configurable Responses

Configure responses from the **dependency's externally-visible behavior**, not its implementation. Use named, optional parameters so tests only configure what they care about.

```javascript
class LoginClient {
  static create(config) {
    const httpClient = HttpClient.create(config.authUrl);
    return new LoginClient(httpClient);
  }

  static createNull({
    email = 'user@example.com',
    emailVerified = true,
    userId = 'test-user-id',
    loginSucceeds = true
  } = {}) {
    // Configuration focuses on behavior (login success, user data)
    // NOT on implementation (HTTP status codes, JSON structure)
    return new LoginClient(HttpClient.createNull(), {
      email,
      emailVerified,
      userId,
      loginSucceeds
    });
  }

  constructor(httpClient, config = {}) {
    this._httpClient = httpClient;
    this._config = config;
  }

  async login(credentials) {
    if (this._config.loginSucceeds === false) {
      throw new Error('Login failed');
    }

    // In production, this would call httpClient and parse response
    // In tests, it returns configured behavior
    return {
      email: this._config.email,
      emailVerified: this._config.emailVerified,
      userId: this._config.userId
    };
  }
}

// In tests - configure only what matters for this scenario
const client = LoginClient.createNull({ emailVerified: false });
// Other parameters use sensible defaults
```

**Key principles:**

- Define responses at the behavior level (user data, success/failure)
- NOT at the implementation level (HTTP status codes, JSON structure)
- Use named, optional parameters with sensible defaults
- Tests configure only what they care about

**Sequential responses:**

For scenarios requiring multiple different responses, support both single values (repeating) and arrays (sequential):

```javascript
class DieRoller {
  static createNull({ roll = 6 } = {}) {
    // Supports single value (always returns same) or array (sequential)
    const rolls = Array.isArray(roll) ? roll : [roll];
    return new DieRoller(new StubbedRandom(rolls));
  }
  // ...
}

// Single value - always returns 6
const roller = DieRoller.createNull({ roll: 6 });

// Sequential values - returns each in order, then throws if exhausted
const sequentialRoller = DieRoller.createNull({ roll: [1, 2, 3, 4, 5] });
sequentialRoller.roll(); // 1
sequentialRoller.roll(); // 2
// ...
```

### Output Tracking

Track what infrastructure would send externally using the `track[OutputType]()` pattern. Output tracking records **behavior** (what was written), not function calls.

```javascript
const OUTPUT_EVENT = 'email-sent';

class EmailService {
  static createNull() {
    return new EmailService(new EventEmitter(), new NullMailer());
  }

  constructor(emitter, mailer) {
    this._emitter = emitter;
    this._mailer = mailer;
  }

  // Returns an OutputTracker that listens for email events
  trackSentEmails() {
    return OutputTracker.create(this._emitter, OUTPUT_EVENT);
  }

  async sendEmail(to, subject, body) {
    await this._mailer.send(to, subject, body);
    // Emit the behavior that occurred
    this._emitter.emit(OUTPUT_EVENT, { to, subject, body });
  }
}

// In tests
const emailService = EmailService.createNull();
const tracker = emailService.trackSentEmails();

await emailService.sendEmail('user@example.com', 'Hello', 'World');

const sent = tracker.data;
expect(sent[0].to).toBe('user@example.com');
```

**Key principles:**

- Use `track[OutputType]()` naming convention
- Returns an `OutputTracker` instance (not raw data)
- Emits events representing the behavior that occurred
- Works with both real and null instances

### Behavior Simulation

For infrastructure that receives events from external systems (WebSockets, message queues, etc.), add `simulate[Event]()` methods to trigger those events in tests:

```javascript
const MESSAGE_EVENT = 'message-received';

class WebSocketServer {
  static create(port) {
    return new WebSocketServer(new RealWebSocket(port), new EventEmitter());
  }

  static createNull() {
    return new WebSocketServer(new StubbedWebSocket(), new EventEmitter());
  }

  constructor(socket, emitter) {
    this._socket = socket;
    this._emitter = emitter;

    // Real path: socket events trigger shared handler
    this._socket.on('message', (clientId, data) => {
      this.#handleMessage(clientId, data);
    });
  }

  // Shared handler used by both real and simulated paths
  #handleMessage(clientId, message) {
    this._emitter.emit(MESSAGE_EVENT, { clientId, message });
  }

  // Simulate receiving a message (for tests)
  simulateMessage(clientId, message) {
    this.#handleMessage(clientId, message);
  }

  // Track messages for test verification
  trackMessages() {
    return OutputTracker.create(this._emitter, MESSAGE_EVENT);
  }
}

// In tests
const server = WebSocketServer.createNull();
const tracker = server.trackMessages();

// Simulate an incoming message
server.simulateMessage('client-1', { type: 'greeting', text: 'Hello' });

expect(tracker.data[0].message.text).toBe('Hello');
```

**Key principles:**

- Use `simulate[Event]()` naming convention
- Share code between real and simulated paths (via private handler methods)
- Simulation invokes the same handler as real events
- Combine with output tracking to verify behavior

## Event Emitters for State-Based Tests

Use event emitters to observe state changes in objects:

```javascript
class UserAccount extends EventEmitter {
  static create(userId) {
    return new UserAccount(userId);
  }

  static createNull(userId = 'test-user') {
    return new UserAccount(userId);
  }

  constructor(userId) {
    super();
    this._userId = userId;
    this._balance = 0;
  }

  deposit(amount) {
    this._balance += amount;
    this.emit('balance-changed', {
      userId: this._userId,
      newBalance: this._balance
    });
  }

  getBalance() {
    return this._balance;
  }
}

// In tests
const account = UserAccount.createNull('user-123');
const events = [];

account.on('balance-changed', (event) => {
  events.push(event);
});

account.deposit(100);

expect(events[0].newBalance).toBe(100);
expect(account.getBalance()).toBe(100);
```

## Implementation Patterns

### Pattern: Logic Sandwich

Application code follows: **Read → Process → Write**

```javascript
class TransferMoneyService {
  static create() {
    const accountRepo = AccountRepository.create();
    const transferLogic = TransferLogic.create();
    return new TransferMoneyService(accountRepo, transferLogic);
  }

  static createNull() {
    const accountRepo = AccountRepository.createNull();
    const transferLogic = TransferLogic.create(); // Logic is pure
    return new TransferMoneyService(accountRepo, transferLogic);
  }

  constructor(accountRepo, transferLogic) {
    this._accountRepo = accountRepo;
    this._transferLogic = transferLogic;
  }

  async transfer(fromId, toId, amount) {
    // Read (infrastructure)
    const fromAccount = await this._accountRepo.get(fromId);
    const toAccount = await this._accountRepo.get(toId);

    // Process (logic)
    const result = this._transferLogic.execute(fromAccount, toAccount, amount);

    // Write (infrastructure)
    await this._accountRepo.save(result.fromAccount);
    await this._accountRepo.save(result.toAccount);

    return result;
  }
}
```

### Pattern: Cascading Nullables

When `.createNull()` is called on application code, it cascades down through all dependencies:

```javascript
class Application {
  static create(config) {
    const apiClient = ApiClient.create(config.apiUrl);
    const database = Database.create(config.dbUrl);
    const emailService = EmailService.create(config.smtpConfig);
    return new Application(apiClient, database, emailService);
  }

  static createNull() {
    // All dependencies are also nulled
    const apiClient = ApiClient.createNull();
    const database = Database.createNull();
    const emailService = EmailService.createNull();
    return new Application(apiClient, database, emailService);
  }

  // ...
}
```

### Pattern: Reasonable Defaults

```javascript
class NotificationService {
  static create(config = {}) {
    // Reasonable production defaults
    const emailService = config.emailService ?? EmailService.create();
    const smsService = config.smsService ?? SmsService.create();
    const retryCount = config.retryCount ?? 3;
    const timeout = config.timeout ?? 5000;

    return new NotificationService(emailService, smsService, retryCount, timeout);
  }

  static createNull() {
    // Minimal setup for tests
    return new NotificationService(
      EmailService.createNull(),
      SmsService.createNull(),
      1, // Single attempt in tests
      100 // Short timeout in tests
    );
  }

  // ...
}
```

## Quick Reference Checklist

When implementing Nullables and A-Frame:

**Architecture:**

- [ ] Separate code into Logic, Infrastructure, and Application layers
- [ ] Logic layer has no external dependencies
- [ ] All infrastructure wrappers wrap third-party code, not application code

**Factory Methods:**

- [ ] Every class has a static `.create()` method
- [ ] Every application and infrastructure class has a static `.createNull()` method
- [ ] `.create()` and `.createNull()` work with no arguments (parameterless instantiation)
- [ ] `.create()` calls `.create()` on dependencies
- [ ] `.createNull()` calls `.createNull()` on dependencies
- [ ] Dependencies are passed to constructors

**Instantiation:**

- [ ] Constructors do no significant work (zero-impact instantiation)
- [ ] External connections use separate `connect()` or `start()` methods
- [ ] Constructor complexity hidden behind factory methods (signature shielding)

**Testing:**

- [ ] Unit tests use `.createNull()` instances exclusively
- [ ] Narrow integration tests (few) use `.create()` to verify infrastructure wrappers
- [ ] Tests are narrow, sociable, and state-based
- [ ] Configurable responses defined at behavior level, not implementation level
- [ ] Use `track[OutputType]()` for output tracking
- [ ] Use `simulate[Event]()` for behavior simulation
- [ ] Event emitters expose state changes for testing
