---
name: commit
description: Create a conventional git commit for the current FitVibe changes. Use when the user types /commit or asks to commit. Do not push unless they also asked to push.
disable-model-invocation: true
---

# Commit

Do not push unless asked. Review `git status` and `git diff`. Stage related files only. Message: `<type>: <imperative summary>`. HEREDOC commit. No `--no-verify` or amend.
