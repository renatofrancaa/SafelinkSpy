/**
 * Fix Google Sheets column mapping in local n8n workflows.
 * Problem: sheet headers have trailing spaces (phone , purchased , …)
 * and autoMap wrote into new columns on the right.
 *
 * Usage: node scripts/fix-n8n-sheet-mapping.mjs
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import os from "os";

const n8nJs = path.resolve("tools/n8n-local/node_modules/n8n/bin/n8n");
const tmp = os.tmpdir();
const exportPath = path.join(tmp, "all-wf-fix.json");

function runN8n(args) {
  return execFileSync(process.execPath, [n8nJs, ...args], {
    encoding: "utf8",
    cwd: path.resolve("tools/n8n-local"),
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
}

// Export
const exported = runN8n(["export:workflow", "--all", "--pretty"]);
const jsonStart = exported.indexOf("[");
fs.writeFileSync(exportPath, exported.slice(jsonStart));
const workflows = JSON.parse(fs.readFileSync(exportPath, "utf8"));

const doc = {
  __rl: true,
  value: "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU",
  mode: "list",
  cachedResultName: "App Spy - Leads Recovery ",
  cachedResultUrl:
    "https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit?usp=drivesdk",
};
const sheet = {
  __rl: true,
  value: 1597998998,
  mode: "list",
  cachedResultName: "Leads",
  cachedResultUrl:
    "https://docs.google.com/spreadsheets/d/18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU/edit#gid=1597998998",
};
const cred = {
  googleSheetsOAuth2Api: {
    id: "j8AU2hx7Ws6vQb1E",
    name: "Google Sheets account",
  },
};

// Live schema from sheet (some headers have trailing spaces)
const schemaAppend = [
  col("email"),
  col("name"),
  col("phone "),
  col("purchased "),
  col("visitor_id "),
  col("utm_source "),
  col("utm_medium"),
  col("utm_campaign"),
  col("created_at"),
  col("status"),
];

function col(id, extra = {}) {
  return {
    id,
    displayName: id,
    required: false,
    defaultMatch: false,
    display: true,
    type: "string",
    canBeUsedToMatch: true,
    removed: false,
    ...extra,
  };
}

// Leading ' forces plain text in Sheets (avoids +55 → formula #ERROR!)
const phoneExpr =
  "={{ \"'\" + String($json.phone || '').replace(/^\\+/, '').trim() }}";

for (const w of workflows) {
  for (const n of w.nodes) {
    if (n.type !== "n8n-nodes-base.googleSheets") continue;

    n.credentials = cred;
    n.parameters.authentication = "oAuth2";
    n.parameters.resource = "sheet";
    n.parameters.documentId = doc;
    n.parameters.sheetName = sheet;

    if (n.name.includes("Append") || n.parameters.operation === "append") {
      n.parameters.operation = "append";
      n.parameters.columns = {
        mappingMode: "defineBelow",
        value: {
          email: "={{ $json.email }}",
          name: "={{ $json.name }}",
          "phone ": phoneExpr,
          "purchased ": "={{ $json.purchased }}",
          "visitor_id ": "={{ $json.visitor_id }}",
          "utm_source ": "={{ $json.utm_source }}",
          utm_medium: "={{ $json.utm_medium }}",
          utm_campaign: "={{ $json.utm_campaign }}",
          created_at: "={{ $json.created_at }}",
          status: "={{ $json.status }}",
        },
        matchingColumns: [],
        schema: schemaAppend,
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      };
      n.parameters.options = { cellFormat: "USER_ENTERED" };
      console.log("fixed Append:", w.name);
    }

    if (n.name.includes("Update purchased") || n.parameters.operation === "update") {
      n.parameters.operation = "update";
      n.parameters.columns = {
        mappingMode: "defineBelow",
        value: {
          email: "={{ $json.email }}",
          "purchased ": "true",
          status: "purchased",
        },
        matchingColumns: ["email"],
        schema: [
          col("email", { required: true, defaultMatch: true }),
          col("purchased "),
          col("status"),
        ],
        attemptToConvertTypes: false,
        convertFieldsToString: true,
      };
      n.parameters.options = { cellFormat: "USER_ENTERED" };
      console.log("fixed Update:", w.name);
    }

    if (n.name.includes("Get row")) {
      n.parameters.operation = "read";
      // filters already use email — keep them
      console.log("fixed Get row:", n.name);
    }
  }
}

// Import each workflow
for (const w of workflows) {
  const out = path.join(tmp, `wf-${w.id}-sheetfix.json`);
  fs.writeFileSync(out, JSON.stringify(w, null, 2));
  const result = runN8n(["import:workflow", `--input=${out}`]);
  console.log("import", w.name, result.trim().split("\n").pop());
}

// Publish so active workflows pick up changes after restart
for (const w of workflows) {
  try {
    const result = runN8n(["publish:workflow", `--id=${w.id}`]);
    console.log("publish", w.id, result.trim().split("\n").slice(-2).join(" | "));
  } catch (e) {
    console.warn("publish failed", w.id, e.message);
  }
}

console.log("\nDone. Restart n8n if it is running so active workflows reload.");
