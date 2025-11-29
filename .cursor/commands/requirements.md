---
name: requirements
description: Complete requirements workflow: user description → epics → stories → AC → activities → GitHub issues
invokable: true
---

# Requirements Command - Complete Workflow

Transform user descriptions into complete project planning artifacts (epics, stories, acceptance criteria, activities) and automatically push GitHub issues.

## Workflow Overview

This command follows a comprehensive workflow:

1. **User Description** → Understand the feature request
2. **Clarifying Questions** → Ask targeted questions to fill gaps
3. **Epic Generation** → Create epic structure with activities
4. **Story Generation** → Break down into user stories
5. **Acceptance Criteria** → Define testable AC for each story
6. **Activities** → Define implementation activities
7. **GitHub Issues** → Automatically create and push issues

---

## Phase 1: Requirements Elicitation

### Step 1: Understand User Description

When the user provides a description, analyze it to identify:

- **Feature Name**: What is the core feature?
- **User Type**: Who will use this feature?
- **Business Objective**: Why is this needed?
- **Success Criteria**: How will we measure success?
- **Priority**: High, Medium, or Low?
- **Quality Gate**: BRONZE, SILVER, or GOLD?

### Step 2: Ask Clarifying Questions

If information is missing or ambiguous, ask targeted questions:

**Example Questions:**

1. **User & Use Cases:**
   - "Who is the primary user of this feature? (e.g., authenticated users, admins, coaches)"
   - "What is the main use case? Can you describe a typical user flow?"
   - "Are there any edge cases or error scenarios to consider?"

2. **Functional Requirements:**
   - "What specific actions should users be able to perform?"
   - "What data needs to be stored or displayed?"
   - "Are there any integrations with existing features?"

3. **Non-Functional Requirements:**
   - "What are the performance requirements? (e.g., response time, throughput)"
   - "Are there security or privacy considerations?"
   - "What accessibility requirements should we consider?"

4. **Constraints & Dependencies:**
   - "Are there any technical constraints? (e.g., existing APIs, database schema)"
   - "Does this depend on other features or requirements?"
   - "Are there any business constraints? (e.g., timeline, budget)"

5. **Acceptance Criteria:**
   - "How will we know this feature is complete?"
   - "What are the test scenarios?"
   - "What evidence is needed to verify completion?"

**Ask questions ONE AT A TIME** and wait for user responses before proceeding.

---

## Phase 2: Epic Generation

After gathering information, create an epic structure:

### Epic Structure

```markdown
## Epic N: [Epic Name] ([Requirement ID])

**Status**: Open
**Priority**: [High|Medium|Low]
**Gate**: [BRONZE|SILVER|GOLD]
**Estimated Total Effort**: [X-Y story points]

### Activities

| ID    | Activity        | Description                                         | Difficulty | Dependencies   |
| ----- | --------------- | --------------------------------------------------- | ---------- | -------------- |
| EN-A1 | [Activity Name] | [Clear description of what needs to be implemented] | [1-5]      | [Dependencies] |
```

### Activity Difficulty Scale

- **1 - Trivial**: Simple bug fix, small refactor, documentation update
- **2 - Easy**: Straightforward feature, well-defined scope, minimal dependencies
- **3 - Medium**: Moderate complexity, some unknowns, multiple components
- **4 - Hard**: Complex feature, multiple integrations, architectural considerations
- **5 - Very Hard**: Major architectural changes, high risk, extensive refactoring

### Epic Generation Rules

1. **One Epic per Major Feature**: Group related activities under one epic
2. **Activities from ACs**: Generate activities from acceptance criteria
3. **Dependencies**: Identify technical and feature dependencies
4. **Story Point Estimation**: Estimate based on AC count and complexity
   - Formula: `max(5, min(20, ac_count * 2))` as baseline
   - Adjust based on complexity

---

## Phase 3: User Story Generation

Break down the epic into user stories:

### User Story Format

```markdown
### US-N.M: [Story Title]

**As a** [user type]
**I want** [goal]
**So that** [benefit]

**Activities:**

- EN-A1: [Activity Name]
- EN-A2: [Activity Name]

**Story Points**: [1-13]
**Priority**: [High|Medium|Low]
**Dependencies**: [List of dependencies]

**Acceptance Criteria:**

- **US-N.M-AC01**: [Specific, testable condition]
  - Test Method: [Unit|Integration|E2E|API negative]
  - Evidence: [What evidence is needed]

- **US-N.M-AC02**: [Another testable condition]
  - Test Method: [Unit|Integration|E2E|API negative]
  - Evidence: [What evidence is needed]
```

### Story Generation Rules

