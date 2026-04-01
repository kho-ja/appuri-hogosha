import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link } from "@/navigation";
import { compile } from "@mdx-js/mdx";
import { getAllSlugs, getPostBySlug } from "@/lib/blog";
import { MDXContent } from "./MDXContent";
import { SITE_URL, LOCALES, localePath } from "@/lib/i18nConfig";

interface PageProps {
  params: Promise<{ locale: string; slug: string }>;
}

export async function generateStaticParams() {
  return LOCALES.flatMap((locale) =>
    getAllSlugs(locale).map((slug) => ({ locale, slug }))
  );
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getPostBySlug(locale, slug);

  if (!post) {
    return { title: "Not Found — Appuri Hogosha" };
  }

  const lp = localePath(locale);
  const url = `${SITE_URL}${lp}/blog/${slug}`;

  return {
    title: `${post.title} — Appuri Hogosha`,
    description: post.description,
    authors: [{ name: post.author }],
    openGraph: {
      type: "article",
      title: post.title,
      description: post.description,
      url,
      siteName: "Appuri Hogosha",
      publishedTime: post.date,
      authors: [post.author],
      images: [
        { url: "/og-image.png", width: 1200, height: 630, alt: post.title },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: ["/og-image.png"],
    },
    alternates: {
      canonical: url,
      languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${SITE_URL}${localePath(l)}/blog/${slug}`])
      ),
    },
  };
}

const backLabels: Record<string, string> = {
  en: "← Back to Blog",
  uz: "← Blogga qaytish",
  ja: "← ブログに戻る",
  ru: "← Назад к блогу",
};

export default async function BlogPostPage({ params }: PageProps) {
  const { locale, slug } = await params;
  const post = getPostBySlug(locale, slug);

  if (!post) {
    notFound();
  }

  // Compile MDX to JS string on the server
  const compiled = await compile(post.content, {
    outputFormat: "function-body",
    development: false,
  });
  const code = String(compiled);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <Link
          href="/blog"
          className="mb-8 inline-block text-sm font-medium text-primary hover:underline"
        >
          {backLabels[locale] ?? backLabels.en}
        </Link>

        <article>
          <header className="mb-8">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              {post.title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              {new Date(post.date).toLocaleDateString(locale, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}{" "}
              · {post.author}
            </p>
            {post.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-secondary px-3 py-0.5 text-xs text-secondary-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </header>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <MDXContent code={code} />
          </div>
        </article>
      </div>
    </main>
  );
}
