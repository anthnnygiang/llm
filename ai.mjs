#!/usr/bin/env node

import "dotenv/config"; /* API key */
import os from "os"; /* home folder */
import fs from "fs"; /* local history file */
import { program } from "commander"; /* CLI framework */
import readline from "readline"; /* interactive prompt */
import chalk from "chalk"; /* colors */
import ora from "ora"; /* loading spinner */
import { Configuration, OpenAIApi } from "openai";

const MODEL = "gpt-3.5-turbo";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const HISTORY_FILE = `${os.homedir}/dev/ai-cli/history.txt`;

/***************/
/* CLI OPTIONS */

program
  .argument("[prompt]", "input message")
  .option("-i, --interactive", "interactive prompt", false)
  .option("-t, --temperature <temperature>", "response creativity", parseFloat, 1)
  .option(" --no-history", "disable history");
program.parse(process.argv);
const { interactive, temperature, noHistory } = program.opts();
const content = program.args.join(" ");
const spinner = ora({ prefixText: `${chalk.green("     ai:")}`, spinner: "dots12", discardStdin: false });
spinner.color = "green";

/*******************/
/* NETWORK REQUEST */

const configuration = new Configuration({
  apiKey: OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
async function chat({ messages, temperature }) {
  spinner.start();
  const output = await openai.createChatCompletion({
    model: MODEL,
    messages: messages,
    temperature: temperature,
  });
  spinner.stop();
  const outputMessage = output.data.choices[0].message;
  console.log(`${chalk.green("     ai:\n")}${outputMessage.content}\n`); /* print to stdout */
  if (!noHistory) {
    const history = `MESSAGE: ${content}\n     AI:\n${outputMessage.content}\n`;
    fs.appendFileSync(HISTORY_FILE, history); /* append to log file */
  }
  return outputMessage;
}

/*****************/
/* SINGLE PROMPT */

if (!interactive) {
  if (content === "") {
    console.log(`${chalk.red("error: invalid prompt")}`);
  } else {
    const messages = [{ role: "user", content: content }];
    await chat({ messages, interactive, temperature });
    if (!noHistory) {
      fs.appendFileSync(HISTORY_FILE, "FINISH.\n\n");
    }
  }
  process.exit(0);
}

/**********************/
/* INTERACTIVE PROMPT */

const messages = [];
if (content !== "") {
  messages.push({ role: "user", content: content });
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
    rl.prompt();
  }
  messages.push({ role: "user", content: line });
  const result = await chat({ messages, interactive, temperature });
  messages.push(result);
  rl.prompt();
}).on("close", () => {
  console.log(`\n${chalk.yellow("Interactive mode closed.")}`);
  if (!noHistory) {
    fs.appendFileSync(HISTORY_FILE, "FINISH.\n\n");
  }
  process.exit(0);
});
