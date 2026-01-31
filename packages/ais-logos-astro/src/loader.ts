import type { Loader, LoaderContext } from "astro/loaders";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import type {
  LogosIndex,
  LogosLoaderOptions,
  Organization,
  FileEntry,
  DownloadedVariant,
} from "./types.js";

const DEFAULT_INDEX_URL =
  "https://foreview.github.io/aisafety-logos/index.json";
const DEFAULT_BASE_URL = "https://foreview.github.io/aisafety-logos/";

/**
 * Convert a URL to a filesystem-safe slug
 */
function urlToSlug(url: string): string {
  return url
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .replace(/\./g, "-");
}

/**
 * Download a file from a URL to a local path
 */
async function downloadFile(url: string, destPath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return false;
    }
    const buffer = await response.arrayBuffer();
    await writeFile(destPath, new Uint8Array(buffer));
    return true;
  } catch {
    return false;
  }
}

/**
 * Select the best file from a list based on format preference
 */
function selectFile(
  files: FileEntry[],
  preferSvg: boolean
): FileEntry | undefined {
  if (!files.length) return undefined;

  if (preferSvg) {
    const svg = files.find((f) => f.type === "image/svg+xml");
    if (svg) return svg;
  }

  return files[0];
}

/**
 * Normalize URL for matching (handle trailing slashes)
 */
function findOrganization(
  index: LogosIndex,
  url: string
): [string, Organization] | undefined {
  // Try exact match first
  const entry = index[url];
  if (entry && typeof entry !== "string") {
    return [url, entry];
  }

  // Try with/without trailing slash
  const withSlash = url.endsWith("/") ? url : url + "/";
  const withoutSlash = url.endsWith("/") ? url.slice(0, -1) : url;

  for (const variant of [withSlash, withoutSlash]) {
    const entry = index[variant];
    if (entry && typeof entry !== "string") {
      return [variant, entry];
    }
  }

  return undefined;
}

/**
 * Create an Astro content loader for AI Safety logos
 */
export function logosLoader(options: LogosLoaderOptions = {}): Loader {
  const {
    urls,
    indexUrl = DEFAULT_INDEX_URL,
    baseUrl = DEFAULT_BASE_URL,
    preferSvg = true,
    publicDir = "logos",
  } = options;

  // If custom indexUrl provided, baseUrl must also be provided
  if (options.indexUrl && !options.baseUrl) {
    throw new Error("baseUrl is required when indexUrl is provided");
  }

  return {
    name: "ais-logos-loader",
    load: async (context: LoaderContext) => {
      const { store, logger, generateDigest, config } = context;

      logger.info("Fetching AI Safety Logos index...");
      const response = await fetch(indexUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch logos index: ${response.status}`);
      }
      const index: LogosIndex = await response.json();

      // Prepare download directory
      const logosDir = path.join(fileURLToPath(config.publicDir), publicDir);
      await mkdir(logosDir, { recursive: true });

      store.clear();

      // Determine which organizations to load
      const orgUrls = urls ?? Object.keys(index).filter((k) => k !== "$schema");

      for (const orgUrl of orgUrls) {
        const found = findOrganization(index, orgUrl);
        if (!found) {
          logger.warn(`Organization not found in index: ${orgUrl}`);
          continue;
        }

        const [canonicalUrl, org] = found;
        const slug = urlToSlug(orgUrl);

        const downloadedVariants: Record<string, DownloadedVariant> = {};

        // Download all variants
        for (const [variantKey, variant] of Object.entries(org.variants)) {
          const colorFile = selectFile(variant.color, preferSvg);
          const whiteFile = selectFile(variant.white, preferSvg);

          let colorPath: string | undefined;
          let whitePath: string | undefined;

          // Build filename with variant suffix (skip for "default")
          const variantSuffix = variantKey === "default" ? "" : `-${variantKey}`;

          // Download color logo
          if (colorFile) {
            const ext = path.extname(colorFile.file) || ".svg";
            const filename = `${slug}${variantSuffix}${ext}`;
            const destPath = path.join(logosDir, filename);
            const fileUrl = new URL(colorFile.file, baseUrl).toString();

            if (await downloadFile(fileUrl, destPath)) {
              colorPath = `/${publicDir}/${filename}`;
            } else {
              logger.warn(
                `Failed to download ${variantKey} color logo for ${org.canonicalName}`
              );
            }
          }

          // Download white logo
          if (whiteFile) {
            const ext = path.extname(whiteFile.file) || ".svg";
            const filename = `${slug}${variantSuffix}-white${ext}`;
            const destPath = path.join(logosDir, filename);
            const fileUrl = new URL(whiteFile.file, baseUrl).toString();

            if (await downloadFile(fileUrl, destPath)) {
              whitePath = `/${publicDir}/${filename}`;
            }
          }

          downloadedVariants[variantKey] = {
            color: colorPath,
            white: whitePath,
            type: variant.type,
            dimensions: colorFile
              ? { width: colorFile.width, height: colorFile.height }
              : undefined,
          };
        }

        logger.info(`Downloaded: ${org.canonicalName}`);

        const data: Record<string, unknown> = {
          name: org.canonicalName,
          url: canonicalUrl,
          names: org.names,
          canonical: org.canonical,
          variants: downloadedVariants,
        };

        store.set({
          id: slug,
          data,
          digest: generateDigest(data),
        });
      }

      logger.info(`Loaded ${orgUrls.length} organizations`);
    },
  };
}
