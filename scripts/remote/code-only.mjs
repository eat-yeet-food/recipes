export function assertCodeOnly(previous, migrations, plan) {
  if (previous?.status !== 'ready' || !previous.releaseId) throw new Error('Code-only release requires an existing healthy application')
  if (JSON.stringify(previous.migrations) !== JSON.stringify(migrations)) throw new Error('Code-only release cannot change migrations; use a full release')
  if (plan && (plan.status !== 'complete' || !['created', 'updated', 'retired'].every((name) => plan.counts?.[name] === 0) ||
    plan.siteChanged !== false || plan.mediaChanges !== 0)) throw new Error('Code-only release requires an unchanged content/media plan; use a full release')
}
