import { getTags } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
export const metadata = pageMetadata(
  "Topics",
  "Explore Grida articles by topic, from typography and rendering to canvas engineering.",
  "/tags",
);
export default function Tags() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">Explore the blog</p>
        <h1>Topics</h1>
      </header>
      <ul className="topic-list">
        {getTags().map((tag) => (
          <li key={tag.slug}>
            <a href={`/blog/tags/${tag.slug}`}>
              <h2>
                {tag.label} <small>({tag.count})</small>
              </h2>
              {tag.description && <p>{tag.description}</p>}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
