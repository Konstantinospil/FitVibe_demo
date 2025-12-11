# Agent Examples and Templates

This directory contains shared examples and templates for all Cursor agents.

---

## Directory Structure

```
.cursor/agents/examples/
├── handoffs/              # Standard handoff protocol examples
├── templates/             # Common input/output format templates
├── patterns/              # Reusable code patterns (future)
├── current_state-template.md  # State file template
├── system-context-date.md     # Date/time usage guide
└── README.md             # This file
```

---

## Handoff Examples

Standard handoff protocol examples for all agents to reference:

- **standard-handoff.json** - Normal workflow handoff
- **escalation-handoff.json** - Escalation to planner or other agent
- **collaboration-handoff.json** - Collaborative work between agents
- **error-recovery-handoff.json** - Retry after failure

**Usage**: Reference these in agent files instead of duplicating examples.

---

## Templates

Common input/output format templates:

- **input-format-template.json** - Standard input format template
- **output-format-template.json** - Standard output format template

**Usage**: Reference these templates in agent documentation.

---

## Patterns

Common code patterns (to be populated):

- **controller-pattern.ts** - Controller pattern example
- **service-pattern.ts** - Service pattern example
- **repository-pattern.ts** - Repository pattern example

**Usage**: Reference patterns that appear across multiple agents.

---

## State File Template

- **current_state-template.md** - Template for agent state files

**Usage**: Copy this template when creating state files.

---

## System Context

- **system-context-date.md** - Date/time usage guide

**Usage**: Reference for date/time handling in agents.

---

## Hybrid Separation Approach

### When to Use Shared Examples

✅ **Use shared examples** for:
- Standard handoff patterns
- Common input/output formats
- Reusable code patterns

### When to Keep Examples Inline

✅ **Keep inline** for:
- Agent-specific input/output examples
- Domain-specific code examples
- Workflow examples unique to agent

---

## References

- **Standards**: `.cursor/agents/STANDARDS.md` (Examples and Templates Standards section)
- **Analysis**: `.cursor/docs/AGENT_EXAMPLES_SEPARATION_ANALYSIS.md`
- **State File Spec**: `.cursor/docs/AGENT_CURRENT_STATE_SPECIFICATION.md`

---

**Last Updated**: 2025-12-08

