---
title: "Bellaso's countersign, and how Kasiski broke it"
order: 30
era: renaissance
when: "1553, broken in print 1863"
place: "Venice, then Prussia"
line: "A short key word changes the alphabet at every letter. It took three centuries for a general way to break it to appear in print."
description: "Giovan Battista Bellaso's keyword cipher of 1553, later misnamed after Vigenère, and Friedrich Kasiski's attack of 1863: find the key length from repeats, then break each column."
story: |
  In 1553 Giovan Battista Bellaso, from a noble family of Brescia, published a small booklet in Venice. In it he proposed a key that is easy to remember and easy to change: a word or a few words, which he called the countersign. You write the countersign over your message again and again, and each of its letters decides which shifted alphabet enciphers the letter below it. So the same letter of the message comes out in different ways, and simply counting letters no longer works. The method was later named after someone else, Blaise de Vigenère; in 1863 a retired Prussian officer, Friedrich Kasiski, published how to break it.
more: |
  **Bellaso.** Almost nothing is known of his life. He served in the household of Cardinal Pio da Carpi, and his booklet of 1553 was printed again in 1557. He kept improving his ciphers and published a new book on them in 1564.

  **The square.** A table of 26 alphabets, each shifted one place further, was already in print: the German scholar Johannes Trithemius had described it in his *Polygraphia*, the first printed book on cryptography. Bellaso's new step was the key: instead of using the alphabets in a fixed order, a short word, which anyone can learn by heart and change at any time, chooses them.

  **Kasiski.** Friedrich Wilhelm Kasiski (1805 to 1881) spent his career as an infantry officer in Prussia and retired as a major in 1852. In 1863 he published *Die Geheimschriften und die Dechiffrir-Kunst* (Secret writing and the art of deciphering). Later in life he turned to archaeology instead.
machine: |
  Choose a countersign and type a message. Each key letter sits over one letter of the message and picks the shifted alphabet for it.
task: |
  This message was enciphered with an unknown countersign (we wrote it for this puzzle). Break it the way Kasiski describes, in two steps. **Step 1:** find pieces of ciphertext that repeat and measure the gaps between them; the key length divides the gaps. **Step 2:** split the message into one column per key letter. Each column is an ordinary shift cipher, so its letter counts look like English, just moved along. Slide each column until its bars match.
hints:
  - "Most gaps are multiples of the same number. 10 fits many gaps too, but 10 is twice that number."
  - "The key has 5 letters. In each column, look for the tallest bar: it is usually E."
  - "The countersign is an Italian word for a flower, FIORE."
truth: |
  **What Kasiski saw.** When a common word, such as "the", falls under the same part of the key twice, it is enciphered the same way twice. So the ciphertext repeats, and the gap between the repeats is a multiple of the key length. Kasiski's advice: measure the gaps, break them into factors, and the factor that keeps coming back is the length of the key. With the length known, the message falls apart into columns that are each a simple shift, and simple shifts fall to letter counting. This two-step attack is still called the Kasiski examination.

  **"Unbreakable"?** For centuries the cipher was thought to be unbreakable. It was not: codebreakers of the 16th century, such as Giovanni Battista Argenti, already read some messages in it, by guessing the key. Kasiski's book was the first general method in print, one that works without a lucky guess.

  Then and now: the Toolbox has a [Vigenère cipher](/toolbox/vigenere/), [Kasiski examination](/toolbox/kasiski/) and a [Vigenère breaker](/toolbox/vigenere-breaker/) that does both steps for you.
myth:
  claim: "Blaise de Vigenère invented the Vigenère cipher."
  text: "Vigenère, a French writer, published a large book on ciphers in the 1580s and described stronger ciphers of his own. The simple repeating-key cipher came from Bellaso's booklet of 1553 and was later given Vigenère's name. Historians of cryptography have pointed out the mistake for decades, but the name has stuck."
sources:
  - text: "D. Kahn, *The Codebreakers*, Macmillan, 1967: p. 137 (Bellaso), pp. 145 to 148 (Vigenère and the misnaming), pp. 207 to 209 (Kasiski)."
  - text: "A. Petrucci, \"Bellaso, Giovan Battista\", *Dizionario Biografico degli Italiani*, vol. 7, 1970 (in Italian)."
    url: "https://www.treccani.it/enciclopedia/giovan-battista-bellaso_(Dizionario-Biografico)/"
  - text: "K. Pommerening, \"Polyalphabetic substitution: the Renaissance\", lecture notes on cryptology, University of Mainz (archived copy)."
    url: "https://web.archive.org/web/2023/https://www.staff.uni-mainz.de/pommeren/Cryptology/Classic/2_Polyalph/Renaissance.html"
  - text: "D. Kahn, \"Kasiski, Friedrich Wilhelm\", *Neue Deutsche Biographie*, vol. 11, 1977, p. 317 (in German)."
    url: "https://www.deutsche-biographie.de/sfz40077.html"
  - text: "C. F. Rocca Jr., *Cryptology Through History and Inquiry*, section 4.3, \"Nineteenth Century Revelations\" (open textbook, Western Connecticut State University)."
    url: "https://sites.wcsu.edu/mbxml/html/section_polyalphabetic_attack2.html"
---
