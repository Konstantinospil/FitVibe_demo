# Development Workflow

## Branch-Based CI/CD

This project uses a branch-based CI/CD strategy where different branches trigger different workflows:

- **`dev` branch**: Only CI runs (tests, linting, quality checks)
- **`stage` branch**: Both CI and CD run (full testing + deployment to staging)
- **`main` branch**: Only CD runs (deployment to production, assumes CI already passed)

## Commit Message Format

You can specify which branch to push to using commit message directives:

### Format 1: Directive Tag

```
fix: update tests [push:dev]
feat: add new feature [push:stage]
chore: update dependencies [push:main]
```

### Format 2: Natural Language

```
fix: update tests - push to dev
feat: add new feature - deploy to stage
chore: update dependencies - push to main
```

## Usage

### Method 1: Using the Push Script (Recommended)

After committing, run the push script:

```bash
# Make your changes and commit
git add .
git commit -m "fix: update tests [push:dev]"

# Push to the specified branch
./scripts/git-push-branch.sh
```

### Method 2: Using the Combined Script

Commit and push in one command:

```bash
# Commit and push to dev
./scripts/git-commit-and-push.sh "fix: update tests" dev

# Or include directive in message
./scripts/git-commit-and-push.sh "fix: update tests [push:stage]"
```

### Method 3: Manual Push

If you prefer manual control:

```bash
# Commit with directive
git commit -m "fix: update tests [push:dev]"

# Manually push to the branch
git push origin dev
```

## Workflow Details

### Dev Branch (`dev`)

- **Triggers**: CI workflow only
- **Runs**: All quality gates, tests, linting, type checking
- **Does NOT**: Build images or deploy
- **Use case**: Development and feature work

### Stage Branch (`stage`)

- **Triggers**: CI workflow, then CD Staging workflow
- **Runs**:
  - Full CI pipeline (all tests, quality checks)
  - Image building and publishing
  - Deployment to staging environment
- **Use case**: Pre-production testing and validation

### Main Branch (`main`)

- **Triggers**: CD workflow (after CI completes)
- **Runs**:
  - Deployment to production
  - Uses images built during CI
- **Use case**: Production releases

## Important Notes

1. **CI must pass before CD runs**: The CD workflows are triggered by successful CI workflow completion
2. **Image artifacts**: CD workflows download container artifacts from the CI workflow
3. **Manual deployment**: You can still manually trigger CD workflows via GitHub Actions UI
4. **Branch protection**: Consider protecting `main` and `stage` branches in GitHub settings

## Troubleshooting

### Script not found

Make sure scripts are executable:

```bash
chmod +x scripts/git-push-branch.sh
chmod +x scripts/git-commit-and-push.sh
```

### Branch doesn't exist

The script will automatically create the branch if it doesn't exist locally or remotely.

### CI/CD not triggering

- Check that your commit message includes a valid directive
- Verify branch names match exactly: `dev`, `stage`, or `main`
- Check GitHub Actions workflow files for correct branch triggers
