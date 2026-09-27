import type { PayloadEmailAdapter as EmailAdapter } from 'payload'

export type AccountEmailSettings = { resendApiKey?: string; from?: string; mode: 'resend' | 'log' | 'disabled' }
const fromPattern = /^(?:[^<>]{1,80} )?<?[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+>?$/

/** True when account emails will actually be delivered (or logged locally). */
export const accountEmailAvailable = (settings?: AccountEmailSettings) =>
  settings?.mode === 'log' || (settings?.mode === 'resend' && Boolean(settings.resendApiKey) && fromPattern.test(settings.from ?? ''))

/**
 * Resend's HTTP API works from Workers without an SMTP client. Local
 * development prints links instead; remote environments without credentials
 * refuse to send, and the account routes report email sign-up as unavailable.
 */
export function accountEmailAdapter(settings?: AccountEmailSettings): EmailAdapter {
  const from = settings?.from || 'Eat / Yeet <accounts@localhost.invalid>'
  const match = from.match(/^(.*?)\s*<(.+)>$/)
  return () => ({
    name: settings?.mode ?? 'disabled',
    defaultFromName: match?.[1] || 'Eat / Yeet',
    defaultFromAddress: match?.[2] || from,
    async sendEmail(message) {
      const to = Array.isArray(message.to) ? message.to.map(String) : [String(message.to)]
      if (settings?.mode === 'log') {
        const links = String(message.html ?? '').match(/href="([^"]+)"/g)?.map((link) => link.slice(6, -1)) ?? []
        console.warn(`[account email] to ${to.join(', ')}: ${message.subject}\n  ${links.join('\n  ')}`)
        return
      }
      if (!accountEmailAvailable(settings)) throw new Error('Account email is not configured')
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${settings!.resendApiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to, subject: message.subject, html: message.html }),
        signal: AbortSignal.timeout(10000),
      })
      if (!response.ok) throw new Error(`Account email failed (${response.status})`)
    },
  })
}
