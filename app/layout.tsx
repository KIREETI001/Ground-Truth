import type { Metadata } from "next";
import "./globals.css";
import "./experience.css";
import "./journey.css";
import "./platform.css";
import "./repository-learning.css";
import "./workspace-ux.css";
import "./beginner-learning.css";
import "./learning-library.css";
import "./responsive.css";
import { LearnerProvider } from "./components/learner-context";

export const metadata: Metadata = {
  title: "GroundTruth — From AI output to understanding",
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
