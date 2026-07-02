# Rithvik Kasarla Personal Site

Static first pass for a personal website with a blog.

Open `index.html` directly in a browser, or deploy the folder contents to GitHub Pages.

## Structure

- `index.html`: homepage, selected work, research, blog links, contact
- `blog/index.html`: blog index
- `blog/*.html`: starter posts
- `assets/styles.css`: site styling

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
