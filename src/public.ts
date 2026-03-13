import { runIntegration } from "./integration";

export async function runPublicIntegration(
  accessToken: string,
  pageId: string
): Promise<boolean> {
  return runIntegration(accessToken, pageId);
}
