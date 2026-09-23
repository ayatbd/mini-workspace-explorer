import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mini Workspace Explorer",
  description: "A local workspace for organizing folders and text files.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
