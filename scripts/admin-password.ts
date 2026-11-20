// Sets the admin password: asks for it (twice, not shown on screen) and
// writes its scrypt hash to .env as ADMIN_PASSWORD_HASH, plus a random
// SESSION_SECRET if there isn't one. Nothing secret is printed.
//
//   npm run admin:password
//
// Changing SESSION_SECRET signs everyone out; this keeps the existing one.
import fs from "node:fs";
import crypto from "node:crypto";
import readline from "node:readline";
import { hashPassword } from "../src/lib/auth.ts";

function ask(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    // Don't echo what's typed.
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      if (s.startsWith(question)) process.stdout.write(question);
    };
    rl.question(question, (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

const first = await ask("New admin password: ");
if (first.length < 10) {
  console.log("Use at least 10 characters. Nothing was changed.");
  process.exit(1);
}
if ((await ask("Same again: ")) !== first) {
  console.log("They didn't match. Nothing was changed.");
  process.exit(1);
}

const file = ".env";
let env = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
const set = (key: string, value: string) => {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, "m");
  env = re.test(env) ? env.replace(re, line) : `${env}${env && !env.endsWith("\n") ? "\n" : ""}${line}\n`;
};
set("ADMIN_PASSWORD_HASH", hashPassword(first));
if (!/^SESSION_SECRET=.+$/m.test(env)) set("SESSION_SECRET", crypto.randomBytes(32).toString("base64url"));
fs.writeFileSync(file, env, { mode: 0o600 });
console.log("Saved to .env. Restart the site for it to take effect.");
