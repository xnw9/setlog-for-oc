# Fonts

Font files live in this folder and are **self-hosted**. Nothing is loaded from Google Fonts or
any other CDN, so the app works offline as a PWA and no request leaks the user's IP to a third
party — which is what "your photos never leave this device" implies.

## Adding Nunito

1. Download the **Nunito** webfont (SIL Open Font License 1.1) — e.g. from
   [fontsource](https://fontsource.org/fonts/nunito) or
   [google-webfonts-helper](https://gwfh.mranftl.com/fonts/nunito), choosing **woff2** and the
   **latin** subset.
2. Drop these four files into this folder (the weights `global.css` and the components use):

   ```
   nunito-400.woff2   regular
   nunito-600.woff2   semibold
   nunito-700.woff2   bold      (buttons, labels)
   nunito-800.woff2   extrabold (headings, avatar initials)
   ```

3. Append to `fonts.css`:

   ```css
   @font-face {
     font-family: 'Nunito';
     src: url('./nunito-400.woff2') format('woff2');
     font-weight: 400;
     font-style: normal;
     font-display: swap;
   }
   /* …repeat for 600, 700 and 800, changing only src and font-weight. */
   ```

   A variable font works too — ship one file and use `font-weight: 400 800;` in a single rule.

Vite hashes and rewrites these URLs at build time, so they resolve correctly under the
relative `base: './'` the project builds with. That is why the files live in `src/styles/`
rather than `public/`, where an absolute `/fonts/…` path would break on a sub-path host.

Until files are added, `Nunito` doesn't resolve and the stack falls through to `system-ui`.
The app is fully usable either way — only the rounded look is missing.
