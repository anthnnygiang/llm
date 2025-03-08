#!/usr/bin/env node
import { Anthropic } from "@anthropic-ai/sdk";
import { OpenAI } from "openai";
import readline from "node:readline"; /* interactive prompt */
import { Option, program } from "commander"; /* CLI framework */
import chalk from "chalk"; /* terminal colors */

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODELS = ["claude-3-7-sonnet-latest", "gpt-4o", "o3-mini"];

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
  .exit/quit    quit the prompt gracefully
  .system       log the current system message
  .temperature  log the current temperature
  .model        log the current model
  .new          clear history
  .help         show this help message
  
Notes:
  - The OpenAI API response time can take as long as 30 seconds
  `,
);
program.showHelpAfterError();
program.parse(process.argv);
let { model, temperature, systemMessage } = program.opts();

/* model providers */
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

const history = [];
initialize();

/**********************/
/* interactive prompt */

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${chalk.cyan("me: ")}`,
});

rl.prompt();
rl.on("line", async (line) => {
  switch (line.trim()) {
    case ".exit":
    case ".quit":
      /* exit prompt */
      process.stdout.write(`${chalk.yellow("system:")} prompt finished\n`);
      process.exit(0);
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
    case ".new":
      /* clear history */
      initialize();
      process.stdout.write(`${chalk.yellow("system:")} cleared history\n`);
      break;
    case "":
      /* empty line */
      break;
    default:
      /* chat */
      history.push({ role: "user", content: line.trim() });
      const result = await chat();
      history.push(result);
      break;
  }
  rl.prompt();
}).on("close", () => {
  process.stdout.write(`\n${chalk.yellow("system:")} prompt finished\n`);
  process.exit(0);
});

/**********************/
/* initialize history */

function initialize() {
  switch (model) {
    case MODELS[0]:
      /* claude-3-7-sonnet-latest */
      history.splice(0);
      break;
    case MODELS[1]:
      /* gpt-4o */
      history.push({ role: "system", content: systemMessage }); /* add the system message */
      history.splice(0);
      break;
    default:
      process.stdout.write(`${chalk.yellow("system:")} model error`);
      process.exit(1);
  }
}

/********/
/* chat */

async function chat() {
  switch (model) {
    case MODELS[0]:
      /* claude-3-7-sonnet-latest */
      return await AnthropicChat();
    case MODELS[1]:
      /* gpt-4o */
      return await OpenAIChat();
    default:
      process.stdout.write(`${chalk.yellow("system:")} model error`);
      process.exit(1);
  }
}

/*************************/
/* anthropic api request */

async function AnthropicChat() {
  const message = await anthropic.messages.stream({
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

/**********************/
/* openai api request */

async function OpenAIChat() {
  process.stdout.write(`${chalk.green(`ai: `)}`);
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
