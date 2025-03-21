import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { runPublicIntegration } from "./public";
import { getNotionPageIds, getNotionPageUrl } from "./notion";
import { Client } from "@notionhq/client";

dotenv.config();

const app = express();

const port = 3000;

app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI!);

app.get("/", (req, res) => {
  console.log("Received GET request");
  res.send("notion-movies server is working");
});

app.get("/connect", (req, res) => {
  console.log("Received /connect GET request");
  res.redirect(
    "https://api.notion.com/v1/oauth/authorize?client_id=15fd872b-594c-81b8-8db1-00373cdd4f34&response_type=code&owner=user&redirect_uri=https%3A%2F%2Fnotion-movies.vercel.app%2Fauth"
  );
});

app.post("/", async (req, res) => {
  // Process POST requests from webhook
  console.log("Received POST request");
  const payload = req.body;
  const userId = payload.source.user_id;
  const pageId = payload.data.id;
  console.log(`user_id: ${userId}\npage_id: ${pageId}`);

  if (!userId || !pageId) {
    res
      .status(400)
      .send("Failed to complete POST request. Malformed request syntax.");
    return;
  }

  try {
    // Query database for appropriate token, using user id and page id
    const users = client.db("notion").collection("users");
    const user = await users.findOne({
      user_id: userId,
      $or: [
        {
          duplicated_template_id: pageId,
        },
        {
          page_ids: pageId,
        },
      ],
    });
    if (user === null) {
      res
        .status(422)
        .send(
          "Failed to complete POST request. Try reauthorizing integration."
        );
      return;
    }

    // Run script to fetch data
    const accessToken = user.access_token;
    const result = await runPublicIntegration(pageId, accessToken);
    if (!result) {
      res
        .status(422)
        .send(
          "Failed to complete POST request. Try reauthorizing integration."
        );
      return;
    }

    res.send("Completed POST request.");
  } catch (e) {
    console.error(e);
  }
});

app.get("/auth", async (req, res) => {
  console.log("Received auth request");
  try {
    if (req.query.error) {
      // Handle canceled request or error
      console.log(req.query.error);
      res.redirect("https://github.com/evxiong/notion-movies");
      return;
    }
    if (req.query.code) {
      // Send POST request for access token, using temp auth code
      const encoded = Buffer.from(
        `${process.env.OAUTH_CLIENT_ID}:${process.env.OAUTH_CLIENT_SECRET}`
      ).toString("base64");

      const options = {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Basic ${encoded}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code: req.query.code,
          redirect_uri: process.env.OAUTH_REDIRECT_URI,
        }),
      };

      const r = await fetch("https://api.notion.com/v1/oauth/token", options);
      const response = await r.json();

      if (response.error) {
        // Handle token request failure
        res.redirect("https://github.com/evxiong/notion-movies");
        return;
      }
      // Write connection info to MongoDB
      const users = client.db("notion").collection("users");

      // Replace response.owner with user_id = response.owner.user.id
      const { owner, ...d } = response;
      d.user_id = owner.user.id;
      d.timestamp = new Date();

      // pageIds won't always contain newly created page
      // https://developers.notion.com/reference/search-optimizations-and-limitations
      const notion = new Client({ auth: d.access_token });
      const pageIds = await getNotionPageIds(notion);
      d.page_ids = pageIds;

      // Replace or insert new connection
      const result = await users.replaceOne(
        {
          bot_id: d.bot_id,
          access_token: d.access_token,
        },
        d,
        { upsert: true }
      );
      console.log(`Inserted document with _id: ${result.upsertedId}`);

      // Redirect to newly created page
      console.log("Auth flow complete");
      const url = d.duplicated_template_id
        ? await getNotionPageUrl(notion, d.duplicated_template_id)
        : null;
      if (url) {
        res.redirect(url);
      } else {
        res.redirect("https://www.notion.so");
      }
    }
  } catch (e) {
    console.error(e);
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
