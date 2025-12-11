# Cursor Configuration for FitVibe

This directory contains Cursor IDE configuration files for agents, MCP servers, slash commands, project rules, documentation, and utility scripts to enhance development productivity in the FitVibe monorepo.

**Note**: This entire directory (`.cursor/`) is ignored by git as it contains user-specific configuration. All files remain local to your workspace.

## Directory Structure

```text
.cursor/
├── agents/          # Specialized development agents
├── bug-database/    # Bug tracking database (bugs.json)
├── commands/        # Slash command definitions
├── docs/            # Cursor-related documentation (reviews, reports, analysis)
├── mcp/             # Model Context Protocol server configurations
├── rules/           # Project rules (migrated from .cursorrules)
├── scripts/         # Utility scripts (compliance, chat analysis, bug fixing)
├── QUICK_START.md   # Quick start guide
└── README.md        # This file
```

## Agents

Agents are specialized AI assistants configured for specific development tasks:

- **planner-agent.md** - Project planning, workflow orchestration, and documentation management
- **requirements-analyst-agent.md** - Requirements analysis and acceptance criteria definition
- **system-architect-agent.md** - System architecture, API contracts, data models, and technical design
- **backend-agent.md** - Backend development (Express, Knex.js, PostgreSQL)
- **senior-frontend-developer.md** - Frontend development (React, Vite, TypeScript)
- **fullstack-agent.md** - Full-stack feature implementation
- **test_manager.md** - Testing and quality assurance
- **code-review-agent.md** - Code review and quality assurance
- **documentation-agent.md** - Documentation management and updates
- **version_controller.md** - Version control, git operations, security scanning, and PR management
- **agent-quality-agent.md** - Meta-agent for reviewing and improving agent configurations
- **knowledge-specialist-agent.md** - Queries RAG knowledge base to provide filtered, relevant context to other agents
- **researcher-agent.md** - Researches external knowledge, best practices, and solutions to enrich the knowledge base
- **prompt-engineer-agent.md** - **CENTRAL HUB**: Receives all user queries and agent handoffs, clarifies requirements, improves prompts, integrates context, and routes to appropriate agents

See `.cursor/agents/REGISTRY.md` for complete agent registry and capabilities.

Each agent has context about the relevant tech stack, coding standards, and common tasks.

### Agent Workflow

**CRITICAL ARCHITECTURE**: All communication flows through the **prompt-engineer**. Agents NEVER handoff directly to each other. The prompt-engineer serves as the central communication hub.

1. **User Request** → **Prompt Engineer** receives, clarifies if needed, improves prompt
2. **Prompt Engineer** → Routes to Planner Agent for workflow orchestration
3. **Requirements Analysis** → Prompt Engineer routes to requirements-analyst-agent
4. **Requirements Analyst** → Hands off to **Prompt Engineer** (agents ALWAYS handoff here)
5. **Prompt Engineer** → Routes to system-architect-agent (technical design)
6. **System Architect** → Hands off to **Prompt Engineer**
7. **Prompt Engineer** → Routes to fullstack-agent (or backend-agent/frontend-agent separately)
   - **CRITICAL**: Must implement BOTH backend AND frontend (if feature requires both)
8. **[Implementation Agent]** → Hands off to **Prompt Engineer**
9. **Prompt Engineer** → Routes to api-contract-agent (API contract validation)
10. **API Contract Agent** → Hands off to **Prompt Engineer**
11. **Prompt Engineer** → Routes to test-manager (testing - TDD/BDD approach)
12. **Test Manager** → Hands off to **Prompt Engineer**
13. **Prompt Engineer** → Routes to code-review-agent (code review)
14. **Code Review Agent** → Hands off to **Prompt Engineer**
15. **Prompt Engineer** → Routes to security-review-agent (security review)
16. **Security Review Agent** → Hands off to **Prompt Engineer**
17. **Prompt Engineer** → Routes to documentation-agent (documentation updates)
18. **Documentation Agent** → Hands off to **Prompt Engineer**
19. **Prompt Engineer** → Routes to version-controller (version control)
20. **Version Controller** → Hands off to **Prompt Engineer**
21. **Prompt Engineer** → Routes to planner-agent (marks complete)

**Key Points**:
- **ALL user queries** go through prompt-engineer first
- **ALL agent handoffs** go through prompt-engineer (agents ALWAYS handoff here, never directly to each other)
- Prompt-engineer improves prompts and integrates context from knowledge-specialist when needed
- Prompt-engineer routes improved prompts to appropriate agent(s)

**⚠️ CRITICAL**: The planner agent MUST continue orchestrating until ALL phases are complete. It will NOT stop after backend implementation, after testing, or at any intermediate step. The workflow continues automatically until documentation is updated and PR is created.

