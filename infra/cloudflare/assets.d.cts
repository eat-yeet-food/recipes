export type DeploymentManifest = Record<string, { sha256: string; size: number }>
export function deploymentManifest(directory: string): DeploymentManifest
export function assertDeploymentManifest(directory: string, expected: DeploymentManifest): void
