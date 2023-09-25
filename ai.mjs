#!/usr/bin/env node

import { program } from "commander"; /* CLI framework */
import readline from "readline"; /* interactive prompt */
import chalk from "chalk"; /* colors */
import { OpenAI } from "openai";

const MODEL = "gpt-4";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

/***************/
/* CLI OPTIONS */

program
  .argument("[prompt]", "input message")
  .option("-i, --interactive", "interactive prompt", false)
  .option("-t, --temperature <temperature>", "response creativity", parseFloat, 1)
  .option("-s, --system-message <message>", "modify ai behaviour");
program.addHelpText(
  "after",
  `
Example call:
  $ ai -is "you're a pirate"

To finish the interactive prompt, press Ctrl+C`
);
program.parse(process.argv);
const { interactive, temperature, systemMessage } = program.opts();
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
  if (content !== "") {
    messages.push({ role: "user", content: content });
    const result = await chat({ messages, interactive, temperature });
    messages.push(result);
  }
  rl.prompt();
}).on("close", () => {
  process.stdout.write(`\n${chalk.yellow("system: interactive prompt finished")}\n`);
  process.exit(0);
});

/*******************/
/* API REQUEST */

async function chat({ messages, temperature }) {
  process.stdout.write(`${chalk.green(`${"ai: "}`)}`);
  const completion = await openai.chat.completions.create({
    model: MODEL,
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
  const message = {
    role: "assistant",
    content: fullContent,
  };
  return message;
}
