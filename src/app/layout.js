import { Geist } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const geist = Geist({
  subsets: ["latin"],
});

export const metadata = {
  title: "CodRoom",
  description: "Technical interviews, powered by AI",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} antialiased`}>
        {children}
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
