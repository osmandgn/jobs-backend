# İş İlan Platformu PRD (Product Requirements Document)

## 📋 Ürün Genel Bakış

### Vizyon
İngiltere'deki kullanıcıları kısa süreli, günlük işler için bir araya getiren, konum bazlı bir iş eşleştirme platformu.

### Temel Değer Önerisi
- **İşverenler:** Hızlıca günlük/kısa süreli iş ilanı açabilir, uygun adaylarla anında iletişime geçebilir
- **İş Arayanlar:** Bulundukları konuma yakın, ilgi alanlarına uygun işlerden anında haberdar olabilir

### Hedef Pazar
- **Coğrafya:** United Kingdom (UK)
- **Dil:** İngilizce (UK English)
- **Kullanıcılar:** Kısa süreli iş arayanlar ve iş verenler (bireysel kullanıcılar)

### Platform
- Web Uygulaması (Responsive)
- iOS Uygulaması
- Android Uygulaması

---

## 👥 Kullanıcı Tipleri

### 1. İş Arayan (Job Seeker)
- Günlük/kısa süreli iş arayan bireyler
- Profil oluşturur, yeteneklerini ve çalışabileceği kategorileri belirler
- "Actively Looking" statüsünü açıp kapatabilir
- İlgilendikleri kategorilerdeki yeni ilanlardan bildirim alır

### 2. İşveren (Job Poster)
- Kısa süreli iş ilanı açmak isteyen bireyler
- İlan oluşturur, başvuruları değerlendirir
- Adaylarla mesajlaşabilir

> **Not:** Aynı kullanıcı hem iş arayan hem işveren olabilir.

---

## 🔐 Kimlik Doğrulama & Kayıt

### Kayıt Gereksinimleri
- Email ve şifre ile kayıt
- Sosyal medya ile kayıt (Google, Apple, Facebook)
- Email doğrulama zorunlu
- Telefon numarası (opsiyonel, profilde gösterim tercihe bağlı)

### Kayıt Akışı
1. Email/Sosyal medya ile kayıt
2. Email doğrulama
3. Temel profil bilgileri (ad, soyad, konum)
4. Kullanıcı tipi seçimi (veya her ikisi)
5. İş arayan ise: Kategoriler ve yetenekler seçimi
6. Bildirim tercihlerinin ayarlanması

### Erişim Kuralları

| Eylem | Kayıtsız | Kayıtlı |
|-------|----------|---------|
| İlanları görüntüleme | ✅ | ✅ |
| İlan detayı görme | ✅ | ✅ |
| İlan açma | ❌ | ✅ |
| Başvuru yapma | ❌ | ✅ |
| Mesaj gönderme | ❌ | ✅ |
| Bildirim alma | ❌ | ✅ |

---

## 👤 Kullanıcı Profili

### Temel Bilgiler
- Ad Soyad
- Profil fotoğrafı
- Konum (şehir, bölge, postcode)
- Bio/Hakkında
- Kayıt tarihi

### İş Arayan Profili (Ek Alanlar)
- **Yetenekler (Skills):** Etiket bazlı seçim
- **Deneyim:** Geçmiş iş deneyimleri listesi
- **Portfolyo:** Fotoğraf/belge yükleme imkanı
- **Çalışabileceği Kategoriler:** Çoklu seçim
- **Çalışma Durumu:** "Actively Looking" toggle
- **Çalışma Tercihleri:** Mesafe, ücret aralığı vs.

### İşveren Profili (Ek Alanlar)
- İşletme/Şirket adı (opsiyonel)
- Açılan ilanlar geçmişi
- Tamamlanan işler

### Değerlendirme & Puanlama
- 5 yıldız üzerinden ortalama puan
- Yazılı yorumlar
- Tamamlanan iş sayısı
- Yanıt süresi ortalaması

### Gizlilik Ayarları
- Telefon numarası gösterimi (açık/kapalı)
- Mesaj alma (açık/kapalı)
- Profil görünürlüğü

---

## 📝 İş İlanı (Job Listing)

### İlan Alanları

| Alan | Zorunlu | Açıklama |
|------|---------|----------|
| Başlık (Title) | ✅ | Max 100 karakter |
| Kategori | ✅ | Listeden seçim |
| Açıklama (Description) | ✅ | Detaylı iş tanımı |
| Konum | ✅ | Adres veya postcode |
| Tarih | ✅ | İşin yapılacağı tarih(ler) |
| Saat Aralığı | ✅ | Başlangıç-bitiş saati |
| Ücret | ✅ | Sayısal değer |
| Ücret Tipi | ✅ | Saatlik / İş başı |
| Fotoğraflar | ❌ | Max 5 adet |
| Gerekli Yetenekler | ❌ | Etiket seçimi |
| Deneyim Seviyesi | ❌ | Başlangıç/Orta/Uzman |

