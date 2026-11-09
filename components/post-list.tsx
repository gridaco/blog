import type { Post } from "@/lib/content";

const dateFormat = new Intl.DateTimeFormat("en", {
  month: "long",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function PostList({ posts, heading }: { posts: Post[]; heading?: string }) {
  return (
    <section className="posts-section" aria-label={heading ?? "Articles"}>
      {heading && <h2 className="posts-heading">{heading}</h2>}
      {posts.length === 0 ? (
        <p className="notice">There are no published articles here yet.</p>
      ) : (
        <div className="post-list">
          {posts.map((post) => (
            <article className="post-card" key={post.slug}>
              <div className="post-card-content">
                <div className="post-meta">
                  <time dateTime={post.date}>{dateFormat.format(new Date(post.date))}</time>
                  <span aria-hidden="true">·</span>
                  <span>{post.readingTime} min read</span>
                </div>
                <h2 className="post-card-title">
                  <a href={`/blog/${post.slug}`}>{post.title}</a>
                </h2>
                <p className="post-card-description">{post.description}</p>
                <div className="post-card-bottom">
                  <p className="post-card-authors">
                    {post.authors.map((author) => author.name).join(", ")}
                  </p>
                  <a
                    className="read-article"
                    href={`/blog/${post.slug}`}
                    aria-label={`Read ${post.title}`}
                  >
                    Read article <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
              {post.image && (
                <a
                  className="post-card-image"
                  href={`/blog/${post.slug}`}
                  aria-hidden="true"
                  tabIndex={-1}
                >
                  <img src={post.image} alt="" loading="lazy" width="640" height="400" />
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default PostList;
