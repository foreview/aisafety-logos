#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["cairosvg", "pillow"]
# ///
"""Sync logo files and update index.json.

- Generates PNGs from SVGs at 512px height
- Updates index.json with file metadata (dimensions, MIME types)
- Idempotent: only regenerates PNGs if SVG is newer or PNG doesn't exist
"""

import json
import re
from pathlib import Path

import cairosvg
from PIL import Image

TARGET_HEIGHT = 512


def needs_regeneration(svg_path: Path, png_path: Path) -> bool:
    """Check if PNG needs to be regenerated."""
    if not png_path.exists():
        return True
    return svg_path.stat().st_mtime > png_path.stat().st_mtime


def get_svg_dimensions(svg_path: Path) -> tuple[int, int]:
    """Extract width/height from SVG viewBox or width/height attributes."""
    content = svg_path.read_text()

    # Try viewBox first
    viewbox_match = re.search(
        r'viewBox=["\'][\d.]+\s+[\d.]+\s+([\d.]+)\s+([\d.]+)["\']', content
    )
    if viewbox_match:
        return int(float(viewbox_match.group(1))), int(float(viewbox_match.group(2)))

    # Fall back to width/height attributes
    width_match = re.search(r'\bwidth=["\']?([\d.]+)', content)
    height_match = re.search(r'\bheight=["\']?([\d.]+)', content)
    if width_match and height_match:
        return int(float(width_match.group(1))), int(float(height_match.group(1)))

    raise ValueError(f"Cannot determine dimensions for {svg_path}")


def get_png_dimensions(png_path: Path) -> tuple[int, int]:
    """Get PNG dimensions using PIL."""
    with Image.open(png_path) as img:
        return img.size


def convert_svg_to_png(
    svg_path: Path, png_path: Path, height: int
) -> tuple[int, int]:
    """Convert SVG to PNG at specified height, return actual dimensions."""
    svg_width, svg_height = get_svg_dimensions(svg_path)
    scale = height / svg_height
    out_width = int(svg_width * scale)
    out_height = height

    cairosvg.svg2png(
        url=str(svg_path),
        write_to=str(png_path),
        output_width=out_width,
        output_height=out_height,
    )
    return out_width, out_height


def get_mime_type(path: str) -> str:
    """Get MIME type for file."""
    if path.endswith(".svg"):
        return "image/svg+xml"
    elif path.endswith(".png"):
        return "image/png"
    raise ValueError(f"Unknown file type: {path}")


def make_file_entry(file_path: str, width: int, height: int) -> dict:
    """Create a file entry for the new schema."""
    return {
        "file": file_path,
        "type": get_mime_type(file_path),
        "width": width,
        "height": height,
    }


def main():
    root = Path(__file__).parent.parent
    index_path = root / "index.json"

    with open(index_path) as f:
        index = json.load(f)

    new_index = {"$schema": index["$schema"]}

    for url, org in index.items():
        if url == "$schema":
            continue

        new_org = {
            "canonicalName": org["canonicalName"],
        }
        if "names" in org:
            new_org["names"] = org["names"]

        new_variants = {}
        for variant_name, variant in org["variants"].items():
            new_variant = {}

            for color_type in ["color", "white"]:
                if color_type not in variant:
                    continue

                # Handle both old (string) and new (list) formats
                variant_value = variant[color_type]
                if isinstance(variant_value, list):
                    # Already converted - get the first (source) file
                    file_path = variant_value[0]["file"]
                else:
                    file_path = variant_value

                full_path = root / file_path
                entries = []

                if file_path.endswith(".svg"):
                    # Get SVG dimensions, normalized to TARGET_HEIGHT for consistency with PNGs
                    svg_width, svg_height = get_svg_dimensions(full_path)
                    scale = TARGET_HEIGHT / svg_height
                    normalized_width = int(svg_width * scale)
                    entries.append(make_file_entry(file_path, normalized_width, TARGET_HEIGHT))

                    # Generate PNG if needed
                    png_path = file_path.replace(".svg", ".png")
                    png_full_path = root / png_path

                    if needs_regeneration(full_path, png_full_path):
                        print(f"Converting {file_path} -> {png_path}")
                        png_width, png_height = convert_svg_to_png(
                            full_path, png_full_path, TARGET_HEIGHT
                        )
                    else:
                        print(f"Skipping {png_path} (up to date)")
                        png_width, png_height = get_png_dimensions(png_full_path)

                    entries.append(make_file_entry(png_path, png_width, png_height))

                elif file_path.endswith(".png"):
                    # Existing PNG, just get dimensions
                    width, height = get_png_dimensions(full_path)
                    entries.append(make_file_entry(file_path, width, height))

                new_variant[color_type] = entries

            new_variants[variant_name] = new_variant

        new_org["variants"] = new_variants
        new_index[url] = new_org

    # Write updated index
    with open(index_path, "w") as f:
        json.dump(new_index, f, indent=2)
        f.write("\n")

    print(f"\nUpdated {index_path}")


if __name__ == "__main__":
    main()
