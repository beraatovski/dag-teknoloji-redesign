# DAĞ TEKNOLOJİ - YENİ NESİL WEB PLATFORMU REDESIGN

Bu proje, [dagteknoloji.com.tr](https://dagteknoloji.com.tr/) sitesinin mevcut kurumsal içeriğini (Perpa Ticaret Merkezi lokasyonu, 3D yazıcılar, filamentler, muadil tonerler, 3D tarama ve teknik servis hizmetleri) temel alarak, **sıfırdan modern bir teknoloji ve katmanlı üretim platformu** olarak baştan tasarlanmış versiyonudur.

---

## 🌟 Neler Yenilendi & Neler Eklendi?

### 1. Sıfırdan Modern Görsel Kimlik & Tasarım Dili
* **Cyber / Endüstriyel Dark Aestetik**: Koyu karbon zemin, elektrik camgöbeği (Electric Cyan), kobalt mavisi ve zümrüt yeşili neon aksanlar.
* **Glassmorphism & Mikro-animasyonlar**: Saydam cam kartlar, lazer tarama ışın animasyonları ve yumuşak geçiş efektleri.
* **Modern Tipografi**: Başlıklarda fütüristik `Space Grotesk`, gövde metinlerinde okunabilirliği yüksek `Plus Jakarta Sans`.

### 2. Canlı İnteraktif 3D Viewport (Three.js Engine)
* Hero alanında çalışan gerçek zamanlı WebGL 3D sahne.
* Mouse veya dokunmatik ekran ile 360° dönebilen ve derinliği hissedilen mekanik çekirdek / nozzle mimarisi.
* Canlı filament renk değiştirici (Cyan, Emerald, Amber Gold, Ruby Red, Carbon Black).
* Tel kafes (Wireframe) / Katı mod geçiş desteği.

### 3. Anında 3D Baskı Fiyat & Süre Hesaplayıcı (Slicing Tool)
* Gerçekçi dilimleme simülasyonu: Kullanıcı `.STL`, `.OBJ`, `.STEP` dosyası yüklediğinde model geometrisi doğrulanır.
* Malzeme katsayıları (PLA+ Hyper, PETG, ABS, PA-CF Karbon Fiber, SLA Reçine, TPU Esnek).
* İç doluluk (infill %15 - %100) ve katman hassasiyeti (0.12mm - 0.28mm) seçimine göre anlık gr ağırlığı, baskı süresi ve KDV dahil fiyat hesaplama.
* Tek tıkla Perpa atölyesine sipariş/teklif talebi gönderme.

### 4. Dinamik E-Ticaret Kataloğu & Sepet Sistemi
* 4 ana kategori: 3D Yazıcılar, Filamentler, Muadil Tonerler, Yedek Parça & Nozzle.
* Hızlı arama ve filtreleme.
* Ürün detay modalı (Quick View).
* Tam işlevsel açılır sepet paneli (Slide-out drawer), miktar artırma/azaltma, sepet tutarı ve kargo hesaplama.

### 5. Orijinal İçeriğin Korunması & Genişletilmesi
* Halil Rıfat Mahallesi, Yüzer Havuz Sokak, Perpa Ticaret Merkezi B Blok Kat: 8 No: 825 Şişli / İstanbul adresi ve `0507 020 11 98`, `0212 221 19 31`, `info@dagteknoloji.com.tr` iletişim bilgileri korundu.
* Doğrudan WhatsApp hızlı iletişim entegrasyonu.

---

## 🚀 Nasıl Çalıştırılır?

Proje herhangi bir derleme aşamasına (build step) ihtiyaç duymadan, modern CDN kaynaklarıyla doğrudan tarayıcıda çalışacak şekilde hazırlanmıştır.

### Seçenek 1: Doğrudan Tarayıcıda Açma
Aşağıdaki dosya yoluna çift tıklayarak veya tarayıcınıza sürükleyerek açabilirsiniz:
```
C:\Users\dosto\.gemini\antigravity\scratch\dag-teknoloji-redesign\index.html
```

### Seçenek 2: Basit Yerel Sunucu (Python ile)
Terminal veya PowerShell üzerinden:
```powershell
cd "C:\Users\dosto\.gemini\antigravity\scratch\dag-teknoloji-redesign"
python -m http.server 3000
```
Ardından tarayıcınızda `http://localhost:3000` adresine gidebilirsiniz.
