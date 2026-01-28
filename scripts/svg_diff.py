#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.10"
# dependencies = ["cairosvg"]
# ///
"""Compare two SVGs visually and output diff metric + image path."""

import subprocess
import sys
import tempfile
from pathlib import Path

import cairosvg


def main():
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <svg1> <svg2>", file=sys.stderr)
        sys.exit(1)

    svg1, svg2 = sys.argv[1], sys.argv[2]

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp = Path(tmpdir)
        png1 = tmp / "a.png"
        png2 = tmp / "b.png"

        # Rasterize both SVGs at 4x scale for better comparison
        cairosvg.svg2png(url=svg1, write_to=str(png1), scale=4)
        cairosvg.svg2png(url=svg2, write_to=str(png2), scale=4)

        # Generate diff image in /tmp (persists after script exits)
        diff_path = Path("/tmp") / f"svg_diff_{Path(svg1).stem}.png"

        # Get pixel difference count
        result = subprocess.run(
            ["magick", "compare", "-metric", "AE", str(png1), str(png2), str(diff_path)],
            capture_output=True,
            text=True,
        )
        # ImageMagick outputs metric to stderr
        metric = result.stderr.strip()

        print(f"Pixel differences: {metric}")
        print(f"Diff image: {diff_path}")

        if metric == "0":
            sys.exit(0)
        else:
            sys.exit(1)


if __name__ == "__main__":
    main()
