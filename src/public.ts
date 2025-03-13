import { Client } from "@notionhq/client";
import {
  getNotionDatabaseId,
  getNotionMovies,
  updateNotionMovie,
} from "./notion";
import { getMovieInfo } from "./tmdb";

export async function runPublicIntegration(
  pageId: string,
  accessToken: string
): Promise<boolean> {
  // Run public integration. Return false if Notion error.
  const notion = new Client({ auth: accessToken });

  const databaseId = await getNotionDatabaseId(notion, pageId);
  if (databaseId === null) {
    return false;
  }

  const results = await getNotionMovies(notion, databaseId);
  if (results === null) {
    return false;
  }

  console.log(`Updating ${results.length} movies...\n`);

  for (const res of results) {
    console.log(res.id + "\n" + res.title + "\n" + res.year);
    const m = await getMovieInfo(res.title, res.year);
    if (m === null) {
      console.log("WARNING: TMDB search yielded no matching results.\n");
      continue;
    }
    await updateNotionMovie(notion, res.id, m);
    console.log(m.runtime);
    console.log(m.posterLink + "\n");
  }

  console.log("Done");
  return true;
}
