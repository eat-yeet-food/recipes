export function performancePassed(report, origin) {
  const paths = ['/', '/recipes', '/browse', '/learn', '/recipes/new-york-style-pizza', '/learn/mixing-dough-and-gluten-development']
  if (report?.origin !== origin || report.results?.length !== paths.length) throw new Error('Incomplete performance evidence')
  return paths.map((path) => {
    const result = report.results.find((row) => row.path === path)
    if (result?.runs?.length !== 3) throw new Error('Incomplete performance runs')
    const median = Object.fromEntries(['performance', 'lcp', 'cls'].map((key) => {
      const values = result.runs.map((run) => run[key])
      if (values.some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Invalid performance measurement')
      return [key, values.sort((a, b) => a - b)[1]]
    }))
    return median.performance >= 0.9 && median.lcp <= 2500 && median.cls <= 0.1
  }).every(Boolean)
}

export function acceptanceException(reason, revision, ownerEmail, limitations, now = Date.now()) {
  if (typeof reason !== 'string' || reason.trim().length < 20) throw new Error('Record the explicit owner authorization and known limitations (20+ characters)')
  return { revision, ownerEmail, reason: reason.trim(), limitations, recordedAt: new Date(now).toISOString(), expiresAt: new Date(now + 86400000).toISOString() }
}

export function assertAcceptanceRelease(record, control, outputs, revision, migrations) {
  if (!/^[a-f0-9]{40}$/.test(revision) || record?.revision !== revision || record.status !== 'complete' ||
      control?.status !== 'ready' || control.contentRevision !== revision || control.releaseId !== record.id || outputs.releaseId !== record.id)
    throw new Error('Acceptance requires a completed deployed application with matching release/content identities')
  if (JSON.stringify(migrations) !== JSON.stringify(record.migrations) || JSON.stringify(control.migrations) !== JSON.stringify(record.migrations))
    throw new Error('Acceptance tooling migrations differ from the deployed application')
}
