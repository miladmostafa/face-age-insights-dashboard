import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const serif = Fraunces({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Face Age Insights Dashboard",
    template: "%s · Face Age Insights",
  },
  description:
    "Open-source anonymized analytics for the face-age skin analysis widget. See top skin concerns, skin-age distribution, skin health, and scan-to-cart conversion without storing photos or emails.",
  keywords: [
    "face-age",
    "skin analysis dashboard",
    "skin age analytics",
    "skincare conversion",
    "anonymized analytics",
  ],
  openGraph: {
    title: "Face Age Insights Dashboard",
    description:
      "Aggregate anonymized face-age scan results: top concerns, skin-age buckets, and add-to-cart conversion.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body className="font-sans text-ink antialiased">{children}</body>
    </html>
  );
}
