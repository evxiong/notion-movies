import dotenv from "dotenv";
import { runIntegration } from "./integration";

dotenv.config();

async function runInternalIntegration() {
  runIntegration(process.env.NOTION_KEY!, process.env.NOTION_PAGE_ID!);
}

runInternalIntegration();
