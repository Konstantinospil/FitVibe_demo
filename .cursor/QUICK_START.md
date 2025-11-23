# Cursor Configuration Quick Start

## Setup

1. **MCP Servers** (Optional but recommended)
   - MCP servers are configured in `.cursor/mcp/servers.json`
   - Set environment variables for servers you want to use:
     ```bash
     export POSTGRES_CONNECTION_STRING="postgresql://user:pass@localhost:5432/fitvibe"
     export BRAVE_API_KEY="your-key"  # Optional
     export GITHUB_PERSONAL_ACCESS_TOKEN="your-token"  # Optional
     ```
   - Restart Cursor after setting environment variables

2. **Agents** - Ready to use!
   - Agents are automatically available in Cursor
   - Reference them in your prompts: "Use the backend agent to..."

3. **Slash Commands** - Ready to use!
   - Type `/` in Cursor chat to see available commands
   - Commands are automatically loaded

## Quick Examples

### Using an Agent

```
Use the backend agent to create a new API endpoint for user sessions
```

### Using a Slash Command

```
/test - Run tests for the current file
/lint - Fix linting issues
/refactor - Refactor selected code
/api - Create a new API endpoint
```

### Using MCP Servers

MCP servers provide additional context automatically. For example:

- Filesystem server: Helps with file operations
- Git server: Provides git context
- PostgreSQL server: Can query the database (when configured)

## Common Workflows

### Creating a New Feature

1. Use `/api` to create the backend endpoint
2. Use `/component` to create the frontend component
3. Use `/test` to write tests
4. Use `/docs` to update documentation

### Fixing Issues

1. Use `/lint` to fix linting issues
2. Use `/refactor` to improve code quality
3. Use `/security` to review security implications

### Database Changes

1. Use `/migrate` to create a migration
2. Follow the migration guidelines
3. Update TDD documentation

## Need Help?

See `.cursor/README.md` for detailed documentation.
