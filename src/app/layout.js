import { Geist, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

const geist = Geist({ subsets: ["latin"] });
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata = {
  title: "CodRoom",
  description: "Technical interviews, powered by AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} ${inter.variable} antialiased`}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(10, 8, 24, 0.95)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(12px)",
              color: "white",
            },
          }}
        />
      </body>
    </html>
  );
}
