#!/usr/bin/env node
import { Anthropic } from "@anthropic-ai/sdk";
import { OpenAI } from "openai";
import readline from "node:readline"; /* interactive prompt */
import { Option, program } from "commander"; /* CLI framework */
import chalk from "chalk"; /* terminal colors */
import child_process from "node:child_process";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODELS = ["claude-3-7-sonnet-latest", "gpt-4o"];
const MODEL_PROVIDER = {
  [MODELS[0]]: "anthropic",
  [MODELS[1]]: "openai",
};

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
      process.stdout.write(`${chalk.yellow("system:")} current [${model}], available [${MODELS}]\n`);
      break;
    case ".new":
      /* clear history */
      if (MODEL_PROVIDER[model] === "anthropic") {
        history.splice(0);
      } else if (MODEL_PROVIDER[model] === "openai") {
        history.splice(0);
        history.push({ role: "system", content: systemMessage }); /* add the system message */
      } else {
        process.stdout.write(`${chalk.yellow("system:")} model error`);
        process.exit(1);
      }
      process.stdout.write(`${chalk.yellow("system:")} cleared history\n`);
      break;
    case "":
      /* empty line */
      break;
    default:
      /* chat */
      history.push({ role: "user", content: line.trim() });

      let result;
      if (MODEL_PROVIDER[model] === "anthropic") {
        result = await AnthropicChat({ history, temperature });
      } else if (MODEL_PROVIDER[model] === "openai") {
        result = await OpenAIChat({ history, temperature });
      } else {
        process.stdout.write(`${chalk.yellow("system:")} model error`);
        process.exit(1);
      }
      history.push(result);
      break;
  }
  rl.prompt();
}).on("close", () => {
  process.stdout.write(`\n${chalk.yellow("system:")} prompt finished\n`);
  process.exit(0);
});

/*************************/
/* anthropic api request */

async function AnthropicChat({ history, temperature }) {
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

async function OpenAIChat({ history, temperature }) {
  process.stdout.write(`${chalk.green(`ai: `)}`);
  history.push({ role: "system", content: systemMessage }); /* add the system message */
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
