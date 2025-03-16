# 🎬 notion-movies

A simple movie tracker integration for Notion. Retrieves IMDb posters and movie
runtimes with a single click.

![Demo](https://github.com/user-attachments/assets/831c9353-bc0e-484f-b747-d585d3d719f1)

> [!NOTE]
>
> **The public version of this integration (shown above) uses webhook actions
> and therefore requires a paid or education Notion plan**. If you are on a free
> plan, you can still use the private/internal version of this integration,
> which runs locally and requires Node.js 18+. See
> [Getting started](#getting-started) for details.

The integration is designed to work with
[this Notion movie tracker template](https://evanxiong.notion.site/Movies-1b6f43a6ce128098b9a2e92adaf4cd6b).

To get started, follow [these instructions](#getting-started).

## What this integration does

Adds runtime and IMDb poster to each movie in the database. Movie posters are
used in card previews like so:

![image](https://github.com/user-attachments/assets/4e33c3ae-695b-4edf-b014-65a51dc1900a)

The accompanying movie tracker template is designed for rating movies, ranking
them, and maintaining a watchlist. It is not meant to contain every single piece
of metadata associated with each movie; that's what IMDb and TMDB are for.

## Implementation choices

- Fetched movie posters are from **IMDb**, not TMDB. TMDB posters are
  photoshopped to remove credits and dates (and are often based on alternate
  posters), while IMDb posters usually feature the most iconic version, credits
  and all. If no IMDb poster is available, then the TMDB poster is used as a
  fallback.
- Fetched movie posters have a **fixed width of 400px**. Using larger external
  images only slows Notion down, with little added benefit.
- Fetched movie posters are added to the movie's **page content** (not the icon
  or cover image, which get severely cropped), so that when you open a page, you
  can immediately see the full, uncropped poster. This also allows Notion to
  show posters in card previews.

<!-- - This integration **does not fetch TMDB backdrops** or modify Notion cover
  images. Using backdrops or posters as page covers doesn't work very well,
  since they get severely cropped. And again, increasing the number of images
  only slows Notion down.
- The integration **does not fetch genres**, which are subjective. You might
  classify _The Dark Knight_ as an action film, but I might classify it as
  superhero (you might not even believe superhero is its own genre...see what I
  mean?). So, the determination of genres is left up to you in Notion, for your
  own categorization purposes.
- In general, the integration only provides essential data relevant to rating,
  ranking, sorting, and visualizing movie pages within Notion. If you were
  interested in anything more specific, you would probably be reading the
  movie's Wikipedia or IMDb page anyway. -->

## Template database

The
[template database](https://evanxiong.notion.site/Movies-1b6f43a6ce128098b9a2e92adaf4cd6b)
works with this integration out of the box, and will be duplicated during the
setup process. The public integration will not work properly if you try to
connect it to an existing Notion database. The integration uses these four
columns in the database:

- `Title` (type title) - movie title in English
- `Year` (type text) - release year of movie
- `Runtime` (type string) - filled in by integration, ex. "2h 4m"
- `Info Added` (type checkbox) - used by integration to keep track of whether
  movie data has already been fetched

The template also includes the following columns for your personal use. These
columns do not have any impact on the integration (feel free to
add/modify/delete):

- `Status` (type status) - watch status
- `Genre` (type text) - movie genre
- `Score` (type select) - from 0 to 4 stars, in intervals of 0.5 stars
- `Theatre` (type checkbox) - whether you watched this movie in cinemas
- `Rewatch` (type checkbox) - whether you want to rewatch this movie
- `First Watched` (type date) - date of first watch
- `Last Watched` (type date) - date of most recent watch

### Views

- All - lists all movies in database. Use this view to rank movies by manually
  repositioning rows.
- Watchlist - lists all movies in database that haven't been watched, or have
  been marked for rewatch.

## Getting started

### Public Version

**You must be on a paid or education Notion plan to use this version**. This
version allows you to fetch movie data with a single click, directly in Notion.

1. [Connect the integration to your workspace](https://api.notion.com/v1/oauth/authorize?client_id=15fd872b-594c-81b8-8db1-00373cdd4f34&response_type=code&owner=user&redirect_uri=https%3A%2F%2Fnotion-movies.vercel.app%2Fauth).
   Follow the prompts and select `Use a template provided by the developer`. You
   should now have a copy of the template in your workspace.
2. Test out the integration by adding a new movie page to the database, and
   filling in the `Title` and `Year` properties. **Both properties must be
   filled out for the integration to work**.
3. Click the Fetch button to run the integration. **The integration will update
   data for all movie pages that have `Info Added` unchecked**, using the
   `Title` and `Year` values to search for the corresponding movie.
4. The integration may take some time to run. After it's finished, all pages
   should have `Runtime` filled out, `Info Added` checked, and an image of the
   movie poster appended to the page's content.

Any time you add new pages to the database, all you have to do is fill in the
`Title` and `Year` properties, then click the Fetch button.

### Internal Version

**Requires Node.js 18+**. After adding movie pages to the database, you'll have
to manually run a Node script to fetch data.

1. If you don't already have a TMDB API key,
   [register for one here](https://developer.themoviedb.org/docs/getting-started).
2. Duplicate the template into your Notion workspace by
   [visiting the template site](https://evanxiong.notion.site/Movies-1b6f43a6ce128098b9a2e92adaf4cd6b)
   and clicking the Duplicate icon in the top right corner. You should now have
   a new page in your workspace called "Movies".
3. Create a new internal integration in your
   [integration settings](https://www.notion.so/profile/integrations). Note the
   internal integration secret.
4. Connect the integration to the newly created "Movies" page: open the page in
   Notion, click the ••• menu in the top right corner, click on Connections, and
   select the integration from the dropdown list.
5. Clone this repo:

   ```shell
   git clone https://github.com/evxiong/notion-movies.git && cd notion-movies
   ```

6. Install dependencies:

   ```shell
   npm ci
   ```

7. Create a `.env` file in the root project directory (at the same level as this
   README), and add the following key/value pairs:

   ```
   NOTION_KEY=<insert internal integration secret from step 3>
   NOTION_PAGE_ID=<insert Movies page id>
   TMDB_API_KEY=<insert TMDB API key>
   ```

   To get the page id, open the "Movies" page in Notion, click Share in the top
   right corner, click the Copy link button, and copy the 32-character string at
   the end of the URL.

8. Test out the integration by adding a new database page to "Movies", and
   filling in the `Title` and `Year` properties. **Both properties must be
   filled out for the integration to work**.

9. Run the Node.js script to fetch movie data:

   ```shell
   npm run internal
   ```

**The integration will update data for all movie pages that have `Info Added`
unchecked**, using the `Title` and `Year` values to search for the corresponding
movie. It may take some time to run. After it's finished, all pages should have
`Runtime` filled out, `Info Added` checked, and an image of the movie poster
appended to the page's content.

Any time you add new pages to the database, all you have to do is fill in the
`Title` and `Year` properties, then `cd` into `notion-movies` and run
`npm run internal`.

## Privacy

If you use the public integration, your Notion user id will be stored for
functionality purposes only. The integration will have access to your connected
database to update pages with fetched data.

The internal integration runs completely locally on your machine.

## Tools used

TypeScript, Node.js, Express.js, TMDB API, Notion SDK for JavaScript
