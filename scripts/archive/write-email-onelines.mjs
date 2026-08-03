/**
 * Write n8n JSON body expressions for E1–E4.
 *
 * IMPORTANT: With Expression (fx) ON, n8n already shows a leading "=".
 * Paste content WITHOUT "={{" / "}}" — only the JS expression body.
 * Otherwise n8n ends up with "=[object Object]" / invalid JSON.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { subjects, htmls, staticPreview } from "./recovery-email-templates.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "docs", "n8n");
const htmlDir = path.join(__dirname, "..", "docs", "recovery-emails");

const sample = {
  name: "Karim",
  phone: "212 6609782",
  email: "karim.jbara1958@gmail.com",
};

/** Expression for fx-ON field (no leading ={{ ) */
function expressionBody(key) {
  // Avoid curly/smart quotes that break JS strings in n8n
  let html = htmls[key]
    .replace(/\r?\n/g, "")
    .replace(/\s*\+\s*/g, "+")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'");

  // Strip outer (''+...) wrapping issues — keep as-is from templates
  return (
    "({ from: 'App Spy <ola@mysafelinkspy.com>', to: [$json.email], subject: " +
    subjects[key] +
    ", html: " +
    html +
    " })"
  ).replace(/\r?\n/g, "");
}

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(htmlDir, { recursive: true });

const readme = [];
readme.push("# Como colar o body dos e-mails no n8n (sem erro de JSON)");
readme.push("");
readme.push("## Erro comum");
readme.push('`O valor no campo Corpo JSON não é um JSON válido` / `=[object Object]`');
readme.push("");
readme.push("## Causa");
readme.push("Com **Expression (fx) ligado**, o n8n **já coloca o `=`** na frente.");
readme.push("Se você colar `={{ ... }}`, fica `=={{ ... }}` ou o objeto vira `[object Object]`.");
readme.push("");
readme.push("## Passo a passo (Email 1, 2, 3 ou 4)");
readme.push("1. Abra o node **Email N**");
readme.push("2. **Especificar corpo** = Using JSON");
readme.push("3. Campo **JSON**: apague **tudo**");
readme.push("4. Clique em **fx** (Expression) — fica ativo");
readme.push("5. Cole o conteúdo do arquivo `emailN-jsonBody-expression.txt`");
readme.push("6. O campo deve **começar com `(`** ou `({` — **NÃO** com `={{`");
readme.push("7. Na UI pode aparecer `=` cinza na frente (normal). Conteúdo: `({ from: ... })`");
readme.push("8. Execute step → SAÍDA com `id` do Resend");
readme.push("");
readme.push("## Arquivos");
readme.push("| Node | Arquivo |");
readme.push("|------|---------|");
readme.push("| Email 1 | `email1-jsonBody-expression.txt` |");
readme.push("| Email 2 | `email2-jsonBody-expression.txt` |");
readme.push("| Email 3 | `email3-jsonBody-expression.txt` |");
readme.push("| Email 4 | `email4-jsonBody-expression.txt` |");
readme.push("");
readme.push("Pasta: `docs/n8n/`");

for (const key of ["e1", "e2", "e3", "e4"]) {
  const n = key.slice(1);
  const expr = expressionBody(key);
  const file = path.join(outDir, `email${n}-jsonBody-expression.txt`);
  fs.writeFileSync(file, expr, "utf8");
  fs.writeFileSync(
    path.join(htmlDir, `${key}-preview.html`),
    staticPreview(key, sample),
    "utf8"
  );
  console.log(key, "starts with", JSON.stringify(expr.slice(0, 20)), "len", expr.length);
}

fs.writeFileSync(path.join(outDir, "COMO-COLAR-EMAILS.md"), readme.join("\n"), "utf8");
console.log("Wrote COMO-COLAR-EMAILS.md");
