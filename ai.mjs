#!/usr/bin/env node

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
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

/*****************/
/* SINGLE PROMPT */

if (!interactive) {
  if (content === "") {
    process.stdout.write(`${chalk.yellow("system: invalid prompt")}\n`);
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
  prompt: `${chalk.cyan("me: ")}`,
});

rl.prompt();
rl.on("line", async (line) => {
  const input = line.trim();
  if (input !== "") {
    messages.push({ role: USER_ROLE, content: line });
    const result = await chat({ messages, interactive, temperature });
    messages.push(result);
  }
  rl.prompt();
}).on("close", () => {
  process.stdout.write(`\n${chalk.yellow("system: interactive chat finished")}\n`);
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
