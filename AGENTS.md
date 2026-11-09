# Blog development

For application contributors and coding agents. Article writers should start with [CONTRIBUTING.md](CONTRIBUTING.md).

## Setup and checks

Use Node.js 24 LTS and the pnpm version pinned in `package.json`. This is a standalone Next.js + MDX application at the repository root; it does not depend on the Grida monorepo.

```sh
pnpm install --frozen-lockfile
pnpm dev                         # http://localhost:3002/blog
pnpm check                       # TypeScript, tests, content and image validation
pnpm build                       # Content validation and static Next.js build
pnpm start --port 3002            # Serve the production build
pnpm verify http://localhost:3002 # Verify served routes, assets, feeds and SEO
```

Run `pnpm check` and `pnpm build` after application or content changes. The served-site check needs a running production build. No runtime credentials or environment files are required.

## Sources

- `content/posts/**/*.mdx` and `content/posts/**/*.md` are discovered automatically; there is no manual article registry. Frontmatter is validated by `lib/content.ts`.
- `content/authors.yml` defines author IDs; `content/tags.yml` supplies optional tag labels and descriptions. Drafts are excluded from all published routes and feeds.
- `public/` holds images, author portraits and brand assets. MDX image URLs include `/blog`, for example `/blog/images/refig/demo.webp`.
- `app/` owns routes; `components/` owns shared presentation. `lib/mdx.tsx`, `lib/feeds.ts`, `lib/metadata.ts` and `lib/site.ts` own rendering, full-body feeds and SEO URLs.
- `migration-manifest.json` records the original Docusaurus content, metadata, legacy routes and asset hashes. `next.config.ts` uses its legacy asset paths for redirects.

Keep ordinary publishing independent of that historical snapshot. `pnpm verify --baseline` audits the original migration; it is optional and can fail after intentional article or asset edits. Update current content normally without changing the baseline to make routine checks pass.

## Routing and deployment

The Next.js base path is `/blog`. Canonical URLs, social metadata, RSS/Atom links and sitemap entries use `https://grida.co/blog`, including preview builds. Preserve existing article slugs and legacy redirects. Public asset references must resolve beneath `/blog`.

The Vercel `blog` project connects to `gridaco/blog`, with Next.js as the framework, Node.js 24, no Root Directory override, and no Output Directory override. Install with `pnpm install --frozen-lockfile` and build with `pnpm build`. Set `ENABLE_EXPERIMENTAL_COREPACK=1` to use the pnpm version pinned in `package.json`. The production branch is `main`; branches and pull requests receive preview deployments through the Git integration.

The main website proxies `/blog` and its descendants to this application. `vercel.json` also accepts stripped paths from the previous website proxy. Preserve both forms when changing routing, including the exact `/blog` index without an extra trailing slash.

The main Grida website owns `grida.co` and its root `robots.txt`; the blog supplies `/blog/robots.txt` and `/blog/sitemap.xml`. Verify a deployment through the public website with:

```sh
pnpm verify https://grida.co
```
