---
title: "Enigma and the Polish Cipher Bureau"
order: 70
era: ww2
when: "1932 to 1939"
place: "Warsaw, then Bletchley Park"
line: "Three Polish mathematicians read the German army's Enigma for years, then gave everything to the British and French."
description: "Marian Rejewski, Jerzy Różycki and Henryk Zygalski of the Polish Cipher Bureau broke Enigma in the winter of 1932 to 1933 and handed their methods over at Pyry in July 1939: use a working Enigma, then find a day's key from the doubled message keys, as Rejewski did."
story: |
  In the 1930s the German army enciphered its radio messages with Enigma, a machine of turning rotors. At the end of 1932 Marian Rejewski, a young mathematician at the Polish Cipher Bureau in Warsaw, used the theory of permutations, together with German documents passed on by French intelligence, to work out how the military Enigma was wired. Around the New Year of 1933 the Poles read their first Enigma messages. With his colleagues Jerzy Różycki and Henryk Zygalski he kept reading them for years, inventing new methods and machines each time the Germans changed their rules. In late July 1939, weeks before Germany invaded Poland, they showed everything to British and French codebreakers at Pyry, near Warsaw.
more: |
  The weak point the Poles used first was a rule for operators. Each message had its own key: three letters, the start of the rotors. Until September 1938 the operator enciphered those three letters **twice**, at the start position set for the whole day, and sent the six letters at the head of the message. So the first and the fourth letter hid the same letter, and so did the second and fifth, and the third and sixth.

  To use this every day, Rejewski had a **cyclometer** built: two sets of Enigma rotors wired together, which showed for each rotor position the lengths of the chains you will trace below. With it the Poles made a card catalogue of all 6 rotor orders and 17,576 start positions, 105,456 entries. With the catalogue, a day's key took minutes. When the rules changed, Zygalski's perforated sheets and an electromechanical machine, the bomba, took its place.

  At Pyry the Poles gave each of their guests, among them Alastair Denniston and Dilly Knox of the British Government Code and Cypher School, a Polish-built copy of the Enigma and explained their methods.
machine: |
  Choose three of the five rotors, their start letters and a few plugboard pairs, then type. With each key the right rotor turns one step (and now and then the next one), so the same letter comes out differently each time. The current runs through the plugboard, the three rotors, a reflector, back through the rotors and the plugboard again; that is why no letter can become itself, and why the same machine, set the same way, deciphers.
task: |
  You have a day's traffic: the first six letters of 30 messages, each a three letter message key enciphered twice at the day's secret start. **Step 1:** trace the chains from the first letter to the fourth, the second to the fifth and the third to the sixth, as Rejewski did. **Step 2:** look the chain lengths up in the catalogue. It gives the rotor order and the start position, and the day's messages open.
hints:
  - "Tap any letter in the first row: the page follows it from message to message until it comes back, and writes the chain. Then tap a letter that is still free."
  - "Every letter belongs to exactly one chain, so each row is complete when its chain lengths add up to 26. Lengths always come in pairs."
  - "The three lines should read: 12 12 1 1, then 7 7 5 5 1 1, then 5 5 5 5 1 1 1 1 1 1. Then search the catalogue."
truth: |
  **Why the chains work.** The plugboard swaps letters before and after the rotors. It changes which letters stand in a chain, but not how long the chains are. So the lengths depend only on the rotor order and the start position, and those can be catalogued once and for all. Rejewski wrote that about 80 messages of one day were usually enough to see every chain.

  **After Pyry.** The British built on what the Poles had shown them. GCHQ, the successor of the Government Code and Cypher School, says that the knowledge gained in Poland transformed its approach to Enigma. At Bletchley Park, Alan Turing and others designed the British Bombe, a machine for finding Enigma keys.

  **About the puzzle.** Our machine is the Enigma I with rotors I to V and reflector B, from the published wirings. The day key is ours, with the ring settings left at A to keep the puzzle short; the Poles had to find those too. We picked 30 messages whose keys happen to cover every letter.

  Then and now: Rejewski showed that a cipher machine does not stay secret. Modern ciphers are designed to stay safe even when the attacker knows exactly how they work; only the key is secret.
disagree:
  - "**Which day was the meeting?** Rejewski wrote that it was held on 25 July 1939. GCHQ says 25 and 26 July, the UK government's history blog 26 July, and the Polish Foreign Intelligence Agency 25 to 27 July, with the visit to the codebreaking centre at Pyry on the 25th."
myth:
  claim: "Alan Turing broke Enigma on his own."
  text: "The Poles had read Enigma since the winter of 1932 to 1933 and handed over their methods and machines in July 1939. Turing's work at Bletchley Park was vital, but it built on theirs and was one part of the work of many people. The film *U-571*, in which American sailors seize an Enigma from a U-boat, is fiction: the capture it borrows from was British. On 9 May 1941 a boarding party from HMS Bulldog took an Enigma machine and code books from U-110, before the United States had entered the war."
sources:
  - text: "M. Rejewski, \"An application of the theory of permutations in breaking the Enigma cipher\", *Applicationes Mathematicae* 16(4), 1980, pp. 543 to 559 (typeset copy on cryptocellar.org)."
    url: "https://cryptocellar.org/enigma/files/rew80.pdf"
  - text: "GCHQ, \"The Pyry Forest meeting\"."
    url: "https://www.gchq.gov.uk/information/the-pyry-forest-meeting"
  - text: "UK Government history blog, \"What's the context? Polish cryptologists reveal they have cracked the Enigma code, 26 July 1939\", 2019."
    url: "https://history.blog.gov.uk/2019/07/26/whats-the-context-polish-cryptologists-reveal-they-have-cracked-the-enigma-code-26-july-1939/"
  - text: "Foreign Intelligence Agency (Agencja Wywiadu, Poland), \"Enigma decryption\"."
    url: "https://aw.gov.pl/en/history/enigma-decryption/183,Enigma-decryption.html"
  - text: "T. Sale, \"The Polish cyclometer\", Virtual Wartime Bletchley Park."
    url: "https://codesandciphers.org.uk/virtualbp/poles/cyclom.htm"
  - text: "University of Cambridge, Department of Engineering, \"Enigma code-breaking machine rebuilt at Cambridge\" (a working replica of the cyclometer)."
    url: "https://www.eng.cam.ac.uk/node/5585"
  - text: "uboat.net, \"U-110\" (the capture of 9 May 1941)."
    url: "https://www.uboat.net/boats/u110.htm"
  - text: "CBS News, \"Hollywood heroism under fire\" (on the film U-571)."
    url: "https://www.cbsnews.com/news/hollywood-heroism-under-fire"
---
