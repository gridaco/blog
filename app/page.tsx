import PostList from "@/components/post-list";
import { getPosts } from "@/lib/content";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/lib/site";

export const metadata = pageMetadata("Grida Blog", site.description);

export default function Home() {
  return (
    <>
      <header className="page-header">
        <p className="eyebrow">From the Grida team</p>
        <h1>Ideas taking shape.</h1>
        <p>Notes on design, engineering, and building an open canvas for everyone.</p>
      </header>
      <PostList posts={getPosts()} />
    </>
  );
}
