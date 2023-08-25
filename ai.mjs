#!/usr/bin/env node

import "dotenv/config"; /* API key */
import { program } from "commander"; /* CLI framework */
import readline from "readline"; /* interactive prompt */
import chalk from "chalk"; /* colors */
import { OpenAI } from "openai";

const MODEL = "gpt-3.5-turbo";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const USER_ROLE = "user";

/***************/
/* CLI OPTIONS */

program
  .argument("[prompt]", "input message")
  .option("-i, --interactive", "interactive prompt", false)
  .option("-t, --temperature <temperature>", "response creativity", parseFloat, 1);
program.addHelpText(
  "after",
  `
Example call:
  $ ai -i hello there

To stop the interactive prompt, press Ctrl+C`
);
program.parse(process.argv);
const { interactive, temperature } = program.opts();
const content = program.args.join(" ");

/*******************/
/* NETWORK REQUEST */

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
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
    fullContent += completionDelta;
    process.stdout.write(`${completionDelta}`);
  }
  const message = {
    role: "assistant",
    content: fullContent,
  };
  return message;
}

/*****************/
/* SINGLE PROMPT */

if (!interactive) {
  if (content === "") {
    console.log(`${chalk.red("error: invalid prompt")}`);
  } else {
    const messages = [{ role: USER_ROLE, content: content }];
    await chat({ messages, interactive, temperature });
  }
  process.exit(0);
}

/**********************/
/* INTERACTIVE PROMPT */

const messages = [];
if (content !== "") {
  messages.push({ role: USER_ROLE, content: content }); /* add initial prompt */
  const result = await chat({ messages, interactive, temperature });
  messages.push(result);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: `${chalk.cyan("message: ")}`,
});

rl.prompt();
rl.on("line", async (line) => {
  const input = line.trim();
  if (input === "") {
    console.log(`${chalk.red("error: invalid prompt")}`);
  } else {
    messages.push({ role: USER_ROLE, content: line });
    const result = await chat({ messages, interactive, temperature });
    messages.push(result);
  }
  rl.prompt();
}).on("close", () => {
  process.stdout.write(`\n${chalk.yellow("Interactive chat finished.")}`);
  process.exit(0);
});
