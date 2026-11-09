import path from "node:path";
import { notFound } from "next/navigation";
import { getPosts } from "@/lib/content";
import { renderPost } from "@/lib/mdx";
import { postMetadata } from "@/lib/metadata";
import { absoluteUrl, formatDate, site } from "@/lib/site";

export const dynamicParams = false;
export function generateStaticParams() {
  return getPosts().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = getPosts().find((entry) => entry.slug === slug);
  if (!post) notFound();
  return postMetadata(post);
}

export default async function Article({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const posts = getPosts();
  const post = posts.find((entry) => entry.slug === slug);
  if (!post) notFound();
  const { content, headings } = await renderPost(post);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: `${post.date}T00:00:00.000Z`,
    mainEntityOfPage: absoluteUrl(`/${post.slug}`),
    image: new URL(post.socialImage, site.origin).href,
    author: post.authors.map((author) => ({
      "@type": "Person",
      name: author.name,
      url: author.url,
    })),
    publisher: { "@type": "Organization", name: "Grida", url: site.origin },
  };
  const index = posts.indexOf(post);
  const editPath = path
    .relative(path.join(process.cwd(), "content", "posts"), post.filePath)
    .split(path.sep)
    .map(encodeURIComponent)
    .join("/");
  return (
    <article className="article-layout">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <header className="article-header">
        <a className="eyebrow" href="/blog">
          ← All posts
        </a>
        <h1 className="post-title">{post.title}</h1>
        <p className="article-description">{post.description}</p>
        <div className="post-meta">
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          <span> · {post.readingTime} min read</span>
        </div>
        <div className="post-authors">
          {post.authors.map((author) => (
            <a key={author.id} href={author.url ?? "/blog/authors"} className="author">
              {author.image && <img src={author.image} alt="" width="36" height="36" />}
              <span>
                {author.name}
                {author.title && <small>{author.title}</small>}
              </span>
            </a>
          ))}
        </div>
        <ul className="tag-list">
          {post.tags.map((tag) => (
            <li key={tag}>
              <a href={`/blog/tags/${tag}`}>{tag}</a>
            </li>
          ))}
        </ul>
      </header>
      {!post.hiddenTOC && headings.length > 0 && (
        <details className="article-toc">
          <summary>On this page</summary>
          <ul>
            {headings
              .filter((heading) => heading.level <= 3)
              .map((heading) => (
                <li key={heading.id}>
                  <a href={`#${heading.id}`}>{heading.text}</a>
                </li>
              ))}
          </ul>
        </details>
      )}
      <div className="article-body prose">{content}</div>
      <footer className="article-footer">
        <a href={`https://github.com/gridaco/blog/edit/main/content/posts/${editPath}`}>
          Edit this post on GitHub ↗
        </a>
        <nav aria-label="More posts">
          {posts[index - 1] && (
            <a href={`/blog/${posts[index - 1].slug}`}>← {posts[index - 1].title}</a>
          )}
          {posts[index + 1] && (
            <a href={`/blog/${posts[index + 1].slug}`}>{posts[index + 1].title} →</a>
          )}
        </nav>
      </footer>
    </article>
  );
}
