<!-- s:32f8804e6b -->
Text.js ब्राउज़र कंसोल में रेंडर होने वाले ऐप्स के लिए एक React फ़्रेमवर्क है।

<!-- s:814ee9e9d7 -->
[डॉक्स](https://textjs.org/docs) · [सीखें](https://textjs.org/learn) · [Playground](https://textjs.org/playground) · [OpenCode](https://textjs.org/opencode)

<!-- s:bc834fc57b -->
Chrome DevTools कंसोल में रेंडर हुआ एक Text.js ऐप

<!-- s:9535b10be9 -->
शुरुआत

<!-- s:c7a467af05 -->
[localhost:3000](http://localhost:3000) खोलें और [ब्राउज़र कंसोल खोलें](https://textjs.org/docs/installation#open-the-console)। Text.js के लिए Bun 1.2+ या Node.js 22+ और डेस्कटॉप पर Chrome, Edge, Firefox या Safari चाहिए।

<!-- s:9bf34f44c9 -->
उदाहरण

<!-- s:3f1f0605f9 -->
Yoga हर फ़्रेम का लेआउट बनाता है, Text.js उसे `%c` span में रन-लेंथ एन्कोड करता है और एक `console.log` कॉल में लिखता है। जिस फ़्रेम में कोई सेल नहीं बदला हो, वह कुछ लॉग नहीं करता। [`ARCHITECTURE.md`](ARCHITECTURE.md) फ़ाइल में रेंडरिंग पाइपलाइन की जानकारी है।

<!-- s:8b78543399 -->
पैकेज

<!-- s:cf0456d221 -->
| पैकेज | वर्शन | विवरण |
| --- | --- | --- |
| [`@textjs/app`](packages/app) | [![npm](https://img.shields.io/npm/v/@textjs/app)](https://www.npmjs.com/package/@textjs/app) | App Router, `text` CLI और रूट हैंडलर |
| [`@textjs/react`](packages/react) | [![npm](https://img.shields.io/npm/v/@textjs/react)](https://www.npmjs.com/package/@textjs/react) | रिकंसाइलर, कंपोनेंट और हुक |
| [`@textjs/core`](packages/core) | [![npm](https://img.shields.io/npm/v/@textjs/core)](https://www.npmjs.com/package/@textjs/core) | सेल बफ़र, लेआउट और `%c` कंसोल ड्राइवर |
| [`@textjs/font`](packages/font) | [![npm](https://img.shields.io/npm/v/@textjs/font)](https://www.npmjs.com/package/@textjs/font) | FIGlet फ़ॉन्ट पार्सर और रेंडरर |
| [`@textjs/opencode`](packages/opencode) | [![npm](https://img.shields.io/npm/v/@textjs/opencode)](https://www.npmjs.com/package/@textjs/opencode) | textjs.org/opencode और OpenCode सर्वर के बीच लोकल ब्रिज |
| [`create-text-app`](packages/create-text-app) | [![npm](https://img.shields.io/npm/v/create-text-app)](https://www.npmjs.com/package/create-text-app) | प्रोजेक्ट जनरेटर |
| [`eslint-plugin-textjs`](packages/eslint-plugin-textjs) | [![npm](https://img.shields.io/npm/v/eslint-plugin-textjs)](https://www.npmjs.com/package/eslint-plugin-textjs) | Text.js ऐप्स के लिए ESLint नियम |

<!-- s:8b249e49fa -->
एडिटर और ब्राउज़र एक्सटेंशन भी यहीं हैं:

<!-- s:cbba2b4208 -->
- [`packages/vscode-textjs`](packages/vscode-textjs): [VS Code एक्सटेंशन](https://textjs.org/docs/vscode), जिसमें लाइव प्रीव्यू, App Router स्कैफ़ोल्डिंग और एरर कोड लिंक हैं
- [`packages/devtools-extension`](packages/devtools-extension): [Chrome DevTools एक्सटेंशन](https://textjs.org/docs/devtools-extension), जिसमें कंपोनेंट ट्री, फ़्रेम इंस्पेक्टर और टाइमलाइन हैं

<!-- s:08b48c3d0b -->
डेवलपमेंट

<!-- s:5facd29c1d -->
साइट [localhost:3000](http://localhost:3000) पर चलती है। [CONTRIBUTING.md](CONTRIBUTING.md) फ़ाइल में दूसरे ऐप्स, एंड-टू-एंड स्क्रिप्ट और रिलीज़ प्रक्रिया की जानकारी है।

<!-- s:47964f2d9e -->
योगदान

<!-- s:b236bea0a4 -->
बग रिपोर्ट और पुल रिक्वेस्ट का स्वागत है। पहले [CONTRIBUTING.md](CONTRIBUTING.md) फ़ाइल पढ़ें, और सुरक्षा से जुड़ी समस्याओं की रिपोर्ट [SECURITY.md](SECURITY.md) फ़ाइल में बताए तरीके से करें।

<!-- s:6c549a56db -->
लाइसेंस

<!-- s:a950c8684e -->
[MIT](LICENSE)। साथ दी गई थर्ड-पार्टी फ़ाइलों के अपने लाइसेंस हैं: [`packages/font`](packages/font/NOTICE) में मौजूद FIGlet फ़ॉन्ट (BSD 3-Clause) और `apps/web` और `merch/fonts` फ़ोल्डर में मौजूद फ़ॉन्ट (SIL Open Font License 1.1)।
