import { JSDOM } from "jsdom";

export async function getIMDbPoster(imdbId: string): Promise<string | null> {
  // Get IMDb poster link.
  const url = `https://www.imdb.com/title/${imdbId}`;

  try {
    const r = await fetch(url);
    const html = await r.text();
    const result = new JSDOM(html).window.document.querySelector(
      "script#__NEXT_DATA__"
    )?.textContent;
    if (!result) {
      return null;
    }
    const json = JSON.parse(result);

    // Get full size poster link
    const posterLinkFull = json.props.pageProps.aboveTheFoldData.primaryImage
      .url as string;

    // Get width-400 poster link
    const posterLink =
      posterLinkFull.slice(0, -4) +
      "QL100_UX400,CR1,1,400" +
      posterLinkFull.slice(-4);
    return posterLink;
  } catch (e) {
    console.error(e);
  }
  return null;
}
