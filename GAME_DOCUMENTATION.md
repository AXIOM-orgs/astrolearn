# Dokumentasi Game: Space Quiz Mission

## 1. Tingkat Kesulitan (Difficulty)
Game ini memiliki tiga tingkat kesulitan yang mempengaruhi jumlah kemunculan objek dan kecepatan permainan:

| Elemen | Easy | Medium | Hard |
| :--- | :--- | :--- | :--- |
| Asteroid Bergerak | 8 | 15 | 25 |
| Basic Enemy | 0 | 9 | 15 |
| Sniper Enemy | 2 | 3 | 5 |
| Spinner (Squadron) | 6 | 3 | 5 |
| Kecepatan Scroll | 3 | 5 | 7 |

---

## 2. Jenis Musuh & Karakteristik
Setiap jenis musuh memiliki pola serangan dan atribut yang berbeda:

### A. Musuh Utama (Active Enemies)
*   Basic Enemy (HP: 50): Musuh standar yang akan mengejar posisi pemain. Memberikan damage 2 HP jika bertabrakan.
*   Sniper Enemy (HP: 80): Muncul dari atas, berhenti di posisi tertentu, membidik, dan menembakkan peluru presisi. Memberikan damage 2 HP jika tabrakan dan pelurunya memberikan 1 HP damage.
*   Spinner / Squadron (HP: 40): Muncul dalam kelompok (formasi) dengan pola gerakan tertentu (Sine Wave, Cross, atau U-Turn). Memberikan damage 2 HP jika bertabrakan.
*   Asteroid (HP: 60-150): Rintangan jatuh yang harus dihancurkan atau dihindari. Memberikan damage 3 HP jika bertabrakan.

### B. Musuh "Hiasan" (Scrolling Decorations)
Meskipun dikategorikan sebagai "hiasan" dalam kode, beberapa di antaranya tetap memiliki interaksi mekanis:
*   Space Station 1: Menembakkan peluru ke arah pemain (1 HP damage per peluru).
*   Space Station 2: Bertindak sebagai *kamikaze* yang mengejar pemain. Memberikan 2 HP damage jika menabrak.
*   Batu (Rock): Hanya hiasan murni. Tidak menembak dan hanya meluncur melewati layar.
*   Efek Visual: *Booster decor*, asap (*smoke*), dan ledakan (*explosion*) murni untuk estetika.

---

## 3. Sistem Kerusakan (Damage System)
Pemain memiliki sistem nyawa (Max Lives: 10) dan setiap nyawa memiliki 100 HP.

*   Tabrakan Asteroid: -3 HP
*   Tabrakan Musuh/Kamikaze: -2 HP
*   Terkena Peluru Musuh/Minion: -1 HP
*   Terkena Laser Bos: -1 s/d -3 HP per *tick* (tergantung kesulitan).

> [!IMPORTANT]
> Pemain mendapatkan Imunitas selama 3 detik setelah kehilangan satu nyawa. Selama masa imunitas, pemain tidak bisa menerima kerusakan apa pun.

---

## 4. Bos Roket (Giant Boss)
Bos muncul setelah semua gelombang musuh (*wave*) dibersihkan. Terdapat animasi peringatan "⚠ WARNING ⚠" selama 3 detik sebelum bos masuk ke layar.

### Fase Pertempuran Bos:
1.  Fase 1 (100% - 75% HP): Bos menembakkan peluru kuning dari 4 turret secara cepat.
2.  Fase 2 (HP < 75%): Bos memanggil 2 Minion (HP: 400) dan mengaktifkan perisai (Invulnerable). Bos tidak bisa diserang sampai kedua minion hancur.
3.  Fase 3 (Rage Mode): Setelah minion hancur, bos akan mengejar pemain dengan gerakan yang lebih liar (*jitter*) dan menembakkan Laser Merah Raksasa setiap 2 detik.

---

## 5. Sistem Upgrade Senjata
Senjata pemain dapat ditingkatkan hingga Level 4. Power-up dijatuhkan setiap 6 detik setelah fase awal permainan (5 detik pertama).

*   Level 1 (Base): Tembakan *Spread* (3 peluru) di tengah.
*   Level 2: Tembakan *Spread* di kiri & kanan + Tembakan tambahan di tengah.
*   Level 3: Menambahkan senjata Laser (tembakan cepat dan lurus) di tengah.
*   Level 4 (Max): Menambahkan senjata Magnetic (peluru yang mencari musuh terdekat secara otomatis).

> [!TIP]
> Upgrade senjata hanya akan reset kembali ke Level 1 jika pemain kehilangan nyawa, bukan saat HP berkurang biasa.

---

## 6. Alur Waktu Permainan (Timing)
1.  0 - 5 Detik: *Dodge Phase* (Fase Menghindar). Belum ada power-up, asteroid mulai berjatuhan.
2.  > 5 Detik: Musuh mulai muncul secara acak dari antrean (*queue*) dengan jeda 2 detik antar kemunculan. Power-up senjata mulai jatuh setiap 6 detik.
3.  Wave Clear: Setelah semua antrean musuh habis dan layar bersih, Bos akan muncul.
4.  Last 10 Seconds (Hard): Pada tingkat kesulitan Hard, Bos dirancang untuk muncul lebih intens di akhir sesi.
