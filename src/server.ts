import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { runPublicIntegration } from "./public";
import { getNotionPageUrl } from "./notion";
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
      duplicated_template_id: pageId,
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

      // Replace or insert new connection
      const result = await users.replaceOne(
        {
          bot_id: d.bot_id,
          access_token: d.access_token,
          duplicated_template_id: d.duplicated_template_id,
        },
        d,
        { upsert: true }
      );
      console.log(`Inserted document with _id: ${result.upsertedId}`);

      // Redirect to newly created page
      console.log("Auth flow complete");
      const notion = new Client({ auth: d.access_token });
      const url = await getNotionPageUrl(
        notion,
        d.duplicated_template_id as string
      );
      if (url) {
        res.redirect(url);
      } else {
        res.send(
          "Auth flow complete. The movie tracker should now be in your Notion workspace."
        );
      }
    }
  } catch (e) {
    console.error(e);
  }
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
