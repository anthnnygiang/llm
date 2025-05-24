# AI-CLI

![example](example.gif)

Simple LLM CLI.

## Requirements:

- Node version >= `18`
- Anthropic API key
- OpenAI API key

## Usage:

1. Clone or download this repository.
2. Run `npm link`. This links the commands from `package.json` to your path. To verify, if using [Volta](https://volta.sh/), run `volta list`.
   Any code changes are automatically reflected as it is a symlinked, so there is no need to reinstall.
3. Add `export OPENAI_CLI="12345"`, to your `.zlogin`, `.zshrc`, or similar.
4. Add `export ANTHROPIC_CLI="12345"` to your `.zlogin`, `.zshrc`, or similar.
5. `$ ai <message>` from anywhere.

OR

1. Download the file `ai.mjs` and execute it however you please.
