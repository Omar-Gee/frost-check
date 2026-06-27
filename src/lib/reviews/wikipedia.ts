const WIKIPEDIA_API = "https://nl.wikipedia.org/w/api.php";

export interface WikipediaExtract {
  title: string;
  extract: string;
  url: string;
}

export async function fetchWikipediaExtract(
  slug: string
): Promise<WikipediaExtract | null> {
  if (!slug.trim()) return null;

  const params = new URLSearchParams({
    action: "query",
    prop: "extracts",
    exintro: "1",
    explaintext: "1",
    format: "json",
    titles: slug,
    origin: "*",
  });

  const response = await fetch(`${WIKIPEDIA_API}?${params}`, {
    next: { revalidate: 604800 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as {
    query?: {
      pages?: Record<
        string,
        { title?: string; extract?: string; missing?: string }
      >;
    };
  };

  const pages = data.query?.pages;
  if (!pages) return null;

  const page = Object.values(pages)[0];
  if (!page || page.missing || !page.extract) return null;

  const title = page.title ?? slug;
  return {
    title,
    extract: page.extract,
    url: `https://nl.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
  };
}
