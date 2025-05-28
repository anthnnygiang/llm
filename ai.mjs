#!/usr/bin/env node
import { Anthropic } from "@anthropic-ai/sdk";
import { OpenAI } from "openai";
import readline from "node:readline"; /* interactive prompt */
import os from "node:os"; /* detect platform */
import { spawnSync } from "node:child_process"; /* copy to clipboard */
import { Option, program } from "commander"; /* CLI framework */
import chalk from "chalk"; /* terminal colors */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_CLI;
const OPENAI_API_KEY = process.env.OPENAI_CLI;
const MODELS = ["o4-mini", "claude-3-7-sonnet-latest"]; /* optimal model from each provider */

/***************/
/* cli options */

program
  .option("-t, --temperature <temperature>", "response creativity, between [0,2]", parseFloat, 1)
  .option("-s, --system-message <message>", "modify ai behaviour", "You are a helpful assistant. Answer succinctly.")
  .addOption(new Option("-m, --model <model>", "model version").choices(MODELS).default(MODELS[0]));
program.addHelpText(
  "after",
  `
Usage:
  $ ai
  .exit/quit        quit the prompt gracefully
  .system           log the current system message
  .temperature      log the current temperature
  .model            log the current model
  .out              copy latest response to clipboard
  .new              clear history
  .explain <topic>  explain a topic in detail
  .howto <task>     describe how to do a task step-by-step
  .help             show this help message
  `,
);
program.showHelpAfterError();
program.parse(process.argv);
let { model, temperature, systemMessage } = program.opts();

/* model providers */
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

const history = [];
let minHistory = -1; /* history must be longer than minHistory to copy to clipboard */
let multiline = false; /* multiline input flag */
let multilineBuffer = ""; /* buffer for multiline input */
initialize();

/**********************/
/* initialize history */

function initialize() {
  switch (model) {
    case MODELS[0] /* openai */:
      history.splice(0);
      history.push({ role: "system", content: systemMessage }); /* add the system message */
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
  prompt: `${chalk.cyan("me: ")}`,
});

rl.prompt();
rl.on("line", async (line) => {
  if (line.trim() === '"""') {
    if (!multiline) {
      /* start multiline input */
      multiline = true;
      multilineBuffer = ""; /* reset multiline buffer */
      rl.setPrompt(`${chalk.cyan("... ")}`);
      rl.prompt();
      return;
    } else {
      /* end multiline input */
      multiline = false;
      line = multilineBuffer;
      rl.setPrompt(`${chalk.cyan("me: ")}`);
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
      process.stdout.write(`${chalk.yellow("system:")} current ${JSON.stringify(model)}\n`);
      process.stdout.write(`${chalk.yellow("system:")} available ${JSON.stringify(MODELS)}\n`);
      break;
    case ".out":
      /* output latest response to clipboard */
      if (history.length <= minHistory) {
        process.stdout.write(`${chalk.yellow("system:")} could not copy to clipboard \n`);
        break;
      }
      const latestResponse = history[history.length - 1].content;
      switch (os.platform()) {
        case "darwin" /* macOS */:
          spawnSync("pbcopy", { input: latestResponse });
          break;
        case "linux" /* Linux */:
          spawnSync("xclip", ["-selection", "clipboard"], { input: latestResponse });
          break;
        case "win32" /* Windows */:
          spawnSync("clip", { input: latestResponse });
          break;
        default:
          process.stdout.write(`${chalk.yellow("system:")} unsupported platform\n`);
      }
      process.stdout.write(`${chalk.yellow("system:")} copied to clipboard\n`);
      break;
    case ".new":
      /* clear history */
      initialize();
      process.stdout.write(`${chalk.yellow("system:")} cleared history\n`);
      break;
    default:
      /* use any prompt templates if specified */
      const explainRgx = /^\.explain\s+(.+)$/; /* starts with .explain */
      const howToRgx = /^\.howto\s+(.+)$/; /* starts with .howto */
      switch (true) {
        case explainRgx.test(line):
          /* explain a topic */
          const explainMatch = line.match(explainRgx);
          line = `Explain "${explainMatch[1]}" in detail. Provide an in-depth overview including: key concepts, historical context, relevant examples, and lastly further reading topics.`;
          break;
        case howToRgx.test(line):
          /* how to do task */
          const howToMatch = line.match(howToRgx);
          line = `How to "${howToMatch[1]}"? Provide a step-by-step guide with detailed instructions. Note any prerequisites and common pitfalls.`;
          break;
      }

      /* chat */
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
  process.stdout.write(`${chalk.green(`ai: `)}`);
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

async function OpenAIChat() {
  const completion = await openai.chat.completions.create({
    model: model,
    stream: true,
    messages: history,
    temperature: temperature,
  });
  let fullContent = "";
  for await (const chunk of completion) {
    const completionDelta = chunk.choices[0].delta.content ?? "\n"; /* there is only 1 choice */
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

async function AnthropicChat() {
  const message = anthropic.messages.stream({
    model: model,
    temperature: temperature,
    max_tokens: 1024,
    system: systemMessage,
    messages: history,
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
