---
title: "Privacy"
description: "How this site handles your data: who runs it, where it is hosted, what the visit counter records, and your rights."
layout: privacy
updated: "10 November 2026"
# linked from the footer (layouts/partials/footer.html), /you/ and /stats/; kept out of lists and search
build:
  list: never
outputs: [html]
searchHidden: true
# the short version at the top of the page
short:
  - "No cookies, no ads, no analytics service, no tracking across sites."
  - "A visit counter keeps **daily totals** only (page, referring site, device type, browser family, country). No IP addresses, nothing about any one visitor."
  - "Do Not Track or Global Privacy Control in your browser: your visits are not counted at all."
  - "Everything else stays in your browser, unless you choose to send it: a leaderboard score, a Kitty Kart Duo race, answers at one of my talks."
---

## Who runs this site

Florias Papadopoulos, doctoral researcher at the University of St. Gallen (HSG), Switzerland. You can reach me at <a href="#email" data-u="soluopodapap.sairolf" data-d="hc.gsinu" data-show>my HSG address</a> or on [LinkedIn](https://www.linkedin.com/in/florias-papadopoulos-b035ab233).

## Hosting and the visit counter

The pages are served by **GitHub Pages**, which receives your IP address and the usual request details to deliver them and keeps logs for security ([GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement)); I do not see those logs.

Each page view adds one to the daily totals of a counter of mine on **Cloudflare Workers** ([Cloudflare's privacy policy](https://www.cloudflare.com/privacypolicy/)): the page, the site that sent you, the device type, the browser family and the country. No cookies, no IP addresses, nothing that links your page views. With Do Not Track or Global Privacy Control turned on, the counter receives nothing from your visits. The page [What this site knows about you](/you/) shows what it records.

## What you can choose to send

- **Leaderboards:** if you add a score, the game, the difficulty, your nickname and the score are stored with the date and shown to everyone. Old scores far from the top are deleted; write to me to have one removed. Likes are only counted, never linked to you.
- **Kitty Kart Duo:** to connect two devices, each sends a short connection message with its IP address, which the counter passes on and deletes within about two minutes. The race then runs directly between the two devices, which see each other's IP address.
- **Audience mode at my talks:** your answers, questions, an optional nickname (shown with the ranking; nicknames with rude words are refused) and a random browser token, kept for that talk only and deleted 24 hours after it ends.

Deleted data can remain in Cloudflare's automatic backup for up to seven days.

## What stays in your browser

The Toolbox and the lab's paste box calculate in your browser; nothing you type is sent anywhere. Your pet, settings, best scores, liked games and similar choices are kept in your browser's local storage and never leave it; clearing this site's data removes them.

## Other services and data abroad

Fonts, formula files and game music come from this site itself; there are no ads, social media plugins or embedded videos. Google Search Console shows me totals of the Google searches that led here, without telling me who searched.

GitHub and Cloudflare are companies in the United States, so the data above may be processed there. Both are certified under the Swiss-US Data Privacy Framework.

## Your rights

Under the Swiss Federal Act on Data Protection (nFADP) you can ask me what personal data I hold about you, and have it corrected or deleted. In practice that only concerns what you chose to send yourself: a nickname and score on a leaderboard, or answers, questions and a nickname in audience mode. Write to me and I will look it up or remove it. You can also contact the Swiss Federal Data Protection and Information Commissioner (FDPIC).
