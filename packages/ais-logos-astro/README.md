# ais-logos-astro

Astro integration for loading AI Safety organization logos.

## Installation

```bash
pnpm add @foreview/ais-logos-astro
```

## Usage

In your `src/content.config.ts`:

```ts
import { defineCollection } from "astro:content";
import { logosLoader, organizationSchema } from "@foreview/ais-logos-astro";

const organizations = defineCollection({
  loader: logosLoader({
    urls: [
      "https://cesia.org",
      "https://encode.org",
      "https://foreview.org",
    ],
  }),
  schema: organizationSchema,
});

export const collections = { organizations };
```

Then in your Astro components:

```astro
---
import { getCollection } from "astro:content";

const orgs = await getCollection("organizations");
---

{orgs.map((org) => (
  <img
    src={org.data.variants[org.data.canonical].color}
    alt={org.data.name}
  />
))}
```

## Options

```ts
logosLoader({
  // Organization URLs to include (optional - loads all if not specified)
  urls: ["https://example.org"],

  // Full URL to the index.json file
  indexUrl: "https://foreview.github.io/aisafety-logos/index.json",

  // Base URL for logo files (required when indexUrl is set)
  baseUrl: "https://foreview.github.io/aisafety-logos/",

  // Prefer SVG over PNG when available (default: true)
  preferSvg: true,

  // Directory in your public directory where logos are downloaded (default: "logos")
  publicDir: "logos",
})
```

## Logo Component

Create a reusable logo component in your project:

```astro
---
// src/components/OrgLogo.astro
import { getCollection } from "astro:content";

interface Props {
  url: string;
  variant?: string;
  color?: "color" | "white";
  class?: string;
}

const { url, variant, color = "color", class: className } = Astro.props;

const orgs = await getCollection("organizations");
const org = orgs.find((o) => o.data.url === url || o.data.url === url + "/");

const variantKey = variant ?? org?.data.canonical;
const logoVariant = variantKey ? org?.data.variants[variantKey] : undefined;
const src = logoVariant?.[color];
---

{src && <img src={src} alt={org?.data.name} class={className} />}
```

Usage:

```astro
<!-- Default (canonical) variant, color -->
<OrgLogo url="https://foreview.org" />

<!-- Specific variant -->
<OrgLogo url="https://foreview.org" variant="mark" />

<!-- White version -->
<OrgLogo url="https://foreview.org" color="white" class="h-8" />
```

## Data Schema

Each organization entry includes:

- `name` - Organization name
- `url` - Canonical URL
- `names` - Alternative names (optional)
- `canonical` - Key of the default variant
- `variants` - Object with all logo variants:
  - `[key]` - Variant name (e.g., "default", "mark")
    - `color` - Path to color logo
    - `white` - Path to white logo
    - `type` - "mark" | "wordmark" | "lockup"
    - `dimensions` - `{ width, height }` of the logo
