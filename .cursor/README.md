# Cursor Configuration for FitVibe

This directory contains Cursor IDE configuration files for agents, MCP servers, and slash commands to enhance development productivity in the FitVibe monorepo.

## Directory Structure

```
.cursor/
├── agents/          # Specialized development agents
├── mcp/            # Model Context Protocol server configurations
├── commands/       # Slash command definitions
└── README.md       # This file
```

## Agents

Agents are specialized AI assistants configured for specific development tasks:

- **backend-agent.md** - Backend development (Express, Knex.js, PostgreSQL)
- **senior-frontend-developer.md** - Frontend development (React, Vite, TypeScript)
- **fullstack-agent.md** - Full-stack feature implementation
- **test_manager.md** - Testing and quality assurance
- **version_controller.md** - Version control, git operations, security scanning, and PR management

Each agent has context about the relevant tech stack, coding standards, and common tasks.

## MCP Servers

Model Context Protocol (MCP) servers provide additional context and capabilities:

### Standard MCP Servers
- **filesystem** - File system operations
- **git** - Git repository operations
- **postgres** - PostgreSQL database access
- **brave-search** - Web search capabilities
- **github** - GitHub integration

Configuration is in `.cursor/mcp/servers.json`. Set required environment variables:
- `POSTGRES_CONNECTION_STRING` - For PostgreSQL MCP server
- `BRAVE_API_KEY` - For Brave Search (optional)
- `GITHUB_PERSONAL_ACCESS_TOKEN` - For GitHub integration (optional)

### Vector Database (Knowledge Base)

The `.cursor/mcp/` directory also contains Python scripts for managing a vector database of FitVibe documentation:

- **vector_db.py** - Core vector database using ChromaDB for semantic search
- **load_vector_db.py** - Script to load chunked documents from JSONL files
- **test_search.py** - Quick test script for search functionality
- **verify_search_quality.py** - Comprehensive quality verification

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

## Configuration

### MCP Server Setup

1. Edit `.cursor/mcp/servers.json` to configure MCP servers
2. Set required environment variables in your shell or `.env` file
3. Restart Cursor to load MCP server configurations

### Adding New Agents

1. Create a new `.md` file in `.cursor/agents/`
2. Follow the structure of existing agents
3. Include purpose, capabilities, context, and guidelines

### Adding New Commands

1. Create a new `.md` file in `.cursor/commands/`
2. Include YAML frontmatter with `name`, `description`, and `invokable: true`
3. Provide clear instructions for the command

## Best Practices

1. **Use the right agent** - Select the appropriate agent for your task
2. **Follow project standards** - All agents and commands enforce FitVibe coding standards
3. **Update documentation** - Use `/docs` command when making changes
4. **Test your changes** - Use `/test` command to verify functionality
5. **Security first** - Use `/security` command to review security implications

## References

- **Project Rules**: `.cursorrules` (root directory)
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

1. Review agent configuration files
2. Ensure context and guidelines are clear
3. Reference `.cursorrules` for project-wide standards

---

For more information, see the main [README.md](../README.md) and [CONTRIBUTING.md](../CONTRIBUTING.md).

