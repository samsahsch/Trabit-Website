# trabit.app

Static site for [trabit.app](https://trabit.app), served by GitHub Pages.

| File | What it is |
| --- | --- |
| `index.html`, `home.css`, `home.js` | The homepage, with the interactive phone, logging demo, coach week planner, pantry demo, and habit stats. |
| `privacy.html`, `terms.html`, `support.html` | Legal and support pages. The App Store listing links to `/privacy` and `/support`. They use `styles.css`. |
| `404.html` | Fallback for universal link paths (`/add`, `/join`, ...) when the app is not installed. |
| `theme.js` | Light/dark toggle shared by every page. It fires a `themechange` event. |
| `.well-known/apple-app-site-association`, `apple-app-site-association` | Universal links. Both must stay byte-identical to `apple-app-site-association.json` in the app repo. |
| `img/` | Screenshots as WebP (360 and 660 wide), plus `og.png`, the 1200x630 share image. |
| `logos/` | Favicons and the home-screen icon, made from the app icon. |
| `tools/screenshots.sh` | Converts App Store PNG screenshots into `img/*.webp`, including dark versions. |

## Screenshots

    tools/screenshots.sh <light PNG folder> <dark PNG folder>

Once dark versions exist, add `data-dark-shots` to `#screens` in `index.html`. The phone then follows the theme.

## Copy rules

- Every claim must match the shipping app.
- No em dashes and no center dots.
- Keep it short.

## After deploying

    curl -sI https://trabit.app/.well-known/apple-app-site-association
    curl -sI https://trabit.app/apple-app-site-association
