import { Metadata } from "next";
import LandingPage from "@/src/components/LandingPage";

export const metadata: Metadata = {
  title: "Create Custom Murder Mystery Parties",
  description: "Generate unique murder mystery party scenarios with our AI-powered tool. Customize themes, characters, and plots for unforgettable events.",
  openGraph: {
    title: "Murder Mystery Party Generator",
    description: "Generate unique murder mystery party scenarios with our AI-powered tool.",
    url: "https://murder-mystery.party",
    siteName: "Murder Mystery Party Generator",
    images: [
      {
        url: "https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true",
        width: 1200,
        height: 630,
        alt: "Murder Mystery Party Generator",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Murder Mystery Party Generator",
    description: "Generate unique murder mystery party scenarios with our AI-powered tool.",
    images: ["https://github.com/CoachJ87/murder-mystery-party-generator/blob/main/public/images/custom_themes.png?raw=true"],
  },
  alternates: {
    canonical: "https://murder-mystery.party",
  },
};

// JSON-LD structured data for better SEO
export const generateMetadata = async () => {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Murder Mystery Party Generator",
    url: "https://murder-mystery.party",
    description: "Generate unique murder mystery party scenarios with our AI-powered tool.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://murder-mystery.party/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return {
    // Other metadata...
    other: {
      "script:ld+json": JSON.stringify(jsonLd),
    },
  };
};

export default function Home() {
  return <LandingPage />;
}