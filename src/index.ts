import { Client } from "@notionhq/client";
import dotenv from "dotenv";
import { getMovieInfo } from "./tmdb";
import { getNotionMovies, updateNotionMovie } from "./notion";

dotenv.config();

async function main() {
  const notion = new Client({ auth: process.env.NOTION_KEY });
  const results = await getNotionMovies(notion);
  if (results === null) {
    return;
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
}

main();
