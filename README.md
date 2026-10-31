# Matej’s Angels

Bilingual static website for Sanja and Matej’s family kennel in Premantura.
Published HTML is committed at the repository root and in `en/` and `hr/`.
There is no server framework or production dependency installation.

## Edit and build

- `templates/header.html` and `templates/footer.html`: shared shell for every page.
- `templates/pages/`: page-specific source; edit these instead of generated HTML.
- `content/strings.json`: paired English/Croatian navigation, homepage and shared copy.
- `content/page-copy.json`: paired hero content for each translated page type.
- `content/routes.json`: exact language partners; homepage and About are distinct.
- `css/editorial.css`: warm editorial styling; `css/style.css`: base components.
- `js/refinements.js`: keyboard profile tabs and the email composer.

Run `python tools/build_site.py` after edits. It renders all pages, updates asset
cache versions, adds intrinsic image sizes and selects responsive photo variants.
The build uses only Python’s standard library.

When adding photographs, install `requirements-dev.txt`, then run
`python tools/prepare_media.py` before rebuilding. Originals remain available;
large photos receive appropriately sized WebP alternatives.

## Validate before publishing

```text
python tools/build_site.py
python tools/check_site.py
python tools/check_records.py
node --test tests/privacy.test.cjs
python tools/check_browser.py
```

Browser checks require `pip install -r requirements-dev.txt` and
`python -m playwright install chromium`. They inspect every page at desktop/mobile
widths, test keyboard tabs and contact validation, and compare nine representative
page types against reviewed screenshots. After an intentional design change,
review `tests/artifacts/` and explicitly run
`python tools/check_browser.py --update-baselines` to accept the new appearance.
Baselines are platform-specific. GitHub Actions runs structural/browser checks
on Linux and uploads screenshots; local Windows runs also compare pixel baselines.
The workflow also tests the `/matejs-angels-web` subdirectory used by GitHub
Pages, including language switching inside the privacy dialog. Run that check
locally with `python tools/check_browser.py --visual-only --mount /matejs-angels-web`.

## Contact and privacy

The contact composer prepares an email in the visitor’s own email application.
It does **not** claim delivery or submit messages to a backend. The direct email,
telephone and WhatsApp links remain available. Flag Counter and external embeds
still require the corresponding privacy consent.

The Facebook page blocks automated reads. Personal introductions use names,
location and history already documented in the existing site. No additional
personal claims or unrelated coastal photographs were introduced.

Litter album structure, dates, dog identities and recorded results are retained.
Publishing in this workflow is GitHub-only; no external hosting upload is performed.

## Canonical URLs and Google indexing

The build regenerates `sitemap.xml` from the same route definitions used for
canonical tags. The Croatian About page and English homepage are included.
The historical `hr/blog` alias points canonically to `hr/vijesti` and is excluded.
Both language versions remain separate canonical pages with reciprocal hreflang.

`deploy/apache.htaccess` is the deployment-ready Apache configuration for the
custom domain. Install it as `.htaccess` in that host's document root when deploying
the current generated pages, assets and sitemap. It consolidates HTTP/www URLs onto
`https://matejsangels.com/`. Confirm the host's HTTPS/proxy configuration and test
redirects before making that configuration live. GitHub Pages ignores Apache rules.

After the custom domain is updated, submit `https://matejsangels.com/sitemap.xml`
in Search Console and inspect the canonical homepage/About URLs. Expected www/HTTP
duplicates do not need independent indexing. Discovery and indexing remain Google's
decision; a sitemap or validation request does not guarantee inclusion.

