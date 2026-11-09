import { getAuthors, getPosts } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Authors",
  "Meet the people writing about design and engineering at Grida.",
  "/authors",
);
export default function Authors() {
  const posts = getPosts();
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">The people behind the posts</p>
        <h1>Authors</h1>
      </header>
      <div className="authors-list">
        {getAuthors().map((author) => (
          <section key={author.id}>
            {author.image && <img src={author.image} alt="" width="72" height="72" />}
            <h2>
              <a href={author.url}>{author.name}</a>
            </h2>
            <p>{author.title}</p>
            <ul>
              {posts
                .filter((post) => post.authors.some(({ id }) => id === author.id))
                .map((post) => (
                  <li key={post.slug}>
                    <a href={`/blog/${post.slug}`}>{post.title}</a>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </>
  );
}
