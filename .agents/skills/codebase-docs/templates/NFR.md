# Non-functional requirements

How the system must be built, whatever it does.

- Solutions must admit to graphical and declarative representations.
  - So the human does not have to read lines of code, but understands how the system is structured (state machines, reactive signal graph, etc).
- Write code so that almost every line, up to the line that does I/O, can be tested quickly with no I/O. See CODE.md.
- The solution runs on <X, Y, Z>, over <A, B, C>, as named combinations (eg desktop + local data, desktop + cloud data, phone + cloud data).
  - Say what each combination implies, eg "data can be uploaded to a cloud account, so the system can run in the cloud".
- All HTML is responsive.
- Telemetry (eg effect-ts).
- Typed errors (eg effect-ts).
- Built-in concurrency and other primitives (eg effect-ts).
