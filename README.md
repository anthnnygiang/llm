# LLM
Simple LLM CLI.\
1 file. 250 lines.

![example](example.gif)
Note: renamed command to `llm`.

## Features:
- Interactive chat (OpenAI, Anthropic, Google)
- Output to clipboard
- Multi-line input

## Requirements:
- Node version >= `20`
- Anthropic API key
- OpenAI API key

## Usage:
1. Clone repo.
2. Add
   * `export OPENAI_CLI="12345"`,
   * `export ANTHROPIC_CLI="12345"`,
   * and  `export GOOGLE_CLI="12345"` to `.zshrc` or `.zlogin`.
3. `$ npm run build` to build the JS file
4. `$ npm link`
5. `$ llm` from anywhere.

## Why?
- Intentionally minimal.\
  Fully featured alternatives:
  - [simonw/llm](https://github.com/simonw/llm)
  - [sigoden/aichat](https://github.com/sigoden/aichat)

## Development:
- `$ npm run dev` to run in dev mode with `tsc --watch`.
