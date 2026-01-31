import { z } from "astro/zod";

/**
 * Zod schema for a downloaded logo variant
 */
export const variantSchema = z.object({
  /** Path to color logo */
  color: z.string().optional(),
  /** Path to white logo */
  white: z.string().optional(),
  /** Logo type */
  type: z.enum(["mark", "wordmark", "lockup"]),
  /** Logo dimensions */
  dimensions: z
    .object({
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

/**
 * Zod schema for organization data in content collections
 */
export const organizationSchema = z.object({
  /** Organization name */
  name: z.string(),
  /** Canonical URL */
  url: z.string().url(),
  /** Alternative names */
  names: z.array(z.string()).optional(),
  /** Key of the canonical variant */
  canonical: z.string(),
  /** All logo variants */
  variants: z.record(z.string(), variantSchema),
});

export type VariantSchema = z.infer<typeof variantSchema>;
export type OrganizationSchema = z.infer<typeof organizationSchema>;
