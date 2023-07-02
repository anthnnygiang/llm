#! /usr/bin/env node

import "dotenv/config";
import fs from "fs";
import { program } from "commander";
import readline from "readline";
import { Configuration, OpenAIApi } from "openai";

const MODEL = "gpt-3.5-turbo";

/***************/
/* CLI OPTIONS */

program
  .argument("[message]", "the message")
  .option("-i, --interactive", "interactive prompt", false)
  .option("-t, --temperature <temperature>", "temperature longer longer argument", parseFloat, 1);
program.parse(process.argv);
const { interactive, temperature } = program.opts();
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
  const history = `message: ${content}\nai: ${outputMessage.content}\n`;
  fs.appendFileSync("./history.txt", history); /* append to log file */
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
    fs.appendFileSync("./history.txt", "######## closed. ########\n\n");
  }
  process.exit(0);
}

/**********************/
/* INTERACTIVE PROMPT */

const messages = [];
if (content !== "") {
  messages.push({ role: "user", content: content });
  await chat({ messages, interactive, temperature });
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
  await chat({ messages, interactive, temperature });
  rl.prompt();
}).on("close", () => {
  console.log("\nInteractive mode closed.");
  fs.appendFileSync("./history.txt", "######## closed. ########\n\n");
  process.exit(0);
});