### İlan Durumları
- **Draft:** Taslak
- **Pending Review:** Onay bekliyor (konfigüratif)
- **Active:** Yayında
- **Paused:** Duraklatıldı
- **Filled:** İş verildi
- **Completed:** Tamamlandı
- **Expired:** Süresi doldu
- **Rejected:** Reddedildi

### İlan Onay Sistemi (Configurable)
- Admin panelinden açılıp kapatılabilir
- Açıksa: İlan yayınlanmadan önce admin onayı gerekir
- Kapalıysa: İlan direkt yayına girer
- Belirli kategoriler için zorunlu onay seçeneği

---

## 📁 Kategoriler

### Örnek Ana Kategoriler
- 🏠 Home & Garden (Cleaning, Gardening, DIY, Moving)
- 🔧 Trades & Services (Plumbing, Electrical, Painting)
- 📦 Delivery & Driving
- 🍳 Hospitality & Catering
- 🛒 Retail & Sales
- 📸 Events & Photography
- 💻 Admin & Office
- 👶 Childcare & Pet Care
- 📚 Tutoring & Education
- 💪 Health & Fitness
- 🎨 Creative & Design
- 🔨 Construction & Labour
- 🧹 Cleaning Services
- 🚗 Automotive
- 📱 Tech Support
- ➕ Other

### Alt Kategoriler
Her ana kategorinin altında spesifik alt kategoriler bulunacak.

---

## 📍 Konum Sistemi

### Konum Özellikleri
- UK postcode bazlı konum
- GPS tabanlı konum algılama
- Manuel adres girişi
- Harita üzerinde seçim

### Mesafe Filtreleme
- Kullanıcı tercihine göre mesafe ayarı (1-50 mil)
- Varsayılan: 10 mil yarıçap
- "Nationwide" seçeneği (remote işler için)

### Bildirim Alanı
- Kullanıcılar bildirim almak istedikleri bölgeleri belirleyebilir
- Birden fazla bölge seçilebilir

---

## 💬 Mesajlaşma Sistemi

### Mesaj Türleri

#### 1. Başvuru Mesajı
- İş arayanın ilana başvururken yazdığı ilk mesaj
- Zorunlu alan
- Max 500 karakter

#### 2. Sohbet Mesajları
- Başvuru sonrası devam eden iletişim
- İşverenin mesajlaşma izni açıksa aktif
- Metin, emoji desteği

### Mesajlaşma Kuralları
- İşveren mesaj almayı kapatabilir (sadece başvuru mesajı alır)
- Engelleme özelliği
- Spam/uygunsuz içerik bildirimi

### Mesaj Durumları
- Gönderildi
- İletildi
- Okundu

---

## 🔔 Bildirim Sistemi

### Bildirim Türleri

| Bildirim | Tetikleyici | Kanal |
|----------|-------------|-------|
| Yeni İlan | Takip edilen kategoride yeni ilan | Push, Email |
| Başvuru Alındı | İlana yeni başvuru | Push, Email |
| Yeni Mesaj | Mesaj alındığında | Push |
| İlan Onaylandı | İlan yayına girdiğinde | Push, Email |
| İlan Reddedildi | İlan reddedildiğinde | Push, Email |
| Değerlendirme | Yeni yorum/puan alındığında | Push, Email |
| Hatırlatma | İş tarihi yaklaştığında | Push |

### Bildirim Tercihleri
- Her bildirim türü ayrı ayrı açılıp kapatılabilir
- Sessiz saatler belirlenebilir
- Email frekansı ayarlanabilir (anında/günlük özet/haftalık)

### "Actively Looking" Modu
- Açıkken: İlgili kategorilerdeki tüm yeni ilanlardan bildirim
- Kapalıyken: Sadece direkt mesajlar için bildirim

---

## ⭐ Değerlendirme & Yorum Sistemi

### Puanlama
- 5 yıldız üzerinden
- İş tamamlandıktan sonra her iki taraf birbirini değerlendirebilir
- Değerlendirme süresi: İş bitiminden 14 gün

### Yorum
- Yazılı yorum (opsiyonel)
- Min 20, max 500 karakter
- Profanity filter

### Değerlendirme Kriterleri

**İş arayan için:**
- Dakiklik
- İş kalitesi
- İletişim
- Profesyonellik

**İşveren için:**
- Açıklama doğruluğu
- İletişim
- Ödeme

### Görünürlük
- Değerlendirmeler profilde görünür
- Ortalama puan hesaplanır
- Son yorumlar listelenir

---

## 🚨 Şikayet Sistemi

### Şikayet Nedenleri
- Spam/Sahte ilan
- Uygunsuz içerik
- Dolandırıcılık şüphesi
- Taciz/Tehdit
- Yanıltıcı bilgi
- Diğer

### Şikayet Akışı
1. Kullanıcı şikayet nedeni seçer
2. Detaylı açıklama yazar (opsiyonel)
3. Kanıt ekler (screenshot vs.)
4. Admin'e iletilir
5. Admin inceleyip karar verir
6. Sonuç bildirilir

