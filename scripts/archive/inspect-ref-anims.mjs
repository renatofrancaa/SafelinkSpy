const urls = [
  "https://perfect.zappdetect.com/ingles/upsell/up1",
  "https://perfect.zappdetect.com/ingles/upsell/up2/",
  "https://perfect.zappdetect.com/ingles/upsell/up3/",
  "https://perfect.zappdetect.com/ingles/upsell/up4/",
  "https://perfect.zappdetect.com/ingles/upsell/up5/",
  "https://perfect.zappdetect.com/ingles/upsell/up7/",
];

for (const u of urls) {
  const html = await (
    await fetch(u, { headers: { "User-Agent": "Mozilla/5.0" } })
  ).text();
  console.log("\n====", u, "len", html.length);
  const kfs = [...html.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)\s*\{[\s\S]*?\}/g)];
  console.log(
    "keyframes:",
    kfs.map((m) => m[1] + " => " + m[0].replace(/\s+/g, " ").slice(0, 160))
  );
  const anims = [
    ...new Set(
      [...html.matchAll(/animation\s*:\s*([^;}\"']+)/g)].map((m) =>
        m[1].trim().slice(0, 80)
      )
    ),
  ];
  console.log("animation props:", anims.slice(0, 30));
  // emoji / icon classes
  const classes = [
    ...new Set(
      [...html.matchAll(/class=["']([^"']*(?:icon|emoji|spin|pulse|float|shake|lock|sat)[^"']*)["']/gi)].map(
        (m) => m[1]
      )
    ),
  ];
  console.log("icon classes:", classes.slice(0, 40));
}
