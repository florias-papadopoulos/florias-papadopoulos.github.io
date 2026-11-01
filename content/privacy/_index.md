---
title: "Privacy"
description: "How this site handles your data: who runs it, where it is hosted, what the visit counter records, and your rights."
layout: privacy
updated: "1 November 2026"
# linked from the footer (layouts/partials/footer.html), /you/ and /stats/; kept out of lists and search
build:
  list: never
outputs: [html]
searchHidden: true
# the short version at the top of the page
short:
  - "No cookies, no ads, no analytics service, no tracking across sites."
  - "A visit counter keeps **daily totals** of five things (page, referring site, device type, browser family, country). No IP addresses, nothing about any one visitor."
  - "If your browser sends Do Not Track or Global Privacy Control, your visits are not counted at all."
  - "Your settings, game scores and the optional \"remember me\" on [What this site knows about you](/you/) stay in your browser."
---

## Who runs this site

This is the personal website of Florias Papadopoulos, doctoral researcher at the University of St. Gallen (HSG), Switzerland. I am responsible for it. You can reach me on [LinkedIn](https://www.linkedin.com/in/florias-papadopoulos-b035ab233).

## Hosting: GitHub Pages

The pages are served by GitHub Pages. To deliver them, GitHub necessarily receives your IP address and the usual request details, and keeps logs of them for security purposes. That happens on GitHub's side under the [GitHub General Privacy Statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement); I do not see those logs.

## The visit counter: Cloudflare

To know how many people visit, each page view sends one small request to a counter of mine that runs on Cloudflare Workers. It adds one to the totals of the day for:

- the page you opened,
- the site that sent you, only when it is another site,
- phone, tablet or computer,
- your browser's family name (Firefox, Chrome, Safari and so on),
- your country, which Cloudflare works out from your connection.

Only these daily totals are kept. There are no cookies, no IP addresses are stored, and nothing links one page view to another or to you. The totals are public on [Site stats](/stats/). Cloudflare processes the request to run the counter, under the [Cloudflare Privacy Policy](https://www.cloudflare.com/privacypolicy/).

**How to opt out:** turn on Do Not Track or Global Privacy Control in your browser, and the counter receives nothing from your visits. On [Site stats](/stats/) you can also switch counting off for one browser.

## The lesson on "What this site knows about you"

The page [What this site knows about you](/you/) shows you what the counter records about your visit. If your visit is counted, it also asks the counter which country it would record; nothing is stored.

Its last part runs only when you press its button. Your browser then works out a fingerprint and sends it to my counter, which sends back everything that reached it with that request (your IP address, the location and network data Cloudflare attaches, your browser and language headers, the fingerprint and the optional id) and keeps none of it: no database entry, no log line.

The optional **Remember me on this browser** button stores a random id, a visit count and the date of your last visit in your browser's local storage (under `you-visitor`). It is created only when you press that button, sent only when you press the main button, and only to be shown back to you. **Forget me**, or clearing this site's data in your browser, deletes it.

## Storage in your browser

The site sets no cookies. A few things are kept in your browser's local storage so the site remembers them for you: the look of the cat you chose, how often you petted it, the hints you have seen, game best scores, chosen levels and game settings, and the "don't count my visits" choice on Site stats. They never leave your browser, and clearing this site's data removes them.

## No other third parties

Fonts and formula files are served from this site itself. There are no ads, social media plugins, embedded videos or maps. Links to other sites (LinkedIn, GitHub, publishers, OpenStreetMap) only take you there when you click them.

Google Search Console shows me totals of the Google searches that led to this site (search terms and clicks), which Google gets from its own search engine. It runs no code on this site and never tells me who searched.

## Your rights

Under the Swiss Federal Act on Data Protection (nFADP) you can ask me what personal data I hold about you, and ask for it to be corrected or deleted. Since this site stores nothing personal about visitors, there is usually nothing to look up. For data that GitHub or Cloudflare process to deliver the site, their privacy statements explain how to reach them.
