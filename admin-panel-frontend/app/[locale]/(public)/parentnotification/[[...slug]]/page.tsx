"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import localImageLoader from "@/lib/localImageLoader";
import { useEffect } from "react";

interface PageProps {
  params: { locale: string; slug?: string[] };
  searchParams: { variant?: string };
}

export default function ParentNotificationPage({
  params,
  searchParams,
}: PageProps) {
  const androidLink =
    process.env.NEXT_PUBLIC_ANDROID_STORE_URL ||
    "https://play.google.com/store/apps/details?id=com.jduapp.parentnotification";
  const iosLink =
    process.env.NEXT_PUBLIC_IOS_STORE_URL || "https://apps.apple.com";

  useEffect(() => {
    const slugPath = params.slug?.join("/") ?? "";
    const variant = searchParams.variant || "production";
    const scheme =
      variant === "development"
        ? "jduapp-dev"
        : variant === "preview"
          ? "jduapp-preview"
          : "jduapp";
    const path = slugPath || "home";
    const appUrl = `${scheme}://${path}`;

    const userAgent = navigator.userAgent || navigator.vendor || "";
    const storeUrl = /android/i.test(userAgent)
      ? androidLink
      : /iPad|iPhone|iPod/.test(userAgent)
        ? iosLink
        : undefined;

    const timer = setTimeout(() => {
      if (storeUrl) {
        window.location.href = storeUrl;
      }
    }, 1500);

    window.location.href = appUrl;

    return () => clearTimeout(timer);
  }, [params.slug, searchParams.variant, androidLink, iosLink]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900 dark:text-white">
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-b border-gray-200 dark:border-slate-800">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-extrabold tracking-tight">
              Parent Notification
            </span>
          </div>
          <nav className="flex gap-6">
            <Link href="#" className="text-sm hover:underline">
              Home
            </Link>
            <Link href="#" className="text-sm hover:underline">
              Features
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container grid items-center gap-8 pb-8 pt-20 md:grid-cols-2 md:gap-16">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
              Stay Connected
              <br />
              with Your Child's Education
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Real-time updates on university activities, grades, and
              attendance.
              <br />
              Never miss important school updates.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href={androidLink}>
              <Image
                loader={localImageLoader}
                src="/assets/google.png"
                alt="Get it on Google Play"
                width={646}
                height={250}
                className="h-12 w-auto hover:scale-105 transition"
                priority
              />
            </Link>
            <Link href={iosLink}>
              <Image
                loader={localImageLoader}
                src="/assets/apple.png"
                alt="Download on the App Store"
                width={646}
                height={250}
                className="h-12 w-auto hover:scale-105 transition"
                priority
              />
            </Link>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Scan to get the app
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/undraw_fill_form_re_cwyf.svg"
            alt="Notification Bell"
            width={300}
            height={300}
            className="animate-pulse hover:scale-105 transition"
            priority
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="container grid gap-12 py-20 md:grid-cols-2 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">Real-time Updates</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Get instant notifications about your child&apos;s attendance,
            grades, and university events. Stay informed about their academic
            progress and campus activities.
          </p>
          <Button variant="link" className="p-0 dark:text-white">
            Learn More About Features
          </Button>
        </div>
        <div className="relative flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/undraw_browsing_online_re_umsa.svg"
            alt="Calendar"
            width={500}
            height={500}
            className="hover:scale-105 transition"
          />
        </div>
      </section>

      {/* Forms Section */}
      <section className="container grid gap-12 py-20 md:grid-cols-2 items-center">
        <div className="relative order-last md:order-first flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/undraw_fill_form_re_cwyf.svg"
            alt="Calendar"
            width={500}
            height={500}
            className="hover:scale-105 transition"
          />
        </div>
        <div className="space-y-6">
          <span className="text-sm uppercase tracking-wide text-gray-600 dark:text-gray-400">
            Easy Communication
          </span>
          <h2 className="text-3xl font-bold">Submit Forms Digitally</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Easily submit absence forms and communicate with teachers through
            the app. No more paper forms or delayed communications.
          </p>
        </div>
      </section>

      {/* Communication Section */}
      <section className="container grid gap-12 py-20 md:grid-cols-2 items-center">
        <div className="space-y-6">
          <h2 className="text-3xl font-bold">
            Enhanced Parent-Teacher Connection
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Stay updated about parent-teacher meetings, school holidays, and
            important events. Direct communication channel with teachers and
            school administration.
          </p>
        </div>
        <div className="relative flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/undraw_undraw_undraw_undraw_smartphone_34c3_-1-_orrt_-1-_tyrp_-1-_fl8c.svg"
            alt="Calendar"
            width={300}
            height={300}
            className="h-[400px] w-auto object-contain hover:scale-105 transition"
          />
        </div>
      </section>

      {/* Download Section */}
      <footer className="relative py-10 bg-gray-50 dark:bg-slate-800 text-center">
        <div className="container space-y-6">
          <h2 className="text-2xl font-bold">
            Download Parent Notification Today
          </h2>
          <p className="max-w-xl mx-auto text-gray-600 dark:text-gray-400">
            Free to download and use. Stay connected with your child&apos;s
            education journey.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8">
            <Link href={androidLink}>
              <Image
                loader={localImageLoader}
                src="/assets/google.png"
                alt="Get it on Google Play"
                width={646}
                height={250}
                className="h-12 w-auto hover:scale-110 transition"
                priority
              />
            </Link>
            <Link href={iosLink}>
              <Image
                loader={localImageLoader}
                src="/assets/apple.png"
                alt="Download on the App Store"
                width={646}
                height={250}
                className="h-12 w-auto hover:scale-110 transition"
                priority
              />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
