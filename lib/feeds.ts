import { renderToStaticMarkup } from "react-dom/server.edge";
import { getPosts, getTags } from "./content";
import { renderPost } from "./mdx";
import { absoluteUrl, site } from "./site";

function xml(value: string): string {
  return value.replace(
    /[<>&"']/g,
    (character) =>
      ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!,
  );
}

function cdata(value: string): string {
  return `<![CDATA[${value.replaceAll("]]>", "]]]]><![CDATA[>")}]]>`;
}

/** Feed readers need absolute URLs, including links to headings within a post. */
function absoluteLinks(html: string, articleUrl: string): string {
  return html.replace(
    /\b(href|src|poster)="([^"]*)"/g,
    (attribute, name: string, value: string) => {
      if (/^[a-z][a-z\d+.-]*:/i.test(value)) return attribute;
      // React escapes attribute values before they reach this serializer.
      const decoded = value.replace(
        /&(amp|quot|apos|lt|gt|#x27|#x[0-9a-f]+|#\d+);/gi,
        (entity, code: string) => {
          const named: Record<string, string> = {
            amp: "&",
            quot: '"',
            apos: "'",
            lt: "<",
            gt: ">",
          };
          if (named[code]) return named[code];
          return code.startsWith("#x")
            ? String.fromCodePoint(parseInt(code.slice(2), 16))
            : code.startsWith("#")
              ? String.fromCodePoint(Number(code.slice(1)))
              : entity;
        },
      );
      return `${name}="${xml(new URL(decoded, articleUrl).href)}"`;
    },
  );
}

export async function feed(type: "rss" | "atom"): Promise<string> {
  const labels = new Map(getTags().map((tag) => [tag.slug, tag.label]));
  const posts = await Promise.all(
    getPosts().map(async (post) => {
      const url = absoluteUrl(`/${post.slug}`);
      const { content } = await renderPost(post, { interactive: false });
      return { ...post, url, html: absoluteLinks(renderToStaticMarkup(content), url) };
    }),
  );
  const title = xml(site.name);
  const description = xml(site.description);
  const home = absoluteUrl();
  const updated = posts[0] ? new Date(posts[0].date) : new Date(0);
  const stylesheet = `<?xml-stylesheet type="text/xsl" href="${absoluteUrl(`/${type}.xsl`)}"?>`;

  if (type === "rss") {
    return `<?xml version="1.0" encoding="UTF-8"?>${stylesheet}
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:content="http://purl.org/rss/1.0/modules/content/">
<channel><title>${title}</title><link>${home}</link><description>${description}</description><language>en</language><lastBuildDate>${updated.toUTCString()}</lastBuildDate><atom:link href="${absoluteUrl("/rss.xml")}" rel="self" type="application/rss+xml"/>
${posts.map((post) => `<item><title>${xml(post.title)}</title><link>${post.url}</link><guid isPermaLink="true">${post.url}</guid><pubDate>${new Date(post.date).toUTCString()}</pubDate><description>${xml(post.description)}</description><content:encoded>${cdata(post.html)}</content:encoded>${post.authors.map((author) => `<dc:creator>${xml(author.name)}</dc:creator>`).join("")}${post.tags.map((tag) => `<category>${xml(labels.get(tag) ?? tag)}</category>`).join("")}</item>`).join("\n")}
</channel></rss>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>${stylesheet}
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="en"><title>${title}</title><subtitle>${description}</subtitle><id>${home}</id><link href="${home}"/><link href="${absoluteUrl("/atom.xml")}" rel="self" type="application/atom+xml"/><updated>${updated.toISOString()}</updated>
${posts.map((post) => `<entry><title>${xml(post.title)}</title><id>${post.url}</id><link href="${post.url}"/><published>${new Date(post.date).toISOString()}</published><updated>${new Date(post.date).toISOString()}</updated>${post.authors.map((author) => `<author><name>${xml(author.name)}</name>${author.url ? `<uri>${xml(author.url)}</uri>` : ""}</author>`).join("")}<summary>${xml(post.description)}</summary><content type="html">${cdata(post.html)}</content>${post.tags.map((tag) => `<category term="${xml(labels.get(tag) ?? tag)}" label="${xml(labels.get(tag) ?? tag)}"/>`).join("")}</entry>`).join("\n")}
</feed>`;
}
