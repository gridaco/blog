import assert from "node:assert/strict";
import { existsSync, statSync } from "node:fs";
import { resolve, sep } from "node:path";
import { createProcessor } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import { site } from "../lib/site";

interface SyntaxNode {
  type: string;
  children?: SyntaxNode[];
  identifier?: string;
  url?: string;
  name?: string | null;
  attributes?: { type: string; name?: string; value?: unknown }[];
}

const parser = createProcessor({ remarkPlugins: [remarkGfm] });

/** Read rendered image syntax, including references resolved by the MDX parser. */
export function imageSources(body: string): string[] {
  // Match the renderer's support for the original blog's HTML comments.
  const tree = parser.parse(body.replace(/<!--[\s\S]*?-->/g, ""));
  const definitions = new Map<string, string>();
  const images: string[] = [];
  function visit(node: SyntaxNode, run: (node: SyntaxNode) => void): void {
    run(node);
    node.children?.forEach((child) => visit(child, run));
  }
  visit(tree, (node) => {
    if (
      node.type === "definition" &&
      node.identifier &&
      node.url !== undefined &&
      !definitions.has(node.identifier)
    ) {
      definitions.set(node.identifier, node.url);
    }
  });
  visit(tree, (node) => {
    if (node.type === "image" && node.url !== undefined) images.push(node.url);
    if (node.type === "imageReference" && node.identifier && definitions.has(node.identifier)) {
      images.push(definitions.get(node.identifier)!);
    }
    if (
      (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
      node.name === "img"
    ) {
      const source = node.attributes?.find(
        (attribute) => attribute.type === "mdxJsxAttribute" && attribute.name === "src",
      )?.value;
      // Expressions are compiled by Next.js; the HTTP verifier checks their output.
      if (typeof source === "string") images.push(source);
    }
  });
  return images;
}

/** Validate local URLs in source and HTML; optionally require their public file. */
export function verifyImage(
  image: string | undefined,
  context: string,
  options: { origin?: string; publicDirectory?: string } = {},
): URL | undefined {
  if (image === undefined) return undefined;
  assert(image.trim(), `${context}: image URL is empty`);
  const origin = options.origin ?? site.origin;
  const url = new URL(image, origin);
  if (url.protocol === "data:") return undefined;
  assert(
    url.protocol === "http:" || url.protocol === "https:",
    `${context}: unsupported image URL ${image}`,
  );
  if (url.origin !== origin && url.origin !== site.origin) return undefined;
  const prefix = `${site.basePath}/`;
  const absolute = /^(?:https?:)?\/\//i.test(image);
  assert(
    url.pathname.startsWith(prefix) && (absolute || image.startsWith(prefix)),
    `${context}: local image must use ${prefix}: ${image}`,
  );
  if (options.publicDirectory) {
    const publicDirectory = resolve(options.publicDirectory);
    const file = resolve(publicDirectory, decodeURIComponent(url.pathname).slice(prefix.length));
    assert(
      file.startsWith(`${publicDirectory}${sep}`) && existsSync(file) && statSync(file).isFile(),
      `${context}: missing current image ${image}`,
    );
  }
  return url;
}
