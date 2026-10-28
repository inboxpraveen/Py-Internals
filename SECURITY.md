# Security

## Reporting a vulnerability

Please do not open a public issue for a security problem. Use GitHub's private reporting: open the repository's **Security** tab and choose **Report a vulnerability**. Include a description, the page it affects and steps to reproduce. You will get an acknowledgement within a few days, and a fix is published as a normal commit to `main`. You are credited in the commit unless you would rather not be named.

## What this project does and does not do

Py Internals is a set of static files served by GitHub Pages. There is no server code, no database, no login and no form that sends data anywhere.

- **Nothing is collected.** There are no cookies, no analytics and no accounts.
- **Two values stay on the reader's device.** `localStorage` holds which sessions were finished (`pj_completed`) and which one was opened last (`pj_last`). Nothing reads them but the site itself.
- **One third party.** Each page links the Google Fonts stylesheet and font files (Lora, DM Sans, JetBrains Mono). The browser contacts Google to fetch them. Nothing else is loaded from another host.
- **No user content.** The pages render text that is written in the repository. Nothing a visitor types is ever inserted into a page, so there is no stored or reflected content to attack. Reports of cross-site scripting should show how an outside party can get their own text into a page.
- **Pull requests are the attack surface.** Because the whole site is source in this repository, the realistic risk is a malicious change. Every change goes through review, and the project has no runtime dependencies to compromise.

## Supported versions

Only the live site, built from the latest commit on `main`, is supported.
