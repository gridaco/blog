import { feed } from "@/lib/feeds";

export const dynamic = "force-static";

export async function GET() {
  return new Response(await feed("rss"), {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
