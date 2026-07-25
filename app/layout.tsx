import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Famguard | Smart Parental Control",
  description:
    "Famguard helps families build balanced digital habits with screen time tools and web safety.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0, height: "100%" }}>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: "100%",
          width: "100%",
          background: "#0b0f14",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
