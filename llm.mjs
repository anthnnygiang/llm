#!/usr/bin/env node
import { Anthropic } from "@anthropic-ai/sdk";
import { OpenAI } from "openai";
import readline from "node:readline"; /* interactive prompt */
import os from "node:os"; /* detect platform */
import { spawnSync } from "node:child_process"; /* copy to clipboard */
import { Option, program } from "commander"; /* CLI framework */
import chalk from "chalk"; /* terminal colors */

export const OPENAI_API_KEY = process.env.OPENAI_CLI;
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_CLI;
export const MODELS = [
  "o4-mini",
  "claude-3-7-sonnet-latest",
]; /* optimal model from each provider */

/***************/
/* cli options */

program
  .option(
    "-t, --temperature <temperature>",
    "response creativity, between [0,2]",
    parseFloat,
    1,
  )
  .option(
    "-s, --system-message <message>",
    "modify ai behaviour",
    "You are a helpful assistant. Answer concisely.",
  )
  .addOption(
    new Option("-m, --model <model>", "model version")
      .choices(MODELS)
      .default(MODELS[0]),
  );
program.addHelpText(
  "after",
  `
Prompt:
  For multiline input, use ^^^ (triple carat) to signal the start and end.

  .exit/quit         quit the prompt gracefully
  .system            log the current system message
  .temperature       log the current temperature
  .model             log the current model
  .out               copy latest response to clipboard
  .prompts           copy all user prompts to clipboard
  .new               clear history
  .help              show this help message
  `,
);
program.showHelpAfterError();
program.parse(process.argv);
let { model, temperature, systemMessage } = program.opts();

/* model providers */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const history = [];
let minHistory =
  -1; /* history must be longer than minHistory to copy to clipboard */
let multiline = false; /* multiline input flag */
let multilineBuffer = ""; /* buffer for multiline input */
initialize();

/**********************/
/* initialize history */

function initialize() {
  switch (model) {
    case MODELS[0] /* openai */:
      history.splice(0);
      history.push({
        role: "system",
        content: systemMessage,
      }); /* add the system message */
      minHistory = 1; /* openai requires at least 1 message in history */
      break;
    case MODELS[1] /* anthropic */:
      history.splice(0);
      minHistory = 0; /* anthropic does not require a system message */
      break;
    default:
      process.stdout.write(`${chalk.yellow("system:")} model error`);
      process.exit(1);
  }
}

/**********************/
/* interactive prompt */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${chalk.cyan("-->: ")}`,
});

rl.prompt();
rl.on("line", async (line) => {
  if (line.trim() === "^^^") {
    // flip multiline state
    multiline = !multiline;
    if (multiline) {
      /* start multiline input */
      multilineBuffer = ""; /* reset multiline buffer */
      rl.setPrompt(`${chalk.cyan("... ")}`);
      rl.prompt();
      return;
    } else {
      /* end multiline input */
      line = multilineBuffer; /* use accumulated multiline input */
      rl.setPrompt(`${chalk.cyan("-->: ")}`);
    }
  }
  if (multiline) {
    /* accumulate multiline input */
    multilineBuffer += line + "\n";
    rl.prompt();
    return;
  }

  switch (line.trim()) {
    case ".exit":
    case ".quit":
      process.stdout.write(`${chalk.yellow("system:")} prompt finished\n`);
      process.exit(0);
    case "":
      /* empty line */
      break;
    case ".help":
      /* show help */
      program.outputHelp();
      break;
    case ".system":
      /* log current message */
      process.stdout.write(`${chalk.yellow("system:")} ${systemMessage}\n`);
      break;
    case ".temperature":
      /* log current temperature */
      process.stdout.write(`${chalk.yellow("system:")} ${temperature}\n`);
      break;
    case ".model":
      /* log current model */
      process.stdout.write(
        `${chalk.yellow("system:")} current ${JSON.stringify(model)}\n`,
      );
      process.stdout.write(
        `${chalk.yellow("system:")} available ${JSON.stringify(MODELS)}\n`,
      );
      break;
    case ".out":
      /* output latest response to clipboard */
      if (history.length <= minHistory) {
        process.stdout.write(
          `${chalk.yellow("system:")} could not copy to clipboard \n`,
        );
        break;
      }
      const latestResponse = history[history.length - 1].content;
      copyToClipboard(latestResponse);
      process.stdout.write(`${chalk.yellow("system:")} copied to clipboard\n`);
      break;
    case ".prompts":
      /* output all prompts to clipboard */
      if (history.length <= minHistory) {
        process.stdout.write(
          `${chalk.yellow("system:")} could not copy to clipboard \n`,
        );
        break;
      }
      const allPrompts = history
        .filter((msg) => msg.role === "user")
        .map((msg) => msg.content)
        .join("\n");
      copyToClipboard(allPrompts);
      process.stdout.write(`${chalk.yellow("system:")} copied to clipboard\n`);
      break;
    case ".new":
      /* clear history */
      initialize();
      process.stdout.write(`${chalk.yellow("system:")} cleared history\n`);
      break;
    default:
      history.push({ role: "user", content: line.trim() });
      const result = await chat();
      history.push(result);
      break;
  }
  rl.prompt();
}).on("close", () => {
  /* ctrl-c/d */
  process.stdout.write(`\n${chalk.yellow("system:")} prompt finished\n`);
  process.exit(0);
});

/********/
/* chat */

async function chat() {
  process.stdout.write(`${chalk.green(`llm: `)}`);
  switch (model) {
    case MODELS[0] /* openai */:
      return await OpenAIChat();
    case MODELS[1] /* anthropic */:
      return await AnthropicChat();
    default:
      process.stdout.write(`${chalk.yellow("system:")} model error`);
      process.exit(1);
  }
}

/**********************/
/* openai api request */

export async function OpenAIChat(
  client = openai,
  _model = model,
  _messages = history,
  _temperature = temperature,
) {
  const completion = await client.chat.completions.create({
    model: _model,
    stream: true,
    messages: _messages,
    temperature: _temperature,
  });
  let fullContent = "";
  for await (const chunk of completion) {
    const completionDelta =
      chunk.choices[0].delta.content ?? "\n"; /* there is only 1 choice */
    process.stdout.write(`${completionDelta}`);
    fullContent += completionDelta;
  }
  return {
    role: "assistant",
    content: fullContent,
  };
}

/*************************/
/* anthropic api request */

export async function AnthropicChat(
  client = anthropic,
  _model = model,
  _temperature = temperature,
  _system = systemMessage,
  _messages = history,
) {
  const message = client.messages.stream({
    model: _model,
    temperature: _temperature,
    max_tokens: 1024,
    system: _system,
    messages: _messages,
  });
  let fullMessage = "";
  for await (const chunk of message) {
    const messageDelta = chunk.delta?.text ?? "";
    process.stdout.write(`${messageDelta}`);
    fullMessage += messageDelta;
  }
  process.stdout.write("\n");
  return {
    role: "assistant",
    content: fullMessage,
  };
}

/*********************/
/* copy to clipboard */

function copyToClipboard(text) {
  switch (os.platform()) {
    case "darwin" /* macOS */:
      spawnSync("pbcopy", { input: text });
      break;
    case "linux" /* Linux */:
      spawnSync("xclip", ["-selection", "clipboard"], { input: text });
      break;
    case "win32" /* Windows */:
      spawnSync("clip", { input: text });
      break;
    default:
      process.stdout.write(`${chalk.yellow("system:")} unsupported platform\n`);
  }
}
