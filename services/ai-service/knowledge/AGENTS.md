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



