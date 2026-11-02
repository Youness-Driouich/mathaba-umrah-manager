import crypto from "crypto";
import fs from "fs";

const freshSecret = crypto.randomBytes(18).toString("base64url");
let env = fs.readFileSync(".env", "utf8");

env = env.replace(/INITIAL_ADMIN_PASSWORD=.*/, `INITIAL_ADMIN_PASSWORD="${freshSecret}"`);
fs.writeFileSync(".env", env);
console.log("Generated fresh administrator password in .env (unlogged)");
