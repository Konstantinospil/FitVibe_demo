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

4. **Stage Changes Selectively**

   **IMPORTANT**: Stage only related changes for atomic commits. Avoid `git add -A` unless all changes are truly related.

   ```bash
   # Option 1: Stage specific files (RECOMMENDED for atomic commits)
   git add <file1> <file2> <file3>

   # Option 2: Stage by directory
   git add apps/backend/src/modules/auth/

   # Option 3: Stage all (ONLY if all changes are related)
   git add -A
   ```

   **Best Practice**: Make separate commits for:
   - Different features
   - Bug fixes vs. new features
   - Code changes vs. documentation
   - CI/CD changes vs. application code

5. **Commit**

   ```bash
   git commit -m "<type>: <description>"
   ```

6. **Push to Remote**
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
- **Atomic Commits**: Commit related changes together - one logical change per commit
- **Review Before Commit**: Always review changes with `git diff` before committing
- **Selective Staging**: Use `git add <files>` instead of `git add -A` to create focused, reviewable commits
