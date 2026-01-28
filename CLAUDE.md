### Fetching things

The WebFetch tool does not give you access to the code. Use curl when you're looking for the code and WebFetch when you're looking for information.

### Working with image data

Never manipulate image data or SVGs manually, always run little scripts `uv run --with ... script.py` or commands. Always check that SVGs are not PNGs in disguise check for `<image>` tags, etc.

### Adding a new logo

Add its canonical url with scheme to <index.json>, it servers as its unique identifier.

The canonical name is whatever most people say when mentionning them. Ask the user if you don't know. If you're aware of extra names, add them to names.

You must provide at least one canonical variant for logos with a color and white version. If there is no white version, ask the user for it, unless you can trivially generate it.

If the file is a SVG, optimize it with `pnpm dlx svgo input.svg -o optimized.svg`, then verify with `./scripts/svg_diff.py input.svg optimized.svg`. Exit code 0 means identical, 1 means differences found. View the diff image in `/tmp` to inspect any changes.

Then validate the JSON is correct: `uvx check-jsonschema --schemafile index.schema.json index.json`

Then delete any intermediate files or scripts you created in the process that are specific to this logo.

Then commit: `git commit -m "new: [logo0], [logo1], [...]"`

Then push.

### Changing the index

For one off changes, edit directly.

To make programmatic changes:
* Use jq+sponge: `jq 'walk(if type == "object" and has("name") then .canonicalName = .name | del(.name) else . end)' index.json | sponge index.json`
* Create a python script that you run with uv and install dependencies on the fly with `uv run --with httpx python descriptive_name.py`.
* Don't use sed.
