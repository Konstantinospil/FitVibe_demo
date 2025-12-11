# Analysis: Separating Examples/Templates from Agent Files

**Date**: 2025-12-08
**Analysis Type**: Architectural Decision
**Status**: Recommendation

---

## Current State

### File Sizes
- Largest agent files:
  - `planner-agent.md`: 1,819 lines
  - `test_manager.md`: 1,372 lines
  - `prompt-engineer-agent.md`: 1,206 lines
  - `fullstack-agent.md`: 1,158 lines
  - `backend-agent.md`: 1,155 lines
  - `agent-quality-agent.md`: 1,078 lines

### Example Patterns Found
- **277 example patterns** across 19 agent files
- Types of examples:
  - JSON input/output examples
  - TypeScript interface definitions
  - Handoff protocol examples
  - Code pattern examples
  - Markdown template examples
  - Workflow examples

---

## Recommendation: **Hybrid Approach**

### ✅ **DO Separate** (Examples Directory)

Separate **reusable, standardized examples** into `.cursor/agents/examples/`:

#### 1. **Handoff Protocol Examples** (High Priority)
- **Location**: `.cursor/agents/examples/handoffs/`
- **Rationale**: Handoffs are standardized across all agents, highly reusable
- **Structure**:
  ```
  .cursor/agents/examples/handoffs/
    standard-handoff-example.json
    escalation-handoff-example.json
    collaboration-handoff-example.json
    error-recovery-handoff-example.json
  ```

#### 2. **Input/Output Template Schemas** (Medium Priority)
- **Location**: `.cursor/agents/examples/templates/`
- **Rationale**: JSON schemas and TypeScript interfaces are standardized
- **Structure**:
  ```
  .cursor/agents/examples/templates/
    input-format-template.json
    output-format-template.json
    review-report-template.md
  ```

#### 3. **Common Code Patterns** (Medium Priority)
- **Location**: `.cursor/agents/examples/patterns/`
- **Rationale**: Reusable code snippets that appear across agents
- **Structure**:
  ```
  .cursor/agents/examples/patterns/
    controller-pattern.ts
    service-pattern.ts
    repository-pattern.ts
    migration-pattern.ts
  ```

### ❌ **DON'T Separate** (Keep in Agent Files)

Keep **agent-specific, contextual examples** in the agent files:

#### 1. **Agent-Specific Input Examples**
- **Rationale**: Shows how THIS specific agent receives input
- **Example**: Backend agent's endpoint creation input example
- **Location**: Stay in agent file under "Input Format" section

#### 2. **Agent-Specific Workflow Examples**
- **Rationale**: Demonstrates THIS agent's specific workflow
- **Example**: Planner agent's 9-phase workflow example
- **Location**: Stay in agent file under "Processing Workflow" section

#### 3. **Domain-Specific Code Examples**
- **Rationale**: Shows THIS agent's domain-specific patterns
- **Example**: Frontend agent's React component example
- **Location**: Stay in agent file under "Code Patterns & Examples" section

---

## Proposed Directory Structure

```
.cursor/agents/
├── *.md                    # Agent configuration files (reduced size)
├── STANDARDS.md
├── HANDOFF_PROTOCOL.md
├── REGISTRY.md
└── examples/               # NEW: Reusable examples
    ├── handoffs/
    │   ├── standard.json
    │   ├── escalation.json
    │   ├── collaboration.json
    │   └── error-recovery.json
    ├── templates/
    │   ├── input-format.json
    │   ├── output-format.json
    │   └── review-report.md
    └── patterns/
        ├── controller-pattern.ts
        ├── service-pattern.ts
        └── repository-pattern.ts
```

---

## Benefits of Hybrid Approach

### ✅ Pros

1. **Reduced File Size**
   - Remove ~200-300 lines per agent file (handoff examples)
   - Smaller files are easier to navigate and maintain
   - Faster loading and parsing

2. **Single Source of Truth**
   - Handoff protocol examples in one place
   - Update once, applies to all agents
   - Consistent formatting across agents

3. **Reusability**
   - Common patterns can be referenced by multiple agents
   - Templates can be versioned independently
   - Easier to create new agents (copy templates)

4. **Maintainability**
   - Update handoff format? Change one file, not 17
   - Fix typo in common pattern? Fix once
   - Better version control (smaller diffs)

5. **Discoverability**
   - Clear location for examples
   - Easy to browse available templates
   - New developers can find examples easily

### ⚠️ Cons (Mitigated)

1. **Context Loss** ❌ → ✅ **Mitigated**
   - **Solution**: Keep agent-specific examples in files
   - Reference shared examples with clear links
   - Include brief inline references

2. **Navigation Complexity** ❌ → ✅ **Mitigated**
   - **Solution**: Use clear file references: `See .cursor/agents/examples/handoffs/standard.json`
   - Agent files remain self-contained for agent-specific info
   - Only standard examples are external

