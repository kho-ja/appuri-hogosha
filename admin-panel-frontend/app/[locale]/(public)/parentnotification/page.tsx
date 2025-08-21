"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import localImageLoader from "@/lib/localImageLoader";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-slate-950 dark:to-slate-900 dark:text-white">
      <header className="container flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-bold tracking-tighter">
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
      </header>

      {/* Hero Section */}
      <section className="container grid items-center gap-8 pb-8 pt-16 md:grid-cols-2 md:gap-16">
        <div className="space-y-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">
              Stay Connected
              <br />
              with Your Child&apos;s Education
            </h1>
            <p className="text-gray-500 dark:text-gray-400">
              Real-time updates on university activities, grades, and
              attendance.
              <br />
              Never miss important school updates.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Link href="https://play.google.com/store/apps/details?id=com.jduapp.parentnotification">
              <Image
                loader={localImageLoader}
                src="/assets/google.png"
                alt="Get it on Google Play"
                width={646}
                height={250}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <Link href="https://apps.apple.com/uz/app/parent-notification/id6744873338">
              <Image
                loader={localImageLoader}
                src="/assets/apple.png"
                alt="Download on the App Store"
                width={646}
                height={250}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>
          <div className="w-32">
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              Scan to get the app
            </p>
          </div>
        </div>
        <div className="relative h-[500px] flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/notification-bell.svg"
            alt="Notification Bell"
            width={256}
            height={256}
            className="animate-pulse"
            priority
          />
        </div>
      </section>

      {/* Features Section */}
      <section className="container grid gap-8 py-16 md:grid-cols-2 md:gap-16">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">Real-time Updates</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Get instant notifications about your child&apos;s attendance,
            grades, and university events. Stay informed about their academic
            progress and campus activities.
          </p>
          <Button variant="link" className="p-0 dark:text-white">
            Learn More About Features
          </Button>
        </div>
        <div className="relative h-[500px] flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/undraw_browsing_online_re_umsa.svg"
            alt="Calendar"
            width={656}
            height={656}
            className="h-41 w-auto"
          />
        </div>
      </section>

      {/* Forms Section */}
      <section className="container grid gap-8 py-16 md:grid-cols-2 md:gap-16">
        <div className="relative h-[500px] order-last md:order-first flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/undraw_fill_form_re_cwyf.svg"
            alt="Calendar"
            width={656}
            height={656}
            className="h-41 w-auto"
          />
        </div>
        <div className="space-y-4">
          <div className="text-sm font-medium dark:text-gray-300">
            Easy Communication
          </div>
          <h2 className="text-3xl font-bold">Submit Forms Digitally</h2>
          <p className="text-gray-500 dark:text-gray-400">
            Easily submit absence forms and communicate with teachers through
            the app. No more paper forms or delayed communications.
          </p>
        </div>
      </section>

      {/* Communication Section */}
      <section className="container grid gap-8 py-16 md:grid-cols-2 md:gap-16">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold">
            Enhanced Parent-Teacher Connection
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            Stay updated about parent-teacher meetings, school holidays, and
            important events. Direct communication channel with teachers and
            school administration.
          </p>
        </div>
        <div className="relative h-[500px] flex items-center justify-center">
          <Image
            loader={localImageLoader}
            src="/assets/undraw_undraw_undraw_undraw_smartphone_34c3_-1-_orrt_-1-_tyrp_-1-_fl8c.svg"
            alt="Calendar"
            width={256}
            height={256}
            className="h-[500px] w-auto object-contain"
          />
        </div>
      </section>

      {/* Download Section */}
      <section className="container space-y-8 py-16 text-center">
        <h2 className="text-3xl font-bold">
          Download Parent Notification Today
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Free to download and use. Stay connected with your child&apos;s
          education journey.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8">
          <div className="w-32">{/* QR Code space */}</div>
          <div className="flex flex-col gap-4">
            <Link href="#">
              <Image
                loader={localImageLoader}
                src="/assets/google.png"
                alt="Get it on Google Play"
                width={646}
                height={250}
                className="h-12 w-auto"
                priority
              />
            </Link>
            <Link href="#">
              <Image
                loader={localImageLoader}
                src="/assets/apple.png"
                alt="Download on the App Store"
                width={646}
                height={250}
                className="h-12 w-auto"
                priority
              />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
