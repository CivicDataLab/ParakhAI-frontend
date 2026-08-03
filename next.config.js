/** @type {import('next').NextConfig} */

/**
 * Image remotePatterns are derived from NEXT_PUBLIC_* URLs at build time.
 * Configure the same vars in GitHub Actions / deployment per environment.
 *
 * Optional: NEXT_PUBLIC_IMAGE_REMOTE_HOSTS — comma-separated URLs or hostnames
 * (defaults to images.unsplash.com when unset).
 */

/** @typedef {{ protocol: 'http' | 'https', hostname: string, port?: string }} RemotePattern */

/** Env vars whose values are full URLs (hostname extracted for images). */
const IMAGE_HOST_URL_ENV_KEYS = [
  'NEXT_PUBLIC_DATASPACE_HOST',
  'NEXT_PUBLIC_AI_MAKER_URL',
  'NEXT_PUBLIC_DATASPACE_API_URL',
  'NEXT_PUBLIC_BACKEND_BASE_URL',
  'NEXT_PUBLIC_BACKEND_URL',
  'NEXT_PUBLIC_PLATFORM_URL',
];

const DEFAULT_EXTRA_IMAGE_HOSTS = 'images.unsplash.com';

/**
 * @param {string | undefined} value
 * @returns {RemotePattern | null}
 */
function toRemotePattern(value) {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const href = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const { protocol, hostname, port } = new URL(href);
    const normalizedProtocol = protocol.replace(':', '');

    if (normalizedProtocol !== 'http' && normalizedProtocol !== 'https') {
      return null;
    }
    if (!hostname) return null;

    return {
      protocol: /** @type {'http' | 'https'} */ (normalizedProtocol),
      hostname,
      ...(port ? { port } : {}),
    };
  } catch {
    return null;
  }
}

/** @param {RemotePattern} pattern */
function patternKey(pattern) {
  return `${pattern.protocol}://${pattern.hostname}${pattern.port ? `:${pattern.port}` : ''}`;
}

function buildImageRemotePatterns() {
  /** @type {Map<string, RemotePattern>} */
  const patterns = new Map();

  const add = (value) => {
    const pattern = toRemotePattern(value);
    if (pattern) patterns.set(patternKey(pattern), pattern);
  };

  let fromAppUrls = 0;
  for (const key of IMAGE_HOST_URL_ENV_KEYS) {
    const before = patterns.size;
    add(process.env[key]);
    if (patterns.size > before) fromAppUrls += 1;
  }

  const extraHosts =
    process.env.NEXT_PUBLIC_IMAGE_REMOTE_HOSTS || DEFAULT_EXTRA_IMAGE_HOSTS;
  for (const entry of extraHosts.split(',')) {
    add(entry);
  }

  if (process.env.CI && fromAppUrls === 0) {
    console.warn(
      '[next.config] No image hosts from NEXT_PUBLIC_* URL env vars. ' +
        'Set NEXT_PUBLIC_DATASPACE_API_URL (and related vars) in CI/deployment.',
    );
  }

  return [...patterns.values()];
}

const nextConfig = {
  productionBrowserSourceMaps: true,
  transpilePackages: ['opub-ui'],
  swcMinify: false,
  eslint: {
    ignoreDuringBuilds: true,
  },
  // experimental: {
  //   optimizePackageImports: ['opub-ui','echarts', 'lucide-react'],
  // },
  images: {
    remotePatterns: buildImageRemotePatterns(),
  },
};

module.exports = nextConfig;
