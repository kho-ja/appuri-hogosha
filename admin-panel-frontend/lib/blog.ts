import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostFrontmatter {
  title: string;
  description: string;
  date: string;
  slug: string;
  author: string;
  tags: string[];
}

export interface Post extends PostFrontmatter {
  content: string;
}

const BLOG_DIR = path.join(process.cwd(), "content", "blog");

function getMdxFiles(locale: string): string[] {
  const dir = path.join(BLOG_DIR, locale);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".mdx"));
}

export function getAllPosts(locale: string): PostFrontmatter[] {
  const dir = path.join(BLOG_DIR, locale);
  return getMdxFiles(locale)
    .map((filename) => {
      const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
      return matter(raw).data as PostFrontmatter;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(locale: string, slug: string): Post | null {
  const dir = path.join(BLOG_DIR, locale);
  for (const filename of getMdxFiles(locale)) {
    const raw = fs.readFileSync(path.join(dir, filename), "utf-8");
    const { data, content } = matter(raw);
    const frontmatter = data as PostFrontmatter;
    if (frontmatter.slug === slug || filename.replace(/\.mdx$/, "") === slug) {
      return { ...frontmatter, content };
    }
  }
  return null;
}

/** Reuses getAllPosts to avoid double file reads. */
export function getAllSlugs(locale: string): string[] {
  return getAllPosts(locale).map((p) => p.slug);
}
