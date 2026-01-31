/**
 * A single logo file with metadata
 */
export interface FileEntry {
  /** Path to the file relative to repository root */
  file: string;
  /** MIME type of the file */
  type: "image/svg+xml" | "image/png";
  /** Width in pixels */
  width: number;
  /** Height in pixels */
  height: number;
}

/**
 * A logo variant with color and white versions
 */
export interface LogoVariant {
  /** Logo composition type */
  type: "mark" | "wordmark" | "lockup";
  /** Color version files, ordered by fidelity (vector first) */
  color: FileEntry[];
  /** White version files, ordered by fidelity (vector first) */
  white: FileEntry[];
}

/**
 * An organization entry in the logos index
 */
export interface Organization {
  /** The canonical/official name of the organization */
  canonicalName: string;
  /** Alternative names or aliases */
  names?: string[];
  /** Key of the default/primary variant in variants object */
  canonical: string;
  /** Logo variants available for the organization */
  variants: Record<string, LogoVariant>;
}

/**
 * The full logos index structure
 */
export interface LogosIndex {
  $schema?: string;
  [url: string]: Organization | string | undefined;
}

/**
 * Options for the logos loader
 */
export interface LogosLoaderOptions {
  /**
   * List of organization URLs to include.
   * If not provided, all organizations will be loaded.
   */
  urls?: string[];

  /**
   * Full URL to the logos index.json file.
   * If provided, baseUrl must also be provided.
   * @default "https://foreview.github.io/aisafety-logos/index.json"
   */
  indexUrl?: string;

  /**
   * Base URL for fetching logo files.
   * Required when indexUrl is provided.
   * @default "https://foreview.github.io/aisafety-logos/"
   */
  baseUrl?: string;

  /**
   * Prefer SVG files over PNG when available.
   * @default true
   */
  preferSvg?: boolean;

  /**
   * Directory within public/ to download logos to.
   * @default "logos"
   */
  publicDir?: string;
}

/**
 * A downloaded logo variant
 */
export interface DownloadedVariant {
  /** Path to color logo */
  color?: string;
  /** Path to white logo */
  white?: string;
  /** Logo type (mark, wordmark, lockup) */
  type: "mark" | "wordmark" | "lockup";
  /** Logo dimensions */
  dimensions?: {
    width: number;
    height: number;
  };
}

/**
 * Data shape for each organization in the content collection
 */
export interface OrganizationData {
  /** Organization name */
  name: string;
  /** Canonical URL */
  url: string;
  /** Alternative names */
  names?: string[];
  /** Key of the canonical variant */
  canonical: string;
  /** All logo variants */
  variants: Record<string, DownloadedVariant>;
}
