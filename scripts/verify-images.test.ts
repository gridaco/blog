import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { imageSources, verifyImage } from "./verify-images";

function withImages(run: (publicDirectory: string) => void): void {
  const publicDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "grida-blog-images-"));
  fs.mkdirSync(path.join(publicDirectory, "images"));
  fs.writeFileSync(path.join(publicDirectory, "images/example.png"), "fixture image");
  try {
    run(publicDirectory);
  } finally {
    fs.rmSync(publicDirectory, { recursive: true, force: true });
  }
}

test("resolve full, collapsed, and shortcut references using Markdown label semantics", () => {
  const sources = imageSources(`![Full][My   Photo]
![Collapsed][]
![Shortcut]

[my photo]: /blog/images/example.png
[COLLAPSED]: /blog/images/example.png
[shortcut]: /blog/images/example.png
[unused-link]: /outside-blog
`);
  assert.deepEqual(sources, Array(3).fill("/blog/images/example.png"));
  withImages((publicDirectory) => {
    for (const source of sources)
      assert.doesNotThrow(() => verifyImage(source, "article", { publicDirectory }));
  });
});

test("reject reference images outside /blog and missing referenced files", () => {
  withImages((publicDirectory) => {
    for (const [source, expected] of [
      ["/images/example.png", /local image must use \/blog\//],
      ["/blog/images/missing.png", /missing current image/],
    ] as const) {
      const images = imageSources(`![alt][image]\n\n[image]: ${source}`);
      assert.equal(images.length, 1);
      assert.throws(() => verifyImage(images[0], "article", { publicDirectory }), expected);
    }
  });
});

test("check inline and literal MDX images while ignoring code, comments, and expressions", () => {
  const sources = imageSources(`![Inline](/blog/images/example.png "Caption")
<img src="/blog/images/example.png" alt="Flow" />

Text with <img alt="Inline" src='/blog/images/example.png' /> in it.

<img src={"/blog/images/expression.png"} />

<!-- ![comment](/images/not-rendered.png) -->

\`\`\`md
![Code](/images/not-rendered.png)
\`\`\`
`);
  assert.deepEqual(sources, Array(3).fill("/blog/images/example.png"));
  withImages((publicDirectory) => {
    for (const source of sources)
      assert.doesNotThrow(() => verifyImage(source, "article", { publicDirectory }));
    assert.throws(
      () =>
        verifyImage(imageSources('<img src="/images/example.png" />')[0], "article", {
          publicDirectory,
        }),
      /local image must use \/blog\//,
    );
  });
});

test("allow external and data images, and validate canonical local URLs", () => {
  withImages((publicDirectory) => {
    for (const source of [
      "https://cdn.example.com/image.png",
      "//cdn.example.com/image.png",
      "data:image/png;base64,eA==",
    ]) {
      assert.equal(verifyImage(source, "article", { publicDirectory }), undefined);
    }
    assert.doesNotThrow(() =>
      verifyImage("https://grida.co/blog/images/example.png", "article", { publicDirectory }),
    );
    assert.throws(
      () => verifyImage("https://grida.co/images/example.png", "article", { publicDirectory }),
      /local image must use \/blog\//,
    );
  });
});

test("HTTP verification checks local image prefixes without restricting main-site links", () => {
  const options = { origin: "http://127.0.0.1:3100" };
  assert.equal(
    verifyImage("/blog/images/example.png", "/blog/article", options)?.pathname,
    "/blog/images/example.png",
  );
  for (const source of [
    "/images/example.png",
    "http://127.0.0.1:3100/images/example.png",
    "https://grida.co/images/example.png",
  ]) {
    assert.throws(
      () => verifyImage(source, "/blog/article", options),
      /local image must use \/blog\//,
    );
  }
  assert.equal(
    verifyImage("https://cdn.example.com/image.png", "/blog/article", options),
    undefined,
  );
});
