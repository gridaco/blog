import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getAllPosts, getPosts } from "../lib/content";
import { imageSources, verifyImage } from "./verify-images";

type ManifestPost = {
  slug: string;
  path: string;
  title: string;
  description: string;
  date: string;
  authors: string[];
  tags: string[];
  hide_table_of_contents: boolean;
  bodySha256: string;
  headingIds: string[];
};
type ManifestAsset = {
  file: string;
  path: string;
  legacyPath?: string;
  sha256: string;
  bytes: number;
};
type Manifest = {
  basePath: string;
  canonicalOrigin: string;
  posts: ManifestPost[];
  authors: Record<string, { name: string; title: string; url: string; image: string }>;
  legacyHtmlRoutes: string[];
  feeds: string[];
  assets: ManifestAsset[];
};

const arguments_ = process.argv.slice(2);
assert(
  arguments_.every((value) => value === "--baseline" || !value.startsWith("--")),
  "Unknown verification option",
);
const baseline = arguments_.includes("--baseline");
const origins = arguments_.filter((value) => value !== "--baseline");
assert(origins.length <= 1, "Usage: npm run verify -- [--baseline] [origin]");
const root = resolve(import.meta.dirname, "..");
const manifest = JSON.parse(
  readFileSync(resolve(root, "migration-manifest.json"), "utf8"),
) as Manifest;
const sha256 = (value: string | Uint8Array) => createHash("sha256").update(value).digest("hex");

// Only the mechanical Docusaurus-to-MDX changes are ignored. Changes to article
// prose, code examples, tables, and metadata still fail this migration contract.
function normalizeBody(body: string, slug: string): string {
  return body
    .replace(/^import \{ VimeoEmbed \} from ["']@site\/src\/components\/VimeoEmbed["'];?\s*$/gm, "")
    .replaceAll(`/blog/images/${slug}/`, "./images/")
    .replace(/<!--\s*truncate\s*-->/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/\n[ \t]+\n/g, "\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function verifyFiles(): void {
  const allPosts = getAllPosts();
  const publishedPosts = getPosts();
  assert.equal(new Set(allPosts.map((post) => post.slug)).size, allPosts.length);
  assert(
    publishedPosts.every((post) => !post.draft),
    "Drafts leaked into published posts",
  );

  // Current articles may evolve after the migration. The historical snapshot is
  // audited only when explicitly requested, so ordinary publishing stays simple.
  for (const post of publishedPosts) {
    const images = [
      post.image,
      post.socialImage,
      ...post.authors.map((author) => author.image),
      ...imageSources(post.body),
    ];
    for (const image of images) {
      verifyImage(image, post.slug, { publicDirectory: resolve(root, "public") });
    }
  }

  if (baseline)
    for (const original of manifest.posts) {
      const post = publishedPosts.find((entry) => entry.slug === original.slug);
      assert(post, `Missing published article: ${original.slug}`);
      assert.equal(post.title, original.title, `${post.slug}: title changed`);
      assert.equal(post.description, original.description, `${post.slug}: description changed`);
      assert.equal(
        new Date(post.date).toISOString().slice(0, 10),
        original.date,
        `${post.slug}: date changed`,
      );
      assert.deepEqual(post.tags, original.tags, `${post.slug}: tags changed`);
      assert.equal(
        post.hiddenTOC,
        original.hide_table_of_contents,
        `${post.slug}: TOC setting changed`,
      );
      assert.deepEqual(
        post.authors.map((author) => ({ name: author.name, title: author.title, url: author.url })),
        original.authors.map((id) => {
          const { name, title, url } = manifest.authors[id];
          return { name, title, url };
        }),
        `${post.slug}: author metadata changed`,
      );
      assert.equal(
        sha256(normalizeBody(post.body, post.slug)),
        original.bodySha256,
        `${post.slug}: article body changed beyond the migration transformations`,
      );
    }

  if (baseline)
    for (const asset of manifest.assets) {
      const bytes = readFileSync(resolve(root, asset.file));
      assert.equal(bytes.byteLength, asset.bytes, `${asset.file}: size changed`);
      assert.equal(sha256(bytes), asset.sha256, `${asset.file}: contents changed`);
    }
  console.log(
    baseline
      ? `Verified the original metadata and bodies of ${manifest.posts.length} articles and ${manifest.assets.length} asset hashes.`
      : `Verified ${publishedPosts.length} current articles, metadata, authors, and referenced local images.`,
  );
}

function decodeHTML(value: string): string {
  return value
    .replace(/&#(x[\da-f]+|\d+);?/gi, (_, code: string) =>
      String.fromCodePoint(
        code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : parseInt(code, 10),
      ),
    )
    .replace(
      /&(amp|quot|apos|lt|gt);/g,
      (_, name: string) => ({ amp: "&", quot: '"', apos: "'", lt: "<", gt: ">" })[name]!,
    );
}

function attributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map((match) => [
      match[1].toLowerCase(),
      decodeHTML(match[2] ?? match[3]),
    ]),
  );
}

function elements(html: string, tag: string): Record<string, string>[] {
  return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, "gi"))].map((match) =>
    attributes(match[0]),
  );
}

