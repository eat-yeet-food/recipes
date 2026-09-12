export function cloudflareAPI(token) {
  return async function request(path, options = {}) {
    const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
      ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers },
      signal: options.signal ?? AbortSignal.timeout(120000),
    })
    const result = await response.json()
    if (!response.ok || result.success === false) {
      const codes = result.errors?.map(({ code }) => code).join(', ') ?? response.status
      throw new Error(`Cloudflare ${options.method ?? 'GET'} ${path.split('?')[0]} failed (${codes}); check credential scope and account ownership`)
    }
    return result
  }
}
export async function listAll(api, path) {
  const items = []
  for (let page = 1; ; page++) {
    // Pages rejects larger page sizes; its verified default is 10.
    const data = await api(`${path}${path.includes('?') ? '&' : '?'}page=${page}&per_page=10`)
    const rows = Array.isArray(data.result) ? data.result : data.result?.buckets ?? []
    items.push(...rows)
    if (!data.result_info || page >= data.result_info.total_pages || rows.length < 10) return items
  }
}
export async function inventory(api, { allowPartial = false } = {}) {
  const zones = await listAll(api, '/zones?name=eatyeet.com')
  if (zones.length !== 1) throw new Error('Expected exactly one accessible eatyeet.com zone; verify the account and token scopes')
  const zone = zones[0], accountId = zone.account.id
  const resources = {}
  const unavailable = []
  const endpoints = {
    dns: `/zones/${zone.id}/dns_records`, pages: `/accounts/${accountId}/pages/projects`,
    workers: `/accounts/${accountId}/workers/scripts`, databases: `/accounts/${accountId}/d1/database`,
    buckets: `/accounts/${accountId}/r2/buckets`, identityProviders: `/accounts/${accountId}/access/identity_providers`,
    accessApplications: `/accounts/${accountId}/access/apps`, routes: `/zones/${zone.id}/workers/routes`,
    subscriptions: `/accounts/${accountId}/subscriptions`,
  }
  for (const [name, path] of Object.entries(endpoints)) {
    try { resources[name] = await listAll(api, path) }
    catch (error) { if (!allowPartial) throw error; resources[name] = []; unavailable.push({ resource: name, error: error.message }) }
  }
  const hooks = []
  for (const project of resources.pages) {
    try { for (const hook of await listAll(api, `/accounts/${accountId}/pages/projects/${project.name}/deploy_hooks`)) hooks.push({ project: project.name, id: hook.id, name: hook.name, branch: hook.branch }) }
    catch (error) { if (!allowPartial) throw error; unavailable.push({ resource: `hooks:${project.name}`, error: error.message }) }
  }
  let organization
  try { organization = (await api(`/accounts/${accountId}/access/organizations`)).result }
  catch (error) { if (!allowPartial) throw error; unavailable.push({ resource: 'accessOrganization', error: error.message }) }
  // Never persist provider client secrets, service tokens, or arbitrary API responses.
  return { observedAt: new Date().toISOString(), accountId, zoneId: zone.id, accountName: zone.account.name,
    accessTeamDomain: organization?.auth_domain, deployHooks: hooks, unavailable,
    dns: resources.dns.map(({ id, name, type, content, proxied }) => ({ id, name, type, content, proxied })),
    pages: resources.pages.map(({ id, name, domains, source, production_branch }) => ({ id, name, domains, production_branch,
      source: source ? { type: source.type, config: { production_deployments_enabled: source.config?.production_deployments_enabled, repo_name: source.config?.repo_name } } : null })),
    workers: resources.workers.map(({ id }) => ({ id })), databases: resources.databases.map(({ uuid, name }) => ({ uuid, name })),
    buckets: resources.buckets.map(({ name }) => ({ name })), routes: resources.routes,
    identityProviders: resources.identityProviders.map(({ id, name, type }) => ({ id, name, type })),
    accessApplications: resources.accessApplications.map(({ id, name, domain, aud }) => ({ id, name, domain, aud })),
    plans: resources.subscriptions.map(({ id, rate_plan }) => ({ id, name: rate_plan?.public_name })),
  }
}
