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
  - "Your settings and game scores stay in your browser."
  - "The two-player game passes two devices' connection details (with their IP addresses) on between them and deletes them within two minutes. The race itself runs directly between the two devices, or, when they cannot reach each other, encrypted through Cloudflare's relay."
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

## Racing a friend: Kitty Kart Duo

In Kitty Kart Duo on the [Games](/games/) page, two people race each other from their own phones or computers. To find each other, each of the two devices sends one short connection message, which contains its network addresses, including its IP address. The counter on Cloudflare holds the two messages under a four letter code only to pass them on: it deletes them as soon as the host's device has picked up the answer, and at the latest after two minutes. It stores nothing else and logs nothing. To learn its own public address, each device also asks Cloudflare's STUN service, which sees that request like any other connection.

After that the two devices talk directly, and nothing about the race goes through a server. As with any direct connection, each of the two devices sees the other's IP address, so race with people you are happy to share that with.

Some networks keep two devices from reaching each other directly, for example a phone's hotspot, two different mobile networks, or a strict wifi. Then the race goes through Cloudflare's relay service (TURN) instead: for this, the counter gives each device a relay password that expires after two hours, and Cloudflare passes the race data between the two devices. That data is encrypted between the two devices, so the relay cannot read it; like any server, it sees the two devices' IP addresses while it passes the data on. The counter only counts how many relay passwords it hands out each day, to cap them, and keeps nothing else.

## The page "What this site knows about you"

The page [What this site knows about you](/you/) shows you what the counter records about your visit. If your visit is counted, it also asks the counter which country it would record; nothing is stored.

## Storage in your browser

The site sets no cookies. A few things are kept in your browser's local storage so the site remembers them for you: the look of the cat you chose, how often you petted it, the hints you have seen, game best scores, chosen levels and game settings, and the "don't count my visits" choice on Site stats. They never leave your browser, and clearing this site's data removes them.

## No other third parties

Fonts and formula files are served from this site itself. There are no ads, social media plugins, embedded videos or maps. Links to other sites (LinkedIn, GitHub, publishers) only take you there when you click them.

Google Search Console shows me totals of the Google searches that led to this site (search terms and clicks), which Google gets from its own search engine. It runs no code on this site and never tells me who searched.

## Your rights

Under the Swiss Federal Act on Data Protection (nFADP) you can ask me what personal data I hold about you, and ask for it to be corrected or deleted. Since this site stores nothing personal about visitors, there is usually nothing to look up. For data that GitHub or Cloudflare process to deliver the site, their privacy statements explain how to reach them.
