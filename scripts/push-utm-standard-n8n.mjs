/**
 * Push email workflows to n8n with standardized UTMs (email_* sources).
 * Env: N8N_API_KEY, N8N_BASE_URL
 */
import fs from "fs";

const base = process.env.N8N_BASE_URL || "https://infosd.app.n8n.cloud";
const key = process.env.N8N_API_KEY;
const headers = {
  "X-N8N-API-KEY": key,
  "Content-Type": "application/json",
  Accept: "application/json",
};

const SHEETS = {
  googleSheetsOAuth2Api: {
    id: "cPUIPb2SjjiZpCfg",
    name: "Google Sheets account",
  },
};
const RESEND = {
  httpHeaderAuth: { id: "kgfB071PoLJfLOZd", name: "Header Auth account" },
};
const DOC = {
  __rl: true,
  value: "18jZnwB4KbIV3EdwmYi77Q_HkK-yO0fqkYvI9cxxbBOU",
  mode: "list",
  cachedResultName: "App Spy - Leads Recovery ",
};

async function api(m, p, b) {
  const r = await fetch(base + p, {
    method: m,
    headers,
    body: b !== undefined ? JSON.stringify(b) : undefined,
  });
  return { status: r.status, j: await r.json().catch(() => ({})) };
}

function forceUtm(nodes) {
  for (const n of nodes) {
    if (typeof n.parameters?.jsonBody !== "string") continue;
    let b = n.parameters.jsonBody;

    // Direct PerfectPay links — strip branded /go/ redirect
    b = b.replaceAll(
      "https://mysafelinkspy.com/go/",
      "https://go.centerpag.com/"
    );
    b = b.replaceAll(
      "https://www.mysafelinkspy.com/go/",
      "https://go.centerpag.com/"
    );

    b = b.replaceAll(
      "utm_source=email&utm_medium=cart_abandon&utm_campaign=",
      "utm_source=email_cart&utm_medium=email&utm_campaign="
    );
    b = b.replaceAll(
      "utm_source=email&utm_medium=cancel_recovery&utm_campaign=",
      "utm_source=email_cancel&utm_medium=email&utm_campaign="
    );
    b = b.replaceAll(
      "utm_source=email&utm_medium=recovery&utm_campaign=",
      "utm_source=email_recovery&utm_medium=email&utm_campaign="
    );
    b = b.replaceAll(
      "utm_source=email&utm_medium=welcome&utm_campaign=",
      "utm_source=email_welcome&utm_medium=email&utm_campaign="
    );

    // Already rebuilt files may already have email_cart without src
    if (b.includes("utm_source=email_cart") && !b.includes("src=email_cart")) {
      b = b.replace(
        /utm_campaign=(cart_a\d+)/g,
        "utm_campaign=$1&src=email_cart&sck=$1"
      );
    }
    if (b.includes("utm_source=email_cancel") && !b.includes("src=email_cancel")) {
      b = b.replace(
        /utm_campaign=(cancel_e\d+)/g,
        "utm_campaign=$1&src=email_cancel&sck=$1"
      );
    }
    if (
      b.includes("utm_source=email_recovery") &&
      !b.includes("src=email_recovery")
    ) {
      b = b.replace(
        /utm_campaign=(e\d+)/g,
        "utm_campaign=$1&src=email_recovery&sck=$1"
      );
    }
    if (
      b.includes("utm_source=email_welcome") &&
      !b.includes("src=email_welcome")
    ) {
      b = b.replace(
        /utm_campaign=(w\d+)/g,
        "utm_campaign=$1&src=email_welcome&sck=$1"
      );
    }

    n.parameters.jsonBody = b;
    if (n.type?.includes("httpRequest")) n.credentials = RESEND;
  }
}

async function push(match, file, sheet) {
  const list = await api("GET", "/api/v1/workflows");
  const ex = (list.j.data || []).find((w) =>
    (w.name || "").toLowerCase().includes(match)
  );
  if (!ex) {
    console.log("missing", match);
    return;
  }
  const full = await api("GET", `/api/v1/workflows/${ex.id}`);
  const cur = full.j.data || full.j;

  let nodes, connections, settings, name;
  if (file && fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, "utf8"));
    nodes = raw.nodes;
    connections = raw.connections;
    settings = raw.settings;
    name = raw.name;
    for (const n of nodes) {
      if (n.type?.includes("googleSheets")) {
        n.credentials = SHEETS;
        n.parameters.documentId = DOC;
        if (sheet)
          n.parameters.sheetName = {
            __rl: true,
            value: sheet,
            mode: "name",
          };
      }
      if (n.type?.includes("httpRequest")) n.credentials = RESEND;
    }
  } else {
    nodes = cur.nodes;
    connections = cur.connections;
    settings = cur.settings;
    name = cur.name;
  }

  forceUtm(nodes);

  const samples = [];
  for (const n of nodes) {
    const b = n.parameters?.jsonBody;
    if (typeof b === "string") {
      const m = b.match(/utm_source=[a-z_]+/);
      if (m) samples.push(`${n.name}: ${m[0]}`);
    }
  }

  const put = await api("PUT", `/api/v1/workflows/${ex.id}`, {
    name,
    nodes,
    connections,
    settings,
    staticData: cur.staticData || null,
  });
  console.log(match, "PUT", put.status);
  console.log(" ", samples.slice(0, 4).join(" | ") || "(no utm in body)");
  await api("POST", `/api/v1/workflows/${ex.id}/activate`);
}

await push(
  "welcome purchase",
  "docs/n8n/workflow-welcome-purchase-5emails.json",
  null
);
await push(
  "cart abandoned",
  "docs/n8n/workflow-cart-abandoned-7emails.json",
  "Cart Abandoned"
);
await push(
  "card refused",
  "docs/n8n/workflow-cancel-card-refused-7emails.json",
  "Cancel Leads"
);
// Recovery / captura lead — force CenterPag + UTM (file if present, else live patch)
await push(
  "captura lead",
  "docs/n8n/workflow-lead-recovery-4emails.json",
  "Leads"
);
await push("recovery", "docs/n8n/workflow-lead-recovery-4emails.json", "Leads");
console.log("DONE");
