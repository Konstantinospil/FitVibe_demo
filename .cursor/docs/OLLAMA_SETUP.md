# Ollama Setup Guide

Ollama is a local LLM solution that runs models on your machine. It's perfect for local development as it doesn't require API keys or have quota limits.

## Installation

### macOS

```bash
# Download and install from https://ollama.ai/download
# Or use Homebrew:
brew install ollama
```

### Linux

```bash
# Download from https://ollama.ai/download
# Or use the install script:
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows

Download the installer from https://ollama.ai/download

## Starting Ollama

```bash
# Start the Ollama server
ollama serve

# This will start the server on http://localhost:11434
```

## Pulling Models

Before using Ollama, you need to pull a model:

```bash
# Popular models:
ollama pull llama2          # Meta's Llama 2 (7B parameters)
ollama pull mistral         # Mistral 7B (fast and efficient)
ollama pull codellama       # Code-focused Llama model
ollama pull llama2:13b      # Larger 13B version
ollama pull mistral:7b      # Specific version
```

### Recommended Models for Development

- **mistral** - Fast, efficient, good for general tasks
- **codellama** - Best for code generation and analysis
- **llama2:13b** - Better quality, slower (if you have enough RAM)

## Configuration

Update `.cursor/.env`:

```bash
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434/v1
```

## Usage

Once Ollama is running and you have a model pulled, the workflow system will automatically use it:

```bash
cd .cursor
python3 scripts/run_workflow.py run feature-development --input '{"epic": "E1"}'
```

## Model Selection

The workflow system will use the model specified in the request. Common model names:
- `llama2` - Llama 2 7B
- `mistral` - Mistral 7B
- `codellama` - Code Llama
- `llama2:13b` - Llama 2 13B

## Troubleshooting

### "Connection refused" Error

Make sure Ollama is running:
```bash
ollama serve
```

### "Model not found" Error

Pull the model first:
```bash
ollama pull llama2
```

### Slow Performance

- Use smaller models (7B instead of 13B)
- Ensure you have enough RAM (7B needs ~8GB, 13B needs ~16GB)
- Close other applications to free up memory

### Check Ollama Status

```bash
# List available models
ollama list

# Check if server is running
curl http://localhost:11434/api/tags
```

## Benefits

✅ **No API Keys** - Completely local, no authentication needed  
✅ **No Quota Limits** - Use as much as you want  
✅ **Privacy** - All data stays on your machine  
✅ **Free** - No costs for API calls  
✅ **Offline** - Works without internet connection  

## Switching Back to OpenAI

If you want to switch back to OpenAI (when quota resets):

```bash
# Update .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
```

## Performance Tips

1. **Use smaller models for faster responses** (mistral, llama2:7b)
2. **Use code-specific models for development** (codellama)
3. **Close unused applications** to free up RAM
4. **Use GPU if available** (Ollama automatically uses GPU if detected)