function canonicalPath(path: string): string {
  return `${manifest.canonicalOrigin}${path === manifest.basePath ? path : path.replace(/\/$/, "")}`;
}

async function verifyHTTP(input: string): Promise<void> {
  const origin = new URL(input).origin;
  const cache = new Map<string, Promise<{ response: Response; bytes: Uint8Array; text: string }>>();
  const fetchPath = (path: string) => {
    const url = new URL(path, origin).href;
    let pending = cache.get(url);
    if (!pending) {
      pending = (async () => {
        const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        const bytes = new Uint8Array(await response.arrayBuffer());
        return { response, bytes, text: new TextDecoder().decode(bytes) };
      })();
      cache.set(url, pending);
    }
    return pending;
  };
  const localBlogURL = (value: string, currentPath: string) => {
    const url = new URL(value, new URL(currentPath, origin));
    if (
      (url.origin === origin || url.origin === manifest.canonicalOrigin) &&
      (url.pathname === manifest.basePath || url.pathname.startsWith(`${manifest.basePath}/`))
    )
      return url;
    return undefined;
  };

  const resources = new Set<string>();
  const currentPosts = getPosts();
  const articleByPath = new Map(currentPosts.map((post) => [`/blog/${post.slug}`, post]));
  const originalBySlug = new Map(manifest.posts.map((post) => [post.slug, post]));
  const routes = new Set([...manifest.legacyHtmlRoutes, ...articleByPath.keys()]);
  for (const path of routes) {
    const { response, text: html } = await fetchPath(path);
    assert.equal(response.status, 200, `${path}: HTTP ${response.status}`);
    assert.match(
      response.headers.get("content-type") ?? "",
      /text\/html/,
      `${path}: expected HTML`,
    );
    const finalPath = new URL(response.url).pathname.replace(/\/$/, "");
    const head = html.split(/<\/head>/i)[0];
    const canonical = elements(head, "link").find((link) => link.rel === "canonical")?.href;
    if (path !== "/blog/markdown-page") {
      assert.equal(
        canonical?.replace(/\/$/, ""),
        canonicalPath(finalPath),
        `${path}: incorrect canonical`,
      );
    }
    const metadata = elements(head, "meta");
    assert(
      metadata.some((meta) => meta.name === "description" && meta.content),
      `${path}: missing description`,
    );
    assert.match(head, /<title>[^<]+<\/title>/i, `${path}: missing page title`);

    const post = articleByPath.get(finalPath);
    if (post) {
      assert(decodeHTML(head).includes(post.title), `${path}: article title missing from metadata`);
      assert.equal(
        metadata.find((meta) => meta.name === "description")?.content,
        post.description,
        `${path}: article description differs`,
      );
      assert.equal(
        metadata.find((meta) => meta.property === "og:type")?.content,
        "article",
        `${path}: missing article OG type`,
      );
      assert.equal(
        metadata.find((meta) => meta.property === "og:url")?.content?.replace(/\/$/, ""),
        canonicalPath(finalPath),
        `${path}: incorrect OG URL`,
      );
      const ogImage = metadata.find((meta) => meta.property === "og:image")?.content;
      assert(ogImage, `${path}: missing OG image`);
      const expectedSocialImage = new URL(post.socialImage, manifest.canonicalOrigin).href;
      assert.equal(ogImage, expectedSocialImage, `${path}: OG image differs from current metadata`);
      const imageURL = localBlogURL(ogImage, path);
      if (imageURL) resources.add(imageURL.pathname + imageURL.search);
      assert.match(html, /application\/ld\+json/, `${path}: missing structured data`);
      const ids = new Set(
        [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => decodeHTML(match[1])),
      );
      if (baseline)
        for (const id of originalBySlug.get(post.slug)?.headingIds ?? []) {
          assert(ids.has(id), `${path}: lost existing heading anchor #${id}`);
        }
      if (baseline && post.slug === "refig") {
        const vimeo = elements(html, "iframe").find((frame) =>
          frame.src?.includes("player.vimeo.com/video/1165652748"),
        );
        assert(vimeo, "refig: Vimeo embed was lost");
        for (const option of ["autoplay", "muted", "loop"]) {
          assert.equal(
            new URL(vimeo.src).searchParams.get(option),
            "1",
            `refig: Vimeo ${option} changed`,
          );
        }
      }
    }

    for (const link of elements(html, "a")) {
      if (!link.href || /^(mailto:|tel:|javascript:)/i.test(link.href)) continue;
      const url = localBlogURL(link.href, path);
      if (!url) continue;
      const targetPath = url.pathname + url.search;
      const { response: target, text } = await fetchPath(targetPath);
      assert.equal(target.status, 200, `${path}: broken internal link ${link.href}`);
      if (url.hash && target.headers.get("content-type")?.includes("text/html")) {
        const id = decodeURIComponent(url.hash.slice(1));
        assert(
          [...text.matchAll(/\bid="([^"]+)"/g)].some((match) => decodeHTML(match[1]) === id),
          `${path}: broken anchor ${link.href}`,
        );
      }
    }
    for (const [tag, attribute] of [
      ["img", "src"],
      ["script", "src"],
      ["link", "href"],
    ] as const) {
      for (const element of elements(html, tag)) {
        const value = element[attribute];
        if (
          !value ||
          (tag === "link" &&
            !["stylesheet", "icon", "preload", "modulepreload"].includes(element.rel))
        )
          continue;
        if (tag === "script" && value.startsWith("/"))
          assert(value.startsWith("/blog/"), `${path}: script asset escaped basePath`);
        if (tag === "img") verifyImage(value, path, { origin });
        const url = localBlogURL(value, path);
        if (url) resources.add(url.pathname + url.search);
      }
    }
  }

  for (const asset of manifest.assets) {
    const paths = [
      ...(baseline ? [asset.path] : []),
      ...(asset.legacyPath ? [asset.legacyPath] : []),
    ];
    for (const path of paths) {
      const { response, bytes } = await fetchPath(path);
      assert.equal(response.status, 200, `${path}: missing asset or legacy redirect`);
      if (baseline)
        assert.equal(sha256(bytes), asset.sha256, `${path}: response differs from original asset`);
      if (/\.(png|gif|webp|svg|ico)$/.test(path))
        assert.match(
          response.headers.get("content-type") ?? "",
          /^image\//,
          `${path}: incorrect image content type`,
        );
    }
  }
  for (const resource of resources) {
    const { response } = await fetchPath(resource);
    assert.equal(response.status, 200, `${resource}: missing rendered CSS, JS, or image asset`);
    assert(
      !response.headers.get("content-type")?.includes("text/html"),
      `${resource}: asset unexpectedly returned HTML`,
    );
  }

  const { response: sitemapResponse, text: sitemap } = await fetchPath("/blog/sitemap.xml");
  assert.equal(sitemapResponse.status, 200, "Missing sitemap");
  assert.match(sitemap, /<urlset\b/, "Invalid sitemap response");
  for (const post of getPosts())
    assert(
      sitemap.includes(canonicalPath(`/blog/${post.slug}`)),
      `${post.slug}: missing from sitemap`,
    );
  for (const location of sitemap.matchAll(/<loc>(.*?)<\/loc>/g))
    assert(
      decodeHTML(location[1]).startsWith(`${manifest.canonicalOrigin}/blog`),
      "Sitemap URL escaped canonical basePath",
    );

  for (const feedPath of manifest.feeds) {
    const { response, text } = await fetchPath(feedPath);
    assert.equal(response.status, 200, `${feedPath}: missing feed`);
    assert.match(text, /<(rss|feed)\b/, `${feedPath}: invalid feed response`);
    for (const post of currentPosts) {
      assert(
        text.includes(canonicalPath(`/blog/${post.slug}`)),
        `${feedPath}: missing current article ${post.slug}`,
      );
      assert(
        decodeHTML(text).includes(post.title),
        `${feedPath}: missing current title ${post.slug}`,
      );
    }
    const contentPattern = feedPath.endsWith("rss.xml")
      ? /<content:encoded>([\s\S]*?)<\/content:encoded>/g
      : /<content\b[^>]*>([\s\S]*?)<\/content>/g;
    const fullArticles = [...text.matchAll(contentPattern)];
    assert.equal(
      fullArticles.length,
      currentPosts.length,
      `${feedPath}: full article content is missing`,
    );
    assert(
      fullArticles.every((entry) => entry[1].trim()),
      `${feedPath}: empty article content`,
    );
  }
  const { response: missing } = await fetchPath("/blog/__migration-missing-article__");
  assert.equal(missing.status, 404, "Unknown article should return 404");
  console.log(
    `Verified ${routes.size} routes, article metadata and anchors, feeds, sitemap, images, and ${resources.size} rendered resources at ${origin}.`,
  );
}

verifyFiles();
if (origins[0]) await verifyHTTP(origins[0]);
