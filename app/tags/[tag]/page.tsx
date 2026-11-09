import { notFound } from "next/navigation";
import PostList from "@/components/post-list";
import { getPosts, getTags } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
export const dynamicParams = false;
export function generateStaticParams() {
  return getTags().map(({ slug }) => ({ tag: slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: slug } = await params;
  const tag = getTags().find((entry) => entry.slug === slug);
  if (!tag) notFound();
  return pageMetadata(
    tag.label,
    tag.description ?? `Articles about ${tag.label} from the Grida team.`,
    `/tags/${slug}`,
  );
}
export default async function TagPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: slug } = await params;
  const tag = getTags().find((entry) => entry.slug === slug);
  if (!tag) notFound();
  return (
    <>
      <header className="page-header">
        <a href="/blog/tags" className="eyebrow">
          ← All topics
        </a>
        <h1>{tag.label}</h1>
        {tag.description && <p>{tag.description}</p>}
      </header>
      <PostList posts={getPosts().filter((post) => post.tags.includes(slug))} />
    </>
  );
}
