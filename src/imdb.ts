import { JSDOM } from "jsdom";
import type { Session } from "./types";

/**
 * Gets IMDb poster URL for specified movie.
 * @param imdbId IMDb id of movie
 * @param session Session object containing Puppeteer page
 * @returns IMDb poster URL, or null if error during retrieval
 */
export async function getIMDbPoster(
  imdbId: string,
  session: Session
): Promise<string | null> {
  const url = `https://www.imdb.com/title/${imdbId}/`;

  try {
    await session.page.goto(url, { waitUntil: "domcontentloaded" });
    await session.page.waitForSelector("#__NEXT_DATA__");
    const html = await session.page.content();
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
