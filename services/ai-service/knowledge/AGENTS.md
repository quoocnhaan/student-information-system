# Knowledge service guide

## Implementation gate

- Implement code, configuration, tests, or documentation changes when the user
explicitly asks to implement a plan they pasted, named, or identified by file
path. Resolve a named plan in `plans/` and read the full plan before changing
files. If the reference matches multiple plans, ask which one they mean.
- When the user has not supplied a plan by any of those means, ask whether they
want a plan created before making changes (plans are used by other agents).
- When the user directly asks to create a plan, create it without asking this
question first.

## Plans for agents

- When creating a plan intended for another agent to implement, use the
`writing-for-agents` skill before writing the plan.
- Create Knowledge-service plans in `services/ai-service/knowledge/plans/`.

## Local workflow and schema resets

- For a local Docker development workflow change that alters persisted behavior
or schema, prefer a clean Knowledge Docker-volume reset over carrying legacy
records or compatibility code forward. This includes documents, chunks,
vectors, OCR drafts, and jobs stored in the local stack.
- Treat a volume reset as destructive: do it only when the user explicitly
asks to reset/remove Docker volumes for the current task. Never apply this
local-development rule to production or another shared environment.
- New workflows should use schemas and endpoints designed for the new behavior;
do not retain legacy workflow compatibility unless the user explicitly asks.





&nbsp;