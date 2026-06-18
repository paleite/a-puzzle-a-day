import "./globals.css";

import type { Metadata } from "next";
import { Geist } from "next/font/google";

import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {};

type RootLayoutProps = {
  children: React.ReactNode;
};

function RootLayout({ children }: Readonly<RootLayoutProps>) {
  return (
    <html className={cn("font-sans", geist.variable)} lang="en">
      <body className="antialiased">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

export default RootLayout;
