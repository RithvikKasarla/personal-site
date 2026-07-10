# Rithvik Kasarla Personal Site

Static personal site built as a mechanical world lift. The homepage is one continuous application: the arrival floor introduces Rithvik, then the car descends through collections of projects, papers, field notes, and experiments.

Open `index.html` directly in a browser, or deploy the folder contents to GitHub Pages.

## Structure

- `index.html`: world-lift homepage and collection floors
- `assets/world-lift.css`: world-lift homepage styling
- `assets/world-lift.js`: floor indicator behavior
- `assets/world-lift-blog.css`: shared world-lift styling for the blog index and articles
- `blog/index.html`: blog index
- `blog/*.html`: starter posts
- `assets/styles.css`: archived pre-lift styling; no longer loaded by the site

`design-prototype.html` and its related assets remain the design study from which the homepage direction was chosen. Do not ship its variant switcher or its cumulative prototype CSS.

## Deployment Notes

The GitHub account currently has:

- profile repo: `RithvikKasarla/RithvikKasarla`
- old Pages repo: `RithvikKasarla/RithvikKasarla.github.io`
- profile blog URL: `http://rithvik-dev.com`

`gh auth status` reports an invalid local token, so pushing or repo setup will need:

```bash
gh auth login -h github.com
```

After auth is fixed, this can either replace the old `RithvikKasarla.github.io` site or become a new repository connected to `rithvik-dev.com`.
