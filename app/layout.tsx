import {
  Inter,
  Noto_Sans_Devanagari,
  Noto_Sans_Tamil,
  Noto_Sans_Kannada,
  Noto_Sans_Telugu,
  Noto_Sans_Malayalam,
  Noto_Sans_Bengali,
  Noto_Sans_Gujarati,
  Noto_Sans_Gurmukhi,
  Noto_Sans_Oriya,
  // Scheduled languages missing from first pass
  Noto_Sans_Meetei_Mayek,
  Noto_Sans_Ol_Chiki,
  Noto_Sans_Arabic,
  // Northeastern scripts
  Noto_Sans_Chakma,
  Noto_Sans_Limbu,
  Noto_Sans_Lepcha,
  Noto_Sans_Syloti_Nagri,
  // Other regional scripts
  Noto_Sans_Sinhala,
  Noto_Sans_Saurashtra,
  Noto_Sans_Myanmar,
} from "next/font/google";
import { Providers } from "@/providers";
import "../styles/globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const notoDevanagari = Noto_Sans_Devanagari({
  subsets: ["devanagari"],
  display: "swap",
  variable: "--font-noto-devanagari",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  display: "swap",
  variable: "--font-noto-tamil",
});

const notoKannada = Noto_Sans_Kannada({
  subsets: ["kannada"],
  display: "swap",
  variable: "--font-noto-kannada",
});

const notoTelugu = Noto_Sans_Telugu({
  subsets: ["telugu"],
  display: "swap",
  variable: "--font-noto-telugu",
});

const notoMalayalam = Noto_Sans_Malayalam({
  subsets: ["malayalam"],
  display: "swap",
  variable: "--font-noto-malayalam",
});

const notoBengali = Noto_Sans_Bengali({
  subsets: ["bengali"],
  display: "swap",
  variable: "--font-noto-bengali",
});

const notoGujarati = Noto_Sans_Gujarati({
  subsets: ["gujarati"],
  display: "swap",
  variable: "--font-noto-gujarati",
});

const notoGurmukhi = Noto_Sans_Gurmukhi({
  subsets: ["gurmukhi"],
  display: "swap",
  variable: "--font-noto-gurmukhi",
});

const notoOriya = Noto_Sans_Oriya({
  subsets: ["oriya"],
  display: "swap",
  variable: "--font-noto-oriya",
});

const notoMeeteiMayek = Noto_Sans_Meetei_Mayek({
  subsets: ["meetei-mayek"],
  display: "swap",
  variable: "--font-noto-meetei-mayek",
});

const notoOlChiki = Noto_Sans_Ol_Chiki({
  subsets: ["ol-chiki"],
  display: "swap",
  variable: "--font-noto-ol-chiki",
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  display: "swap",
  variable: "--font-noto-arabic",
});

const notoChakma = Noto_Sans_Chakma({
  subsets: ["chakma"],
  display: "swap",
  variable: "--font-noto-chakma",
  weight: "400",
});

const notoLimbu = Noto_Sans_Limbu({
  subsets: ["limbu"],
  display: "swap",
  variable: "--font-noto-limbu",
  weight: "400",
});

const notoLepcha = Noto_Sans_Lepcha({
  subsets: ["lepcha"],
  display: "swap",
  variable: "--font-noto-lepcha",
  weight: "400",
});

const notoSylotiNagri = Noto_Sans_Syloti_Nagri({
  subsets: ["syloti-nagri"],
  display: "swap",
  variable: "--font-noto-syloti-nagri",
  weight: "400",
});

const notoSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  display: "swap",
  variable: "--font-noto-sinhala",
});

const notoSaurashtra = Noto_Sans_Saurashtra({
  subsets: ["saurashtra"],
  display: "swap",
  variable: "--font-noto-saurashtra",
  weight: "400",
});

const notoMyanmar = Noto_Sans_Myanmar({
  subsets: ["myanmar"],
  display: "swap",
  variable: "--font-noto-myanmar",
  weight: ["400", "700"],
});

const fontVariables = [
  inter.variable,
  notoDevanagari.variable,
  notoTamil.variable,
  notoKannada.variable,
  notoTelugu.variable,
  notoMalayalam.variable,
  notoBengali.variable,
  notoGujarati.variable,
  notoGurmukhi.variable,
  notoOriya.variable,
  notoMeeteiMayek.variable,
  notoOlChiki.variable,
  notoArabic.variable,
  notoChakma.variable,
  notoLimbu.variable,
  notoLepcha.variable,
  notoSylotiNagri.variable,
  notoSinhala.variable,
  notoSaurashtra.variable,
  notoMyanmar.variable,
].join(" ");

export const metadata = {
  title: "ParakhAI",
  description: "Paricipatory AI Evaluation",
  icons: {
    icon: "/images/icons/Favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={fontVariables}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
