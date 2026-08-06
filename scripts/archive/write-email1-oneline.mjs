import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { subjects, htmlE1 } from "./recovery-email-templates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(__dirname, "..", "docs", "n8n", "email1-jsonBody-expression.txt");

// One continuous expression — multi-line paste often breaks n8n JSON body
const html = htmlE1.replace(/\r?\n/g, "").replace(/\s*\+\s*/g, "+");
const body =
  "={{ ({ from: 'App Spy <noreply@mysafelinkspy.com>', to: [$json.email], subject: " +
  subjects.e1 +
  ", html: " +
  html +
  " }) }}";

const oneLine = body.replace(/\r?\n/g, "");
fs.writeFileSync(out, oneLine, "utf8");
console.log("Wrote", out, "bytes", oneLine.length);
console.log("starts with ={{", oneLine.startsWith("={{"));
console.log("ends with }}) }}", oneLine.endsWith("}) }}") || oneLine.slice(-10));
