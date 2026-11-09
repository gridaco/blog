import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getAllPosts, getPosts } from "./content";

function fixture(run: (directory: string) => void) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "grida-blog-content-"));
  fs.mkdirSync(path.join(directory, "posts"));
  fs.writeFileSync(path.join(directory, "authors.yml"), "writer:\n  name: A Writer\n");
  try {
    run(directory);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

const article = (fields = "") =>
  `---\ntitle: A new article\ndescription: A description\ndate: 2026-11-09\nauthors: writer\n${fields}---\n\nHello, world.\n`;

test("new MDX files appear automatically; drafts stay out of publication", () => {
  fixture((directory) => {
    const posts = path.join(directory, "posts");
    assert.deepEqual(getPosts(directory), []);
    fs.writeFileSync(path.join(posts, "new-article.mdx"), article());
    assert.deepEqual(
      getPosts(directory).map((post) => post.slug),
      ["new-article"],
    );
    fs.mkdirSync(path.join(posts, "drafts"));
    fs.writeFileSync(path.join(posts, "drafts", "unfinished.mdx"), article("draft: true\n"));
    assert.equal(getAllPosts(directory).length, 2);
    assert.deepEqual(
      getPosts(directory).map((post) => post.slug),
      ["new-article"],
    );
    fs.writeFileSync(path.join(posts, "new-article.mdx"), article("slug: permanent-url\n"));
    assert.equal(getPosts(directory)[0].slug, "permanent-url");
  });
});

test("reject invalid metadata, duplicate routes, and unknown authors before publication", () => {
  fixture((directory) => {
    const file = path.join(directory, "posts", "article.mdx");
    for (const [body, expected] of [
      [
        article().replace("date: 2026-11-09", "date: 2026-02-30"),
        /date must be a real calendar date/,
      ],
      [article().replace("authors: writer", "authors: missing"), /unknown author/],
      [article("slug: archive\n"), /reserved slug/],
      [article("draft: yes\n"), /expected true or false/],
      [article().replace("title: A new article", "title: ''"), /required text is missing/],
    ] as const) {
      fs.writeFileSync(file, body);
      assert.throws(() => getPosts(directory), expected);
    }
    fs.writeFileSync(file, article());
    fs.writeFileSync(path.join(directory, "posts", "another.mdx"), article("slug: article\n"));
    assert.throws(() => getPosts(directory), /duplicate slug/);
  });
});