1. **Group ACs into Stories**: Max 5 ACs per story (prefer 3-4)
2. **Story Points**: Based on AC count
   - 1-2 ACs: 3 SP
   - 3-4 ACs: 5 SP
   - 5+ ACs: 8 SP
   - Complex: 13 SP
3. **User-Focused**: Each story should deliver user value
4. **Testable ACs**: All ACs must be specific and measurable

---

## Phase 4: Acceptance Criteria

For each user story, define detailed acceptance criteria:

### AC Format

```markdown
- **US-N.M-AC01**: [Specific, testable condition with measurable criteria]
  - Test Method: [Unit|Integration|E2E|API negative|Performance]
  - Evidence: [What evidence is needed to verify]
```

### AC Quality Standards

1. **Specific**: Clear, unambiguous condition
2. **Measurable**: Can be verified objectively
3. **Testable**: Can be tested via automated or manual tests
4. **Complete**: Covers happy path and edge cases
5. **Realistic**: Achievable within project constraints

### AC Examples

**Good AC:**

```
- **US-1.1-AC01**: Users can edit alias, weight, fitness level, and training frequency via API endpoint PATCH /api/v1/users/me within ≤500ms response time.
  - Test Method: Integration + E2E
  - Evidence: API response times, DB snapshot, UI screenshots
```

**Bad AC:**

```
- Users can edit their profile (too vague, not measurable)
```

---

## Phase 5: Activities

Define implementation activities for each epic:

### Activity Format

```markdown
| EN-A1 | [Activity Name] | [Clear description] | [Difficulty 1-5] | [Dependencies] |
```

### Activity Guidelines

1. **Granular**: Each activity should be completable in 1-3 days
2. **Clear Scope**: Description should be unambiguous
3. **Dependencies**: List all blocking dependencies
4. **Difficulty**: Use 1-5 scale consistently

---

## Phase 6: GitHub Issue Creation

After generating all artifacts, automatically create GitHub issues:

### Issue Creation Process

1. **Check Existing Issues**: Use `verify_github_issues.py` to check what's already created
2. **Generate Issues**: Use `project_planning_agent.py --mode issues`
3. **Upload Missing Issues**: Use `upload_missing_issues.py` or `--auto-upload` flag
4. **Add to Project**: Issues are automatically added to GitHub project

### Issue Format

Each user story becomes a GitHub issue with:

- **Title**: `[Story ID]: [Story Title]`
- **Body**: Full user story with ACs and activities
- **Labels**: Epic label, priority label, type label
- **Project**: Added to FitVibe project board

### GitHub Token

The command requires a GitHub token. Options:

1. **Environment Variable**: `GITHUB_TOKEN`
2. **Command Argument**: `--git-token <token>`
3. **Prompt User**: Ask for token if not provided

---

## Implementation Steps

### Step 1: Parse User Description

```python
# Analyze user description
feature_name = extract_feature_name(user_description)
user_type = identify_user_type(user_description)
business_objective = identify_business_objective(user_description)
```

### Step 2: Ask Clarifying Questions

```python
# Identify gaps and ask questions
missing_info = identify_missing_information(user_description)
questions = generate_clarifying_questions(missing_info)

# Ask ONE question at a time
for question in questions:
    response = ask_user(question)
    update_requirements(response)
```

### Step 3: Generate Epic

```python
# Create epic structure
epic = {
    "id": f"Epic {epic_num}",
    "title": feature_name,
    "status": "Open",
    "priority": priority,
    "gate": gate,
    "estimated_sp": estimate_story_points(acs),
    "activities": generate_activities(acs, dependencies)
}
```

### Step 4: Generate Stories

```python
# Break epic into stories
stories = []
for ac_group in group_acceptance_criteria(acs, max_per_story=5):
    story = {
        "id": f"US-{epic_num}.{story_num}",
        "as_a": user_type,
        "i_want": extract_goal(ac_group),
        "so_that": extract_benefit(ac_group),
        "story_points": estimate_story_points(ac_group),
        "acceptance_criteria": ac_group,
        "activities": map_activities(ac_group)
    }
    stories.append(story)
```

### Step 5: Write to Files

```python
# Update PROJECT_EPICS_AND_ACTIVITIES.md
# Check which file exists and use it
epic_file = "docs/PROJECT_EPICS_AND_ACTIVITIES.md"  # Default location used by scripts
if Path("docs/6.Implementation/PROJECT_EPICS_AND_ACTIVITIES.md").exists():
    epic_file = "docs/6.Implementation/PROJECT_EPICS_AND_ACTIVITIES.md"
append_epic_to_file(epic, epic_file)

# Update USER_STORIES.md
append_stories_to_file(stories, "docs/USER_STORIES.md")
```

### Step 6: Generate and Upload Issues

