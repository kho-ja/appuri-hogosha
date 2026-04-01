import type { Metadata } from "next";
import { Link } from "@/navigation";
import { getAllPosts } from "@/lib/blog";
import { SITE_URL, LOCALES, localePath } from "@/lib/i18nConfig";

const BLOG_TITLES: Record<string, string> = {
  en: "Blog — Appuri Hogosha",
  uz: "Blog — Appuri Hogosha",
  ja: "ブログ — Appuri Hogosha",
  ru: "Блог — Appuri Hogosha",
};
const BLOG_DESCRIPTIONS: Record<string, string> = {
  en: "Tips, guides, and updates from the Appuri Hogosha team.",
  uz: "Appuri Hogosha jamoasidan maslahatlar, qo'llanmalar va yangiliklar.",
  ja: "Appuri Hogosha チームからのヒント、ガイド、最新情報。",
  ru: "Советы, руководства и обновления от команды Appuri Hogosha.",
};

interface PageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const lp = localePath(locale);
  const title = BLOG_TITLES[locale] ?? BLOG_TITLES.en;
  const description = BLOG_DESCRIPTIONS[locale] ?? BLOG_DESCRIPTIONS.en;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      title,
      description,
      url: `${SITE_URL}${lp}/blog`,
      siteName: "Appuri Hogosha",
    },
    alternates: {
      canonical: `${SITE_URL}${lp}/blog`,
      languages: Object.fromEntries(
        LOCALES.map((l) => [l, `${SITE_URL}${localePath(l)}/blog`])
      ),
    },
  };
}

const HEADINGS: Record<string, string> = {
  en: "Blog",
  uz: "Blog",
  ja: "ブログ",
  ru: "Блог",
};
const NO_POSTS: Record<string, string> = {
  en: "No posts yet. Check back soon!",
  uz: "Hozircha maqolalar yo'q. Tez orada qaytib keling!",
  ja: "まだ投稿がありません。また後ほどご確認ください。",
  ru: "Пока нет статей. Загляните позже!",
};
const READ_MORE: Record<string, string> = {
  en: "Read more →",
  uz: "Davomi →",
  ja: "続きを読む →",
  ru: "Читать далее →",
};

export default async function BlogListPage({ params }: PageProps) {
  const { locale } = await params;
  const posts = getAllPosts(locale);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="mb-8 text-4xl font-bold tracking-tight text-foreground">
          {HEADINGS[locale] ?? HEADINGS.en}
        </h1>

        {posts.length === 0 ? (
          <p className="text-muted-foreground">
            {NO_POSTS[locale] ?? NO_POSTS.en}
          </p>
        ) : (
          <ul className="space-y-8">
            {posts.map((post) => (
              <li key={post.slug}>
                <article>
                  <Link href={`/blog/${post.slug}`}>
                    <h2 className="text-2xl font-semibold text-foreground hover:text-primary transition-colors">
                      {post.title}
                    </h2>
                  </Link>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {new Date(post.date).toLocaleDateString(locale, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}{" "}
                    · {post.author}
                  </p>
                  <p className="mt-2 text-muted-foreground">
                    {post.description}
                  </p>
                  {post.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
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
                  <Link
                    href={`/blog/${post.slug}`}
                    className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
                  >
                    {READ_MORE[locale] ?? READ_MORE.en}
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
