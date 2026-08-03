const r = await fetch("https://cdn.utmify.com.br/scripts/pixel/pixel.js");
const t = await r.text();
console.log("len", t.length);
const urls = [...new Set(t.match(/https?:\/\/[^"'`\s)]+/g) || [])];
console.log("urls", urls);
// print first 3000 chars
console.log("--- head ---");
console.log(t.slice(0, 3000));
console.log("--- mid ---");
console.log(t.slice(3000, 7000));
console.log("--- more ---");
console.log(t.slice(7000, 12000));
