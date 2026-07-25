/**
 * Background email polling is disabled — GMassist uses manual on-demand scans only.
 * Run the Next.js app and use "Read unread emails" on the dashboard instead.
 *
 * This script is kept for compatibility but exits immediately.
 */

console.log("GMassist background worker is disabled.");
console.log("Email scanning is manual — use the dashboard to read unread emails.");
process.exit(0);
