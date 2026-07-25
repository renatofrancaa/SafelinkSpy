/**
 * /white — serve famguard without changing to /famguard.html in the bar.
 * Prefer middleware rewrite; iframe is a fallback if this route is hit directly.
 */
export default function WhitePage() {
  return (
    <iframe
      src="/famguard.html"
      title="Safe"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        border: 0,
        margin: 0,
        padding: 0,
        display: "block",
        background: "#0b0f14",
      }}
    />
  );
}
