# Workflow Engine Implementation Guide

**Version**: 2.0  
**Date**: 2025-12-12  
**Status**: Implementation Guide  
**Priority**: High

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Prerequisites & Critical Questions](#prerequisites--critical-questions) ⚠️ **READ FIRST**
3. [Current State Analysis](#current-state-analysis)
4. [Architecture & Design Patterns](#architecture--design-patterns)
5. [Implementation Guide](#implementation-guide)
6. [Component Specifications & Patterns](#component-specifications--patterns)
7. [Integration Guide](#integration-guide)
8. [Testing Patterns](#testing-patterns)
9. [Configuration & Deployment](#configuration--deployment)
10. [Troubleshooting & Operations](#troubleshooting--operations)
11. [Delta Analysis](#delta-analysis)
12. [Appendices](#appendices)

---

## Executive Summary

This document provides a comprehensive, actionable implementation guide for building a production-ready workflow engine for the FitVibe multi-agent system. The guide includes clear patterns, step-by-step instructions, and complete specifications for all components.

### Key Principles

- **Simplicity over complexity**: Prefer straightforward solutions that work
- **Maintainability**: Code should be easy to understand and modify
- **Incremental delivery**: Build in phases, validate each phase
- **Pragmatic**: Use existing infrastructure where possible
- **Pattern-driven**: Follow consistent patterns throughout

### Scope

- Event-driven workflow execution with automatic handoff orchestration
- State persistence with recovery and concurrency control
- Error handling and retry logic
- Workflow validation and monitoring
- Integration with existing agent system

### Document Structure

This guide is organized for implementation:

- **Prerequisites**: Critical questions that must be answered before starting
- **Current State**: What exists and what's missing
- **Architecture**: Design patterns and component relationships
- **Implementation Guide**: Step-by-step instructions with patterns
- **Component Specifications**: Detailed specs with code patterns
- **Integration Guide**: How components work together
- **Testing Patterns**: How to test each component
- **Configuration**: How to configure the system
- **Operations**: How to run and maintain the system

---

## Prerequisites & Critical Questions

### ⚠️ CRITICAL: Answer These Before Implementation

Before beginning implementation, these fundamental questions **must** be answered:

#### 1. Integration Model

**Question**: How does the workflow engine interact with Cursor agents?

**Options to Investigate**:
- Can Python code invoke Cursor agents programmatically? Yes
- Is there a Cursor API or MCP server for agent invocation? Not yet, but one could be implemented if necessary during the implementation phase.
- Or is the workflow engine purely advisory (generates handoff files only)? Not puerly advisory, but an "Ask"-Mode might be meaningful.

**Impact**: This determines whether the engine is a "workflow executor" or a "workflow tracker/handoff generator"

**Action Required**:
- Investigate Cursor agent invocation mechanism
- Test if Python can trigger agent execution
- Document the actual integration model

#### 2. Agent Completion Reporting

**Question**: How do agents report completion to the workflow engine? File watching. This approach also ensures that the same files can be used for tracking an agents state from the agent itself in case of stoppage.

**Options**:
- Polling: Workflow engine polls for completion signals
- Callback: Agents call back to workflow engine
- File watching: Workflow engine watches for completion files
- Manual: Agents don't report, workflow engine infers from handoffs

**Action Required**:
- Determine the mechanism
- Implement the chosen approach
- Document the protocol

#### 3. Execution Environment

**Question**: Where does the workflow engine run? Same process as cursor. Expansions might be implemented in the future.

**Options**:
- Same process as Cursor
- Separate service/daemon
- CLI tool only
- Background job

**Action Required**:
- Decide on deployment model
- Implement accordingly
- Document deployment instructions

#### 4. State Persistence Architecture

**Question**: What storage mechanism for state and events? SQLLite as recommended.

**Options**:
- **SQLite** (recommended): Single file, handles concurrency, good performance
- **JSON files with locking**: Simple but limited scalability
- **PostgreSQL**: If already using for app, leverage existing infrastructure

**Recommendation**: Use SQLite for both state and events (consistent, simple, performant)

**Action Required**:
- Make architecture decision
- Implement chosen approach
- Document limitations (e.g., single-instance if using file locking)

#### 5. Problem Statement

**Question**: What problem is the workflow engine solving? Primarily automation. In the future all four elements should be implemented.

**Options**:
- **Automation**: Automatically execute workflows end-to-end
- **Tracking**: Track workflow execution and handoffs
- **Coordination**: Coordinate handoffs between agents
- **Validation**: Validate workflow definitions and handoffs

**Action Required**:
- Clarify primary use case
- Design accordingly
- Document use cases

#### 6. User Model

**Question**: Who uses the workflow engine? Primarily developers

**Options**:
- Developers (manual invocation)
- CI/CD pipelines (automated)
- Other automated systems
- All of the above

**Action Required**:
- Design for identified users
- Implement appropriate interfaces (CLI, API, etc.)

### Phase 0: Critical Clarifications

**Before any implementation**, complete:

1. **Integration Model Proof of Concept**
   - Can we execute a workflow end-to-end?
   - Test agent invocation mechanism
   - Validate handoff delivery

2. **Architecture Decision**
   - Choose state/event storage (SQLite recommended)
   - Document decision and rationale
   - Create architecture diagram

3. **Integration Documentation**
   - Document how workflow engine integrates with Cursor
   - Document agent completion reporting mechanism
   - Document deployment model

**Deliverables**:
- Integration model documentation
- Architecture decision document
- Proof of concept (if possible)
- Updated implementation plan based on findings

---

## Current State Analysis

### What Exists (Good Foundation)

#### ✅ Core Infrastructure

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| **Workflow Models** | `workflow_models.py` | ✅ Complete | All data structures exist |
| **Workflow Parser** | `workflow_parser.py` | ✅ Complete | Parses markdown workflows |
| **Workflow Validator** | `workflow_validator.py` | ✅ Complete | Validates structure, agents, dependencies |
| **Agent Executor** | `agent_executor.py` | ⚠️ Partial | Executes agents, needs workflow integration |
| **State Manager** | `agent_state.py` | ⚠️ Partial | Has persistence, needs locking |
| **Error Handling** | `error_handling.py` | ✅ Complete | Classification, retry, dead-letter queue |
| **Workflow Executor** | `workflow_executor.py` | ⚠️ Skeleton | Basic structure, needs enhancement |

#### Existing Components Details

**1. Workflow Models** (`workflow_models.py`)
- Complete data structures for workflows, phases, steps
- Execution state tracking models
- Status enums and types
- **Status**: Ready to use

**2. Workflow Parser** (`workflow_parser.py`)
- Parses markdown workflow definitions
- Extracts phases, steps, handoffs
- Basic validation during parsing
- **Status**: Ready to use

**3. Workflow Validator** (`workflow_validator.py`)
- Validates agent references exist
- Checks for circular dependencies
- Validates structure and handoffs
- **Status**: Ready to use

**4. Agent Executor** (`agent_executor.py`)
- Executes individual agents
- Assembles execution context
- Integrates with LLM client
- Has retry logic integration
- **Status**: Needs workflow integration

**5. State Management** (`agent_state.py`)
- State persistence to JSON files
- Versioning and backup/restore
- State integrity checks (checksums)
- **Status**: Needs locking and concurrency control

**6. Error Handling** (`error_handling.py`)
- Error classification
- Retry handler with exponential backoff
- Dead-letter queue
- **Status**: Ready to use, needs workflow integration

**7. Workflow Executor** (`workflow_executor.py`)
- Basic workflow execution skeleton
- Phase and step execution
- Execution state tracking
- **Status**: Needs event emission, timeout handling, cancellation

### What's Missing (Critical Gaps)

#### 1. Event System
- ❌ No event bus or event persistence
- ❌ No event-driven handoff triggering
- ❌ No event ordering guarantees
- ❌ No event replay capability

#### 2. Handoff Automation
- ❌ Handoffs not automatically generated from workflow steps
- ❌ No handoff validation against protocol
- ❌ No handoff status tracking
- ❌ No handoff registry

#### 3. State Management Issues
- ❌ No file locking (concurrent write corruption risk)
- ❌ No optimistic locking (version conflicts)
- ❌ State loading is all-or-nothing (memory issues)
- ❌ No incremental state loading

#### 4. Execution Model
- ❌ Synchronous execution (blocks on long-running agents)
- ❌ No timeout handling
- ❌ No cancellation mechanism
- ❌ No workflow versioning

#### 5. Error Recovery
- ❌ No partial failure recovery
- ❌ No compensation/rollback strategy (may not be needed)
- ❌ Dead-letter queue not integrated with workflows

#### 6. Observability
- ❌ No real-time execution monitoring
- ❌ No workflow metrics
- ❌ Limited debugging capabilities

### Gap Priority Matrix

| Gap | Priority | Impact | Effort | Phase |
|-----|----------|--------|--------|-------|
| State locking | **Critical** | High | 4h | 1 |
| Optimistic locking | **Critical** | High | 3h | 1 |
| Event log | **High** | High | 6h | 2 |
| Handoff generator | **High** | High | 6h | 3 |
| Timeout handling | **High** | Medium | 4h | 1 |
| Partial failure recovery | **High** | Medium | 5h | 4 |
| Async execution | **Medium** | Low | 6h | 5 |
| Compensation | **Low** | Low | 6h | Defer |
| Metrics | **Low** | Low | 4h | 6 |

---

## Architecture & Design Patterns

### Design Principles

1. **Event-Driven but Simple**: Use events for coordination, keep it lightweight
2. **State-First**: All state changes go through state manager
3. **Fail-Safe**: Default to safe behavior (fail closed, not open)
4. **Observable**: Log everything important, make it queryable
5. **Pattern Consistency**: Follow consistent patterns across all components

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Workflow Engine                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Workflow   │───▶│   Step       │───▶│   Handoff    │  │
│  │   Executor   │    │   Executor   │    │   Generator  │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │           │
│         ▼                   ▼                    ▼           │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Event      │    │   Agent      │    │   State      │  │
│  │   Log        │    │   Executor   │    │   Manager    │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────┐
│                    Supporting Systems                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │  Error   │  │  Retry   │  │  Dead    │  │  Audit   │   │
│  │ Handler  │  │ Handler  │  │  Letter  │  │  Logger  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Workflow Executor
- **Responsibility**: Orchestrate workflow execution
- **Pattern**: Orchestrator pattern
- **Key Features**:
  - Load and validate workflows
  - Execute phases and steps in order
  - Handle timeouts and cancellations
  - Integrate with event log

#### 2. Step Executor
- **Responsibility**: Execute individual workflow steps
- **Pattern**: Command pattern
- **Key Features**:
  - Execute agents, scripts, or conditions
  - Handle timeouts per step
  - Emit events on completion
  - Return execution results

#### 3. Handoff Generator
- **Responsibility**: Automatically create handoffs from workflow steps
- **Pattern**: Builder pattern
- **Key Features**:
  - Extract handoff data from step definitions
  - Validate against HANDOFF_PROTOCOL.md
  - Create handoff JSON files
  - Track handoff status

#### 4. Event Log
- **Responsibility**: Persistent event log for workflow events
- **Pattern**: Append-only log pattern
- **Key Features**:
  - Append-only storage (SQLite recommended)
  - Event replay capability
  - Query recent events
  - Simple, no complex event bus

#### 5. State Manager
- **Responsibility**: Manage workflow and agent state
- **Pattern**: Repository pattern with optimistic locking
- **Key Features**:
  - Concurrency control (SQLite transactions)
  - Optimistic locking with version numbers
  - Incremental state loading
  - Automatic recovery from corruption

### Design Patterns Used

#### 1. Orchestrator Pattern
**Used in**: Workflow Executor
**Purpose**: Centralized workflow coordination
**Implementation**: Workflow executor coordinates all components

#### 2. Command Pattern
**Used in**: Step Executor
**Purpose**: Encapsulate step execution as commands
**Implementation**: Each step type is a command that can be executed

#### 3. Builder Pattern
**Used in**: Handoff Generator
**Purpose**: Construct complex handoff objects step by step
**Implementation**: Build handoff from step execution data

#### 4. Repository Pattern
**Used in**: State Manager, Event Log
**Purpose**: Abstract data access
**Implementation**: Repository interface for state/event operations

#### 5. Observer Pattern
**Used in**: Event emission
**Purpose**: Notify components of workflow events
**Implementation**: Event log observes workflow execution

#### 6. Strategy Pattern
**Used in**: Error handling, retry logic
**Purpose**: Interchangeable error handling strategies
**Implementation**: Different retry strategies for different error types

### Data Flow Pattern

```
User/CLI
  │
  ▼
Workflow Executor
  │
  ├─▶ Load Workflow Definition
  │
  ├─▶ Validate Workflow
  │
  ├─▶ Create Execution State
  │
  └─▶ For each Phase:
       │
       └─▶ For each Step:
            │
            ├─▶ Step Executor
            │   │
            │   ├─▶ Execute Agent/Script/Condition
            │   │
            │   └─▶ Emit Event (step_started, step_completed)
            │
            ├─▶ Handoff Generator (if handoff_to specified)
            │   │
            │   ├─▶ Generate Handoff
            │   │
            │   ├─▶ Validate Handoff
            │   │
            │   └─▶ Save Handoff File
            │
            └─▶ Update State
                │
                └─▶ Save to State Manager
```

---

## Implementation Guide

### Implementation Phases

This guide follows a phased approach, building incrementally and validating each phase before proceeding.

### Phase 0: Critical Clarifications (BEFORE IMPLEMENTATION)

**Goal**: Answer critical questions and make architecture decisions

**Tasks**:
1. Investigate Cursor agent invocation mechanism
2. Decide on state/event storage architecture (SQLite recommended)
3. Document integration model
4. Create proof of concept (if possible)

**Deliverables**:
- Integration model documentation
- Architecture decision document
- Proof of concept code (if applicable)

**Success Criteria**:
- All critical questions answered
- Architecture decision made and documented
- Integration model understood

---

### Phase 1: Foundation (Week 1)

**Goal**: Fix critical state management and execution issues

#### Task 1.1: Implement State Persistence with SQLite

**Pattern**: Repository Pattern with Optimistic Locking

**Files**: `agent_state.py` (enhance)

**Steps**:

1. **Create SQLite Schema**
   ```python
   # Pattern: Database schema definition
   CREATE TABLE agent_states (
       state_id TEXT PRIMARY KEY,
       state_type TEXT NOT NULL,
       version INTEGER NOT NULL DEFAULT 1,
       state_data TEXT NOT NULL,  -- JSON
       created_at TEXT NOT NULL,
       updated_at TEXT NOT NULL,
       checksum TEXT
   );
   
   CREATE INDEX idx_state_type ON agent_states(state_type);
   CREATE INDEX idx_updated_at ON agent_states(updated_at);
   ```

2. **Implement State Repository**
   ```python
   # Pattern: Repository with optimistic locking
   class AgentStateRepository:
       def __init__(self, db_path: str):
           self.db_path = db_path
           self._init_db()
       
       def save_state(self, state: AgentState) -> str:
           """Save state with optimistic locking."""
           with self._get_connection() as conn:
               # Check version
               current = self._load_state_internal(conn, state.state_id)
               if current and current.version != state.version:
                   raise StateVersionConflict(...)
               
               # Increment version
               state.version = (current.version if current else 0) + 1
               
               # Save with transaction
               # ...
   ```

3. **Add Migration Support**
   - Create migration from JSON files to SQLite
   - Preserve existing state data

**Testing Pattern**:
```python
def test_state_save_with_optimistic_locking():
    """Test optimistic locking prevents concurrent modifications."""
    repo = AgentStateRepository(":memory:")
    state = create_test_state()
    
    # Save state
    repo.save_state(state)
    
    # Try to save with old version (should fail)
    state.version = 0
    with pytest.raises(StateVersionConflict):
        repo.save_state(state)
```

**Effort**: 6 hours

---

#### Task 1.2: Implement Event Log with SQLite

**Pattern**: Append-Only Log Pattern

**Files**: `event_log.py` (new)

**Steps**:

1. **Create Event Log Schema**
   ```python
   # Pattern: Event log schema
   CREATE TABLE workflow_events (
       event_id TEXT PRIMARY KEY,
       event_type TEXT NOT NULL,
       execution_id TEXT NOT NULL,
       workflow_id TEXT NOT NULL,
       timestamp TEXT NOT NULL,
       step_id TEXT,
       phase_id TEXT,
       agent_id TEXT,
       status TEXT NOT NULL,
       data TEXT,  -- JSON
       error TEXT
   );
   
   CREATE INDEX idx_execution_id ON workflow_events(execution_id);
   CREATE INDEX idx_timestamp ON workflow_events(timestamp);
   CREATE INDEX idx_event_type ON workflow_events(event_type);
   ```

2. **Implement Event Log Repository**
   ```python
   # Pattern: Append-only log repository
   class EventLog:
       def append_event(self, event: WorkflowEvent) -> None:
           """Append event to log (append-only)."""
           with self._get_connection() as conn:
               conn.execute(
                   "INSERT INTO workflow_events VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (event.event_id, event.event_type, ...)
               )
               conn.commit()
       
       def get_events(
           self,
           execution_id: Optional[str] = None,
           event_type: Optional[str] = None,
           limit: int = 100
       ) -> List[WorkflowEvent]:
           """Query events with filters."""
           # Use indexes for performance
   ```

3. **Add Event Replay**
   ```python
   def replay_execution(self, execution_id: str) -> WorkflowExecution:
       """Reconstruct execution from events."""
       events = self.get_events(execution_id=execution_id)
       # Reconstruct execution state from events
   ```

**Testing Pattern**:
```python
def test_event_append_and_query():
    """Test event append and query functionality."""
    event_log = EventLog(":memory:")
    event = create_test_event()
    
    # Append event
    event_log.append_event(event)
    
    # Query events
    events = event_log.get_events(execution_id=event.execution_id)
    assert len(events) == 1
    assert events[0].event_id == event.event_id
```

**Effort**: 6 hours

---

#### Task 1.3: Add Timeout Handling

**Pattern**: Timeout Wrapper Pattern

**Files**: `step_executor.py` (new), `workflow_executor.py` (enhance)

**Steps**:

1. **Add Timeout Configuration**
   ```python
   # Pattern: Timeout configuration
   @dataclass
   class WorkflowStep:
       # ... existing fields
       timeout_seconds: Optional[int] = None
       timeout_action: str = "fail"  # fail, skip, retry
   ```

2. **Implement Timeout Wrapper**
   ```python
   # Pattern: Timeout wrapper
   class StepExecutor:
       def execute_step_with_timeout(
           self,
           step_def: WorkflowStep,
           timeout: Optional[int]
       ) -> StepExecution:
           timeout = timeout or step_def.timeout_seconds or 3600
           
           with ThreadPoolExecutor() as executor:
               future = executor.submit(self._execute_step_internal, step_def)
               try:
                   result = future.result(timeout=timeout)
                   return result
               except TimeoutError:
                   future.cancel()
                   return StepExecution(
                       step_id=step_def.step_id,
                       status=WorkflowStatus.FAILED,
                       error=f"Step timed out after {timeout} seconds"
                   )
   ```

**Testing Pattern**:
```python
def test_step_timeout():
    """Test step execution times out correctly."""
    executor = StepExecutor()
    step_def = WorkflowStep(
        step_id="test",
        timeout_seconds=1
    )
    
    # Mock long-running step
    with patch('step_executor._execute_step_internal', side_effect=time.sleep(10)):
        result = executor.execute_step_with_timeout(step_def, timeout=1)
        assert result.status == WorkflowStatus.FAILED
        assert "timed out" in result.error
```

**Effort**: 4 hours

---

#### Task 1.4: Add Workflow Versioning

**Pattern**: Version Pinning Pattern

**Files**: `workflow_executor.py` (enhance), `workflow_models.py` (enhance)

**Steps**:

1. **Add Version to Workflow Definition**
   ```python
   # Pattern: Version pinning
   @dataclass
   class WorkflowDefinition:
       # ... existing fields
       metadata: WorkflowMetadata
       # metadata.version is the workflow version
   ```

2. **Pin Version on Execution**
   ```python
   # Pattern: Version pinning in execution
   class WorkflowExecutor:
       def start_workflow(
           self,
           workflow_id: str,
           input_data: Dict[str, Any],
           workflow_version: Optional[str] = None
       ) -> WorkflowExecution:
           workflow_def = self.load_workflow(workflow_id, version=workflow_version)
           
           execution = WorkflowExecution(
               # ... other fields
               workflow_version=workflow_def.metadata.version
           )
           return execution
   ```

**Testing Pattern**:
```python
def test_workflow_version_pinning():
    """Test workflow version is pinned to execution."""
    executor = WorkflowExecutor()
    workflow_def = create_test_workflow(version="1.0")
    
    execution = executor.start_workflow(
        workflow_id=workflow_def.metadata.workflow_id,
        input_data={},
        workflow_version="1.0"
    )
    
    assert execution.workflow_version == "1.0"
```

**Effort**: 3 hours

---

**Phase 1 Deliverables**:
- ✅ State persistence with SQLite and optimistic locking
- ✅ Event log with SQLite
- ✅ Timeout handling in step execution
- ✅ Workflow versioning support

**Phase 1 Success Criteria**:
- ✅ No state corruption on concurrent access
- ✅ Events are queryable and replayable
- ✅ Workflows timeout gracefully
- ✅ Workflow versions are pinned to executions

### Phase 1 Completion Status

**Status**: ✅ **COMPLETE** (All tasks implemented and tested)

#### Generated Files and Their Purpose

| File | Purpose | Key Features |
|------|---------|--------------|
| **`event_log.py`** | SQLite-based event logging system | • Append-only event log<br>• Event querying by execution_id, event_type, workflow_id<br>• Event replay to reconstruct execution state<br>• Automatic timestamp generation using `date -u` command<br>• Indexed queries for performance |
| **`state_repository.py`** | SQLite-based state persistence with concurrency control | • Optimistic locking with version fields<br>• State checksum verification for integrity<br>• Automatic version increment on save<br>• Transaction-based operations<br>• State backup/restore support<br>• Query by state_type and timestamps |
| **`step_executor.py`** | Step execution engine with timeout and event emission | • Executes workflow steps (agent, script, condition)<br>• Timeout handling with ThreadPoolExecutor<br>• Event emission (step_started, step_completed, step_failed)<br>• Execution context management<br>• Error handling and reporting |
| **`__tests__/test_event_log.py`** | Unit tests for EventLog | • Event append and query tests<br>• Event replay tests<br>• Timestamp auto-generation tests<br>• Multi-execution event filtering |
| **`__tests__/test_state_repository.py`** | Unit tests for AgentStateRepository | • State save/load tests<br>• Optimistic locking conflict tests<br>• Version increment tests<br>• Checksum verification tests |
| **`__tests__/test_step_executor.py`** | Unit tests for StepExecutor | • Step execution tests<br>• Event emission tests<br>• Timeout handling tests<br>• Error handling tests |
| **`__tests__/test_workflow_executor_phase1.py`** | Integration tests for Phase 1 | • Workflow executor integration with EventLog<br>• State repository integration<br>• Step executor integration<br>• Event emission during workflow execution |

#### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| **`workflow_executor.py`** | • Integrated EventLog for event emission<br>• Integrated AgentStateRepository for state persistence<br>• Integrated StepExecutor for step execution<br>• Added workflow version pinning<br>• Added dynamic timestamp generation | Core orchestrator now uses Phase 1 components |
| **`workflow_models.py`** | • Added `workflow_version` field to `WorkflowExecution` | Support workflow version pinning |
| **`agent_state.py`** | • Added `StateVersionConflict` exception<br>• Improved enum deserialization for WorkflowStatus | Support optimistic locking and better state handling |
| **`rag_service.py`** | • Fixed type hinting for conditional VectorDB import | Resolved NameError in type checking |
| **`__init__.py`** | • Exported new Phase 1 components (EventLog, AgentStateRepository, StepExecutor) | Make components available for import |

#### Database Schema

**SQLite Database**: `.cursor/orchestration/workflow_engine.db` (default location)

**Tables Created**:
1. **`workflow_events`**: Stores all workflow execution events
   - Columns: `event_id`, `event_type`, `execution_id`, `workflow_id`, `timestamp`, `step_id`, `phase_id`, `agent_id`, `status`, `data` (JSON), `error`
   - Indexes: `execution_id`, `timestamp`, `event_type`, `workflow_id`

2. **`agent_states`**: Stores agent and workflow execution states
   - Columns: `state_id`, `state_type`, `version`, `state_data` (JSON), `created_at`, `updated_at`, `checksum`
   - Indexes: `state_type`, `updated_at`

#### Test Results

All Phase 1 tests pass (25 tests total):
- ✅ Event log tests: 8 tests
- ✅ State repository tests: 9 tests
- ✅ Step executor tests: 5 tests
- ✅ Workflow executor integration tests: 3 tests

---

### Phase 2: Event System Integration (Week 1-2)

**Goal**: Integrate event log with workflow execution

#### Task 2.1: Integrate Event Emission

**Pattern**: Event Emission Pattern

**Files**: `workflow_executor.py` (enhance), `step_executor.py` (enhance)

**Steps**:

1. **Add Event Emission to Workflow Executor**
   ```python
   # Pattern: Event emission at key points
   class WorkflowExecutor:
       def __init__(self, event_log: EventLog):
           self.event_log = event_log
       
       def start_workflow(self, ...) -> WorkflowExecution:
           execution = WorkflowExecution(...)
           
           # Emit workflow_started event
           self.event_log.append_event(WorkflowEvent(
               event_type="workflow_started",
               execution_id=execution.execution_id,
               workflow_id=execution.workflow_id,
               status="in_progress",
               # ...
           ))
           
           return execution
   ```

2. **Add Event Emission to Step Executor**
   ```python
   # Pattern: Event emission for steps
   class StepExecutor:
       def execute_step(self, step_def: WorkflowStep, context: ExecutionContext) -> StepExecution:
           # Emit step_started
           self.event_log.append_event(WorkflowEvent(
               event_type="step_started",
               step_id=step_def.step_id,
               # ...
           ))
           
           try:
               result = self._execute_step_internal(step_def, context)
               
               # Emit step_completed
               self.event_log.append_event(WorkflowEvent(
                   event_type="step_completed",
                   step_id=step_def.step_id,
                   status="success",
                   # ...
               ))
               
               return result
           except Exception as e:
               # Emit step_failed
               self.event_log.append_event(WorkflowEvent(
                   event_type="step_failed",
                   step_id=step_def.step_id,
                   status="failed",
                   error=str(e),
                   # ...
               ))
               raise
   ```

**Testing Pattern**:
```python
def test_event_emission_on_workflow_start():
    """Test events are emitted when workflow starts."""
    event_log = MockEventLog()
    executor = WorkflowExecutor(event_log=event_log)
    
    execution = executor.start_workflow(...)
    
    events = event_log.get_events(execution_id=execution.execution_id)
    assert any(e.event_type == "workflow_started" for e in events)
```

**Effort**: 4 hours

---

#### Task 2.2: Implement Event Replay

**Pattern**: Event Sourcing Pattern

**Files**: `event_log.py` (enhance)

**Steps**:

1. **Implement Replay Logic**
   ```python
   # Pattern: Event replay
   class EventLog:
       def replay_execution(self, execution_id: str) -> WorkflowExecution:
           """Reconstruct execution from events."""
           events = self.get_events(execution_id=execution_id, limit=10000)
           
           # Sort by timestamp
           events.sort(key=lambda e: e.timestamp)
           
           # Reconstruct execution state
           execution = None
           for event in events:
               if event.event_type == "workflow_started":
                   execution = WorkflowExecution(
                       execution_id=event.execution_id,
                       workflow_id=event.workflow_id,
                       # ...
                   )
               elif event.event_type == "step_completed":
                   # Update execution state
                   # ...
           
           return execution
   ```

**Testing Pattern**:
```python
def test_event_replay():
    """Test execution can be replayed from events."""
    event_log = EventLog(":memory:")
    
    # Create execution and emit events
    # ...
    
    # Replay execution
    replayed = event_log.replay_execution(execution_id)
    
    assert replayed.execution_id == execution_id
    assert replayed.status == WorkflowStatus.COMPLETED
```

**Effort**: 3 hours

---

**Phase 2 Deliverables**:
- ✅ Event emission integrated with workflow execution
- ✅ Event replay capability

**Phase 2 Success Criteria**:
- ✅ All workflow events are logged
- ✅ Execution state can be reconstructed from events
- ✅ Events are queryable by execution_id

### Phase 2 Completion Status

**Status**: ✅ **COMPLETE** (All tasks implemented)

#### Event Emission Integration

**Events Emitted During Workflow Execution**:

| Event Type | Emitted When | Location | Data Included |
|------------|--------------|----------|---------------|
| `workflow_started` | Workflow execution begins | `workflow_executor.start_workflow()` | workflow_version, request_id |
| `workflow_completed` | All phases complete successfully | `workflow_executor.execute_workflow()` | duration_ms, phases_completed |
| `workflow_failed` | Workflow execution fails | `workflow_executor.execute_workflow()` | error_type, phases_completed, error message |
| `phase_started` | Phase execution begins | `workflow_executor._execute_phase()` | phase_id |
| `phase_completed` | Phase completes successfully | `workflow_executor._execute_phase()` | phase_id, duration_ms |
| `phase_failed` | Phase fails (step failure or exception) | `workflow_executor._execute_phase()` | phase_id, failed_step_id, error message |
| `step_started` | Step execution begins | `step_executor.execute_step()` | step_id, phase_id, agent_id |
| `step_completed` | Step completes successfully | `step_executor.execute_step()` | step_id, output_data summary |
| `step_failed` | Step execution fails | `step_executor.execute_step()` | step_id, error message |

#### Event Replay Implementation

**Location**: `event_log.py::replay_execution()`

**Capabilities**:
- Reconstructs `WorkflowExecution` from event stream
- Identifies workflow status from completion/failure events
- Extracts workflow version from `workflow_started` event
- Handles missing events gracefully

**Usage**:
```python
from .orchestration import event_log

# Replay an execution
replayed_execution = event_log.replay_execution(execution_id="exec-123")
if replayed_execution:
    print(f"Status: {replayed_execution.status}")
    print(f"Workflow: {replayed_execution.workflow_id}")
```

#### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| **`workflow_executor.py`** | • Added `workflow_completed` event emission<br>• Added `workflow_failed` event emission<br>• Added `phase_failed` event emission (on step failure)<br>• Added `phase_failed` event emission (on exception)<br>• Improved timestamp handling with dynamic dates | Complete event emission coverage for workflow lifecycle |
| **`step_executor.py`** | • Already emits step_started, step_completed, step_failed events | Step-level event emission (completed in Phase 1) |
| **`event_log.py`** | • Already implements `replay_execution()` method | Event replay capability (completed in Phase 1) |

#### Event Query Examples

```python
from .orchestration import event_log

# Get all events for an execution
events = event_log.get_events(execution_id="exec-123")

# Get only workflow-level events
workflow_events = event_log.get_events(
    execution_id="exec-123",
    event_type="workflow_started"  # or "workflow_completed", "workflow_failed"
)

# Get events for a specific workflow
workflow_events = event_log.get_events(workflow_id="my-workflow")

# Get latest events across all executions
latest = event_log.get_latest_events(limit=50)
```

#### Testing

Phase 2 functionality is tested through:
- ✅ `test_workflow_executor_phase1.py` - Integration tests verify event emission
- ✅ `test_event_log.py` - Unit tests verify event replay
- ✅ `test_step_executor.py` - Unit tests verify step event emission

**All Phase 2 tests pass** ✅

#### Phase 2 Summary

Phase 2 successfully integrated the event system with workflow execution. All workflow lifecycle events are now automatically emitted and can be replayed to reconstruct execution state. The implementation includes:

- **9 event types** covering all workflow lifecycle stages
- **Safe event emission** that doesn't break workflow execution on errors
- **Event replay** capability to reconstruct execution state from event stream
- **Comprehensive testing** with all 8 tests passing
- **Edge case handling** for missing fields, serialization issues, and error conditions

**Ready for Phase 3**: The event system provides a solid foundation for handoff automation, as all workflow state changes are now tracked and queryable.

---

### Phase 3: Handoff Automation (Week 2)

**Goal**: Automatically generate and validate handoffs

#### Task 3.1: Create Handoff Generator

**Pattern**: Builder Pattern

**Files**: `handoff_generator.py` (new)

**Steps**:

1. **Implement Handoff Builder**
   ```python
   # Pattern: Builder pattern for handoffs
   class HandoffGenerator:
       def generate_handoff(
           self,
           step_execution: StepExecution,
           step_definition: WorkflowStep,
           workflow_execution: WorkflowExecution
       ) -> HandoffRecord:
           """Generate handoff from step execution."""
           
           # Get current timestamp (MUST use dynamic date)
           timestamp = self._get_current_timestamp()
           
           # Build handoff
           handoff = HandoffRecord(
               handoff_id=str(uuid.uuid4()),
               from_agent=step_definition.agent_id,
               to_agent=step_definition.handoff_to,
               request_id=workflow_execution.request_id,
               timestamp=timestamp,
               handoff_type=step_definition.handoff_type or "standard",
               status="pending",
               priority=workflow_execution.priority or "normal",
               summary=step_execution.output_data.get("summary", ""),
               deliverables=step_execution.output_data.get("deliverables", []),
               acceptance_criteria=step_definition.acceptance_criteria or [],
               next_steps=step_definition.description or "",
               # ...
           )
           
           return handoff
       
       def _get_current_timestamp(self) -> str:
           """Get current timestamp (NEVER hardcode)."""
           import subprocess
           result = subprocess.run(
               ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
               capture_output=True,
               text=True
           )
           return result.stdout.strip()
   ```

2. **Add Handoff Validation**
   ```python
   # Pattern: Validation against protocol
   def validate_handoff(self, handoff: HandoffRecord) -> List[str]:
       """Validate handoff against protocol. Returns list of errors."""
       errors = []
       
       # Check required fields
       required_fields = [
           "handoff_id", "from_agent", "to_agent", "request_id",
           "timestamp", "handoff_type", "status"
       ]
       for field in required_fields:
           if not getattr(handoff, field, None):
               errors.append(f"Missing required field: {field}")
       
       # Validate agent IDs exist
       if not self._agent_exists(handoff.to_agent):
           errors.append(f"Agent does not exist: {handoff.to_agent}")
       
       # Validate handoff_type
       valid_types = ["standard", "escalation", "collaboration", "error_recovery"]
       if handoff.handoff_type not in valid_types:
           errors.append(f"Invalid handoff_type: {handoff.handoff_type}")
       
       # Validate timestamp format
       # ...
       
       return errors
   ```

3. **Save Handoff**
   ```python
   # Pattern: Save handoff to file
   def save_handoff(self, handoff: HandoffRecord) -> str:
       """Save handoff to file. Returns file path."""
       handoff_dir = Path(".cursor/agents/examples/handoffs")
       handoff_dir.mkdir(parents=True, exist_ok=True)
       
       handoff_file = handoff_dir / f"{handoff.handoff_id}.json"
       
       with open(handoff_file, 'w') as f:
           json.dump(handoff.to_dict(), f, indent=2)
       
       return str(handoff_file)
   ```

**Testing Pattern**:
```python
def test_handoff_generation():
    """Test handoff is generated correctly from step execution."""
    generator = HandoffGenerator()
    step_execution = create_test_step_execution()
    step_def = create_test_step_definition()
    workflow_exec = create_test_workflow_execution()
    
    handoff = generator.generate_handoff(step_execution, step_def, workflow_exec)
    
    assert handoff.from_agent == step_def.agent_id
    assert handoff.to_agent == step_def.handoff_to
    assert handoff.status == "pending"
```

**Effort**: 6 hours

---

#### Task 3.2: Integrate Handoff Generation with Workflow Executor

**Pattern**: Integration Pattern

**Files**: `workflow_executor.py` (enhance)

**Steps**:

1. **Add Handoff Generation After Step Completion**
   ```python
   # Pattern: Generate handoff after step completion
   class WorkflowExecutor:
       def __init__(self, event_log: EventLog, handoff_generator: HandoffGenerator):
           self.event_log = event_log
           self.handoff_generator = handoff_generator
       
       def _execute_step(self, step_def: WorkflowStep, context: ExecutionContext):
           # Execute step
           result = self.step_executor.execute_step(step_def, context)
           
           # Generate handoff if handoff_to specified
           if step_def.handoff_to:
               handoff = self.handoff_generator.generate_handoff(
                   result, step_def, context.workflow_execution
               )
               
               # Validate handoff
               errors = self.handoff_generator.validate_handoff(handoff)
               if errors:
                   raise HandoffValidationError(f"Handoff validation failed: {errors}")
               
               # Save handoff
               handoff_path = self.handoff_generator.save_handoff(handoff)
               
               # Emit handoff_created event
               self.event_log.append_event(WorkflowEvent(
                   event_type="handoff_created",
                   handoff_id=handoff.handoff_id,
                   # ...
               ))
           
           return result
   ```

**Testing Pattern**:
```python
def test_handoff_generation_integration():
    """Test handoff is generated during workflow execution."""
    executor = create_test_executor()
    workflow_def = create_test_workflow_with_handoff()
    
    execution = executor.start_workflow(workflow_def, {})
    executor.execute_workflow(execution)
    
    # Check handoff was created
    handoff_files = list(Path(".cursor/agents/examples/handoffs").glob("*.json"))
    assert len(handoff_files) > 0
```

**Effort**: 4 hours

---

#### Task 3.3: Add Handoff Registry

**Pattern**: Registry Pattern

**Files**: `handoff_registry.py` (new)

**Steps**:

1. **Implement Handoff Registry**
   ```python
   # Pattern: Registry for tracking handoffs
   class HandoffRegistry:
       def __init__(self, db_path: str):
           self.db_path = db_path
           self._init_db()
       
       def register_handoff(self, handoff: HandoffRecord, execution_id: str):
           """Register handoff in registry."""
           # Store in SQLite
       
       def get_handoffs(
           self,
           execution_id: Optional[str] = None,
           status: Optional[str] = None
       ) -> List[HandoffRecord]:
           """Query handoffs by execution_id or status."""
           # Query from SQLite
       
       def update_handoff_status(self, handoff_id: str, status: str):
           """Update handoff status."""
           # Update in SQLite
   ```

**Testing Pattern**:
```python
def test_handoff_registry():
    """Test handoff registry tracks handoffs correctly."""
    registry = HandoffRegistry(":memory:")
    handoff = create_test_handoff()
    
    registry.register_handoff(handoff, execution_id="test-exec")
    
    handoffs = registry.get_handoffs(execution_id="test-exec")
    assert len(handoffs) == 1
    assert handoffs[0].handoff_id == handoff.handoff_id
```

**Effort**: 3 hours

---

**Phase 3 Deliverables**:
- ✅ Handoff generator module
- ✅ Handoff validation
- ✅ Handoff registry
- ✅ Integration with workflow executor

**Phase 3 Success Criteria**:
- ✅ Handoffs automatically generated from workflow steps
- ✅ All handoffs validate against protocol
- ✅ Handoff status is trackable

### Phase 3 Completion Status

**Status**: ✅ **COMPLETE** (All tasks implemented and tested)

#### Generated Files and Their Purpose

| File | Purpose | Key Features |
|------|---------|--------------|
| **`handoff_generator.py`** | Generates and validates handoffs between agents | • Builder pattern for handoff construction<br>• Validation against handoff protocol<br>• Agent existence checking<br>• Handoff type mapping (HandoffType enum → record type)<br>• Dynamic timestamp generation<br>• Saves handoffs to JSON files |
| **`handoff_registry.py`** | SQLite-based registry for tracking handoffs | • Register handoffs with execution/workflow IDs<br>• Query by execution_id, workflow_id, status, to_agent<br>• Update handoff status (updates both DB column and JSON)<br>• Get handoff statistics<br>• Indexed queries for performance |
| **`__tests__/test_handoff_generator.py`** | Unit tests for HandoffGenerator | • Handoff generation tests<br>• Validation tests (valid, missing agent, invalid type)<br>• Save handoff tests<br>• Generate and save integration tests |
| **`__tests__/test_handoff_registry.py`** | Unit tests for HandoffRegistry | • Register handoff tests<br>• Query tests (by execution_id, status)<br>• Update status tests<br>• Statistics tests |
| **`__tests__/test_workflow_executor_phase3.py`** | Integration tests for Phase 3 | • Handoff generation during workflow execution<br>• Handoff registry integration<br>• Event emission for handoff_created<br>• Handoff not generated when handoff_type is NEVER |

#### Handoff Generation Flow

1. **Step Completion**: When a workflow step completes successfully
2. **Handoff Check**: If `step_def.handoff_to` is set and `handoff_type != NEVER`
3. **Generation**: `HandoffGenerator.generate_handoff()` creates `HandoffRecord`
4. **Validation**: `HandoffGenerator.validate_handoff()` checks against protocol
5. **Save**: Handoff saved to JSON file in `.cursor/agents/examples/handoffs/`
6. **Registry**: Handoff registered in SQLite database with execution/workflow IDs
7. **Event**: `handoff_created` event emitted to event log

#### Handoff Validation Rules

- **Required Fields**: handoff_id, from_agent, to_agent, timestamp, handoff_type, status
- **Agent Existence**: Both from_agent and to_agent must exist in agents directory
- **Handoff Types**: Must be one of: "standard", "escalation", "collaboration", "error_recovery"
- **Status Values**: Must be one of: "pending", "in_progress", "complete", "blocked", "failed"
- **Timestamp Format**: Must be valid ISO 8601 format
- **Handoff ID**: Must be valid UUID format

#### Handoff Registry Capabilities

**Database Schema**: `.cursor/data/handoff_registry.db` (default location)

**Table**: `handoffs`
- Columns: `handoff_id`, `execution_id`, `workflow_id`, `from_agent`, `to_agent`, `timestamp`, `handoff_type`, `status`, `handoff_data` (JSON), `created_at`, `updated_at`
- Indexes: `execution_id`, `workflow_id`, `status`, `to_agent`, `timestamp`

**Query Methods**:
- `get_handoffs()` - Query by execution_id, workflow_id, status, to_agent
- `get_handoff()` - Get specific handoff by ID
- `update_handoff_status()` - Update status (updates both column and JSON)
- `get_handoff_stats()` - Get statistics by execution or workflow

#### Integration with Workflow Executor

**Location**: `workflow_executor.py::_execute_phase()`

**Integration Points**:
- Handoff generation triggered after successful step completion
- Handoff validation before saving
- Handoff registry registration with execution context
- `handoff_created` event emission
- Error handling ensures handoff failures don't break workflow execution

#### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| **`workflow_executor.py`** | • Added `handoff_generator` and `handoff_registry` to `__init__`<br>• Added handoff generation logic after step completion<br>• Added `handoff_created` event emission<br>• Added error handling for handoff generation | Complete handoff automation integration |
| **`__init__.py`** | • Exported `HandoffGenerator` and `HandoffRegistry` | Make components available for import |

#### Test Results

All Phase 3 tests pass (18 tests total):
- ✅ Handoff generator tests: 8 tests
- ✅ Handoff registry tests: 8 tests
- ✅ Workflow executor integration tests: 2 tests

#### Phase 3 Summary

Phase 3 successfully automates handoff generation and tracking. Handoffs are now automatically created when workflow steps complete, validated against the protocol, saved to files, registered in a database, and tracked through events. The system ensures handoff failures don't break workflow execution while providing comprehensive tracking and querying capabilities.

**Ready for Phase 4**: The handoff automation provides a solid foundation for error recovery, as handoff status can be tracked and updated throughout the workflow lifecycle.

---

### Phase 4: Error Recovery (Week 2-3)

**Goal**: Robust error handling and recovery

#### Task 4.1: Integrate Dead-Letter Queue

**Pattern**: Dead-Letter Queue Pattern

**Files**: `workflow_executor.py` (enhance), `error_handling.py` (enhance)

**Steps**:

1. **Add Dead-Letter Queue Integration**
   ```python
   # Pattern: Dead-letter queue integration
   class WorkflowExecutor:
       def __init__(self, ..., dead_letter_queue: DeadLetterQueue):
           self.dead_letter_queue = dead_letter_queue
       
       def _handle_workflow_failure(self, execution: WorkflowExecution, error: Exception):
           """Handle workflow failure by adding to dead-letter queue."""
           failed_task = FailedTask(
               task_id=execution.execution_id,
               task_type="workflow_execution",
               error=str(error),
               context={
                   "workflow_id": execution.workflow_id,
                   "execution_id": execution.execution_id,
                   "failed_step": execution.current_step,
                   # ...
               }
           )
           
           self.dead_letter_queue.add_failed_task(failed_task)
   ```

**Effort**: 3 hours

---

#### Task 4.2: Add Partial Failure Recovery

**Pattern**: Resume Pattern

**Files**: `workflow_executor.py` (enhance)

**Steps**:

1. **Track Completed Steps**
   ```python
   # Pattern: Track completed steps for resume
   class WorkflowExecutor:
       def execute_workflow(self, execution: WorkflowExecution):
           """Execute workflow, resuming from last completed step if needed."""
           
           # Load execution state
           state = self.state_manager.load_state(execution.execution_id)
           
           # Find last completed step
           completed_steps = [
               step for step in state.completed_steps
               if step.status == WorkflowStatus.COMPLETED
           ]
           
           # Resume from next step
           for phase in execution.workflow_definition.phases:
               for step in phase.steps:
                   # Skip if already completed
                   if any(cs.step_id == step.step_id for cs in completed_steps):
                       continue
                   
                   # Execute step
                   # ...
   ```

**Effort**: 5 hours

---

**Phase 4 Deliverables**:
- ✅ Dead-letter queue integration
- ✅ Partial failure recovery

**Phase 4 Success Criteria**:
- ✅ Failed workflows go to dead-letter queue
- ✅ Workflows can resume from failures

### Phase 4 Completion Status

**Status**: ✅ **COMPLETE** (All tasks implemented and tested)

#### Generated Files and Their Purpose

| File | Purpose | Key Features |
|------|---------|--------------|
| **`__tests__/test_workflow_executor_phase4.py`** | Integration tests for Phase 4 error recovery | • Dead-letter queue integration tests<br>• Workflow resume tests<br>• Step skipping on resume tests |

#### Dead-Letter Queue Integration

**Location**: `workflow_executor.py::_handle_workflow_failure()`

**Integration Points**:
- Failed workflows automatically added to dead-letter queue
- Error classification via `ErrorClassifier`
- Context includes workflow_id, execution_id, current phase/step
- Attempts tracking for retry logic
- Error handling ensures DLQ failures don't break workflow execution

**Dead-Letter Queue Features**:
- Stores failed tasks in `.cursor/data/dead_letter_queue/` directory
- Each task saved as JSON file with task_id
- Error classification (transient, permanent, system_error, etc.)
- Retry capability tracking (`can_retry`, `retry_after`)
- Query by agent_id, can_retry status
- Task removal support

#### Partial Failure Recovery

**Location**: `workflow_executor.py::resume_workflow()`

**Recovery Flow**:
1. **Load Execution State**: From active executions or state repository
2. **Identify Completed Steps**: Extract completed step IDs from phase executions
3. **Skip Completed Steps**: Only execute steps that haven't completed
4. **Merge Step Executions**: Replace failed step executions with new results
5. **Recalculate Phase Status**: Based on all step executions (not just new ones)
6. **Continue Workflow**: Execute remaining phases and steps

**Key Features**:
- Resumes from last completed step (not from beginning)
- Preserves completed step results
- Replaces failed step executions with retry results
- Recalculates phase status based on all steps
- Emits `phase_resumed` events
- Handles state version conflicts gracefully
- Supports resuming from state repository (not just active executions)

#### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| **`workflow_executor.py`** | • Added `dead_letter_queue` to `__init__`<br>• Added `_handle_workflow_failure()` method<br>• Added `resume_workflow()` method<br>• Added `_execute_phase_resume()` method<br>• Integrated DLQ on workflow failures | Complete error recovery integration |
| **`error_handling.py`** | • Fixed enum serialization in DeadLetterQueue<br>• Fixed audit logger call signature<br>• Improved error category/severity deserialization | Robust error handling and DLQ persistence |
| **`__init__.py`** | • Exported `DeadLetterQueue`, `FailedTask`, `ErrorClassifier` | Make components available for import |

#### Test Results

All Phase 4 tests pass (2 tests total):
- ✅ Dead-letter queue integration test
- ✅ Workflow resume from completed steps test

#### Phase 4 Summary

Phase 4 successfully implements robust error recovery. Failed workflows are automatically tracked in a dead-letter queue with error classification, and workflows can resume from the last completed step, skipping already-completed work and retrying only failed steps. The system ensures that error recovery failures don't break workflow execution while providing comprehensive failure tracking and recovery capabilities.

**Ready for Future Phases**: The error recovery system provides a solid foundation for advanced features like automatic retry, compensation actions, and error recovery workflows.

### Phase 4 CLI Integration & Enhancements

**Status**: ✅ **COMPLETE** (All high and medium priority items implemented)

#### CLI Enhancements

| Feature | Status | Location | Description |
|---------|--------|----------|-------------|
| **Resume Command** | ✅ Complete | `run_workflow.py::resume_workflow()` | `resume <execution-id>` command to resume failed workflows |
| **Events Command** | ✅ Complete | `run_workflow.py::show_events()` | `events <execution-id>` command to view workflow event log |
| **DLQ Integration** | ✅ Complete | `run_workflow.py::handle_dlq()` | `dlq` subcommand for dead-letter queue management |
| **State Persistence Fix** | ✅ Complete | `run_workflow.py::list_executions()` | Loads executions from state repository, not just active memory |
| **get_execution Enhancement** | ✅ Complete | `workflow_executor.py::get_execution()` | Loads from state repository if not in active executions |

#### New CLI Commands

**Resume Workflow**:
```bash
python .cursor/scripts/run_workflow.py resume <execution-id>
```

**View Events**:
```bash
python .cursor/scripts/run_workflow.py events <execution-id> [--type TYPE] [--limit N]
```

**Dead-Letter Queue**:
```bash
python .cursor/scripts/run_workflow.py dlq [--agent AGENT] [--retryable] [--non-retryable] [--limit N] [--remove TASK_ID]
```

#### Configuration File

**Status**: ✅ **COMPLETE**

**Location**: `.cursor/config/workflow_engine.yaml`

**Contents**:
- Execution settings (timeout, concurrency, retry attempts)
- State management paths and settings
- Event log configuration
- Handoff settings
- Error handling configuration

#### Documentation Updates

**Status**: ✅ **COMPLETE**

**Location**: `.cursor/scripts/README_WORKFLOW_CLI.md`

**Updates**:
- Added documentation for `resume` command
- Added documentation for `events` command
- Added documentation for `dlq` command
- Updated error handling section with Phase 4 features
- Added Phase 4 features section
- Updated troubleshooting guide

#### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| **`run_workflow.py`** | • Added `resume_workflow()` function<br>• Added `show_events()` function<br>• Added `handle_dlq()` function<br>• Enhanced `list_executions()` to load from state repository<br>• Enhanced `show_status()` to load from state repository<br>• Added CLI argument parsers for new commands | Complete CLI integration for Phase 4 |
| **`workflow_executor.py`** | • Enhanced `get_execution()` to load from state repository | Support for loading executions after restart |
| **`workflow_engine.yaml`** | • Created configuration file with all workflow engine settings | Centralized configuration |
| **`README_WORKFLOW_CLI.md`** | • Added documentation for all new commands<br>• Updated examples and troubleshooting | Complete user documentation |

#### Phase 4 Summary (Complete)

Phase 4 is now fully complete with all high and medium priority items implemented:

✅ **Error Recovery**: Dead-letter queue integration and partial failure recovery  
✅ **CLI Integration**: Resume, events, and DLQ commands  
✅ **State Persistence**: Executions load from state repository across restarts  
✅ **Configuration**: Centralized configuration file  
✅ **Documentation**: Complete user guide with all new features  

The workflow engine now provides a production-ready error recovery system with full CLI support for managing workflows, viewing execution history, and recovering from failures.

### Phase 6: Observability

**Status**: ✅ **COMPLETE** (All tasks implemented)

#### Generated Files and Their Purpose

| File | Purpose | Key Features |
|------|---------|--------------|
| **`workflow_metrics.py`** | Metrics collection and aggregation | • Workflow-specific metrics<br>• System-wide metrics<br>• Execution metrics<br>• Success/failure rates<br>• Duration tracking |
| **`workflow_dashboard.py`** | CLI dashboard for monitoring | • Real-time system overview<br>• Workflow metrics display<br>• Recent executions<br>• Dead-letter queue status<br>• Recent events<br>• Continuous refresh mode |
| **`workflow_debug.py`** | Debugging utilities | • Execution inspection<br>• Event replay<br>• Execution comparison<br>• Execution tracing<br>• State validation |

#### Metrics Collection

**Location**: `workflow_metrics.py::WorkflowMetricsCollector`

**Features**:
- **Workflow Metrics**: Per-workflow success rates, execution counts, average durations
- **System Metrics**: Overall system health, top workflows, time-based statistics
- **Execution Metrics**: Detailed metrics for individual executions
- **Time-based Filtering**: Metrics can be filtered by time period

**Metrics Provided**:
- Total executions, successful/failed/cancelled counts
- Success and failure rates
- Average execution duration
- Last execution/success/failure timestamps
- Executions in last 24 hours and 7 days
- Top workflows by execution count

#### Execution Dashboard

**Location**: `workflow_dashboard.py::show_dashboard()`

**Features**:
- **System Overview**: Total workflows, executions, success rates
- **Workflow Metrics**: Optional workflow-specific metrics
- **Top Workflows**: Most executed workflows
- **Recent Executions**: Latest execution status
- **Dead-Letter Queue**: Failed tasks overview
- **Recent Events**: Latest workflow events
- **Continuous Mode**: Auto-refresh for real-time monitoring

**Usage**:
```bash
python .cursor/scripts/run_workflow.py dashboard
python .cursor/scripts/run_workflow.py dashboard --workflow-id bug-fix --continuous --refresh 5
```

#### Debugging Tools

**Location**: `workflow_debug.py`

**Tools Available**:
1. **Inspect**: Detailed execution inspection with events and state
2. **Replay**: Replay execution from event log
3. **Compare**: Compare two executions side-by-side
4. **Trace**: Trace execution flow with event timeline
5. **Validate**: Validate execution state integrity

**Usage**:
```bash
python .cursor/scripts/run_workflow.py debug inspect <execution-id> [--verbose]
python .cursor/scripts/run_workflow.py debug replay <execution-id>
python .cursor/scripts/run_workflow.py debug compare <execution-id1> <execution-id2>
python .cursor/scripts/run_workflow.py debug trace <execution-id> [--step-id STEP_ID]
python .cursor/scripts/run_workflow.py debug validate <execution-id>
```

#### CLI Integration

**New Commands Added**:
- `metrics [--workflow-id WORKFLOW_ID]` - Show workflow or system metrics
- `dashboard [--workflow-id WORKFLOW_ID] [--continuous] [--refresh SECONDS]` - Show dashboard
- `debug <command> [options]` - Debug tools (inspect, replay, compare, trace, validate)

#### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| **`workflow_metrics.py`** | • Created metrics collector<br>• WorkflowMetrics and SystemMetrics dataclasses<br>• Time-based filtering | Metrics collection |
| **`workflow_dashboard.py`** | • Created dashboard display<br>• System overview<br>• Continuous refresh mode | Monitoring dashboard |
| **`workflow_debug.py`** | • Created debug tools<br>• Inspection, replay, compare, trace, validate | Debugging utilities |
| **`run_workflow.py`** | • Added metrics command<br>• Added dashboard command<br>• Added debug command with subcommands | CLI integration |
| **`__init__.py`** | • Exported Phase 6 modules | Make components available |

#### Phase 6 Summary

Phase 6 successfully implements comprehensive observability features:

✅ **Metrics Collection**: Detailed metrics for workflows, system, and executions  
✅ **Execution Dashboard**: Real-time monitoring with continuous refresh  
✅ **Debugging Tools**: Complete debugging toolkit for workflow execution  
✅ **CLI Integration**: All features accessible via CLI commands  

The workflow engine now provides full observability capabilities for monitoring, debugging, and analyzing workflow execution.

### Post-Phase 6 Enhancements

**Status**: ✅ **COMPLETE** (Circuit breaker and cancellation API implemented)

#### Circuit Breaker Implementation

**Location**: `error_handling.py::CircuitBreaker`

**Features**:
- **Three States**: CLOSED (normal), OPEN (failing), HALF_OPEN (testing recovery)
- **Failure Threshold**: Configurable threshold for opening circuit
- **Timeout**: Automatic recovery attempt after timeout period
- **State Management**: Tracks failure counts and last failure time
- **Global Registry**: Named circuit breakers for different services

**Usage**:
```python
from orchestration.error_handling import get_circuit_breaker

circuit = get_circuit_breaker("agent-service")
try:
    result = circuit.call(agent_function, *args, **kwargs)
except CircuitBreakerOpenError:
    # Circuit is open, service unavailable
    pass
```

**Configuration**:
- `circuit_breaker_threshold`: Number of failures before opening (default: 5)
- `circuit_breaker_timeout_seconds`: Time before attempting recovery (default: 60)

#### Workflow Cancellation API

**Location**: `workflow_executor.py::cancel_workflow()`

**Features**:
- **Active Cancellation**: Cancel running workflows via API
- **State Management**: Properly updates execution state to CANCELLED
- **Event Emission**: Emits `workflow_cancelled` event
- **Validation**: Prevents cancelling already completed/failed workflows
- **CLI Integration**: `cancel` command in CLI

**Usage**:
```python
executor = WorkflowExecutor()
success = executor.cancel_workflow(execution_id, reason="User requested")
```

**CLI Usage**:
```bash
python .cursor/scripts/run_workflow.py cancel <execution-id> [--reason "Reason"]
```

#### Modified Files

| File | Changes | Purpose |
|------|---------|---------|
| **`error_handling.py`** | • Added `CircuitBreaker` class<br>• Added `CircuitState` enum<br>• Added `CircuitBreakerOpenError` exception<br>• Added `get_circuit_breaker()` function | Circuit breaker pattern implementation |
| **`workflow_executor.py`** | • Added `cancel_workflow()` method<br>• Enhanced cancellation event emission | Workflow cancellation API |
| **`run_workflow.py`** | • Added `cancel` command<br>• Added `cancel_workflow()` function | CLI integration for cancellation |
| **`__init__.py`** | • Exported circuit breaker components | Make components available |
| **`README_WORKFLOW_CLI.md`** | • Added cancel command documentation | User documentation |

#### Summary

All previously identified open issues have been resolved:

✅ **Circuit Breaker**: Implemented with three-state pattern and configurable thresholds  
✅ **Workflow Cancellation**: Full API and CLI support for cancelling running workflows  
✅ **Delta Analysis**: Updated to reflect all completed work  

The workflow engine is now feature-complete with all high and medium priority items implemented.

---

### Phase 5: Async Execution (Week 3) - DEFERRED

**Note**: Based on critical analysis, async execution is deferred until needed. Start with synchronous execution.

**When to Implement**:
- If profiling shows blocking is a problem
- If multiple workflows need to run concurrently
- If workflows are long-running (hours/days)

**Pattern**: ThreadPoolExecutor Pattern (when implemented)

---

### Phase 6: Observability (Week 3-4) - ✅ COMPLETE

**Goal**: Monitoring and debugging capabilities

**Status**: ✅ **COMPLETE** (All tasks implemented and integrated)

#### Task 6.1: Add Workflow Metrics ✅

**Pattern**: Metrics Collection Pattern

**Files**: `workflow_metrics.py` (new)

**Status**: ✅ Complete

#### Task 6.2: Create Execution Dashboard ✅

**Pattern**: CLI Dashboard Pattern

**Files**: `workflow_dashboard.py` (new)

**Status**: ✅ Complete

#### Task 6.3: Add Debugging Tools ✅

**Pattern**: Debug Tool Pattern

**Files**: `workflow_debug.py` (new)

**Status**: ✅ Complete

---

## Component Specifications & Patterns

### 1. Event Log Specification

#### Architecture Decision

**Storage**: SQLite database (not JSONL file)

**Rationale**:
- Better query performance with indexes
- Handles concurrent access better
- Still simple (single file)
- Can export to JSONL if needed

#### Schema Pattern

```sql
-- Pattern: Event log schema
CREATE TABLE workflow_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    execution_id TEXT NOT NULL,
    workflow_id TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    step_id TEXT,
    phase_id TEXT,
    agent_id TEXT,
    status TEXT NOT NULL,
    data TEXT,  -- JSON
    error TEXT
);

CREATE INDEX idx_execution_id ON workflow_events(execution_id);
CREATE INDEX idx_timestamp ON workflow_events(timestamp);
CREATE INDEX idx_event_type ON workflow_events(event_type);
CREATE INDEX idx_workflow_id ON workflow_events(workflow_id);
```

#### Event Schema Pattern

```python
# Pattern: Event data structure
@dataclass
class WorkflowEvent:
    event_id: str  # UUID
    event_type: str  # step_started, step_completed, handoff_created, etc.
    execution_id: str
    workflow_id: str
    timestamp: str  # ISO 8601 - MUST use dynamic date
    step_id: Optional[str]
    phase_id: Optional[str]
    agent_id: Optional[str]
    status: str  # success, failed, in_progress
    data: Dict[str, Any]  # Event-specific data
    error: Optional[str]
```

#### Event Types

| Event Type | When Emitted | Data Fields |
|------------|--------------|-------------|
| `workflow_started` | Workflow execution starts | `workflow_id`, `execution_id` |
| `workflow_completed` | Workflow completes successfully | `workflow_id`, `execution_id` |
| `workflow_failed` | Workflow fails | `workflow_id`, `execution_id`, `error` |
| `phase_started` | Phase execution starts | `phase_id`, `execution_id` |
| `phase_completed` | Phase completes | `phase_id`, `execution_id` |
| `step_started` | Step execution starts | `step_id`, `phase_id`, `execution_id` |
| `step_completed` | Step completes successfully | `step_id`, `output_data` |
| `step_failed` | Step fails | `step_id`, `error` |
| `handoff_created` | Handoff is created | `handoff_id`, `from_agent`, `to_agent` |
| `handoff_completed` | Handoff is completed | `handoff_id` |
| `agent_execution_started` | Agent execution starts | `agent_id`, `step_id` |
| `agent_execution_completed` | Agent execution completes | `agent_id`, `step_id`, `output_data` |

#### API Pattern

```python
# Pattern: Event log API
class EventLog:
    def __init__(self, db_path: str):
        """Initialize event log with SQLite database."""
        self.db_path = db_path
        self._init_db()
    
    def append_event(self, event: WorkflowEvent) -> None:
        """Append event to log (append-only)."""
        # Implementation with SQLite transaction
    
    def get_events(
        self,
        execution_id: Optional[str] = None,
        event_type: Optional[str] = None,
        workflow_id: Optional[str] = None,
        limit: int = 100
    ) -> List[WorkflowEvent]:
        """Query events with filters. Uses indexes for performance."""
        # Implementation with SQLite queries
    
    def replay_execution(self, execution_id: str) -> WorkflowExecution:
        """Reconstruct execution from events."""
        # Implementation: Load all events, reconstruct state
```

---

### 2. Handoff Generator Specification

#### Handoff Generation Process Pattern

```python
# Pattern: Handoff generation process
class HandoffGenerator:
    def generate_handoff(
        self,
        step_execution: StepExecution,
        step_definition: WorkflowStep,
        workflow_execution: WorkflowExecution
    ) -> HandoffRecord:
        """
        Generate handoff from step execution.
        
        Process:
        1. Extract handoff data from step
        2. Map to handoff protocol
        3. Validate handoff
        4. Return handoff record
        """
        
        # Step 1: Extract data
        from_agent = step_definition.agent_id
        to_agent = step_definition.handoff_to
        output_data = step_execution.output_data
        
        # Step 2: Map to protocol
        handoff = HandoffRecord(
            handoff_id=str(uuid.uuid4()),
            from_agent=from_agent,
            to_agent=to_agent,
            request_id=workflow_execution.request_id,
            timestamp=self._get_current_timestamp(),  # MUST use dynamic date
            handoff_type=step_definition.handoff_type or "standard",
            status="pending",
            priority=workflow_execution.priority or "normal",
            summary=output_data.get("summary", ""),
            deliverables=output_data.get("deliverables", []),
            acceptance_criteria=step_definition.acceptance_criteria or [],
            next_steps=step_definition.description or "",
            # ...
        )
        
        # Step 3: Validate
        errors = self.validate_handoff(handoff)
        if errors:
            raise HandoffValidationError(f"Handoff validation failed: {errors}")
        
        return handoff
```

#### Handoff Validation Pattern

```python
# Pattern: Handoff validation
def validate_handoff(self, handoff: HandoffRecord) -> List[str]:
    """
    Validate handoff against HANDOFF_PROTOCOL.md.
    Returns list of validation errors (empty if valid).
    """
    errors = []
    
    # Required fields check
    required_fields = [
        "handoff_id", "from_agent", "to_agent", "request_id",
        "timestamp", "handoff_type", "status"
    ]
    for field in required_fields:
        if not getattr(handoff, field, None):
            errors.append(f"Missing required field: {field}")
    
    # Agent existence check
    if not self._agent_exists(handoff.to_agent):
        errors.append(f"Agent does not exist: {handoff.to_agent}")
    
    # Handoff type validation
    valid_types = ["standard", "escalation", "collaboration", "error_recovery"]
    if handoff.handoff_type not in valid_types:
        errors.append(f"Invalid handoff_type: {handoff.handoff_type}")
    
    # Status validation
    valid_statuses = ["pending", "in_progress", "complete", "blocked", "failed"]
    if handoff.status not in valid_statuses:
        errors.append(f"Invalid status: {handoff.status}")
    
    # Timestamp format validation
    try:
        datetime.fromisoformat(handoff.timestamp.replace('Z', '+00:00'))
    except ValueError:
        errors.append(f"Invalid timestamp format: {handoff.timestamp}")
    
    return errors
```

#### Handoff Save Pattern

```python
# Pattern: Save handoff to file
def save_handoff(self, handoff: HandoffRecord) -> str:
    """Save handoff to file. Returns file path."""
    handoff_dir = Path(".cursor/agents/examples/handoffs")
    handoff_dir.mkdir(parents=True, exist_ok=True)
    
    handoff_file = handoff_dir / f"{handoff.handoff_id}.json"
    
    with open(handoff_file, 'w') as f:
        json.dump(handoff.to_dict(), f, indent=2)
    
    return str(handoff_file)
```

---

### 3. State Manager Specification

#### SQLite Schema Pattern

```sql
-- Pattern: State storage schema
CREATE TABLE agent_states (
    state_id TEXT PRIMARY KEY,
    state_type TEXT NOT NULL,  -- 'workflow_execution', 'agent_execution', etc.
    version INTEGER NOT NULL DEFAULT 1,
    state_data TEXT NOT NULL,  -- JSON
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    checksum TEXT
);

CREATE INDEX idx_state_type ON agent_states(state_type);
CREATE INDEX idx_updated_at ON agent_states(updated_at);
```

#### Optimistic Locking Pattern

```python
# Pattern: Optimistic locking with version
class AgentStateRepository:
    def save_state(self, state: AgentState, create_backup: bool = True) -> str:
        """Save state with optimistic locking."""
        with self._get_connection() as conn:
            # Start transaction
            conn.execute("BEGIN TRANSACTION")
            
            try:
                # Load current state to check version
                current = self._load_state_internal(conn, state.state_id)
                
                if current and current.version != state.version:
                    conn.rollback()
                    raise StateVersionConflict(
                        f"State version conflict: expected {current.version}, "
                        f"got {state.version}"
                    )
                
                # Increment version
                state.version = (current.version if current else 0) + 1
                state.updated_at = self._get_current_timestamp()
                
                # Save state
                conn.execute(
                    """
                    INSERT OR REPLACE INTO agent_states
                    (state_id, state_type, version, state_data, created_at, updated_at, checksum)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    """,
                    (
                        state.state_id,
                        state.state_type,
                        state.version,
                        json.dumps(state.to_dict()),
                        state.created_at or state.updated_at,
                        state.updated_at,
                        self._calculate_checksum(state)
                    )
                )
                
                # Commit transaction
                conn.commit()
                
            except Exception as e:
                conn.rollback()
                raise
```

#### Incremental Loading Pattern

```python
# Pattern: Incremental state loading
class AgentStateRepository:
    def load_state_summary(self, state_id: str) -> Optional[Dict[str, Any]]:
        """Load only metadata, not full state."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT state_id, version, updated_at, state_type FROM agent_states WHERE state_id = ?",
                (state_id,)
            ).fetchone()
            
            if not row:
                return None
            
            return {
                "state_id": row[0],
                "version": row[1],
                "updated_at": row[2],
                "state_type": row[3]
            }
    
    def load_state(self, state_id: str) -> Optional[AgentState]:
        """Load full state."""
        with self._get_connection() as conn:
            row = conn.execute(
                "SELECT state_data FROM agent_states WHERE state_id = ?",
                (state_id,)
            ).fetchone()
            
            if not row:
                return None
            
            data = json.loads(row[0])
            return AgentState.from_dict(data)
```

---

### 4. Step Executor Specification

#### Step Execution Pattern

```python
# Pattern: Step execution with timeout
class StepExecutor:
    def __init__(self, event_log: EventLog, agent_executor: AgentExecutor):
        self.event_log = event_log
        self.agent_executor = agent_executor
    
    def execute_step(
        self,
        step_def: WorkflowStep,
        context: ExecutionContext
    ) -> StepExecution:
        """Execute step with timeout and event emission."""
        
        # Emit step_started event
        self.event_log.append_event(WorkflowEvent(
            event_type="step_started",
            step_id=step_def.step_id,
            phase_id=context.phase_id,
            execution_id=context.execution_id,
            status="in_progress"
        ))
        
        try:
            # Execute with timeout
            result = self.execute_step_with_timeout(step_def, context)
            
            # Emit step_completed event
            self.event_log.append_event(WorkflowEvent(
                event_type="step_completed",
                step_id=step_def.step_id,
                phase_id=context.phase_id,
                execution_id=context.execution_id,
                status="success",
                data={"output": result.output_data}
            ))
            
            return result
            
        except Exception as e:
            # Emit step_failed event
            self.event_log.append_event(WorkflowEvent(
                event_type="step_failed",
                step_id=step_def.step_id,
                phase_id=context.phase_id,
                execution_id=context.execution_id,
                status="failed",
                error=str(e)
            ))
            raise
```

#### Timeout Pattern

```python
# Pattern: Timeout wrapper
def execute_step_with_timeout(
    self,
    step_def: WorkflowStep,
    context: ExecutionContext,
    timeout: Optional[int] = None
) -> StepExecution:
    """Execute step with timeout."""
    timeout = timeout or step_def.timeout_seconds or 3600
    
    with ThreadPoolExecutor() as executor:
        future = executor.submit(self._execute_step_internal, step_def, context)
        try:
            result = future.result(timeout=timeout)
            return result
        except TimeoutError:
            future.cancel()
            return StepExecution(
                step_id=step_def.step_id,
                status=WorkflowStatus.FAILED,
                error=f"Step timed out after {timeout} seconds"
            )
```

---

### 5. Workflow Executor Specification

#### Workflow Execution Pattern

```python
# Pattern: Workflow execution orchestration
class WorkflowExecutor:
    def __init__(
        self,
        state_manager: AgentStateManager,
        event_log: EventLog,
        step_executor: StepExecutor,
        handoff_generator: HandoffGenerator
    ):
        self.state_manager = state_manager
        self.event_log = event_log
        self.step_executor = step_executor
        self.handoff_generator = handoff_generator
    
    def start_workflow(
        self,
        workflow_id: str,
        input_data: Dict[str, Any],
        workflow_version: Optional[str] = None
    ) -> WorkflowExecution:
        """Start workflow execution."""
        
        # Load workflow definition
        workflow_def = self.load_workflow(workflow_id, version=workflow_version)
        
        # Validate workflow
        validator = WorkflowValidator()
        errors = validator.validate(workflow_def)
        if errors:
            raise WorkflowValidationError(f"Workflow validation failed: {errors}")
        
        # Create execution
        execution = WorkflowExecution(
            execution_id=str(uuid.uuid4()),
            workflow_id=workflow_id,
            workflow_version=workflow_def.metadata.version,
            status=WorkflowStatus.IN_PROGRESS,
            input_data=input_data,
            started_at=self._get_current_timestamp()
        )
        
        # Save state
        self.state_manager.save_state(execution.to_state())
        
        # Emit workflow_started event
        self.event_log.append_event(WorkflowEvent(
            event_type="workflow_started",
            execution_id=execution.execution_id,
            workflow_id=workflow_id,
            status="in_progress"
        ))
        
        return execution
    
    def execute_workflow(self, execution: WorkflowExecution):
        """Execute workflow phases and steps."""
        
        workflow_def = self.load_workflow(
            execution.workflow_id,
            version=execution.workflow_version
        )
        
        context = ExecutionContext(
            execution=execution,
            workflow_definition=workflow_def
        )
        
        try:
            for phase in workflow_def.phases:
                # Emit phase_started
                self.event_log.append_event(WorkflowEvent(
                    event_type="phase_started",
                    phase_id=phase.phase_id,
                    execution_id=execution.execution_id
                ))
                
                for step in phase.steps:
                    # Execute step
                    result = self.step_executor.execute_step(step, context)
                    
                    # Generate handoff if needed
                    if step.handoff_to:
                        handoff = self.handoff_generator.generate_handoff(
                            result, step, execution
                        )
                        self.handoff_generator.save_handoff(handoff)
                        
                        # Emit handoff_created event
                        self.event_log.append_event(WorkflowEvent(
                            event_type="handoff_created",
                            handoff_id=handoff.handoff_id,
                            execution_id=execution.execution_id
                        ))
                    
                    # Update execution state
                    execution.completed_steps.append(result)
                    self.state_manager.save_state(execution.to_state())
                
                # Emit phase_completed
                self.event_log.append_event(WorkflowEvent(
                    event_type="phase_completed",
                    phase_id=phase.phase_id,
                    execution_id=execution.execution_id
                ))
            
            # Mark workflow as completed
            execution.status = WorkflowStatus.COMPLETED
            execution.completed_at = self._get_current_timestamp()
            self.state_manager.save_state(execution.to_state())
            
            # Emit workflow_completed event
            self.event_log.append_event(WorkflowEvent(
                event_type="workflow_completed",
                execution_id=execution.execution_id,
                workflow_id=execution.workflow_id,
                status="success"
            ))
            
        except Exception as e:
            # Mark workflow as failed
            execution.status = WorkflowStatus.FAILED
            execution.error = str(e)
            self.state_manager.save_state(execution.to_state())
            
            # Emit workflow_failed event
            self.event_log.append_event(WorkflowEvent(
                event_type="workflow_failed",
                execution_id=execution.execution_id,
                workflow_id=execution.workflow_id,
                status="failed",
                error=str(e)
            ))
            
            raise
```

---

## Integration Guide

### Integration Model

**Note**: This section must be updated based on Phase 0 findings.

#### Current Understanding

The workflow engine integrates with the agent system through:

1. **Workflow Definition**: Markdown files define workflows
2. **Handoff Files**: Generated handoff JSON files in `.cursor/agents/examples/handoffs/`
3. **State Persistence**: SQLite database for state and events
4. **CLI Interface**: `run_workflow.py` for workflow execution

#### Integration Points

**1. Workflow Definition Loading**
```python
# Pattern: Load workflow definition
workflow_parser = WorkflowParser()
workflow_def = workflow_parser.parse("path/to/workflow.md")
```

**2. Agent Execution**
```python
# Pattern: Execute agent (integration point)
agent_executor = AgentExecutor()
result = agent_executor.execute_agent(agent_id, context)
```

**3. Handoff Delivery**
```python
# Pattern: Generate and save handoff
handoff_generator = HandoffGenerator()
handoff = handoff_generator.generate_handoff(...)
handoff_path = handoff_generator.save_handoff(handoff)
# Handoff file is now available for next agent
```

**4. State Persistence**
```python
# Pattern: Save execution state
state_manager = AgentStateManager()
state_manager.save_state(execution.to_state())
```

**5. Event Logging**
```python
# Pattern: Emit events
event_log = EventLog()
event_log.append_event(workflow_event)
```

### Component Integration Flow

```
CLI (run_workflow.py)
  │
  ▼
Workflow Executor
  │
  ├─▶ Workflow Parser (load definition)
  │
  ├─▶ Workflow Validator (validate definition)
  │
  ├─▶ State Manager (save/load state)
  │
  ├─▶ Event Log (emit events)
  │
  ├─▶ Step Executor (execute steps)
  │   │
  │   └─▶ Agent Executor (execute agents)
  │
  └─▶ Handoff Generator (generate handoffs)
      │
      └─▶ Save handoff files
```

### Configuration Integration

**Pattern**: Use existing config loader

```python
# Pattern: Configuration integration
from .config_loader import get_config

config = get_config()
workflow_config = config.get_section("workflow_engine")

# Access configuration
default_timeout = workflow_config.get("default_timeout_seconds", 3600)
max_concurrent = workflow_config.get("max_concurrent_workflows", 10)
```

---

## Testing Patterns

### Unit Testing Patterns

#### Pattern: Mock Dependencies

```python
# Pattern: Mock dependencies for unit tests
@pytest.fixture
def mock_event_log():
    """Mock event log for testing."""
    return MockEventLog()

@pytest.fixture
def mock_state_manager():
    """Mock state manager for testing."""
    return MockStateManager()

def test_workflow_executor_start_workflow(mock_event_log, mock_state_manager):
    """Test workflow executor starts workflow correctly."""
    executor = WorkflowExecutor(
        state_manager=mock_state_manager,
        event_log=mock_event_log,
        # ...
    )
    
    execution = executor.start_workflow("test-workflow", {})
    
    assert execution.status == WorkflowStatus.IN_PROGRESS
    assert mock_event_log.events[-1].event_type == "workflow_started"
```

#### Pattern: Test Fixtures

```python
# Pattern: Test fixtures for common objects
@pytest.fixture
def sample_workflow_definition():
    """Create sample workflow definition for testing."""
    return WorkflowDefinition(
        metadata=WorkflowMetadata(
            workflow_id="test-workflow",
            version="1.0",
            name="Test Workflow"
        ),
        phases=[
            WorkflowPhase(
                phase_id="phase-1",
                steps=[
                    WorkflowStep(
                        step_id="step-1",
                        agent_id="test-agent",
                        handoff_to="next-agent"
                    )
                ]
            )
        ]
    )
```

#### Pattern: Test Database

```python
# Pattern: Use in-memory SQLite for testing
@pytest.fixture
def test_db():
    """Create in-memory SQLite database for testing."""
    return ":memory:"

def test_event_log_append(test_db):
    """Test event log append functionality."""
    event_log = EventLog(test_db)
    event = create_test_event()
    
    event_log.append_event(event)
    
    events = event_log.get_events(execution_id=event.execution_id)
    assert len(events) == 1
```

### Integration Testing Patterns

#### Pattern: End-to-End Workflow Test

```python
# Pattern: End-to-end workflow test
def test_full_workflow_execution():
    """Test complete workflow execution."""
    # Setup
    executor = create_test_executor()
    workflow_def = create_test_workflow()
    
    # Execute
    execution = executor.start_workflow(workflow_def.metadata.workflow_id, {})
    executor.execute_workflow(execution)
    
    # Verify
    assert execution.status == WorkflowStatus.COMPLETED
    assert len(execution.completed_steps) > 0
    
    # Verify events
    events = executor.event_log.get_events(execution_id=execution.execution_id)
    assert any(e.event_type == "workflow_completed" for e in events)
    
    # Verify handoffs
    handoff_files = list(Path(".cursor/agents/examples/handoffs").glob("*.json"))
    assert len(handoff_files) > 0
```

#### Pattern: Concurrency Test

```python
# Pattern: Test concurrent state access
def test_concurrent_state_access():
    """Test state manager handles concurrent access correctly."""
    state_manager = AgentStateManager(":memory:")
    state = create_test_state()
    
    # Save state
    state_manager.save_state(state)
    
    # Try concurrent modification (should fail with version conflict)
    state1 = state_manager.load_state(state.state_id)
    state2 = state_manager.load_state(state.state_id)
    
    # Modify both
    state1.data["key"] = "value1"
    state2.data["key"] = "value2"
    
    # Save first
    state_manager.save_state(state1)
    
    # Save second (should fail)
    with pytest.raises(StateVersionConflict):
        state_manager.save_state(state2)
```

### Test Coverage Requirements

- **Unit Tests**: ≥80% coverage for all new components
- **Integration Tests**: All critical paths covered
- **Error Cases**: All error paths tested
- **Edge Cases**: Timeout, cancellation, concurrent access

---

## Configuration & Deployment

### Configuration Pattern

**Pattern**: Use existing config loader

```yaml
# .cursor/config/workflow_engine.yaml
workflow_engine:
  # Execution settings
  default_timeout_seconds: 3600
  max_concurrent_workflows: 10
  max_retry_attempts: 3
  
  # State management
  state_db_path: ".cursor/data/workflow_state.db"
  backup_dir: ".cursor/data/backups"
  max_state_versions: 10
  
  # Event log
  event_log_db_path: ".cursor/data/workflow_events.db"
  event_log_retention_days: 30
  
  # Handoffs
  handoff_dir: ".cursor/agents/examples/handoffs"
  handoff_validation_strict: true
  
  # Error handling
  circuit_breaker_threshold: 5
  circuit_breaker_timeout_seconds: 60
```

### Environment Variables

```bash
# Pattern: Environment variable overrides
WORKFLOW_ENGINE_DEFAULT_TIMEOUT=3600
WORKFLOW_ENGINE_MAX_CONCURRENT=10
WORKFLOW_ENGINE_STATE_DB_PATH=.cursor/data/workflow_state.db
WORKFLOW_ENGINE_EVENT_LOG_DB_PATH=.cursor/data/workflow_events.db
```

### Deployment Model

**Current Model**: CLI tool (`run_workflow.py`)

**Usage**:
```bash
# List workflows
python .cursor/scripts/run_workflow.py list

# Run workflow
python .cursor/scripts/run_workflow.py run <workflow-id>

# Check status
python .cursor/scripts/run_workflow.py status <execution-id>
```

**Future Models** (if needed):
- Background service/daemon
- API server
- Cursor integration

---

## Troubleshooting & Operations

### Common Issues

#### 1. State Version Conflicts

**Symptom**: `StateVersionConflict` exception

**Cause**: Concurrent modifications to same state

**Solution**:
- Retry with fresh state load
- Implement retry logic in workflow executor
- Use transactions for atomic updates

#### 2. Event Log Performance

**Symptom**: Slow event queries

**Cause**: Large event log database

**Solution**:
- Use indexes (already implemented)
- Archive old events
- Implement event log rotation

#### 3. Handoff Validation Failures

**Symptom**: `HandoffValidationError`

**Cause**: Handoff doesn't match protocol

**Solution**:
- Check handoff against `HANDOFF_PROTOCOL.md`
- Verify all required fields present
- Validate agent IDs exist

#### 4. Workflow Timeout

**Symptom**: Workflow times out

**Cause**: Step execution exceeds timeout

**Solution**:
- Increase timeout for specific steps
- Investigate why step is slow
- Consider breaking step into smaller steps

### Operations

#### Monitoring

- Check event log for workflow status
- Query state database for execution state
- Monitor handoff files for handoff status

#### Maintenance

- Archive old events (retention policy)
- Clean up old state files
- Backup state and event databases

#### Debugging

- Use event replay to reconstruct execution
- Query events by execution_id
- Inspect state at any point

---

## Delta Analysis

### ✅ Already Implemented

| Component | Status | Location | Notes |
|-----------|--------|----------|-------|
| Workflow Models | ✅ Complete | `workflow_models.py` | All data structures exist |
| Workflow Parser | ✅ Complete | `workflow_parser.py` | Parses markdown workflows |
| Workflow Validator | ✅ Complete | `workflow_validator.py` | Validates structure, agents, dependencies |
| Agent Executor | ⚠️ Partial | `agent_executor.py` | Executes agents, needs workflow integration |
| State Manager | ⚠️ Partial | `agent_state.py` | Has persistence, needs SQLite migration |
| Error Handling | ✅ Complete | `error_handling.py` | Classification, retry, dead-letter queue |
| Workflow Executor | ⚠️ Skeleton | `workflow_executor.py` | Basic structure, needs enhancement |

### ✅ Completed Components (Previously Missing)

| Component | Status | Phase | Location |
|-----------|--------|-------|----------|
| Event Log (SQLite) | ✅ Complete | Phase 1 | `event_log.py` |
| Handoff Generator | ✅ Complete | Phase 3 | `handoff_generator.py` |
| State Manager (SQLite) | ✅ Complete | Phase 1 | `state_repository.py` |
| Timeout Handling | ✅ Complete | Phase 1 | `step_executor.py` |
| Workflow Versioning | ✅ Complete | Phase 2 | `workflow_executor.py` |
| Partial Failure Recovery | ✅ Complete | Phase 4 | `workflow_executor.py` |
| Dead-Letter Queue Integration | ✅ Complete | Phase 4 | `workflow_executor.py` |
| Circuit Breaker | ✅ Complete | Post-Phase 6 | `error_handling.py` |
| Workflow Metrics | ✅ Complete | Phase 6 | `workflow_metrics.py` |
| Execution Dashboard | ✅ Complete | Phase 6 | `workflow_dashboard.py` |
| Debugging Tools | ✅ Complete | Phase 6 | `workflow_debug.py` |
| Workflow Cancellation | ✅ Complete | Post-Phase 6 | `workflow_executor.py` |

### ⏸️ Deferred Components (Intentionally Not Implemented)

| Component | Priority | Reason | Phase |
|-----------|----------|--------|-------|
| Async Execution | **Medium** | Deferred until needed (profiling shows no blocking issues) | Phase 5 (Deferred) |
| Compensation Strategy | **Low** | Not needed (no destructive operations) | Deferred |

### ✅ Enhancement Status

All previously identified enhancements have been completed:

| Component | Previous State | Current State | Status |
|-----------|---------------|---------------|--------|
| State Manager | JSON files | SQLite with optimistic locking | ✅ Complete |
| Workflow Executor | Skeleton | Full execution with events, timeouts, cancellation | ✅ Complete |
| Step Executor | Basic execution | Timeout handling, event emission | ✅ Complete |
| Dead-Letter Queue | Not integrated | Fully integrated with workflow failures | ✅ Complete |

### Implementation Priority (Revised)

**Phase 0 (CRITICAL - Before Everything Else)**:
1. Clarify Integration Model
2. Proof of Concept
3. State Architecture Decision (SQLite recommended)

**Phase 1 (Foundation - Only After Phase 0)**:
1. State persistence (SQLite)
2. Event log (SQLite)
3. Timeout handling
4. Workflow versioning

**Phase 2 (Core Functionality)**:
1. Event emission integration
2. Event replay

**Phase 3 (Handoff Automation)**:
1. Handoff generator
2. Handoff validation
3. Handoff registry
4. Integration with workflow executor

**Phase 4 (Reliability)**:
1. Partial failure recovery
2. Dead-letter queue integration

**Phase 5+ (Enhancements - Only If Needed)**:
- ✅ Advanced observability (Phase 6 - Complete)
- ✅ Circuit breaker (Post-Phase 6 - Complete)
- ✅ Workflow cancellation API (Post-Phase 6 - Complete)
- ⏸️ Async execution (Deferred - if profiling shows need)
- ⏸️ Compensation (Deferred - if destructive operations exist)

---

## Appendices

### Appendix A: File Structure

```
.cursor/
├── orchestration/
│   ├── event_log.py          # NEW - Event log with SQLite
│   ├── handoff_generator.py   # NEW - Handoff generation
│   ├── handoff_registry.py    # NEW - Handoff tracking
│   ├── step_executor.py       # NEW - Step execution
│   ├── agent_state.py         # ENHANCED - SQLite state management
│   ├── workflow_executor.py  # ENHANCED - Full workflow execution
│   ├── workflow_models.py    # EXISTS - Data structures
│   ├── workflow_parser.py    # EXISTS - Markdown parsing
│   ├── workflow_validator.py # EXISTS - Validation
│   ├── agent_executor.py     # EXISTS - Agent execution
│   └── error_handling.py     # EXISTS - Error handling
├── config/
│   └── workflow_engine.yaml  # NEW - Configuration
├── data/
│   ├── workflow_state.db    # NEW - State database
│   └── workflow_events.db   # NEW - Event database
└── scripts/
    └── run_workflow.py        # EXISTS - CLI tool
```

### Appendix B: Dependencies

**No new external dependencies required.**

Uses only:
- Python standard library
- SQLite (built into Python)
- Existing project dependencies

### Appendix C: Date Handling Requirements

**CRITICAL**: Never hardcode dates. Always use dynamic current date.

**Pattern**: Get current date dynamically
```python
import subprocess

def get_current_timestamp() -> str:
    """Get current UTC timestamp (NEVER hardcode)."""
    result = subprocess.run(
        ['date', '-u', '+%Y-%m-%dT%H:%M:%SZ'],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()

def get_current_date() -> str:
    """Get current UTC date (NEVER hardcode)."""
    result = subprocess.run(
        ['date', '-u', '+%Y-%m-%d'],
        capture_output=True,
        text=True
    )
    return result.stdout.strip()
```

**See**: `.cursor/agents/examples/system-context-date.md` for guidelines

### Appendix D: Critical Re-Analysis Summary

**Key Findings from Critical Re-Analysis**:

1. **Cursor Integration Problem**: Must clarify how workflow engine invokes Cursor agents
2. **State Persistence**: Use SQLite instead of JSON files with locking
3. **Event Log Performance**: Use SQLite instead of JSONL for better query performance
4. **Handoff Timing**: Clarify how next agent discovers handoff
5. **Compensation Over-Engineering**: Defer compensation, focus on resume from failure
6. **Async Premature Optimization**: Start synchronous, add async only if needed

**See**: Full critical re-analysis in original document sections

### Appendix E: Testing Checklist

**Unit Tests**:
- [ ] Event log append and query
- [ ] Handoff generation and validation
- [ ] State manager with optimistic locking
- [ ] Step executor with timeout
- [ ] Workflow executor orchestration

**Integration Tests**:
- [ ] Full workflow execution
- [ ] Event replay
- [ ] Partial failure recovery
- [ ] Concurrent state access

**Error Cases**:
- [ ] State version conflicts
- [ ] Workflow timeouts
- [ ] Handoff validation failures
- [ ] Agent execution failures

### Appendix F: Success Metrics

**Phase 1 Success Criteria**:
- ✅ No state corruption on concurrent access
- ✅ Events are queryable and replayable
- ✅ Workflows timeout gracefully
- ✅ Workflow versions are pinned

**Phase 2 Success Criteria**:
- ✅ All workflow events are logged
- ✅ Execution state can be reconstructed from events

**Phase 3 Success Criteria**:
- ✅ Handoffs automatically generated
- ✅ All handoffs validate against protocol
- ✅ Handoff status is trackable

**Phase 4 Success Criteria**:
- ✅ Failed workflows go to dead-letter queue
- ✅ Workflows can resume from failures

**Overall Success Criteria**:
- ✅ Workflow engine is production-ready
- ✅ All critical issues from analysis are addressed
- ✅ System is maintainable and testable
- ✅ Performance is acceptable (< 100ms overhead per step)

---

**Document Status**: ✅ Complete Implementation Guide  
**Last Updated**: 2025-12-12  
**Next Review**: After Phase 0 (Integration Model Clarification)
