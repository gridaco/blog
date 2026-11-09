import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export interface Author {
  id: string;
  name: string;
  title?: string;
  url?: string;
  image?: string;
}

export interface Post {
  slug: string;
  title: string;
  description: string;
  date: string;
  authors: Author[];
  tags: string[];
  image?: string;
  socialImage: string;
  body: string;
  filePath: string;
  draft: boolean;
  hiddenTOC: boolean;
  readingTime: number;
}

export interface Tag {
  slug: string;
  label: string;
  description?: string;
  count: number;
}

const contentDirectory = path.join(process.cwd(), "content");
const reserved = new Set([
  "tags",
  "authors",
  "archive",
  "page",
  "images",
  "img",
  "assets",
  "markdown-page",
]);

function record(value: unknown, context: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${context}: expected a YAML object`);
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, context: string): string {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${context}: required text is missing`);
  return value.trim();
}

function optionalString(value: unknown, context: string): string | undefined {
  return value === undefined ? undefined : requiredString(value, context);
}

function strings(value: unknown, context: string): string[] {
  const values = typeof value === "string" ? [value] : value;
  if (!Array.isArray(values)) throw new Error(`${context}: expected text or a list of text`);
  return values.map((entry) => requiredString(entry, context));
}

function boolean(value: unknown, context: string): boolean {
  if (value === undefined) return false;
  if (typeof value !== "boolean") throw new Error(`${context}: expected true or false`);
  return value;
}

function assetUrl(value: string): string {
  if (value.startsWith("/") && !value.startsWith("/blog/")) return `/blog${value}`;
  return value;
}

function yamlFile(directory: string, filename: string): Record<string, unknown> {
  return record(parse(fs.readFileSync(path.join(directory, filename), "utf8")), filename);
}

export function getAuthors(directory = contentDirectory): Author[] {
  return Object.entries(yamlFile(directory, "authors.yml")).map(([id, value]) => {
    const entry = record(value, `Author ${id}`);
    const image = optionalString(entry.image_url, `Author ${id} image_url`);
    return {
      id,
      name: requiredString(entry.name, `Author ${id} name`),
      title: optionalString(entry.title, `Author ${id} title`),
      url: optionalString(entry.url, `Author ${id} url`),
      image: image ? assetUrl(image) : undefined,
    };
  });
}

export function getAllPosts(directory = contentDirectory): Post[] {
  const authors = getAuthors(directory);
  const postsDirectory = path.join(directory, "posts");
  const files = fs
    .readdirSync(postsDirectory, { recursive: true, encoding: "utf8" })
    .filter((file) => file.endsWith(".mdx") || file.endsWith(".md"));
  const seen = new Set<string>();
  const posts = files.map((file): Post => {
    const filePath = path.join(postsDirectory, file);
    const source = fs.readFileSync(filePath, "utf8").replace(/\r\n/g, "\n");
    const match = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(source);
    if (!match) throw new Error(`${file}: start with YAML frontmatter between --- lines`);
    const data = record(parse(match[1]), file);
    const slug =
      optionalString(data.slug, `${file} slug`) ?? path.basename(file, path.extname(file));
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || reserved.has(slug)) {
      throw new Error(`${file}: invalid or reserved slug "${slug}"`);
    }
    if (seen.has(slug)) throw new Error(`${file}: duplicate slug "${slug}"`);
    seen.add(slug);
    const date = requiredString(data.date, `${file} date`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !Number.isFinite(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date
    ) {
      throw new Error(`${file}: date must be a real calendar date in YYYY-MM-DD format`);
    }
    const postAuthors = strings(data.authors, `${file} authors`).map((id) => {
      const author = authors.find((entry) => entry.id === id);
      if (!author)
        throw new Error(`${file}: unknown author "${id}"; add them to content/authors.yml`);
      return author;
    });
    if (!postAuthors.length) throw new Error(`${file}: at least one author is required`);
    const tags = data.tags === undefined ? [] : strings(data.tags, `${file} tags`);
    for (const tag of tags) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(tag)) throw new Error(`${file}: invalid tag "${tag}"`);
    }
    const body = source.slice(match[0].length);
    const image = optionalString(data.image, `${file} image`);
    const firstImage = /!\[[^\]]*\]\(([^\s)]+)/.exec(body)?.[1];
    return {
      slug,
      date,
      title: requiredString(data.title, `${file} title`),
      description: requiredString(data.description, `${file} description`),
      authors: postAuthors,
      tags,
      image: image ? assetUrl(image) : firstImage,
      socialImage: image ? assetUrl(image) : "/blog/img/social-card.png",
      body,
      filePath,
      draft: boolean(data.draft, `${file} draft`),
      hiddenTOC: boolean(data.hide_table_of_contents, `${file} hide_table_of_contents`),
      readingTime: Math.max(
        1,
        Math.ceil(body.replace(/```[\s\S]*?```/g, "").split(/\s+/).length / 200),
      ),
    };
  });
  return posts.sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
}

export function getPosts(directory = contentDirectory): Post[] {
  return getAllPosts(directory).filter((post) => !post.draft);
}

export function getTags(): Tag[] {
  const registry = yamlFile(contentDirectory, "tags.yml");
  const counts = new Map<string, number>();
  for (const post of getPosts())
    for (const tag of new Set(post.tags)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts]
    .map(([slug, count]) => {
      const data = registry[slug] === undefined ? {} : record(registry[slug], `Tag ${slug}`);
      return {
        slug,
        count,
        label: optionalString(data.label, `Tag ${slug} label`) ?? slug,
        description: optionalString(data.description, `Tag ${slug} description`),
      };
    })
    .sort((a, b) => a.label.localeCompare(b.label));
}
