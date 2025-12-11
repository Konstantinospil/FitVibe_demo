@echo off
REM Setup script for OpenAI API key (Windows)
REM Usage: .cursor\scripts\setup_openai_key.bat

echo Setting up OpenAI API key...

REM Check if key is already set
if "%OPENAI_API_KEY%"=="" (
    echo Please set your OpenAI API key:
    echo setx OPENAI_API_KEY "your-key-here"
    echo.
    echo Or set it for this session:
    echo set OPENAI_API_KEY=your-key-here
) else (
    echo OPENAI_API_KEY is already set.
)













