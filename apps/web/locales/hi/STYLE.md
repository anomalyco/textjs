# Hindi (hi)

- Address the reader as आप in docs, UI and marketing, with plural verb forms (आप चलाएं, आपका ऐप). Never तुम or तू. Instructions use the -एं imperative: “`bun dev` चलाएं”, “कंसोल खोलें”.
- Write everyday Hindi as Indian developers read it, the register of Chrome's and Google's Hindi interfaces: English technical terms in Devanagari transliteration, not Sanskritized coinages. ऐप (not अनुप्रयोग), कंपोनेंट, हुक, रूट, लेआउट, फ़्रेम, सेल, हैंडलर, थीम, प्रीरेंडरिंग, सर्वर रेंडरिंग, डायरेक्टरी, फ़ोल्डर, फ़ाइल, क्वेरी, शॉर्टकट, डिप्लॉय, टर्मिनल, ब्राउज़र, सर्वर, चार्ट, एरर बाउंड्री, प्रॉम्प्ट. Plain Hindi words stay where they're the common ones: सेटिंग, जानकारी, उदाहरण, पेज, बदलाव.
- Spelling follows Chrome's Hindi interface: nukta on borrowed sounds (फ़ाइल, फ़्रेम, ज़रूरी, सिर्फ़, डिफ़ॉल्ट), anusvara for nasal endings (करें, चलाएं, दबाएं, में, हैं), ॉ for the English open “o” (डॉक्यूमेंटेशन, ऑफ़लाइन, कॉपी). Component is कंपोनेंट.
- Names stay in Latin script: Text.js, React, Chrome, DevTools, Bun, OpenCode. Postpositions follow with a space: Text.js में, Chrome के साथ, React का. Don't attach postpositions to inline code; add a noun: “`page.tsx` फ़ाइल में”, “`useInput` हुक से”, “`bun dev` कमांड”.
- Sentences end with the purna viram (।), with no space before it. Questions and exclamations use ? and !. Commas, colons and parentheses are ASCII. No । in headings, labels, buttons or table cells.
- Headings and labels are noun phrases without a purna viram: “इंस्टॉलेशन”, “कंसोल खोलना”, “रूट को ग्रुप करना”.
- Digits are international (0–9), never Devanagari numerals (०–९), to match code samples and benchmarks. Decimal point, comma thousands in the Indian system: 0.163 ms, 3,200 सेल, 12,000 फ़्रेम, 1,00,000. The percent sign follows the number without a space: 70.6%. A no-break space (U+00A0) between a number and its unit: 66 ms, 21 kB. Never touch version numbers (Bun 1.2+, Node.js 22+, 1.4.1), numbers in code, paths or URLs.
- Dates read 3 नवंबर 2026. Ranges use an en dash: 70–81%.
- Quotes are “…” with ‘…’ inside. Browser interface labels go in “…” and match Chrome's Hindi interface: “लॉग सेव करें”, “सेटिंग”. The Console panel is “कंसोल”.
- Keep API names, components, hooks, file paths, CLI commands and keyboard shortcuts (⌘⌥J, Ctrl+Shift+J, Enter) exactly as written.
- In a list or table, keep items parallel: all noun phrases, or all full sentences.
- Avoid translationese and filler: put the verb at the end and keep sentences short; no “के द्वारा” passives where an active sentence works, no “किया जाता है” chains, no “यह ध्यान देना ज़रूरी है कि”, “ध्यान दें कि” as an opener, “बस”, “आसानी से”, “सरलता से”, “शक्तिशाली”, “सहज”, “बिना किसी मेहनत के”, “आइए”, “कृपया” on every instruction, rhetorical questions, dramatic dashes or “न केवल … बल्कि”.
- Don't add adjectives, intensifiers, hedges or explanations that aren't in the English, and don't create colon reveals.
- Table headers: `Prop` stays `Prop`.
- Marketing copy keeps the deadpan tone: the console-as-production-UI premise is stated straight, never explained or winked at.
- Names kept in English: the Enterprise plan, the Playground and the course Learn Text.js. The Learn section and nav are “सीखें”. Docs is “डॉक्स” as a nav label and डॉक्यूमेंटेशन in prose.
- Merch print slogans stay in English: “YOU WOULDN’T RENDER A WEBSITE IN THE CONSOLE”.

## Focus pad

- The console pad's actions finish the sentence “Then click here and {action}.” Translate each action as the form that fits that slot. “फिर यहां क्लिक करें और {action}।”: {action} is an आप imperative that ends the sentence: “टाइप करें”, “↑ ↓ दबाएं”, “प्रॉम्प्ट लिखें”.
- “type” is the verb (type on the keyboard), never a data type. “Custom size” is the size picker's option for entering your own columns and rows.
- Hint labels under the keycaps are one or two words: “वापस”, “जानकारी”, “कार्ट”.

## Captions

- Subtitle style: about 17 characters per second. Drop filler and repetition, keep every fact, number and code name.
- “See you there.” at the end of a chapter is “वहीं मिलते हैं।” “Welcome back to Learn Text.js.” is “Learn Text.js में फिर से स्वागत है।”
