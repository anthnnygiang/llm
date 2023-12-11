#!/usr/bin/env node
import { OpenAI } from "openai";
import readline from "node:readline"; /* interactive prompt */
import { Option, program } from "commander"; /* CLI framework */
import chalk from "chalk"; /* terminal colors */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const MODELS = ["gpt-3.5-turbo", "gpt-4"];

/***************/
/* CLI OPTIONS */

program
  .argument("[prompt]", "input message")
  .option("-d, --duration", "API response time", false)
  .option("-i, --interactive", "interactive prompt", false)
  .option("-t, --temperature <temperature>", "response creativity between [0,2]", parseFloat, 1)
  .option("-s, --system-message <message>", "modify ai behaviour")
  .addOption(new Option("-m, --model <model>", "model version").choices(MODELS).default(MODELS[0]));
program.addHelpText(
  "after",
  `
Example calls:
  $ ai -is "you're a pirate"
  $ ai -im "gpt-4"
  $ ai -t 1.5

Note:
  - The OpenAI API response time can take as long as 30 seconds
  - To finish the interactive prompt, press Ctrl+C`
);
program.parse(process.argv);
const { duration, interactive, model, temperature, systemMessage } = program.opts();
const content = program.args.join(" ");
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const messages = [];
if (systemMessage) {
  /* Add system message */
  messages.push({ role: "system", content: systemMessage });
}

/*****************/
/* SINGLE PROMPT */

if (!interactive) {
  if (content === "") {
    process.stdout.write(`${chalk.yellow("system: invalid prompt")}\n`);
  } else {
    messages.push({ role: "user", content: content });
    await chat({ messages, interactive, temperature });
  }
  process.exit(0);
}

/**********************/
/* INTERACTIVE PROMPT */

if (content !== "") {
  messages.push({ role: "user", content: content }); /* add initial prompt */
  const result = await chat({ messages, interactive, temperature });
  messages.push(result);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${chalk.cyan("me: ")}`,
});

rl.prompt();
rl.on("line", async (line) => {
  const content = line.trim();
  let result;
  if (content !== "") {
    messages.push({ role: "user", content: content });
    result = await chat({ messages, interactive, temperature });
    messages.push(result);
  }
  rl.prompt();
}).on("close", () => {
  process.stdout.write(`\n${chalk.yellow("system:")} prompt finished\n`);
  process.exit(0);
});

/*******************/
/* API REQUEST */

async function chat({ messages, temperature }) {
  if (duration) {
    console.time(`${chalk.yellow("system")}`);
  }
  process.stdout.write(`${chalk.green(`${"ai: "}`)}`);
  const completion = await openai.chat.completions.create({
    model: model,
    stream: true,
    messages: messages,
    temperature: temperature,
  });
  let fullContent = "";
  for await (const chunk of completion) {
    const completionDelta = chunk.choices[0].delta.content ?? "\n"; /* there is only 1 choice */
    process.stdout.write(`${completionDelta}`);
    fullContent += completionDelta;
  }
  if (duration) {
    console.timeEnd(`${chalk.yellow("system")}`);
  }
  const message = {
    role: "assistant",
    content: fullContent,
  };
  return message;
}
