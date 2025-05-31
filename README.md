# AI-CLI
Simple CLI.\
1 file. 250 lines.

![example](example.gif)

## Features:
- Interactive chat (OpenAI, Anthropic)
- Output to clipboard
- Multi-line input
- Prompt templates

## Requirements:
- Node version >= `20`
- Anthropic API key
- OpenAI API key

## Usage:
1. Clone repo.
2. `$ npm link`.
3. Add `export OPENAI_CLI="12345"` and `export ANTHROPIC_CLI="12345"` to `.zshrc`.
5. `$ ai` from anywhere.

## Why?
- Extreme simplicity. Intentionally minimal.\
  Fully featured alternatives:
  - [simonw/llm](https://github.com/simonw/llm)
  - [sigoden/aichat](https://github.com/sigoden/aichat)
