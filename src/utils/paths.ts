import { homedir } from 'os';
import { resolve } from 'path';

export function resolvePath(inputPath: string): string {
  if (inputPath.startsWith('~')) {
    return resolve(homedir(), inputPath.slice(2));
  }
  return resolve(inputPath);
}

export function getDefaultConfigPath(): string {
  return resolvePath('~/.config/csv-to-txf/mappings.yaml');
}
