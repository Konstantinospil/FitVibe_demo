#!/usr/bin/env python3
"""Search Cursor chat sessions for API keys"""

import json
import glob
import os
import re
import sys

def find_api_keys_in_chats():
    """Search chat session files for API keys"""
    # Find all chat session files
    chat_dir = os.path.expanduser('~/AppData/Roaming/Cursor/User/workspaceStorage')
    if not os.path.exists(chat_dir):
        print(f"Chat directory not found: {chat_dir}")
        return
    
    pattern = os.path.join(chat_dir, '*/chatSessions/*.json')
    files = glob.glob(pattern)
    
    print(f'Found {len(files)} chat session files')
    print('Searching for API keys...\n')
    
    # Pattern for OpenAI API keys (sk- prefix)
    api_key_pattern = re.compile(r'sk-[a-zA-Z0-9]{20,}', re.IGNORECASE)
    # Pattern for OPENAI_API_KEY variable
    env_pattern = re.compile(r'OPENAI_API_KEY[=:]\s*["\']?([^"\'\s]+)', re.IGNORECASE)
    
    found_keys = []
    for f in files:
        try:
            with open(f, 'r', encoding='utf-8', errors='ignore') as file:
                content = file.read()
                
                # Search for API keys
                matches = api_key_pattern.findall(content)
                env_matches = env_pattern.findall(content)
                
                if matches or env_matches:
                    print(f'\nFound in {os.path.basename(f)}:')
                    print(f'  File: {f}')
                    
                    for match in matches[:3]:  # Show first 3 matches
                        # Mask most of the key for security
                        if len(match) > 10:
                            masked = match[:7] + '...' + match[-4:]
                            print(f'  API Key (masked): {masked}')
                        else:
                            print(f'  API Key: {match}')
                    
                    for match in env_matches[:3]:
                        if match and len(match) > 10:
                            masked = match[:7] + '...' + match[-4:]
                            print(f'  ENV Variable (masked): {masked}')
                    
                    found_keys.append(f)
        except Exception as e:
            continue
    
    if not found_keys:
        print('No API keys found in chat sessions.')
        print('\nThe API key might be:')
        print('  1. Set as an environment variable (check with: echo $OPENAI_API_KEY)')
        print('  2. In a .env file (not committed to git)')
        print('  3. Mentioned in a different format')
        print('\nTo set it, run:')
        print('  export OPENAI_API_KEY="sk-..."')
    else:
        print(f'\n\nFound API keys in {len(found_keys)} file(s).')
        print('Note: Keys are masked for security. Check the files above for full keys.')

if __name__ == '__main__':
    find_api_keys_in_chats()








