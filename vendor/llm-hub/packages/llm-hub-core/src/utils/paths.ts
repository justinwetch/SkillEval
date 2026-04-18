import path from 'node:path';

export interface HubPaths {
  baseDir: string;
  hubDir: string;
  credentialsFile: string;
  configFile: string;
}

export function resolveHubPaths(baseDir = process.cwd()): HubPaths {
  const hubDir = path.resolve(baseDir, '.llm-hub');

  return {
    baseDir,
    hubDir,
    credentialsFile: path.join(hubDir, 'credentials.json'),
    configFile: path.join(hubDir, 'config.json'),
  };
}
