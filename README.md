# Farz Mobile App

"Farz", kullanıcıların geçmişe dönük namaz (Kaza) ve oruç borçlarını hesaplamasına, takip etmesine ve günlük ibadetlerini düzenli olarak kaydetmesine yardımcı olan, modern arayüzlü ve yerel öncelikli (offline-first) bir mobil uygulamadır.

Temel felsefesi: **İbadet takibini görsel, motive edici ve kolay hale getirmek.**

## 🌟 Öne Çıkan Özellikler

### 1. Akıllı Borç Hesaplama (Onboarding)

- Doğum tarihi ve ergenlik yaşı baz alınarak otomatik kaza borcu hesabı.
- Cinsiyet ve özel durumlara (adet dönemi vb.) göre hassas hesaplama.
- İleriye dönük tahmini bitiş tarihi (projeksiyon).

### 2. Dashboard (Ana Ekran)

- **Earth Theme Tasarım:** Kahve, hardal ve sıcak tonlarla (`#3E322A`, `#CD853F`, `#F5F0E1`) göz yormayan, premium arayüz.
- **Dinamik Vakit Kartları:** Günün saatine göre değişen ikonlar (Güneş Doğuşu, Öğle Güneşi, Ay vb.) ve otomatik kaydırma (Smart Swiper).
- **Progress Ring:** Namaz ve Oruç borçlarının görsel ilerleme durumu.
- **Hızlı Erişim:** Tek tıkla kaza namazı veya orucu düştü olarak işaretleme.

### 3. Geçmiş ve Borç Yönetimi (History Screen)

- **Takvim Görünümü:** Ay bazında hangi günlerin "Kılındı", "Kılınmadı" veya "Kaza Girildi" olduğunu görselleştirme.
- **Detaylı Düzenleme:** Seçili gün için 5 vakit namaz durumunu tek tek değiştirme.
- **Hızlı Kaza Girişi (Batch Entry):**
  - Sayaç mantığı ile hızlıca toplu kaza girişi (+/- butonları).
  - **Ertelenmiş Kayıt (Deferred Save):** Yapılan hızlı değişiklikler "Kaydet" butonuna basılana kadar veritabanına işlenmez, böylece hatalı girişler kolayca geri alınabilir.
- **İkon Tutarlılığı:** Namaz için `History` (Saat), Oruç için `MoonStar` (Hilal) ikonları ile görsel bütünlük.

### 4. Vakit Hesaplama (Prayer Times)

- **Adhan.js Entegrasyonu:** Konuma dayalı (İstanbul varsayılan) hassas namaz vakitleri.
- **Temkin Süreleri:** Diyanet uyumlu temkin süreleri eklenerek doğru vakit gösterimi.
- Sonraki vakte kalan süre sayacı.

---

## 🛠️ Teknik Altyapı (Tech Stack)

- **Framework:** React Native (Expo SDK 52)
- **Router:** Expo Router (File-based routing)
- **Dil:** TypeScript
- **Stil:** NativeWind (Tailwind CSS for React Native)
- **Veritabanı:** Expo SQLite (Yerel veritabanı)
- **İkonlar:** Lucide React Native
- **Animasyon:** React Native Reanimated (Planlanan) & LayoutAnimation
- **Vakit Kütüphanesi:** Adhan.js

### Veritabanı Şeması (SQLite)

Uygulama 3 temel tablo kullanır:

1.  **`debt_counts`**:
    - `type` (TEXT): Namaz vakti ('fajr', 'dhuhr'...) veya 'fasting'.
    - `count` (INTEGER): Kalan borç sayısı.

2.  **`daily_status`**:
    - `date` (TEXT): 'YYYY-MM-DD' formatında tarih.
    - `type` (TEXT): İbadet türü.
    - `status` (TEXT): 'completed' (Kıldı) veya 'missed' (Kılmadı).

3.  **`logs`** (Denetim İzi):
    - `id` (INTEGER): Otomatik artan ID.
    - `type` (TEXT): İşlem türü.
    - `amount` (INTEGER): Değişim miktarı (+1 veya -1).
    - `created_at` (TEXT): İşlem zamanı.

---

## 🚀 Kurulum (Getting Started)

1.  **Bağımlılıkları Yükle:**

    ```bash
    npm install
    ```

2.  **Uygulamayı Başlat:**

    ```bash
    npx expo start -c
    ```

3.  **Cihazda Çalıştır:**
    - Expo Go uygulamasını indirin.
    - QR kodu taratın.

---

## 📅 Yol Haritası (Roadmap) ve Sırada Yapılacaklar

### ✅ Tamamlananlar

- [x] Temel hesaplama ve onboarding.
- [x] Dashboard tasarımı ve fonksiyonları.
- [x] Geçmiş ekranı, takvim ve hızlı giriş modülü.
- [x] Yerel veritabanı (SQLite) entegrasyonu.
- [x] Görsel düzenlemeler (Padding, SafeArea, Icons).

### 🚧 Planlanan (Sırada)

1.  **Kimlik Doğrulama (Authentication):**
    - Supabase Auth entegrasyonu (E-posta/Şifre, Google Sign-in).
    - Kullanıcı profili yönetimi.

2.  **Bulut Senkronizasyonu (Cloud Sync):**
    - Yerel verilerin (SQLite) Supabase PostgreSQL ile senkronize edilmesi.
    - Çoklu cihaz desteği (Verilerin kaybolmaması).
    - Offline-first yapısının korunması (İnternet yokken yerel çalışmaya devam).

3.  **Bildirim Sistemi:**
    - Namaz vakti hatırlatıcıları.
    - Kaza namazı kılma hatırlatmaları.

---

## Lisans

Bu proje MIT lisansı ile lisanslanmıştır.
