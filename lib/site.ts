export const site = {
  name: "Grida Blog",
  description:
    "Ideas, engineering, and updates from the people building Grida, the open source design tool.",
  origin: "https://grida.co",
  basePath: "/blog",
  image: "/blog/img/social-card.png",
} as const;

export function absoluteUrl(path = ""): string {
  return new URL(`${site.basePath}${path}`, site.origin).href;
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}
