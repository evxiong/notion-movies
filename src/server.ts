import express from "express";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import { runPublicIntegration } from "./public";

dotenv.config();

const app = express();

const port = 3000;

app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI!);

app.post("/", async (req, res) => {
  // Process POST requests from webhook
  console.log("Received POST request");
  const payload = req.body;
  const userId = payload.source.user_id;
  const pageId = payload.data.id;
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

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
