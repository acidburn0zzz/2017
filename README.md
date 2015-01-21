# Ind.ie Site

## Build

1. To install all required modules, use `./install`
2. To run the dev process (to watch and compile files, and run web server), use `./dev`

### Commands in `./dev`

`edit`             Opens the site in Sublime Text.
`view`             Opens the site in the browser for viewing
`build [options]`  Builds the whole site. Options: `no-cache` (full rebuild, very slow), `partials` (ignores .html and .styl), or pass in an extension to ignore the cache for (e.g., `build .styl` or `build .html`
`deploy`           Deploys the site
`help`             Output help
`exit`             Bye bye!
`*`                Catchall

Options:

`-h`, `--help`     output usage information
`-V`, `--version`  output the version number
`-d`, `--dry-run`  dry run
`--verbose`

## Structure

We’re aiming to keep the site as modular as possible, with each page using it’s own CSS file, compiled from only the required partials.

Every imported file’s URL should be relative to the root, rather than relative to that file. This will allow for the page to be moved without the URL breaking. The exception to this is for modular assets kept within the same folder as the page (see modular assets below).

### Assets

We’re moving away from using `/assets` as a name, rather keeping assets in folders named after their type:
- `/images`
- `/includes`
- `/js` (because we’re unlikely to have other script types)
- `/styles` (not stylus)

There’s a central area for assets (currently in `/source/assets`) which contains assets that are commonly required by many different pages across the site. This will include files like common stylus partials, navigation, header and footer structures, logos and icon graphics.

### Modular assets

Assets that are required by only that page are kept in that page’s folder, in the same `/assets`-less structure.