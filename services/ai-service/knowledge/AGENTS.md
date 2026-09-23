# Knowledge service guide

## Implementation gate

- Implement code, configuration, tests, or documentation changes only when the
user has pasted a plan and explicitly asked for that plan to be implemented.
- When no such plan is supplied, ask whether the user wants a plan created  
before making changes (every plans will be used for other Agent implementation).
- When the user directly asks to create a plan, create it without asking this
question first.

## Plans for agents

- When creating a plan intended for another agent to implement, use the
  `writing-for-agents` skill before writing the plan.
- Create Knowledge-service plans in `services/ai-service/knowledge/plans/`.



