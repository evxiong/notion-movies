import { getIMDbPoster } from "./imdb";
import type { MovieInfo, TMDBMovieResponse, TMDBSearchResponse } from "./types";

export async function getMovieInfo(
  title: string,
  year: number
): Promise<MovieInfo | null> {
  // Get TMDB runtime and poster.
  const searchUrl = `https://api.themoviedb.org/3/search/movie?query=${title}&include_adult=false&language=en-US&primary_release_year=${year}&page=1&api_key=${process.env.TMDB_API_KEY}`;

  try {
    // Search for movie by title and year
    const r1 = await fetch(searchUrl);
    const searchResponse: TMDBSearchResponse = await r1.json();
    if (searchResponse.total_results === 0) {
      return null;
    }

    // Get movie details
    const movieId = searchResponse.results[0].id;
    const movieUrl = `https://api.themoviedb.org/3/movie/${movieId}?language=en-US&api_key=${process.env.TMDB_API_KEY}`;
    const r2 = await fetch(movieUrl);
    const movieResponse: TMDBMovieResponse = await r2.json();
    const mins = movieResponse.runtime;
    const m = mins % 60;
    const h = (mins / 60) >> 0;

    // Get IMDb poster link
    const imdbPosterLink = await getIMDbPoster(movieResponse.imdb_id);

    // Return MovieInfo object
    const movie: MovieInfo = {
      runtime: h + "h " + m + "m",
      posterLink:
        imdbPosterLink ??
        "https://image.tmdb.org/t/p/w400" + movieResponse.poster_path,
    };
    return movie;
  } catch (e) {
    console.error(e);
  }
  return null;
}
