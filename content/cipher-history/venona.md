---
title: "Venona"
order: 80
era: cold-war
when: "1943 to 1980"
place: "United States"
line: "A one-time pad cannot be broken. A one-time pad used twice can."
description: "Venona, the US Army's and later NSA's work on Soviet messages enciphered with one-time pads that had been printed twice: encipher with a pad, then break two messages in depth by subtracting them and dragging guessed words along."
story: |
  On 1 February 1943 a small US Army codebreaking team began to study enciphered Soviet telegrams. They were thought to be unbreakable: the words were put into a numbered code, and then a string of random digits from a one-time pad was added. In the autumn of 1943 Lieutenant Richard Hallock found that some pad pages had been used more than once. The Soviet makers of the pads had printed some 35,000 pages of key twice. Over the following decades the codebreakers read parts of nearly 3,000 messages, many of them from Soviet intelligence, and found the trail of spies inside the United States.
more: |
  The team was at first led by Gene Grabeel, who had just joined. In November 1944 analysts including Genevieve Feinstein worked out how to tell which messages shared a pad page. The linguist Meredith Gardner then led the work of rebuilding the codebooks; late in 1946 he read a message with a list of scientists working on the atomic bomb.

  The messages came from five different Soviet systems: trade representatives, diplomats, and three intelligence services, among them the KGB and the army's GRU. Many people in them hid behind cover names. Among the spies the decrypts helped to unmask were the atomic scientist Klaus Fuchs and Julius Rosenberg.

  The work went on, in secret, until 1 October 1980. The translations were made public from July 1995.
machine: |
  A message is first put into **code**: every word a group of four digits (words that are not in the book are spelled out, letter by letter). Then a group of random digits from the **one-time pad** is added to each code group, digit by digit (in our machine without carrying: 7 + 5 gives 2). Type a few words.
task: |
  Two messages, A and B, were enciphered with the **same pad page**. You have the codebook (the real codebreakers had to rebuild theirs too, which took years). **First** subtract B from A, digit by digit: the key cancels out, and what is left is code A minus code B. **Then** guess a word that might be in one message and drag it along: at each place, the difference tells you what the other message must have there. If that is a word in the book, you have probably found both.
hints:
  - "Telegrams often begin with who they are from and end with stop. Try from in message A, or stop in message B."
  - "Every word you place gives you a word in the other message, and the key for that place. Keep going until all 11 places read in both."
  - "Message A: from station source met courier on friday documents follow by pouch. Message B: urgent reply money received send new instructions for next week stop."
truth: |
  **Why the pad failed.** With a one-time pad, every key digit is random and used once, so a ciphertext on its own says nothing about the message. But if the same key is added to two messages, subtracting one from the other removes the key completely. What is left is two messages mixed together, and two meaningful messages can be pulled apart by guessing, as you just did. Real Soviet codebooks were much bigger than ours, and finding which messages shared a page was itself a hard problem.

  **No captured codebook.** The NSA stresses that the work was done "without supercomputers, capture of keypads, or even a stolen codebook".

  **About the puzzle.** The codebook, the messages and the key are ours. The real decrypts, with Soviet cover names and their known identities, are in the NSA's Venona release.

  Then and now: the Toolbox has a [one-time pad](/toolbox/one-time-pad/) and [XOR](/toolbox/xor/). With bits instead of digits the same rule holds: never use a key twice.
disagree:
  - "**Why were the pages printed twice?** The NSA's short history says the Soviet factory duplicated about 35,000 pages because of the pressure of the German advance on Moscow. The NSA and CIA's 1996 Venona volume dates the duplication to a few months in early 1942 and says the KGB's cryptographic centre printed more than 35,000 duplicate pages \"for some unknown reason\"."
myth:
  claim: "Venona shows that the one-time pad can be broken."
  text: "The pad itself was never broken. Its one rule was broken: each page must be used once. The messages that could be read were those whose key pages had been printed and used twice."
sources:
  - text: "NSA, Cryptologic Almanac 50th Anniversary Series, \"VENONA: An Overview\" (DOCID 3575728), mirror at The Black Vault."
    url: "https://documents.theblackvault.com/documents/nsa/cryptoalmanac/VENONA_An_Overview.pdf"
  - text: "R. L. Benson, M. Warner (eds.), *Venona: Soviet Espionage and the American Response, 1939 to 1957*, NSA and CIA, 1996: foreword, introduction and the inset \"What made Venona possible?\" by C. J. Phillips."
    url: "https://www.cia.gov/resources/csi/static/Venona-Front-Matter-Introduction-chronology-abbreviations.pdf"
  - text: "CIA, press release of 11 July 1995 on the first release of Venona translations (copy at the Federation of American Scientists)."
    url: "https://irp.fas.org/cia/news/pr71195.html"
---
