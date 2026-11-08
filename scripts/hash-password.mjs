import { randomBytes, scryptSync } from "node:crypto";
let password = "";
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/[\r\n]+$/, "");
if (password.length < 12 || password.length > 256)
  throw new Error("관리자 암호는 12~256자로 설정하세요.");
const salt = randomBytes(16).toString("hex");
console.log(`${salt}:${scryptSync(password, salt, 64).toString("hex")}`);
