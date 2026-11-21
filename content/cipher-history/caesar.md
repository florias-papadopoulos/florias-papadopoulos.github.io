---
title: "Caesar's shift"
order: 10
era: antiquity
when: "1st century BC"
place: "Rome and Gaul"
line: "Move every letter three places along the alphabet. Easy to use, and easy to break."
description: "Julius Caesar's secret letters, as Suetonius describes them: try the shift cipher on your own name, then break a captured note by trying every key."
story: |
  Julius Caesar wrote some of his letters in a secret way. When he had something confidential to tell a friend, he replaced every letter with the one three places further on in the alphabet: D for A, E for B, and so on. To anyone else the letter looked like nonsense. His friend simply moved every letter three places back. The emperor Augustus did the same, with a shift of one.
quote:
  text: "…if he had anything confidential to say, he wrote it in cipher, that is, by so changing the order of the letters of the alphabet, that not a word could be made out. If anyone wishes to decipher these, and get at their meaning, he must substitute the fourth letter of the alphabet, namely D, for A, and so with the others."
  original: "…quartam elementorum litteram, id est D pro A et perinde reliquas commutet."
  source: "Suetonius, *Life of Julius Caesar* 56.6 (written in the 2nd century AD), translated by J. C. Rolfe, Loeb Classical Library, 1913."
more: |
  Caesar never describes the trick in the books of his that survive. We know it from three writers who lived long after him.

  - **Suetonius** saw letters of Caesar to Cicero and to friends, written so that "not a word could be made out" (above). About Augustus he adds: "he wrote B for A, C for B, and the rest of the letters on the same principle, using AA for X."
  - **Aulus Gellius** mentions letters of Caesar to Oppius and Balbus, who looked after his affairs, full of single letters that form no words. He adds that the grammarian Probus wrote a careful study of these secret letters.
  - **Cassius Dio** says it was Caesar's usual practice to replace each letter with "the fourth letter beyond".
machine: |
  Type anything, then turn the wheel. The outer ring is the plain alphabet, the inner ring the cipher alphabet: under the window, plain A sits over the letter that replaces it.
task: |
  A note in Caesar's cipher has been captured. You do not know the shift, but there are only 25 shifts to try. Turn the wheel until the note makes sense, or try all 25 at once. Trying every possible key is called **brute force**.
hints:
  - "Look at the word made of one letter. In English it is almost always A or I."
  - "If L stands for I, count the steps from I to L."
  - "The key is 3: the shift Suetonius describes."
truth: |
  Caesar tells one secret letter story himself. During the war in Gaul, his officer Cicero was trapped in a camp under siege. Caesar wrote to him "in Greek characters, lest by intercepting it the enemy might get to know of our designs", and a Gallic horseman threw the letter into the camp, tied to a spear (*Gallic War* 5.48). In the note above we put the content of that letter, as Caesar reports it, into English and into Caesar's shift.

  A shift cipher hides a message only from someone who does not know the trick. With just 25 possible keys, anyone who suspects a shift can try them all in minutes. Later ciphers have far too many keys to try one by one, so codebreakers had to find cleverer ways in.

  Then and now: the Toolbox has a [Caesar cipher](/toolbox/caesar/) and a [Caesar breaker](/toolbox/caesar-breaker/) that tries all 25 keys and picks the one that reads best.
disagree:
  - "Caesar says only that the letter to Cicero was written in Greek characters. Cassius Dio tells the same story and adds that Caesar usually shifted his letters. Was this letter shifted too? Most modern readers take \"Greek\" at face value. The classicist Martine Diepenbroek (2021) argues that it was probably a Greek text that was then enciphered."
myth:
  claim: "The Roman army sent all its orders in Caesar's cipher."
  text: "No ancient writer says so. The three sources describe letters of Caesar and of Augustus, nothing more."
sources:
  - text: "Suetonius, *Life of Julius Caesar* 56.6, translated by J. C. Rolfe, Loeb Classical Library, 1913 (public domain), on LacusCurtius."
    url: "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Suetonius/12Caesars/Julius*.html"
  - text: "Suetonius, *Life of Augustus* 88, same translation."
    url: "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Suetonius/12Caesars/Augustus*.html"
  - text: "Aulus Gellius, *Attic Nights* 17.9, translated by J. C. Rolfe, Loeb Classical Library, 1927, on Perseus."
    url: "https://fgh.perseids.org/read/latinLit/phi1254/phi001/perseus-eng1/17.8-17.10"
  - text: "Cassius Dio, *Roman History* 40.9, Loeb Classical Library translation, 1914 (public domain), on LacusCurtius."
    url: "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Cassius_Dio/40*.html"
  - text: "Julius Caesar, *Gallic War* 5.48, Loeb Classical Library translation, 1917 (public domain), on LacusCurtius."
    url: "https://penelope.uchicago.edu/Thayer/E/Roman/Texts/Caesar/Gallic_War/5B*.html"
  - text: "M. Diepenbroek, \"Ancient Cybersecurity II: Cracking the Caesar Cipher\", *Antigone*, September 2021."
    url: "https://antigonejournal.com/2021/09/cracking-caesar-cipher/"
---
