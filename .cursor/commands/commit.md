# Commit and Push Changes

Create a conventional commit with all current changes and push to the remote repository.

## Steps

1. **Review Changes**
   ```bash
   git status  # See all changes
   git diff    # Review the changes
   ```

2. **Determine Commit Type**
   Analyze the changes and determine the appropriate conventional commit type:
   - `feat:` - New features
   - `fix:` - Bug fixes
   - `docs:` - Documentation changes
   - `style:` - Formatting changes (whitespace, formatting, etc.)
   - `refactor:` - Code refactoring (no behavior change)
   - `test:` - Test additions/changes
   - `chore:` - Maintenance tasks (dependencies, config, etc.)
   - `perf:` - Performance improvements
   - `ci:` - CI/CD changes

3. **Write Commit Message**
   Format: `<type>: <description>`
   - Use imperative mood ("Add feature" not "Added feature")
   - Keep description concise but descriptive
   - Optionally add body for more details
   - Optionally add footer for breaking changes or issue references

4. **Stage and Commit**
   ```bash
   git add -A
   git commit -m "<type>: <description>"
   ```

5. **Push to Remote**
   ```bash
   git push
   ```

## Commit Message Examples

```bash
# Feature
feat: add user profile editing functionality

# Bug fix
fix: resolve session creation validation error

# Documentation
docs: update API design documentation

# Refactoring
refactor: extract session service logic

# Test
test: add integration tests for user authentication

# Chore
chore: update dependencies to latest versions
```

## Important Notes

- **Conventional Commits**: This project follows the [Conventional Commits](https://www.conventionalcommits.org/) specification
- **No Co-authors**: Do NOT add co-authors to the commit message
- **Descriptive Messages**: Write clear, descriptive commit messages
- **Atomic Commits**: Commit related changes together
- **Review Before Commit**: Always review changes with `git diff` before committing
