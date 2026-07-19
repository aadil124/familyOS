import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ReactQueryProvider } from "@/providers/ReactQueryProvider";
import { AuthProvider } from "@/features/auth/context/AuthContext";
import { WorkspaceProvider } from "@/providers/WorkspaceProvider";
import { Toaster } from "@/components/ui/Toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "FamilyOS",
  description: "Secure digital vaults and proactive AI readiness audits for families.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans`}
      >
        <ReactQueryProvider>
          <AuthProvider>
            <WorkspaceProvider>
              {children}
              <Toaster />
            </WorkspaceProvider>
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
