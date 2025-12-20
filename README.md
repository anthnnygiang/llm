# LLM

Simple LLM CLI.\
1 file. 250 lines.

![example](example.gif) Note: renamed command to `llm`.

## Features:

- Interactive chat (OpenAI, Google)
- Output to clipboard
- Multi-line input

## Requirements:

- Node version >= `20`
- OpenAI API key
- Google Gemini API key

## Usage:

1. Clone repo.
2. Add
   - `export OPENAI_CLI="12345"`,
   - `export GOOGLE_CLI="12345"`,
   - and `export GOOGLE_CLI="12345"` to `.zshrc` or `.zlogin`.
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
- `$ npm run format` to format code.
