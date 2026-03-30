import type { Metadata } from "next";
import ParentNotificationClient from "./ParentNotificationClient";

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL || "https://appuri-hogosha.vercel.app";

const androidLink =
  process.env.NEXT_PUBLIC_ANDROID_STORE_URL ||
  "https://play.google.com/store/apps/details?id=com.jduapp.parentnotification";
const iosLink =
  process.env.NEXT_PUBLIC_IOS_STORE_URL || "https://apps.apple.com";

interface PageProps {
  params: Promise<{ locale: string; slug?: string[] }>;
  searchParams: Promise<{ variant?: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;

  const title = "Appuri Hogosha — Parent Notification App";
  const description =
    "Stay connected with your child's education. Get real-time updates on university activities, grades, and attendance. Download the free parent app.";

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `${siteUrl}/${locale}/parentnotification`,
      siteName: "Appuri Hogosha",
      images: [
        {
          url: "/og-image.png",
          width: 1200,
          height: 630,
          alt: "Appuri Hogosha — Parent Notification App",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: `${siteUrl}/${locale}/parentnotification`,
      languages: {
        en: `${siteUrl}/en/parentnotification`,
        uz: `${siteUrl}/parentnotification`,
        ja: `${siteUrl}/ja/parentnotification`,
        ru: `${siteUrl}/ru/parentnotification`,
      },
    },
  };
}

// JSON-LD structured data for the app
function JsonLd({ locale }: { locale: string }) {
  const mobileAppSchema = {
    "@context": "https://schema.org",
    "@type": "MobileApplication",
    name: "Appuri Hogosha",
    description:
      "Real-time updates on university activities, grades, and attendance for parents.",
    applicationCategory: "EducationApplication",
    operatingSystem: "Android, iOS",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    installUrl: androidLink,
    downloadUrl: [androidLink, iosLink],
    inLanguage: ["ja", "uz", "en", "ru"],
    url: `${siteUrl}/${locale}/parentnotification`,
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Appuri Hogosha",
    description:
      "School notification platform for parents — real-time updates on university activities.",
    url: siteUrl,
    sameAs: [],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(mobileAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
    </>
  );
}

export default async function ParentNotificationPage({
  params,
  searchParams,
}: PageProps) {
  const { locale, slug } = await params;
  const { variant } = await searchParams;

  return (
    <>
      <JsonLd locale={locale} />
      <ParentNotificationClient
        slug={slug}
        variant={variant}
        androidLink={androidLink}
        iosLink={iosLink}
      />
    </>
  );
}
