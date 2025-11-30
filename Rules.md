# GigHub UK - Backend Development Rules

## 1. Project Tracking
- Her task tamamlandığında `JobPlatform_Backend_Plan.json` dosyası güncellenecek
- `status` alanı güncellenmeli: `not_started` → `in_progress` → `completed`
- `completion_summary` alanına yapılan işler özet olarak yazılmalı
- Oluşturulan dosyalar `expected_outputs` ile karşılaştırılmalı

## 2. Docker-First Development
- Tüm geliştirme ve test işlemleri Docker üzerinden yapılacak
- `docker-compose up` ile local environment ayağa kaldırılacak
- Veritabanı, Redis ve uygulama container'ları birlikte çalışacak
- Hiçbir zaman local makinede direkt PostgreSQL/Redis kurulmayacak
- Migration ve seed işlemleri Docker container içinden çalıştırılacak

## 3. API Testing
- Her endpoint geliştirildikten sonra manuel test yapılacak (Postman/Insomnia/curl)
- Her endpoint için integration test yazılacak
- Test kapsamı (coverage) minimum %80 olacak
- Edge case'ler ve hata durumları test edilecek
- Authentication gerektiren endpoint'ler token ile test edilecek

## 4. Clean Code Principles
- **Single Responsibility**: Her fonksiyon/servis tek bir iş yapacak
- **DRY (Don't Repeat Yourself)**: Kod tekrarından kaçınılacak
- **KISS (Keep It Simple)**: Gereksiz karmaşıklıktan kaçınılacak
- **Meaningful Naming**: Değişken, fonksiyon ve dosya isimleri açıklayıcı olacak
- **Small Functions**: Fonksiyonlar 30-40 satırı geçmeyecek
- **No Magic Numbers**: Sabit değerler const olarak tanımlanacak
- **Early Return**: Nested if'lerden kaçınmak için early return kullanılacak

## 5. Code Structure
- Controller → Service → Repository pattern uygulanacak
- Business logic sadece service katmanında olacak
- Controller sadece request/response handle edecek
- Her modül kendi klasöründe izole olacak
- Shared utility'ler `utils/` klasöründe olacak
- Type tanımları `types/` klasöründe olacak

## 6. Security First
- Input validation her endpoint'te zorunlu (Zod)
- SQL Injection: Prisma ORM ile parametrized query kullanılacak
- XSS: User input'ları sanitize edilecek
- Rate limiting tüm public endpoint'lerde aktif olacak
- Sensitive data (password, token) asla log'lanmayacak
- Environment variable'lar `.env` dosyasında, asla commit edilmeyecek
- JWT secret'lar güçlü ve unique olacak
- CORS sadece izinli origin'lere açık olacak
- Helmet middleware ile security header'lar eklenecek

## 7. Error Handling
- Try-catch blokları ile hatalar yakalanacak
- Global error handler middleware kullanılacak
- Hatalar anlamlı mesajlarla dönülecek (production'da detay gizlenecek)
- Tüm hatalar loglanacak (winston/pino)
- Error code standardı kullanılacak (AUTH_001, JOB_001, vb.)

## 8. Database Rules
- Her değişiklik için migration oluşturulacak
- Migration'lar geri alınabilir (rollback) olacak
- Seed data güncel tutulacak
- Index'ler performans için uygun alanlara eklenecek
- Soft delete tercih edilecek (kritik veriler için)
- Foreign key constraint'ler tanımlanacak

## 9. Git & Version Control
- Her feature için ayrı branch açılacak (`feature/T01-project-setup`)
- Commit mesajları anlamlı olacak (`feat: add user registration endpoint`)
- PR açılmadan önce tüm testler geçmeli
- `.env`, `node_modules`, build dosyaları commit edilmeyecek
- Sensitive bilgiler asla repo'ya pushllanmayacak

## 10. Documentation
- Her endpoint Swagger/OpenAPI ile dokümante edilecek
- Karmaşık business logic için kod içi yorum eklenecek
- README.md güncel tutulacak
- API değişiklikleri CHANGELOG'a yazılacak

## 11. Performance
- N+1 query problemi önlenecek (Prisma include/select)
- Büyük listeler paginate edilecek
- Sık erişilen veriler Redis'te cache'lenecek
- Ağır işlemler background job'a alınacak
- Database query'leri optimize edilecek (EXPLAIN ANALYZE)

## 12. TypeScript Standards
- `any` tipi kullanılmayacak (zorunlu haller hariç)
- Interface ve Type tanımları yapılacak
- Strict mode aktif olacak
- ESLint ve Prettier kurallarına uyulacak
- Unused import/variable bırakılmayacak

---

## Quick Checklist (Her Task İçin)

```
□ Docker container'lar çalışıyor mu?
□ Kod clean code prensiplerine uygun mu?
□ Input validation eklendi mi?
□ Security kontrolleri yapıldı mı?
□ Error handling eklendi mi?
□ API endpoint test edildi mi?
□ Integration test yazıldı mı?
□ Swagger dokümantasyonu eklendi mi?
□ JobPlatform_Backend_Plan.json güncellendi mi?
□ Git commit yapıldı mı?
```
