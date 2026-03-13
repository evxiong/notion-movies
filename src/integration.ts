import { Client } from "@notionhq/client";
import type { Browser } from "puppeteer-core";
import { addExtra } from "puppeteer-extra";

// See https://github.com/vercel/pkg/issues/910
import "puppeteer-extra-plugin-stealth/evasions/chrome.app";
import "puppeteer-extra-plugin-stealth/evasions/chrome.csi";
import "puppeteer-extra-plugin-stealth/evasions/chrome.loadTimes";
import "puppeteer-extra-plugin-stealth/evasions/chrome.runtime";
import "puppeteer-extra-plugin-stealth/evasions/defaultArgs";
import "puppeteer-extra-plugin-stealth/evasions/iframe.contentWindow";
import "puppeteer-extra-plugin-stealth/evasions/media.codecs";
import "puppeteer-extra-plugin-stealth/evasions/navigator.hardwareConcurrency";
import "puppeteer-extra-plugin-stealth/evasions/navigator.languages";
import "puppeteer-extra-plugin-stealth/evasions/navigator.permissions";
import "puppeteer-extra-plugin-stealth/evasions/navigator.plugins";
import "puppeteer-extra-plugin-stealth/evasions/navigator.vendor";
import "puppeteer-extra-plugin-stealth/evasions/navigator.webdriver";
import "puppeteer-extra-plugin-stealth/evasions/sourceurl";
import "puppeteer-extra-plugin-stealth/evasions/user-agent-override";
import "puppeteer-extra-plugin-stealth/evasions/webgl.vendor";
import "puppeteer-extra-plugin-stealth/evasions/window.outerdimensions";
import "puppeteer-extra-plugin-user-data-dir";
import "puppeteer-extra-plugin-user-preferences";

import StealthPlugin from "puppeteer-extra-plugin-stealth";
import {
  getNotionDatabaseId,
  getNotionMovies,
  updateNotionMovie,
} from "./notion";
import { getMovieInfo } from "./tmdb";
import type { Session } from "./types";

/**
 * Runs integration.
 * @param token Notion integration token
 * @param pageId Notion page id
 * @returns true if successful, false if Notion error
 */
export async function runIntegration(
  token: string,
  pageId: string
): Promise<boolean> {
  const notion = new Client({ auth: token });

  const databaseId = await getNotionDatabaseId(notion, pageId);
  if (databaseId === null) {
    return false;
  }

  const results = await getNotionMovies(notion, databaseId);
  if (results === null) {
    return false;
  }

  console.log(`Updating ${results.length} movies...\n`);

  if (results.length === 0) {
    console.log("Done");
    return true;
  }

  let browser: Browser;

  if (process.env.NODE_ENV === "production") {
    // use serverless Chromium in production
    const chromium = await import("@sparticuz/chromium");
    const puppeteerCore = await import("puppeteer-core");
    const puppeteer = addExtra(puppeteerCore.default);
    puppeteer.use(StealthPlugin());
    browser = await puppeteer.launch({
      args: chromium.default.args,
      executablePath: await chromium.default.executablePath(),
    });
  } else {
    // use full Puppeteer in local
    const puppeteerFull = await import("puppeteer");
    const puppeteer = addExtra(puppeteerFull.default);
    puppeteer.use(StealthPlugin());
    browser = await puppeteer.launch();
  }

  const page = await browser.newPage();
  const session: Session = { browser, page };

  for (const res of results) {
    console.log(res.id + "\n" + res.title + "\n" + res.year);
    const m = await getMovieInfo(res.title, res.year, session);
    if (m === null) {
      console.log("WARNING: TMDB search yielded no matching results.\n");
      continue;
    }
    await updateNotionMovie(notion, res.id, m);
    console.log(m.runtime);
    console.log(m.posterLink + "\n");
  }

  await browser.close();
  console.log("Done");
  return true;
}
