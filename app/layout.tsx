import type { Metadata } from "next";
import { Inter, Lora } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { AuthModalProvider } from "@/components/auth-modal/auth-modal-provider";
import { Nav } from "@/components/nav/nav";
import { Footer } from "@/components/footer/footer";
import { Toaster } from "@/components/ui/toaster";
import { getSessionUser } from "@/lib/auth";

const defaultUrl = process.env.VERCEL_URL
  ? `https://${process.env.VERCEL_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "Van Cortlandt Park Bench Adoption",
  description:
    "Adopt a bench in Van Cortlandt Park. Reserve consecutive months and support the places where neighbors rest.",
};

const inter = Inter({
  variable: "--font-inter",
  display: "swap",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
  display: "swap",
  subsets: ["latin"],
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getSessionUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${lora.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <AuthModalProvider>
            <div className="flex min-h-screen flex-col bg-park-bg">
              <Nav user={user} />
              <main className="flex-1">{children}</main>
              <Footer />
            </div>
            <Toaster />
          </AuthModalProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
