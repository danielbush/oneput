# Oneput monorepo

## Technical notes

### Taskfile

We use taskfile.dev to run tasks including run-scripts in package.json.

| Feature | Recommended approach |
| :--- | :--- |
| **Project Structure** | Use `includes` with `dir` to scope execution. |
| **Env Loading** | Use **Task-level** `dotenv` inside leaf Taskfiles. |
| **Overrides** | Use `dotenv: ['.env.local', '.env']` for local overrides. |
| **Context Switch** | Pass variables via CLI: `task deploy ENV=prod`. |
| **Power User** | Use `direnv` to manage envs outside of Taskfile entirely. |
