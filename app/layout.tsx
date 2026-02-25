import { Inter } from "next/font/google";
import { Providers } from "./providers";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "ParakhAI",
  description: "Paricipatory AI Evaluation",
  icons: {
    icon: "/images/icons/Favicon1.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
