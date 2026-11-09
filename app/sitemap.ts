import type { MetadataRoute } from "next";
import { getPosts, getTags } from "@/lib/content";
import { absoluteUrl } from "@/lib/site";
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...["", "/archive", "/authors", "/tags"].map((path) => ({ url: absoluteUrl(path) })),
    ...getPosts().map((post) => ({
      url: absoluteUrl(`/${post.slug}`),
      lastModified: new Date(post.date),
    })),
    ...getTags().map((tag) => ({ url: absoluteUrl(`/tags/${tag.slug}`) })),
  ];
}
