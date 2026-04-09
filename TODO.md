# TODO - Next.js 15+ & Stripe Pro Üyelik Entegrasyonu

- [x] Rutin API FREE limitini 3 olarak güncelle
  - [x] `src/app/api/v1/routines/route.ts` içindeki `FREE_ROUTINE_LIMIT` değerini 3 yap
  - [x] 403 hata mesajını yeni limite göre güncelle

- [x] Dashboard limit UI akışını 3 limite göre güncelle
  - [x] `src/components/dashboard/RoutineList.tsx` içinde `atLimit` hesabını 3 olarak güncelle
  - [x] Uyarı metnini `3/3` olacak şekilde güncelle
  - [x] `AddRoutineDialog` bileşenine limit/pro ile ilgili prop geç

- [x] AddRoutineDialog içinde limit dolunca formu kilitle ve upgrade yönlendirmesi ekle
  - [x] `src/components/dashboard/AddRoutineDialog.tsx` için yeni props ekle (`atLimit`)
  - [x] Limit doluysa input ve submit aksiyonlarını devre dışı bırak
  - [x] Limit uyarısı + `/api/v1/stripe/checkout` üzerinden PRO’ya geçiş butonu ekle

- [x] Stripe webhook işleyicisini genişlet
  - [x] `src/services/stripe.service.ts` içinde `invoice.payment_succeeded` olayını işle
  - [x] `checkout.session.completed` ve `invoice.payment_succeeded` için kullanıcıyı `PRO` yap
  - [x] Abonelik güncelleme/iptalde metadata yoksa `stripeCustomerId` fallback’i ile kullanıcı bul
  - [x] İptalde kullanıcıyı `FREE` yap ve `stripeSubscriptionId` alanını temizle

- [ ] Doğrulama
  - [ ] Lint/TypeScript kontrolü çalıştır
  - [ ] Gerekirse tip veya küçük uyumluluk düzeltmelerini uygula
