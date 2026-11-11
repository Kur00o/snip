import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Snip — your AI social media team",
    template: "%s · Snip",
  },
  description:
    "Snip designs carousels, writes captions, coaches you to film real Reels, edits them and posts to Instagram, Facebook and YouTube.",
};

export const viewport: Viewport = {
  themeColor: "#14162B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
