#!/usr/bin/env node
import { OpenAI } from "openai";
import readline from "node:readline"; /* interactive prompt */
import { Option, program } from "commander"; /* CLI framework */
import chalk from "chalk"; /* terminal colors */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODELS = ["gpt-4o", "gpt-4", "gpt-3.5-turbo"];

/***************/
/* CLI OPTIONS */

program
  .option("-t, --temperature <temperature>", "response creativity between [0,2]", parseFloat, 1)
  .option("-s, --system-message <message>", "modify ai behaviour", "You are a helpful assistant.")
  .addOption(new Option("-m, --model <model>", "model version").choices(MODELS).default(MODELS[0]));
program.addHelpText(
  "after",
  `
Usage:
  $ ai
  .exit/quit, to quit the prompt
  .system, to log the current system message
  .temperature, to log the current temperature
  .model, to log the current model
  
Notes:
  - The OpenAI API response time can take as long as 30 seconds
  - To finish the interactive prompt, type .exit, .quit, or press Ctrl+C\n`,
);
program.parse(process.argv);
const { model, temperature, systemMessage } = program.opts();
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const history = [];
/* Add system message */
history.push({ role: "system", content: systemMessage });

/**********************/
/* INTERACTIVE PROMPT */

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
      process.stdout.write(`${chalk.yellow("system:")} ${model}\n`);
      break;
    case "":
      /* empty line */
      break;
    default:
      /* chat */
      history.push({ role: "user", content: line.trim() });
      const result = await chat({ history, temperature });
      history.push(result);
      break;
  }
  rl.prompt();
}).on("close", () => {
  process.stdout.write(`\n${chalk.yellow("system:")} prompt finished\n`);
  process.exit(0);
});

/*******************/
/* API REQUEST */

async function chat({ history, temperature }) {
  process.stdout.write(`${chalk.green(`${"ai: "}`)}`);
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
