/**
 * One-time setup: register Gmail push notifications for a user.
 * Usage: USER_ID=xxx npm run gmail:watch
 */

import { prisma } from "../src/lib/db";
import { setupGmailWatch } from "../src/lib/gmail";

async function main() {
  const userId = process.env.USER_ID;
  if (!userId) {
    console.error("Set USER_ID environment variable");
    process.exit(1);
  }

  const expiry = await setupGmailWatch(userId);
  if (expiry) {
    await prisma.user.update({
      where: { id: userId },
      data: { gmailWatchExpiry: expiry },
    });
    console.log(`Gmail watch active until ${expiry.toISOString()}`);
  } else {
    console.log("Gmail watch skipped (GMAIL_PUBSUB_TOPIC not configured)");
  }
}

main().catch(console.error);