## MCP Servers

Model Context Protocol (MCP) servers provide additional context and capabilities:

### Standard MCP Servers

- **filesystem** - File system operations
- **git** - Git repository operations
- **postgres** - PostgreSQL database access
- **brave-search** - Web search capabilities
- **github** - GitHub integration

Configuration is in `.cursor/mcp/servers.json`. Set required environment variables:

- `POSTGRES_CONNECTION_STRING` - For PostgreSQL MCP server (required)
- `BRAVE_API_KEY` - For Brave Search (optional)
- `GITHUB_PERSONAL_ACCESS_TOKEN` - For GitHub integration (optional)

**Setup Instructions**:
1. Copy `.cursor/mcp/.env.example` to `.env` (or set environment variables in your shell)
2. Fill in your actual values (see Security section below for best practices)
3. Restart Cursor to load MCP server configurations

**See Security section below for detailed security practices and secret management.**

### Vector Database (Knowledge Base)

The `.cursor/mcp/` directory also contains Python scripts for managing a vector database of FitVibe documentation:

- **vector_db.py** - Core vector database using ChromaDB for semantic search
- **load_vector_db.py** - Script to load chunked documents from JSONL files
- **test_search.py** - Quick test script for search functionality
- **verify_search_quality.py** - Comprehensive quality verification

The **knowledge-specialist-agent** queries this vector database to provide relevant, filtered context to other agents based on their specific needs. The **researcher-agent** enriches the knowledge base with external research findings.

See `.cursor/mcp/README.md` for detailed documentation on the vector database functionality.

## Slash Commands

Slash commands provide quick access to common development workflows:

- `/test` - Run tests for current file or selection, or create tests if missing
- `/lint` - Lint and fix code issues
- `/refactor` - Refactor code following FitVibe standards
- `/api` - Create or update API endpoints
- `/migrate` - Create or run database migrations
- `/component` - Create React components
- `/docs` - Update documentation
- `/security` - Review and implement security practices
- `/requirements` - Analyze and document requirements with acceptance criteria
- `/ci` - Run complete CI/CD workflow locally
- `/commit` - Create conventional commit and push changes
- `/bug:collect` - Collect bugs from all sources (tests, linter, type checker)
- `/bug:fix` - Fix bugs using basic single-agent system
- `/bug:fix:multi` - Fix bugs using enhanced multi-agent system
- `/bug:brainstorm` - Brainstorm solutions with multiple LLMs

## Usage

### Using Agents

In Cursor, you can reference agents in your prompts:

- "Use the backend agent to create a new API endpoint"
- "With the senior frontend developer, create an accessible React component"
- "Using the test manager, write tests for this function"

### Using MCP Servers

MCP servers are automatically available when configured. They provide additional context and tools for:

- Reading/writing files
- Git operations
- Database queries
- Web searches
- GitHub operations

### Using Slash Commands

Type `/` in Cursor's chat to see available commands, or use them directly:

- `/test` - Run or create tests
- `/lint` - Fix linting issues
- `/refactor` - Refactor selected code
- `/api` - Create API endpoint
- `/migrate` - Database migration
- `/component` - Create component
- `/docs` - Update documentation
- `/security` - Security review
- `/requirements` - Analyze requirements
- `/ci` - Run CI/CD workflow
- `/commit` - Commit and push changes
- `/bug:collect` - Collect bugs from all sources
- `/bug:fix` - Fix bugs (basic agent)
- `/bug:fix:multi` - Fix bugs (multi-agent)
- `/bug:brainstorm` - Brainstorm solutions with LLMs

## Configuration

### MCP Server Setup

1. Edit `.cursor/mcp/servers.json` to configure MCP servers
2. Set required environment variables in your shell or `.env` file
3. Restart Cursor to load MCP server configurations

### Adding New Agents

1. Create a new `.md` file in `.cursor/agents/`
2. Follow the structure defined in `.cursor/agents/STANDARDS.md`
3. Include all required sections (see STANDARDS.md for details)
4. Register the agent in `.cursor/agents/REGISTRY.md`
5. Ensure compliance with handoff protocol (`.cursor/agents/HANDOFF_PROTOCOL.md`)

### Adding New Commands

1. Create a new `.md` file in `.cursor/commands/`
2. Include YAML frontmatter with `name`, `description`, and `invokable: true`
3. Provide clear instructions for the command
4. Follow existing command patterns for consistency

### Updating Project Rules

1. Edit the appropriate file in `.cursor/rules/`
2. Keep files focused on a single topic
3. Maintain files under 500 lines when possible
4. Update `.cursor/rules/README.md` if adding new rule files