3. **Broken References** ⚠️ → ✅ **Mitigated**
   - **Solution**: Use relative paths consistently
   - Document in STANDARDS.md
   - Validate in agent-quality-agent reviews

---

## Implementation Strategy

### Phase 1: Extract Standard Examples (Low Risk)

1. **Create directory structure**
   ```
   .cursor/agents/examples/
   ├── handoffs/
   ├── templates/
   └── patterns/
   ```

2. **Extract handoff examples**
   - Identify all handoff examples in agent files
   - Create standardized handoff example files
   - Replace in agent files with references

3. **Extract common templates**
   - Extract input/output format templates
   - Create schema files
   - Update agent files to reference

### Phase 2: Update Standards (Medium Risk)

1. **Update STANDARDS.md**
   - Document example directory structure
   - Specify when to use shared vs. inline examples
   - Add validation rules

2. **Update agent-quality-agent**
   - Add validation for example references
   - Check that shared examples exist
   - Verify links are valid

### Phase 3: Update All Agents (Medium Risk)

1. **Update agent files**
   - Replace handoff examples with references
   - Replace common templates with references
   - Keep agent-specific examples inline

2. **Validate**
   - Run agent-quality-agent on all files
   - Verify all references work
   - Check file sizes reduced

---

## Recommended Approach

### ✅ **Start with Handoff Examples Only**

**Rationale**:
- Handoffs are most standardized
- Highest reuse across agents
- Easiest to extract
- Biggest file size reduction

**Action**:
1. Extract handoff examples to `.cursor/agents/examples/handoffs/`
2. Update 3-5 agents as proof of concept
3. Measure file size reduction
4. If successful, continue with templates/patterns

### 📊 Expected Impact

**File Size Reduction (per agent)**:
- Handoff examples: ~50-100 lines
- Common templates: ~30-50 lines
- Common patterns: ~40-60 lines
- **Total**: ~120-210 lines per agent

**Example**:
- `planner-agent.md`: 1,819 lines → ~1,600-1,700 lines (11-12% reduction)
- `backend-agent.md`: 1,155 lines → ~950-1,035 lines (10-18% reduction)

---

## Reference Syntax

### In Agent Files

**Reference shared example**:
```markdown
## Handoff Protocol

All handoffs must use the Standard Handoff Protocol defined in `.cursor/agents/HANDOFF_PROTOCOL.md`.

For example handoff formats, see:
- Standard handoff: `.cursor/agents/examples/handoffs/standard.json`
- Escalation handoff: `.cursor/agents/examples/handoffs/escalation.json`

**Agent-Specific Example:**

[Keep agent-specific handoff example inline here]
```

**Reference template**:
```markdown
## Input Format

The standard input format is defined in `.cursor/agents/examples/templates/input-format.json`.

**Example for this agent:**
[Agent-specific input example stays inline]
```

---

## Decision Matrix

| Factor | Separate All | Keep All | Hybrid (Recommended) |
|--------|--------------|----------|----------------------|
| File Size | ✅✅✅ Large reduction | ❌ No reduction | ✅✅ Moderate reduction |
| Maintainability | ✅✅✅ Excellent | ❌ Poor | ✅✅ Good |
| Context | ❌ Lost | ✅✅✅ Preserved | ✅✅ Preserved |
| Reusability | ✅✅✅ High | ❌ Low | ✅✅✅ High |
| Navigation | ❌ Complex | ✅✅✅ Simple | ✅ Balanced |
| Risk | ⚠️ High | ✅ Low | ✅ Low-Medium |

---

## Final Recommendation

### ✅ **YES, but Hybrid Approach**

1. **Extract standardized, reusable examples** to `.cursor/agents/examples/`
   - Handoff protocol examples (priority 1)
   - Common templates (priority 2)
   - Common code patterns (priority 3)

2. **Keep agent-specific, contextual examples** in agent files
   - Agent-specific input/output examples
   - Domain-specific code examples
   - Workflow examples

3. **Start small**: Extract handoff examples first, measure impact, then expand

4. **Benefits**:
   - 10-18% file size reduction
   - Single source of truth for standards
   - Easier maintenance
   - Better reusability

5. **Risks**: Low if implemented incrementally with validation

---

## Next Steps

1. ✅ Review this analysis
2. ⏭️ Create proof-of-concept: Extract handoff examples
3. ⏭️ Update 3-5 agents with references
4. ⏭️ Measure impact (file sizes, maintainability)
5. ⏭️ If successful, expand to templates/patterns
6. ⏭️ Update STANDARDS.md with new structure
7. ⏭️ Update agent-quality-agent validation rules

---

**Recommendation**: **Proceed with hybrid approach, starting with handoff examples**

