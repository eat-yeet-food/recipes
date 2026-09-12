import { chromium } from 'playwright'

/** The owner completes Cloudflare sign-in/MFA; the JWT stays in process memory. */
export async function ownerAccessSession(origin) {
  if (process.env.EATYEET_ACCESS_TOKEN) return process.env.EATYEET_ACCESS_TOKEN
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal to complete owner Access sign-in')
  console.log('Complete Cloudflare owner sign-in/MFA in the verification browser window.')
  const browser = await chromium.launch({ headless: false })
  try {
    const context = await browser.newContext()
    const page = await context.newPage()
    await page.goto(`${origin}/admin`, { waitUntil: 'domcontentloaded' })
    for (let attempt = 0; attempt < 300; attempt++) {
      const cookie = (await context.cookies(origin)).find((cookie) => cookie.name === 'CF_Authorization')
      if (cookie) return cookie.value
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
    throw new Error('Owner Access sign-in timed out')
  } finally { await browser.close() }
}
