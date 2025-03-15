import type { Client } from "@notionhq/client";
import type {
  BlockObjectResponse,
  DatabaseObjectResponse,
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";
import type { MovieInfo, NotionMovie } from "./types";

export async function getNotionMovies(
  notion: Client,
  databaseId: string
): Promise<NotionMovie[] | null> {
  // Get all pages in Notion db.
  try {
    const results: NotionMovie[] = [];
    let nextCursor: string | undefined = undefined;
    let hasMore = true;
    while (hasMore) {
      const response = await notion.databases.query({
        start_cursor: nextCursor,
        database_id: databaseId,
        filter: {
          property: "Info Added",
          checkbox: {
            equals: false,
          },
        },
        sorts: [
          {
            timestamp: "created_time",
            direction: "ascending",
          },
        ],
      });

      hasMore = response.has_more;
      if (hasMore && response.next_cursor !== null) {
        nextCursor = response.next_cursor;
      }

      for (const res of response.results as PageObjectResponse[]) {
        const title =
          res.properties.Title.type === "title" &&
          res.properties.Title.title[0]?.plain_text.trim().length > 0
            ? res.properties.Title.title[0].plain_text
            : null;
        const year =
          res.properties.Year.type === "rich_text" &&
          !isNaN(parseInt(res.properties.Year.rich_text[0]?.plain_text))
            ? parseInt(res.properties.Year.rich_text[0].plain_text)
            : null;

        if (title !== null && year !== null) {
          results.push({
            id: res.id,
            title: title,
            year: year,
          });
        } else {
          console.log(
            `WARNING: Missing/invalid title and/or year: ${res.id}\n    title: ${title}\n    year:  ${year}\n`
          );
        }
      }
    }
    return results;
  } catch (e) {
    console.error(e);
  }
  return null;
}

export async function updateNotionMovie(
  notion: Client,
  pageId: string,
  m: MovieInfo
) {
  // Update page's images, runtime, info added
  try {
    await notion.blocks.children.append({
      block_id: pageId,
      children: [
        {
          object: "block",
          type: "image",
          image: {
            caption: [],
            type: "external",
            external: {
              url: m.posterLink,
            },
          },
        },
      ],
    });

    await notion.pages.update({
      page_id: pageId,
      properties: {
        ...(m.runtime !== "0h 0m" && {
          Runtime: {
            rich_text: [
              {
                type: "text",
                text: {
                  content: m.runtime,
                },
              },
            ],
          },
        }),
        "Info Added": {
          checkbox: true,
        },
      },
    });
  } catch (e) {
    console.error(e);
  }
}

export async function getNotionDatabaseId(
  notion: Client,
  pageId: string
): Promise<string | null> {
  // Get child database id from top-level page
  try {
    const response = await notion.blocks.children.list({
      block_id: pageId,
    });
    const databaseId = (response.results as BlockObjectResponse[]).find(
      (r) => r.type === "child_database"
    )?.id;
    return databaseId ?? null;
  } catch (e) {
    console.error(e);
  }
  return null;
}

export async function getNotionPageUrl(
  notion: Client,
  pageId: string
): Promise<string | null> {
  try {
    const response = await notion.pages.retrieve({ page_id: pageId });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const url = (response as any).url as string;
    return url;
  } catch (e) {
    console.error(e);
  }
  return null;
}

export async function getNotionPageIds(
  notion: Client
): Promise<string[] | null> {
  try {
    const response = await notion.search({
      filter: {
        value: "database",
        property: "object",
      },
    });
    const pageIds: string[] = [];
    for (const r of response.results as DatabaseObjectResponse[]) {
      if (r.parent.type === "page_id") {
        pageIds.push(r.parent.page_id);
      }
    }
    return pageIds;
  } catch (e) {
    console.error(e);
  }
  return null;
}
