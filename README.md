# Sketch Frontend

Angular tabanlı şirket krokisi, oda yerleşimi ve sensör izleme arayüzüdür. Uygulama; bina, kat, oda, restricted area ve sensör yönetimini destekler. Odalar ve sensörler koordinat bazlı olarak kroki üzerinde gösterilir. Sensörlerden gelen sıcaklık ve nem verileri WebSocket üzerinden gerçek zamanlı takip edilir.

## İçindekiler

- [Proje Hakkında](#proje-hakkında)
- [Özellikler](#özellikler)
- [Kullanılan Teknolojiler](#kullanılan-teknolojiler)
- [Proje Yapısı](#proje-yapısı)
- [Kurulum](#kurulum)
- [Çalıştırma](#çalıştırma)
- [Backend Bağlantıları](#backend-bağlantıları)
- [Sayfalar](#sayfalar)
- [Temel Modeller](#temel-modeller)
- [Geliştirme Komutları](#geliştirme-komutları)
- [Notlar](#notlar)

## Proje Hakkında

Bu proje, şirket binalarındaki kat planlarını dijital olarak yönetmek ve odalara yerleştirilen sensörlerden gelen verileri takip etmek amacıyla geliştirilmiştir.

Uygulama üzerinden:

- Bina ekleme, güncelleme ve silme işlemleri yapılabilir.
- Kat oluşturulabilir ve seçilen kata ait odalar görüntülenebilir.
- Odalar koordinat bilgilerine göre kroki alanına yerleştirilebilir.
- Bir odanın içinde kalan alanlar `restricted area` olarak yönetilebilir.
- Sensörler odalara koordinat bazlı olarak eklenebilir.
- Sensörlerden gelen sıcaklık ve nem verileri gerçek zamanlı takip edilebilir.
- Kritik ve uyarı durumundaki odalar/sensörler ayrı panellerde gösterilebilir.
- Sensör verileri analiz sayfasında geçmiş, son veri, ortalama ve tarih aralığına göre incelenebilir.

## Özellikler

### Kroki ve Oda Yönetimi

- Div tabanlı kroki çizimi
- Grid ve cetvel desteği
- Pan/zoom desteği
- Kat bazlı oda gösterimi
- Oda koordinatları için `x`, `y`, `width`, `height` kullanımı
- Restricted area desteği
- Oda çakışma ve iç içe yerleşim kontrolleri
- Koridor mantığı ile kat genel alanının temsil edilmesi

### Sensör Yönetimi

- Sensör ekleme, güncelleme ve silme
- Sensörlerin oda içinde koordinat bazlı gösterimi
- WebSocket ile gerçek zamanlı sıcaklık ve nem verisi alma
- Sensör durum renklendirmesi:
  - Yeşil: Normal
  - Sarı: Uyarı
  - Kırmızı: Kritik
  - Unknown: Veri yok veya durum belirlenemedi

### İzleme ve Analiz

- Ana sayfada seçili bina/kat krokisi
- Problemli odalar ve sensörler için uyarı panelleri
- Tüm odalar için ayrı sensör izleme sayfası
- Sensör verisi analiz sayfası
- Oda bazlı son veri ve geçmiş veri görüntüleme
- Sensör bazlı son veri, ortalama, son N kayıt ve tarih aralığı sorguları

## Kullanılan Teknolojiler

- Angular 16.2.x
- TypeScript 5.1.x
- RxJS 7.8.x
- Angular Router
- Angular Forms
- SCSS
- WebSocket
- Node.js + Express backend entegrasyonu
- PostgreSQL backend veri kaynağı

## Proje Yapısı

```text
src/app
├── features
│   ├── buildings
│   │   ├── building-form
│   │   ├── models
│   │   └── services
│   ├── floors
│   │   └── floor-form
│   ├── restrictedArea
│   │   └── services
│   ├── rooms
│   │   ├── mappers
│   │   ├── models
│   │   ├── room-form
│   │   └── services
│   └── sensors
│       ├── models
│       ├── sensor-data-analysis
│       ├── sensor-form
│       ├── sensor-monitor
│       └── services
├── home
├── models
└── shared
    └── components
        └── modal
```

### Önemli Dosyalar

| Dosya | Açıklama |
| --- | --- |
| `src/app/home/home.component.ts` | Ana kroki ekranı, bina/kat/oda/sensör yönetimi ve WebSocket işlemleri |
| `src/app/features/sensors/sensor-monitor/sensor-monitor.component.ts` | Tüm binalardaki problemli odaları ve sensör durumlarını izleme sayfası |
| `src/app/features/sensors/sensor-data-analysis/sensor-data-analysis.component.ts` | Sensör verisi analiz ekranı |
| `src/app/models/data.ts` | Building, Room, Sensor, ViewModel ve arayüz tanımları |
| `src/app/features/rooms/mappers/room.mapper.ts` | Oda form verisini backend request modeline dönüştüren mapper |
| `src/app/shared/components/modal` | Ortak modal bileşeni |
| `src/app/app.routes.ts` | Uygulama route tanımları |

## Kurulum

Projeyi klonladıktan sonra frontend klasörüne girin:

```bash
cd sketch_frontend
```

Gerekli paketleri yükleyin:

```bash
npm install
```

## Çalıştırma

Frontend geliştirme sunucusunu başlatmak için:

```bash
npm start
```

veya:

```bash
ng serve
```

Uygulama varsayılan olarak şu adreste çalışır:

```text
http://localhost:4200/
```

## Backend Bağlantıları

Frontend, backend servislerine varsayılan olarak aşağıdaki adres üzerinden bağlanır:

```text
http://localhost:3000
```

WebSocket bağlantısı:

```text
ws://localhost:3000
```

Kullanılan başlıca API endpoint grupları:

| Modül | Endpoint |
| --- | --- |
| Building | `/building`, `/building/add`, `/building/:id` |
| Room | `/api/rooms` |
| Sensor | `/api/sensors` |
| Restricted Area | `/api/restricted-areas` |
| Sensor Data | `/api/sensor-data` |

> Not: Frontend’in düzgün çalışması için Node.js + Express backend’in `localhost:3000` üzerinde çalışıyor olması gerekir.

## Sayfalar

### Home

```text
/home
```

Ana kroki ekranıdır. Seçili bina ve kata göre odalar, restricted area alanları ve sensörler kroki üzerinde gösterilir.

Query parametre desteği vardır:

```text
/home?buildingId=3&floor=0
```

### Sensor Monitor

```text
/sensor-monitor
```

Tüm binalardaki odaları ve sensör durumlarını izlemek için kullanılır. Kritik ve uyarı durumları bina, kat ve oda bazında gruplanır.

### Sensor Data Analysis

```text
/sensor-data-analysis
```

Sensör verilerini analiz etmek için kullanılır. Oda ve sensör bazlı veri sorgulamaları yapılabilir.

Desteklenen analiz türleri:

- Odaya ait son veriler
- Odaya ait geçmiş veriler
- Sensöre ait son veri
- Sensör ortalaması
- Sensöre ait son N kayıt
- Sensöre ait tarih aralığı verileri

## Temel Modeller

Projede kullanılan ana domain modelleri:

- `Building`
- `Room`
- `Sensor`
- `RestrictedArea`
- `RoomViewModel`
- `SensorViewModel`
- `RestrictedAreaViewModel`
- `FaultySensorItem`

Bu modeller `src/app/models/data.ts` içinde tanımlanmıştır.

## Geliştirme Komutları

### Development server

```bash
ng serve
```

Uygulama `http://localhost:4200/` üzerinde çalışır. Dosyalarda değişiklik yapıldığında otomatik olarak yenilenir.

### Component oluşturma

```bash
ng generate component component-name
```

Directive, pipe, service, class, guard, interface, enum veya module oluşturmak için:

```bash
ng generate directive|pipe|service|class|guard|interface|enum|module name
```

### Build

```bash
ng build
```

Build çıktıları `dist/` klasöründe oluşturulur.

### Test

```bash
ng test
```

Unit testleri Karma üzerinden çalıştırır.

## Notlar

- Kroki üzerindeki oda ve sensör koordinatları teknik ölçü olarak sabit tutulur.
- Responsive yapı daha çok dış layout, modal, form ve seçim alanları için uygulanır.
- Sensör verileri WebSocket ile geldiği için backend sunucusunun çalışır durumda olması gerekir.
- Projede Angular standalone component yapısı ağırlıklı olarak kullanılmaktadır.
- API adresleri servis dosyalarında `localhost:3000` olarak tanımlanmıştır. Farklı bir backend adresi kullanılacaksa servislerdeki `baseUrl` değerleri güncellenmelidir.

## Angular CLI Bilgisi

Bu proje [Angular CLI](https://github.com/angular/angular-cli) version 16.2.16 ile oluşturulmuştur.

Angular CLI hakkında daha fazla bilgi için:

```bash
ng help
```

veya Angular CLI dokümantasyonunu inceleyebilirsiniz.
