import { getPosts } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { formatDate } from "@/lib/site";
export const metadata = pageMetadata(
  "Archive",
  "Every article from the Grida blog, organized by year.",
  "/archive",
);
export default function Archive() {
  const posts = getPosts();
  const years = [...new Set(posts.map((post) => post.date.slice(0, 4)))];
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">From the beginning</p>
        <h1>Archive</h1>
      </header>
      {years.map((year) => (
        <section className="archive-year" key={year}>
          <h2>{year}</h2>
          <ul>
            {posts
              .filter((post) => post.date.startsWith(year))
              .map((post) => (
                <li key={post.slug}>
                  <time dateTime={post.date}>{formatDate(post.date)}</time>
                  <a href={`/blog/${post.slug}`}>{post.title}</a>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </>
  );
}