```python
# Regenerate issues from USER_STORIES.md
subprocess.run([
    "python", "scripts/generate_github_issues.py"
])

# Upload missing issues
subprocess.run([
    "python", "scripts/project_planning_agent.py",
    "--mode", "issues",
    "--git-token", git_token,
    "--auto-upload"
])
```

---

## Usage Examples

### Example 1: Simple Feature

```
User: /requirements I need a feature where users can upload their profile picture

Agent: [Asks clarifying questions]
- Who can upload? (all users, admins only?)
- What file formats? (JPEG, PNG, WebP?)
- What size limits?
- Should there be image preview?
- Any privacy considerations?

User: [Answers questions]

Agent: [Generates epic, stories, ACs, activities, and creates GitHub issues]
```

### Example 2: Complex Feature

```
User: /requirements I want a social feed where users can share their workouts, like posts, and follow other users

Agent: [Asks multiple rounds of clarifying questions]
- What visibility model? (public by default, private by default?)
- What can users share? (completed sessions only, or planned too?)
- What social interactions? (like, comment, bookmark, follow?)
- Any moderation needed?
- Performance requirements?

User: [Answers questions]

Agent: [Generates epic with multiple activities, breaks into stories, creates ACs, and pushes issues]
```

---

## Output Files

The command updates these files:

1. **`docs/6.Implementation/PROJECT_EPICS_AND_ACTIVITIES.md`**
   - Adds new epic with activities

2. **`docs/USER_STORIES.md`**
   - Adds new user stories with ACs

3. **`scripts/generated/github_issues.json`**
   - Regenerated with new issues

4. **GitHub Repository**
   - New issues created and added to project

---

## Integration with Existing Tools

This command integrates with:

- **`scripts/project_planning_agent.py`**: For generating issues
- **`scripts/generate_github_issues.py`**: For issue file generation
- **`scripts/upload_missing_issues.py`**: For uploading to GitHub
- **`scripts/verify_github_issues.py`**: For checking existing issues

---

## Quality Checklist

Before completing, verify:

### Completeness

- [ ] All user needs addressed
- [ ] Epic structure complete
- [ ] All stories have ACs
- [ ] All activities defined
- [ ] Dependencies identified

### Clarity

- [ ] Epic description clear
- [ ] Stories follow user story format
- [ ] ACs are specific and measurable
- [ ] Activities have clear descriptions

### Testability

- [ ] All ACs are testable
- [ ] Test methods specified
- [ ] Evidence requirements defined

### Consistency

- [ ] Story points estimated consistently
- [ ] Priority levels consistent
- [ ] Difficulty ratings consistent

---

## Error Handling

- **Missing Information**: Ask clarifying questions
- **Ambiguous Requirements**: Request clarification
- **GitHub Token Missing**: Prompt user or use environment variable
- **File Write Errors**: Report error and retry
- **Issue Upload Failures**: Report which issues failed, continue with others

---

## Important Notes

1. **Always ask clarifying questions** if information is missing or ambiguous
2. **One question at a time** - wait for user response before proceeding
3. **Use existing patterns** - reference similar epics/stories for consistency
4. **Validate ACs** - ensure they are testable and measurable
5. **Check dependencies** - verify all dependencies exist or are planned
6. **GitHub token** - required for issue creation, can be provided via env var or prompt

---

## Escalation

Escalate when:

- User request is too ambiguous after multiple clarification attempts
- Business objectives are unclear or conflicting
- Technical constraints make requirements infeasible
- Critical dependencies are missing or unknown
- Requirements conflict with existing system architecture

---

## Example Complete Workflow

```
User: /requirements I need a feature to export workout data to CSV

Agent: Let me understand your requirements better.

Question 1: Who should be able to export data? (all users, admins only, or specific roles?)

User: All authenticated users

Agent: Question 2: What data should be included in the export? (all sessions, date range, specific metrics?)

User: All completed sessions with date, exercises, sets, reps, weight, and duration

Agent: Question 3: Should users be able to filter what's exported? (by date range, exercise type, etc?)

User: Yes, by date range at minimum

Agent: Question 4: Any performance requirements? (file size limits, export time limits?)

User: Should complete within 30 seconds for up to 1000 sessions

Agent: [Generates epic, stories, ACs, activities]

Epic 14: Workout Data Export (FR-014)
- Status: Open
- Priority: Medium
- Gate: SILVER
- Estimated Total Effort: 8-12 story points

Activities:
- E14-A1: Export API Endpoint
- E14-A2: CSV Generation
- E14-A3: Date Range Filtering
- E14-A4: Export Frontend
- E14-A5: Export Tests

Stories:
- US-14.1: Export Workout Data to CSV
- US-14.2: Filter Export by Date Range

[Creates GitHub issues and reports success]
```

---

**Last Updated**: 2025-01-23
