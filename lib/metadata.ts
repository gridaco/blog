import type { Metadata } from "next";
import type { Post } from "./content";
import { absoluteUrl, site } from "./site";

export function pageMetadata(title: string, description: string, path = ""): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      types: {
        "application/rss+xml": absoluteUrl("/rss.xml"),
        "application/atom+xml": absoluteUrl("/atom.xml"),
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: site.name,
      type: "website",
      locale: "en",
      images: [new URL(site.image, site.origin).href],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL(site.image, site.origin).href],
    },
  };
}

export function postMetadata(post: Post): Metadata {
  const image = new URL(post.socialImage, site.origin).href;
  return {
    ...pageMetadata(post.title, post.description, `/${post.slug}`),
    authors: post.authors.map((author) => ({ name: author.name, url: author.url })),
    keywords: post.tags,
    openGraph: {
      title: post.title,
      description: post.description,
      url: absoluteUrl(`/${post.slug}`),
      siteName: site.name,
      type: "article",
      locale: "en",
      publishedTime: `${post.date}T00:00:00.000Z`,
      authors: post.authors.map((author) => author.url ?? author.name),
      tags: post.tags,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [image],
    },
  };
}
