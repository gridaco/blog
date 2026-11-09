import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeHighlight from "rehype-highlight";
import { isValidElement, type ReactNode, type ComponentPropsWithoutRef } from "react";
import { VimeoEmbed } from "@/components/vimeo-embed";
import { Mermaid } from "@/components/mermaid";
import type { Post } from "./content";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

interface TreeNode {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: TreeNode[];
}

function text(node: TreeNode): string {
  return node.value ?? node.children?.map(text).join("") ?? "";
}

export async function renderPost(
  post: Post,
  { interactive = true }: { interactive?: boolean } = {},
): Promise<{ content: ReactNode; headings: Heading[] }> {
  const headings: Heading[] = [];
  function collectHeadings() {
    return (tree: TreeNode) => {
      function visit(node: TreeNode) {
        if (node.tagName && /^h[1-6]$/.test(node.tagName) && node.properties?.id) {
          headings.push({
            id: String(node.properties.id),
            text: text(node),
            level: Number(node.tagName[1]),
          });
        }
        node.children?.forEach(visit);
      }
      visit(tree);
    };
  }
  const { default: Content } = await evaluate(post.body.replace(/<!--[\s\S]*?-->/g, ""), {
    ...runtime,
    development: false,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeSlug,
      collectHeadings,
      [rehypeHighlight, { detect: false, ignoreMissing: true }],
    ],
  });
  return {
    content: (
      <Content
        components={{
          VimeoEmbed,
          pre: ({ children, ...props }: ComponentPropsWithoutRef<"pre">) => {
            if (
              interactive &&
              isValidElement<{ className?: string; children?: ReactNode }>(children) &&
              children.props.className?.includes("language-mermaid")
            ) {
              return <Mermaid chart={String(children.props.children).trim()} />;
            }
            return <pre {...props}>{children}</pre>;
          },
          img: ({ alt = "", ...props }: ComponentPropsWithoutRef<"img">) => (
            <img alt={alt} loading="lazy" decoding="async" {...props} />
          ),
        }}
      />
    ),
    headings,
  };
}
