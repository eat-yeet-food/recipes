/** Payload needs a color-scheme handshake for its admin theme, not the public
 * site's fixed design. Critical-CH otherwise restarts the first navigation. */
export function scopePayloadClientHints(rules) {
  const hint = 'sec-ch-prefers-color-scheme'
  return rules.flatMap((rule) => {
    if (rule.source !== '/:path*' || !rule.headers.some(({ key, value }) => key.toLowerCase() === 'critical-ch' && value.toLowerCase() === hint)) return [rule]
    const themeHeader = ({ key, value }) => ['accept-ch', 'critical-ch', 'vary'].includes(key.toLowerCase()) && value.toLowerCase() === hint
    const common = rule.headers.filter((header) => !themeHeader(header))
    return [...(common.length ? [{ ...rule, headers: common }] : []),
      { ...rule, source: '/admin/:path*', headers: rule.headers.filter(themeHeader) }]
  })
}