### Yaptırımlar
- Uyarı
- İlan kaldırma
- Geçici hesap askıya alma
- Kalıcı hesap kapatma

---

## ⚖️ Hukuki Gereksinimler & Disclosure

### Zorunlu Metinler
- Terms of Service
- Privacy Policy (GDPR uyumlu)
- Cookie Policy
- Community Guidelines
- Safety Tips

### İlan Disclosure'ları
- "Bu platform yalnızca iş arayanlar ve verenler arasında iletişimi sağlar"
- "Ödemeler taraflar arasında gerçekleşir, platform ödeme garantisi vermez"
- "Lütfen yalnızca yetkin olduğunuz işlere başvurun"
- "18 yaş altı kullanıcılar için yasal koruyucu onayı gereklidir"

### UK Spesifik Gereksinimler
- Right to Work kontrol hatırlatması
- Minimum wage bilgilendirmesi
- Insurance/liability disclaimer
- GDPR uyumlu veri işleme

### Güvenlik Uyarıları
- Kişisel bilgi paylaşımında dikkat
- Tanımadığınız kişilerle buluşurken güvenlik önlemleri
- Şüpheli aktivite bildirimi

---

## 💰 İş Modeli

### Faz 1 (Launch)
- Tamamen ücretsiz
- Tüm özellikler açık
- Kullanıcı tabanı oluşturma odaklı

### Gelecek Monetizasyon Seçenekleri (Faz 2+)
- Öne çıkan ilan (Featured Listing)
- Premium profil rozeti
- Reklam alanları
- İşveren abonelik paketi
- Acil ilan özelliği

> **Not:** Ödemeler platform üzerinden yapılmaz, kullanıcılar kendi aralarında anlaşır.

---

## 🛠 Teknik Gereksinimler

### Frontend
- **Web:** React/Next.js (Responsive design)
- **iOS:** Swift/SwiftUI veya React Native
- **Android:** Kotlin veya React Native

### Backend
- Node.js/Express veya Python/Django
- RESTful API veya GraphQL
- Real-time için WebSocket

### Veritabanı
- PostgreSQL (ana veri)
- Redis (cache, session)
- Elasticsearch (arama)

### Altyapı
- Cloud hosting (AWS/GCP/Azure)
- CDN (resimler için)
- Push notification servisi (Firebase/OneSignal)

### Güvenlik
- SSL/TLS encryption
- JWT authentication
- Rate limiting
- Input sanitization
- GDPR compliance

---

## 📱 Ekranlar & Akışlar

### Ana Ekranlar

1. **Splash/Onboarding**
2. **Login/Register**
3. **Home/Feed** - Yakındaki ilanlar
4. **Search/Filter**
5. **Job Detail**
6. **Create Job**
7. **My Jobs** (açtığım ilanlar)
8. **Applications** (başvurularım)
9. **Messages/Inbox**
10. **Chat**
11. **Profile**
12. **Edit Profile**
13. **Settings**
14. **Notifications**
15. **Reviews**
16. **Report**

### Kullanıcı Akışları

#### İş Arama Akışı
```
Home → Filter (kategori, konum, ücret) → İlan Listesi → İlan Detay → Başvur → Mesaj Yaz → Gönder
```

#### İlan Açma Akışı
```
Home → "+" İlan Oluştur → Form Doldur → Önizleme → Yayınla → (Onay Bekle) → Aktif
```

#### Değerlendirme Akışı
```
İş Tamamlandı → Bildirim → Değerlendir → Puan + Yorum → Gönder
```

---

## 📊 Admin Panel

### Özellikler
- Dashboard (istatistikler)
- Kullanıcı yönetimi
- İlan yönetimi & onay
- Şikayet yönetimi
- Kategori yönetimi
- İçerik yönetimi (disclosure metinleri)
- Bildirim gönderimi
- Raporlar & Analytics
- Sistem ayarları (ilan onay toggle vs.)

---

## 🚀 MVP Özellikleri (Faz 1)

### Dahil
- ✅ Kullanıcı kayıt/giriş
- ✅ Profil oluşturma
- ✅ İlan oluşturma
- ✅ İlan arama & filtreleme
- ✅ Konum bazlı listeleme
- ✅ Başvuru yapma
- ✅ Temel mesajlaşma
- ✅ Push bildirimleri
- ✅ Değerlendirme sistemi
- ✅ Temel şikayet sistemi

### Faz 2
- Gelişmiş arama algoritması
- Öneri sistemi
- Premium özellikler
- Analytics dashboard
- Çoklu dil desteği

---

## 📈 Başarı Metrikleri (KPIs)

- Aylık aktif kullanıcı (MAU)
- Günlük yeni ilan sayısı
- Başvuru oranı
- Eşleşme oranı (iş verilen başvuru)
- Kullanıcı memnuniyeti (NPS)
- Retention rate
- Bildirim etkileşim oranı

---

*Bu PRD, projenin temel gereksinimlerini ve özelliklerini tanımlamaktadır. Geliştirme sürecinde detaylar güncellenebilir.*
