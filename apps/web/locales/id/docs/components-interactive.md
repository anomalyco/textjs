<!-- s:06b0e11de4 -->
Input ini dikendalikan melalui keyboard dan mengelola fokusnya sendiri.

<!-- s:1d0d345c65 -->
Fokus

<!-- s:bc06482880 -->
`Tab` dan `Shift+Tab` menggilir fokus. `autoFocus` mengambil fokus saat komponen dipasang.

<!-- s:fca23dd943 -->
Editor yang memiliki fokus menangkap penekanan tombolnya, sehingga mengetik `1` tidak pernah memicu pintasan global.

<!-- s:7c862ee98e -->
`<Input>`

<!-- s:fdde26d4d9 -->
Input satu baris dengan penyuntingan bergaya readline.

<!-- s:88cdcfc0ea -->
| Prop | Deskripsi |
| :-- | :-- |
| `value` / `onChange` | Nilai terkontrol |
| `onSubmit` | Dipanggil saat `Enter` ditekan |
| `placeholder` | Ditampilkan saat kosong |
| `mask` | Karakter penyamar untuk rahasia |

<!-- s:995d41e175 -->
`<Textarea>`

<!-- s:cf370a7f95 -->
Editor multibaris. `Enter` mengirim, `Shift+Enter` menambahkan baris baru.

<!-- s:667b32bc16 -->
`<Select>`

<!-- s:1c8033c766 -->
Daftar opsi berbasis keyboard dengan pencarian fuzzy opsional.

<!-- s:70fe7d6c9b -->
| Prop | Deskripsi |
| :-- | :-- |
| `options` | `{ value, label, hint?, badge? }[]` |
| `onChange` | Dipanggil saat `Enter` ditekan |
| `searchable` | Mengetik menyaring opsi |

<!-- s:958ee46fb6 -->
`<Tabs>`

<!-- s:f61cb509c5 -->
Kursor tanpa fokus

<!-- s:f0552feed5 -->
Saat halaman kehilangan fokus, kursor membeku dan frame berhenti, sehingga Anda dapat memilih dan menyalin teks konsol.
