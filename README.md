# Farz Mobile App 🕌

"Farz", kullanıcıların geçmişe dönük namaz (Kaza) ve oruç borçlarını hesaplamasına, takip etmesine ve günlük ibadetlerini düzenli olarak kaydetmesine yardımcı olan, modern arayüzlü ve yerel öncelikli (offline-first) bir mobil uygulamadır.

**Sürüm:** v1.0.1
**Paket İsmi:** `com.farz.app`

Tasarım felsefesi: **"İbadet takibini görsel, motive edici ve kolay hale getirmek."**

---

## 🌟 Öne Çıkan Özellikler

### 1. Akıllı Borç Hesaplama (Onboarding) 🧮

- Doğum tarihi ve ergenlik yaşı baz alınarak **otomatik kaza borcu hesabı**.
- Cinsiyet ve özel durumlara (adet dönemi vb.) göre hassas hesaplama.
- İleriye dönük tahmini bitiş tarihi (projeksiyon) ve motivasyon mesajları.

### 2. Dashboard (Ana Ekran) 🏠

- **Earth Theme Tasarım:** Kahve, zümrüt yeşili ve sıcak tonlarla (`#064e3b`, `#CD853F`, `#F5F0E1`) göz yormayan, premium arayüz.
- **Dinamik Vakit Kartları:** Günün saatine göre değişen ikonlar ve "Sonraki Vakte Kalan Süre" sayacı.
- **Hızlı Erişim:** Ana ekrandan tek tıkla kaza namazı düşme.

### 3. Geçmiş ve Borç Yönetimi 📅

- **Takvim Görünümü:** Hangi günlerin "Kılındı", "Kılınmadı" veya "Kaza Girildi" olduğunu görselleştirme.
- **Akıllı Düzenleme:** Geçmişe dönük toplu veri girişi veya hata düzeltme.
- **Ertelenmiş Kayıt (Deferred Save):** Hatalı girişleri önlemek için "Kaydet" onaylı düzenleme modu.

### 4. Ekstra Modüller 🛠️

- **Kıble Pusulası:** `expo-sensors` ve `expo-location` ile hassas kıble yönü tayini.
- **Zikirmatik:** Özel zikirler oluşturma, sayaç takibi ve titreşimli geri bildirim.
- **İstatistikler:** Haftalık, aylık ve ömür boyu ibadet özetleri.
- **Bildirimler:** Günlük namaz vakti hatırlatıcıları (Local Notifications).

---

## 🛠️ Teknik Altyapı (Tech Stack)

Uygulama, modern **React Native** ekosistemi üzerine kurulmuştur:

- **Çatı:** React Native (Expo SDK 52)
- **Dil:** TypeScript
- **Navigasyon:** Expo Router (File-based routing)
- **Stil:** NativeWind (Tailwind CSS)
- **Veritabanı:** Expo SQLite (Yerel veritabanı - Offline First)
- **Devlet Yönetimi (State):** React Context & Hooks
- **İkonlar:** Lucide React Native
- **Reklam:** Google AdMob (`react-native-google-mobile-ads`)
- **Bildirim:** Expo Notifications
- **Vakit Kütüphanesi:** Adhan.js

### Klasör Yapısı

```
/app              # Expo Router sayfaları (Ekranlar)
/components       # Tekrar kullanılabilir UI bileşenleri
/db               # SQLite veritabanı bağlantısı ve sorgular
/hooks            # Özel React hook'ları (useAd, useLocation vb.)
/lib              # Yardımcı fonksiyonlar (hesaplama, i18n, adhan)
/assets           # Resimler, ikonlar ve fontlar
/locales          # Dil dosyaları (i18n - TR, EN, AR)
```

---

## 🚀 Kurulum ve Çalıştırma

Projeyi yerel ortamda çalıştırmak için:

1.  **Repoyu Klonla:**

    ```bash
    git clone https://github.com/sabrivatan/Farz.git
    cd Farz
    ```

2.  **Bağımlılıkları Yükle:**

    ```bash
    npm install
    ```

3.  **Uygulamayı Başlat:**

    ```bash
    npx expo start -c
    ```

4.  **Cihazda Test Et:**
    - Telefonuna **Expo Go** uygulamasını indir.
    - Terminaldeki QR kodu tarat.

---

## 📦 Build & Release (Google Play)

Uygulama **EAS Build** kullanılarak derlenir.

**Production Build (AAB) Almak İçin:**

```bash
npx eas-cli build --platform android --profile production
```

_Not: Bu komut, Google Play Store'a yüklenmeye hazır imzalı `.aab` dosyasını oluşturur._

---

## 📄 Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Tüm hakları saklıdır.
İletişim: sabrivatan@gmail.com
