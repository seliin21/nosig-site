# nosigapp.com

Website for the NOSIG iPhone app: home page, support and privacy policy.
Plain HTML and CSS, published with GitHub Pages at https://nosigapp.com.

## Edit and publish

Edit the pages in `src/`, then build and push:

```bash
cd /Users/atasarpetikan/Projects/nosig-site
node tools/build.mjs
git add -A && git commit -m "Update site" && git push
```

`tools/build.mjs` writes `index.html`, `privacy/index.html`, `support/index.html` and `404.html`,
inlines the hero chart and adds `analytics.html` (if present) to every page.

The hero chart (`assets/hero-chart.svg`) is drawn from the app's own map data:

```bash
node tools/make-hero.mjs /Users/atasarpetikan/Projects/nosig/assets/map
```

## Analytics

Cloudflare Web Analytics (free, no cookies): add the site in the Cloudflare dashboard, copy the
JavaScript snippet into a file named `analytics.html` in this folder, run the build and push.

## App Store link

The download buttons link to https://apps.apple.com/app/id6821109646. To count downloads that come
from the site, replace it with a campaign link from App Store Connect (App Analytics, Campaigns).

## Credits

Fonts: Sofia Sans, Sofia Sans Extra Condensed and Chivo Mono (SIL Open Font License, see `assets/fonts`).
Map: Natural Earth (public domain) and VATSpy Data Project FIR boundaries (CC BY-SA 4.0).
