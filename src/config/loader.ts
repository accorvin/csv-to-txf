import { readFile } from 'fs/promises';
import { parse as parseYaml } from 'yaml';
import { Config, MerchantMapping } from './types.js';
import { ConfigNotFoundError, ConfigParseError } from '../utils/errors.js';
import { resolvePath } from '../utils/paths.js';

export async function loadConfig(configPath: string): Promise<Config> {
  const resolvedPath = resolvePath(configPath);

  let content: string;
  try {
    content = await readFile(resolvedPath, 'utf-8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new ConfigNotFoundError(resolvedPath);
    }
    throw error;
  }

  let parsed: unknown;
  try {
    parsed = parseYaml(content);
  } catch (error) {
    throw new ConfigParseError((error as Error).message);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ConfigParseError('Config must be a valid YAML object');
  }

  const config = parsed as Record<string, unknown>;

  if (!Array.isArray(config.mappings)) {
    throw new ConfigParseError('Config must contain a "mappings" array');
  }

  const mappings: MerchantMapping[] = config.mappings.map((mapping: unknown) => {
    if (!mapping || typeof mapping !== 'object') {
      throw new ConfigParseError('Each mapping must be an object');
    }

    const m = mapping as Record<string, unknown>;

    return {
      merchant: String(m.merchant ?? ''),
      organization: String(m.organization ?? ''),
      ...(m.ein !== undefined && { ein: String(m.ein) }),
    };
  });

  return { mappings };
}
