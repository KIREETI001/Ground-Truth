import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import "./journey.css";
import { LearnerProvider } from "./components/learner-context";

export const metadata: Metadata = {
  title: "GroundTruth — Your next useful step",
  description: "Understand the web apps you build with guided practice, an evidence-based learning path, and live investigations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased"><LearnerProvider>{children}</LearnerProvider></body>
    </html>
  );
}