### Adding Documentation

1. Add cursor-related documentation to `.cursor/docs/`
2. Update `.cursor/docs/README.md` with new files
3. Keep documentation organized by topic

## Security

### Workspace Trust

**IMPORTANT**: Enable Workspace Trust in Cursor to prevent unauthorized code execution. This prevents automatic execution of tasks specified in configuration files without explicit user confirmation.

**How to Enable**:
1. Open Cursor Settings
2. Search for "Workspace Trust"
3. Enable "Workspace: Trust" feature
4. Configure trust settings for your workspace

**Why This Matters**: Without workspace trust, malicious code in configuration files (e.g., `.vscode/tasks.json`) could execute automatically when opening the folder. This is a known security consideration for Cursor.

**Reference**: [Cursor Security Best Practices](https://www.oasis.security/blog/cursor-security-flaw)

### Agent Permissions

Agents have access to various tools and capabilities. The following security controls are in place:

**File System Access**:
- Agents can read/write files within the workspace
- No access to files outside the workspace
- All file operations are logged

**Command Execution**:
- Agents can execute shell commands via Bash tool
- Commands are executed in the workspace context
- No automatic execution without user approval (when workspace trust is enabled)

**Network Access**:
- Agents can make web requests via WebFetch tool
- MCP servers may have network access (see MCP Server Security below)
- No access to local network resources without explicit configuration

**Secret Management**:
- **Never commit secrets** - All agents are instructed to never commit API keys, passwords, or tokens
- **Environment Variables** - Secrets must be stored in environment variables, not in code
- **Secret Detection** - Version controller agent scans for accidentally committed secrets
- **MCP Servers** - Use environment variables for all credentials (see below)

### MCP Server Security

MCP servers require environment variables for authentication. Follow these security practices:

**Required Environment Variables**:
- `POSTGRES_CONNECTION_STRING` - PostgreSQL database connection (required for postgres MCP server)
- `BRAVE_API_KEY` - Brave Search API key (optional, for brave-search MCP server)
- `GITHUB_PERSONAL_ACCESS_TOKEN` - GitHub personal access token (optional, for github MCP server)

**Security Best Practices**:
1. **Never commit secrets** - Store environment variables in `.env` file (not in version control)
2. **Use `.env.example`** - Create `.env.example` with placeholder values for documentation
3. **Rotate secrets regularly** - Change API keys and tokens periodically
4. **Limit token permissions** - Grant minimum required permissions to tokens
5. **Use separate tokens** - Use different tokens for development vs production

**Setting Environment Variables**:

**Windows (PowerShell)**:
```powershell
$env:POSTGRES_CONNECTION_STRING = "postgresql://user:pass@localhost:5432/fitvibe"
$env:BRAVE_API_KEY = "your-api-key"
$env:GITHUB_PERSONAL_ACCESS_TOKEN = "your-token"
```

**Windows (Git Bash)**:
```bash
export POSTGRES_CONNECTION_STRING="postgresql://user:pass@localhost:5432/fitvibe"
export BRAVE_API_KEY="your-api-key"
export GITHUB_PERSONAL_ACCESS_TOKEN="your-token"
```

**Linux/macOS**:
```bash
export POSTGRES_CONNECTION_STRING="postgresql://user:pass@localhost:5432/fitvibe"
export BRAVE_API_KEY="your-api-key"
export GITHUB_PERSONAL_ACCESS_TOKEN="your-token"
```

**Using .env file** (recommended):
1. Create `.env` file in project root (already in `.gitignore`)
2. Add environment variables:
   ```
   POSTGRES_CONNECTION_STRING=postgresql://user:pass@localhost:5432/fitvibe
   BRAVE_API_KEY=your-api-key
   GITHUB_PERSONAL_ACCESS_TOKEN=your-token
   ```
3. Load in your shell or use a tool like `dotenv`

**Secret Rotation**:
- Review and rotate secrets quarterly
- Immediately rotate if a secret is exposed or compromised
- Update all team members when secrets change
- Document rotation procedures in team wiki

### Security Scanning

The version-controller agent performs security scanning:

- **Secret Detection** - Scans for accidentally committed secrets
- **Dependency Auditing** - Checks for known vulnerabilities in dependencies
- **Code Security** - Reviews code for security anti-patterns

Run security scans:
```bash
# Secret detection
bash scripts/secrets-scan.sh

# Dependency audit
pnpm audit --audit-level=high

# Full security scan
pnpm security:scan
```

### Security Checklist

Before committing code:
- [ ] No secrets or credentials in code
- [ ] Environment variables used for all sensitive data
- [ ] Dependencies audited for vulnerabilities
- [ ] Security scan passes
- [ ] Workspace trust enabled

## Best Practices

1. **Use the right agent** - Select the appropriate agent for your task
2. **Follow project standards** - All agents and commands enforce FitVibe coding standards
3. **Update documentation** - Use `/docs` command when making changes
4. **Test your changes** - Use `/test` command to verify functionality
5. **Security first** - Use `/security` command to review security implications
6. **Enable workspace trust** - Protect against unauthorized code execution
7. **Never commit secrets** - Use environment variables for all credentials

## Project Rules

Project rules have been migrated from the legacy `.cursorrules` file to `.cursor/rules/` for better organization and maintainability. The rules are split into focused files:

- **`project-overview.md`** - Project overview, tech stack, domain concepts
- **`coding-standards.md`** - TypeScript, formatting, API conventions, database
- **`security-privacy.md`** - Security, privacy, accessibility
- **`testing-requirements.md`** - Testing standards and patterns
- **`development-workflow.md`** - Documentation, branching, quality gates
- **`implementation-patterns.md`** - Common code patterns
- **`implementation-principles.md`** - Core principles and quick reference
- **`domain-concepts.md`** - Observability, troubleshooting, references

See `.cursor/rules/README.md` for complete documentation.

## Documentation

Cursor-related documentation is organized in `.cursor/docs/`:

- **Agent Documentation**: Reviews, implementation status, improvements
- **Rules Documentation**: Compliance reports, improvements, analysis
- **Review Reports**: Configuration reviews and file organization

See `.cursor/docs/README.md` for a complete list of documentation files.

## Utility Scripts

Utility scripts for cursor-related tasks are in `.cursor/scripts/`:

- **`check_cursor_rules_compliance.py`** - Checks codebase compliance with cursor rules
- **`analyze_cursor_chats.py`** - Analyzes cursor chat history for patterns
- **`bug-collector.mjs`** - Collects bugs from tests, linter, and type checker
- **`bug-fixer-agent.mjs`** - Basic single-agent bug fixer
- **`bug-fixer-multi-agent.mjs`** - Enhanced multi-agent bug fixing system
- **`bug-brainstorm-coordinator.mjs`** - Coordinates multiple LLMs for solution brainstorming

See `.cursor/scripts/README.md` for usage instructions.

## Bug Database

Bug tracking database is stored in `.cursor/bug-database/`:

- **`bugs.json`** - Main bug database with bug details, status tracking, and statistics
- Managed by bug-fixing scripts (see Utility Scripts above)
- Accessible via Cursor commands: `/bug:collect`, `/bug:fix`, `/bug:fix:multi`, `/bug:brainstorm`

See `.cursor/bug-database/README.md` and `.cursor/docs/README_BUG_FIXING.md` for complete documentation.

## References

- **Project Rules**: `.cursor/rules/` (migrated from legacy `.cursorrules`)
- **Agent Standards**: `.cursor/agents/STANDARDS.md`
- **Handoff Protocol**: `.cursor/agents/HANDOFF_PROTOCOL.md`
- **Agent Registry**: `.cursor/agents/REGISTRY.md`
- **Quick Start**: `.cursor/QUICK_START.md`
- **Documentation**: `.cursor/docs/README.md`
- **Contributing Guide**: `CONTRIBUTING.md`
- **Technical Design**: `docs/2.Technical_Design_Document/`
- **Product Requirements**: `docs/1.Product_Requirements/`

## Troubleshooting

### MCP Servers Not Working

1. Check that environment variables are set correctly
2. Verify Node.js and npm/npx are available
3. Check Cursor's MCP server logs
4. Ensure network access for external servers (GitHub, Brave Search)

### Commands Not Appearing

1. Ensure command files are in `.cursor/commands/`
2. Check YAML frontmatter is correct
3. Restart Cursor to reload commands

### Agents Not Responding Correctly

1. Review agent configuration files in `.cursor/agents/`
2. Ensure context and guidelines are clear
3. Check compliance with `.cursor/agents/STANDARDS.md`
4. Reference `.cursor/rules/` for project-wide standards
5. Review `.cursor/agents/REGISTRY.md` for agent capabilities

### Rules Not Loading

1. Ensure rule files are in `.cursor/rules/` directory
2. Check that files are valid Markdown
3. Restart Cursor to reload rules
4. Verify `.cursorrules` is not conflicting (legacy file, should be ignored)

### Documentation Questions

1. Check `.cursor/docs/README.md` for available documentation
2. Review agent documentation in `.cursor/docs/` for agent-specific info
3. See `.cursor/QUICK_START.md` for quick setup instructions

---

For more information, see the main [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).
