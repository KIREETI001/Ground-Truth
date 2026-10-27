import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GroundTruth — Understand what your code actually does",
  description: "Predict, run, inspect, and explain. A focused verification lab for understanding the behavior of AI-assisted code.",
  other: {
    "codex-preview": "development",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
