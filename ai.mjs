#! /usr/bin/env node

import "dotenv/config"; /* API key */
import fs from "fs"; /* local history file */
import { program } from "commander"; /* CLI framework */
import readline from "readline"; /* interactive prompt */
import { Configuration, OpenAIApi } from "openai";

const MODEL = "gpt-3.5-turbo";
const HISTORY_FILE = "history.txt";

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

/*******************/
/* NETWORK REQUEST */

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);
async function chat({ messages, temperature }) {
  const output = await openai.createChatCompletion({
    model: MODEL,
    messages: messages,
    temperature: temperature,
  });
  const outputMessage = output.data.choices[0].message;
  console.log(outputMessage.content); /* print to stdout */
  if (!noHistory) {
    const history = `MESSAGE: ${content}\nAI: ${outputMessage.content}\n`;
    fs.appendFileSync(HISTORY_FILE, history); /* append to log file */
  }
  return outputMessage;
}

/*****************/
/* SINGLE PROMPT */

if (!interactive) {
  if (content === "") {
    console.log("Invalid input.");
  } else {
    const messages = [{ role: "user", content: content }];
    await chat({ messages, interactive, temperature });
    if (!noHistory) {
      fs.appendFileSync(HISTORY_FILE, "######## CLOSED. ########\n\n");
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
  prompt: "message: ",
});

rl.prompt();
rl.on("line", async (line) => {
  const input = line.trim();
  if (input === "") {
    console.log("Invalid input.");
    rl.prompt();
  }
  messages.push({ role: "user", content: line });
  const result = await chat({ messages, interactive, temperature });
  messages.push(result);
  rl.prompt();
}).on("close", () => {
  console.log("\nInteractive mode closed.");
  if (!noHistory) {
    fs.appendFileSync(HISTORY_FILE, "######## closed. ########\n\n");
  }
  process.exit(0);
});
