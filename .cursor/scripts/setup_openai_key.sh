#!/bin/bash
# Setup script for OpenAI API key
# Usage: source .cursor/scripts/setup_openai_key.sh

echo "Setting up OpenAI API key..."

# Check if key is already set
if [ -z "$OPENAI_API_KEY" ]; then
    echo "Please set your OpenAI API key:"
    echo "export OPENAI_API_KEY='your-key-here'"
    echo ""
    echo "Or add it to your ~/.bashrc or ~/.zshrc:"
    echo "echo 'export OPENAI_API_KEY=\"your-key-here\"' >> ~/.bashrc"
else
    echo "OPENAI_API_KEY is already set."
fi













