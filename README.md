# Grida Blog

The source for [grida.co/blog](https://grida.co/blog). Articles and images live in this dedicated repository so writers can edit, review, and publish independently of the Grida application.

**Writing a post?** Start with the [contributor guide](CONTRIBUTING.md). You can use GitHub in your browser; no development setup is required.

## Run locally

Use Node.js 24 LTS and npm. The application lives at the repository root.

```sh
npm ci
npm run dev
```

Open [localhost:3002/blog](http://localhost:3002/blog).

```sh
# Validate content, image paths, TypeScript, and tests
npm run check

# Build the standalone Next.js application
npm run build

# Serve the production build locally
npm run start -- --port 3002

# Check the served pages, assets, feeds, and SEO metadata
npm run verify -- http://localhost:3002
```

Articles are discovered automatically from `content/posts/**/*.mdx` and `content/posts/**/*.md`. YAML frontmatter is validated before publication. Tags, author pages, feeds, the archive, and sitemap follow the published content. No article registration or Grida monorepo checkout is needed.

## Deployment

The Vercel blog project connects to `gridaco/blog`, uses **Next.js**, has no Root Directory override, and builds with `npm run build`. Install with `npm ci`; use Node.js 24. The production branch is `main`. Branches and pull requests receive preview deployments when the Git integration is connected.

The application uses `/blog` as its Next.js base path. Canonical URLs, social metadata, feeds, and sitemap entries always use `https://grida.co/blog`, including in previews. The main Grida website proxies `/blog` and its descendants to this application. Compatibility rewrites also accept the stripped paths sent by the previous website proxy.

The blog does not own the `grida.co` domain or the main website's `robots.txt`. Its robots.txt should advertise the blog sitemap at `https://grida.co/blog/sitemap.xml`.

```sh
# Verify production through the main website's proxy
npm run verify -- https://grida.co

# Optional audit of the original migration snapshot
npm run verify -- --baseline
```

The baseline audit checks the original migration against `migration-manifest.json`. It is separate from routine checks so writers can continue editing articles and replacing assets.
