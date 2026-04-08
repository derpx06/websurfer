<h1 align="center">
    <img src="chrome-extension/public/websurfer_banner.png" width="800" alt="WebSurfer Banner" /><br>
</h1>

<div align="center">

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/WebSurfer)

</div>

## 🌐 WebSurfer

WebSurfer, tarayıcınızda çalışan açık kaynaklı bir yapay zeka tarayıcı otomasyon aracıdır. Esnek LLM seçenekleri ve çoklu ajan sistemiyle birlikte OpenAI Operator’a ücretsiz bir alternatiftir.

⬇️ [WebSurfer’ı Chrome Web Mağazası’ndan ücretsiz edinin](https://chromewebstore.google.com/detail/WebSurfer/imbddededgmcgfhfpcjmijokokekbkal)

❤️ WebSurfer’ı sevdiniz mi? Bize GitHub'da bir yıldız ⭐ verin!

<div align="center">
<img src="https://github.com/user-attachments/assets/112c4385-7b03-4b81-a352-4f348093351b" width="600" alt="WebSurfer Demo GIF" />
<p><em>WebSurfer’ın çoklu ajan sistemi, HuggingFace'i gerçek zamanlı analiz ederken; Planner engellerle karşılaştığında akıllıca kendi kendini düzeltir ve Navigator’a yaklaşımını dinamik olarak ayarlamasını söyler—tüm bunlar yerel olarak tarayıcınızda gerçekleşir.</em></p>
</div>

## 🔥Neden WebSurfer?

OpenAI Operator'ın aylık 200 dolarlık ücretinden kurtulmak mı istiyorsunuz? **WebSurfer**, bir Chrome uzantısı olarak size premium tarayıcı otomasyonu yetenekleri sunar ve tam kontrolü elinizde tutmanızı sağlar:

- **%100 Ücretsiz** - Abonelik ücreti veya gizli maliyetler yok. Sadece yükleyin ve kendi API anahtarlarınızı kullanın, ne kadar kullanırsanız o kadar ödersiniz.
- **Gizlilik Odaklı** - Her şey yerel tarayıcınızda çalışır. Kimlik bilgileriniz yalnızca sizde kalır, bulut hizmetleriyle paylaşılmaz.
- **Esnek LLM Seçenekleri** - Tercih ettiğiniz LLM sağlayıcılarına bağlanın, farklı ajanlar için farklı modeller seçme özgürlüğünüz olsun.
- **Tamamen Açık Kaynak** - Tarayıcınızın nasıl otomatikleştirildiğini şeffaf bir şekilde görün. Gizli süreçler yok.

> **Not:** Şu anda OpenAI, Anthropic, Gemini, Ollama, Groq, Cerebras ve OpenAI uyumlu özel sağlayıcıları destekliyoruz. Daha fazlası yolda.

## 📊 Temel Özellikler

- **Çoklu Ajan Sistemi**: Uzmanlaşmış yapay zeka ajanları, karmaşık web görevlerini birlikte gerçekleştirir
- **Etkileşimli Yan Panel**: Gerçek zamanlı durum güncellemeleriyle sezgisel sohbet arayüzü
- **Görev Otomasyonu**: Web siteleri arasında tekrar eden görevleri sorunsuz şekilde otomatikleştirir
- **Takip Soruları**: Tamamlanan görevler hakkında bağlamsal takip soruları sorabilirsiniz
- **Konuşma Geçmişi**: Yapay zeka ajanlarınızla olan geçmiş etkileşimlere kolay erişim
- **Çoklu LLM Desteği**: Tercih ettiğiniz LLM sağlayıcılarına bağlanın, farklı ajanlara farklı modeller atayın

## 🌐 Tarayıcı Desteği

**Resmi olarak desteklenenler:**
- **Chrome** – Tüm özelliklerle tam destek
- **Edge** – Tüm özelliklerle tam destek

**Desteklenmeyenler:**
- Firefox, Safari ve diğer Chromium türevleri (Opera, Arc vb.)

> **Not**: WebSurfer diğer Chromium tabanlı tarayıcılarda çalışabilir, ancak en iyi deneyim ve garantili uyumluluk için Chrome veya Edge öneriyoruz.

## 🚀 Hızlı Başlangıç

1. **Chrome Web Mağazası’ndan Kurulum** (Kararlı Sürüm):
   * [WebSurfer Chrome Web Mağazası sayfasına](https://chromewebstore.google.com/detail/WebSurfer/imbddededgmcgfhfpcjmijokokekbkal) gidin
   * "Chrome’a Ekle" butonuna tıklayın
   * Kurulumu onaylayın

> **Önemli Not**: En yeni özellikler için aşağıdaki ["En Son Sürümü Manuel Kur"](#-en-son-sürümü-manuel-kur) kısmından kurulum yapmanızı öneririz. Chrome Web Mağazası versiyonu inceleme süreci nedeniyle gecikebilir.

2. **Ajan Modellerini Yapılandırın**:
   * Araç çubuğundaki WebSurfer simgesine tıklayın
   * Sağ üstteki `Ayarlar` simgesine tıklayın
   * LLM API anahtarlarınızı ekleyin
   * Farklı ajanlar (Navigator, Planner) için hangi modelin kullanılacağını seçin

## 🔧 En Son Sürümü Manuel Kur

En yeni özellikleri içeren en güncel sürümü kurmak için:

1. **İndirin**
    * Resmi Github [sürüm sayfasından](https://github.com/WebSurfer/WebSurfer/releases) en güncel `WebSurfer.zip` dosyasını indirin

2. **Kurulum**:
    * `WebSurfer.zip` dosyasını çıkarın
    * Chrome'da `chrome://extensions/` adresine gidin
    * Sağ üstten `Geliştirici modu`nu etkinleştirin
    * Sol üstte `Paketlenmemişi yükle`ye tıklayın
    * Çıkardığınız `WebSurfer` klasörünü seçin

3. **Ajan Modellerini Yapılandırın**
    * WebSurfer simgesine tıklayarak yan paneli açın
    * Sağ üstteki `Ayarlar` simgesine tıklayın
    * API anahtarlarınızı ekleyin
    * Ajanlara model atayın (Navigator, Planner)

4. **Güncelleme**:
    * Yeni `WebSurfer.zip` dosyasını indirin
    * Mevcut WebSurfer dosyalarını yenileriyle değiştirin
    * `chrome://extensions/` sayfasına gidip WebSurfer kartındaki yenile simgesine tıklayın

## 🛠️ Kaynaktan Derleme

WebSurfer’ı kendiniz derlemek isterseniz şu adımları izleyin:

1. **Gereksinimler**:
   * [Node.js](https://nodejs.org/) (v22.12.0 veya üstü)
   * [pnpm](https://pnpm.io/installation) (v9.15.1 veya üstü)

2. **Depoyu Klonlayın**:
   ```bash
   git clone https://github.com/WebSurfer/WebSurfer.git
   cd WebSurfer
   ```

3. **Bağımlılıkları Yükleyin**:

   ```bash
   pnpm install
   ```

4. **Eklentiyi Derleyin**:

   ```bash
   pnpm build
   ```

5. **Eklentiyi Yükleyin**:

   * Derlenen eklenti `dist` klasöründe bulunur
   * Manuel Kurulum bölümündeki adımları takip ederek yükleyin

6. **Geliştirme Modu** (isteğe bağlı):

   ```bash
   pnpm dev
   ```

## 🤖 Model Seçimi

WebSurfer, her ajan için farklı LLM modelleri ayarlamanıza olanak tanır. Böylece performans ve maliyet arasında denge kurabilirsiniz. İşte önerilen yapılandırmalar:

### Daha Yüksek Performans

* **Planner**: Claude Sonnet 4

  * Daha iyi mantıksal düşünme ve planlama
* **Navigator**: Claude Haiku 3.5

  * Web gezintisi görevlerinde verimli
  * Performans ve maliyet dengesi

### Uygun Maliyetli Yapılandırma

* **Planner**: Claude Haiku veya GPT-4o

  * Düşük maliyetle makul performans
  * Karmaşık görevlerde daha fazla yineleme gerekebilir
* **Navigator**: Gemini 2.5 Flash veya GPT-4o-mini

  * Hafif ve ekonomik
  * Temel gezinme görevleri için yeterli

### Yerel Modeller

* **Kurulum Seçenekleri**:

  * Ollama veya diğer OpenAI uyumlu sağlayıcılar ile modelleri yerel olarak çalıştırın
  * Sıfır API maliyeti ve tam gizlilik

* **Önerilen Modeller**:

  * **Qwen3-30B-A3B-Instruct-2507**
  * **Falcon3 10B**
  * **Qwen 2.5 Coder 14B**
  * **Mistral Small 24B**
  * [Topluluktan en son test sonuçları](https://gist.github.com/maximus2600/75d60bf3df62986e2254d5166e2524cb)

* **Prompt Mühendisliği**:

  * Yerel modeller daha net ve özgül komutlar ister
  * Yüksek seviyeli, belirsiz komutlardan kaçının
  * Karmaşık görevleri adım adım açık şekilde verin
  * Net bağlam ve kısıtlamalar belirtin

> **Not**: Ucuz yapılandırmalar daha az kararlı çıktı verebilir ve karmaşık görevlerde daha fazla yineleme gerekebilir.

> **İpucu**: Kendi model yapılandırmalarınızı denemekten çekinmeyin!

## 💡 Uygulamalı Örnekler

Sadece bir cümleyle gerçekleştirebileceğiniz güçlü görevlerden bazıları:

1. **Haber Özeti**:

   > "TechCrunch'a git ve son 24 saatteki en popüler 10 başlığı çıkar"

2. **GitHub Araştırması**:

   > "En çok yıldız almış popüler Python depolarını GitHub'da bul"

3. **Alışveriş Araştırması**:

   > "Amazon’da suya dayanıklı, 10 saat batarya ömrüne sahip, 50 doların altında taşınabilir bir Bluetooth hoparlör bul"

## 🛠️ Yol Haritası

WebSurfer için heyecan verici yeni özellikler geliştiriyoruz, katılmak ister misiniz?

Detaylı yol haritamıza ve gelecek özelliklere [GitHub Discussions](https://github.com/WebSurfer/WebSurfer/discussions/85) üzerinden göz atabilirsiniz.

## 🤝 Katkıda Bulunun

Her türden katkıya açığız! Kod katkısı için yönergeleri [CONTRIBUTING.md](CONTRIBUTING.md) dosyasında bulabilirsiniz. Hatalar, özellikler veya dökümantasyon iyileştirmeleri için pull request gönderin.

## 🔒 Güvenlik

Bir güvenlik açığı keşfederseniz, lütfen bunu açık şekilde **issue, pull request veya discussion** yoluyla paylaşmayın.

Bunun yerine, [GitHub Güvenlik Danışma Sayfası](https://github.com/WebSurfer/WebSurfer/security/advisories/new) üzerinden özel olarak bildirin. Böylece açığı kamuya açıklanmadan önce düzeltme şansı buluruz.

WebSurfer’ı ve kullanıcılarını güvende tutmaya yardım ettiğiniz için teşekkür ederiz!

## 💬 İletişim

Hata raporları ve özellik istekleri için lütfen [GitHub Issues](https://github.com/WebSurfer/WebSurfer/issues) veya [GitHub Discussions](https://github.com/WebSurfer/WebSurfer/discussions) kullanın.

## 👏 Teşekkürler

WebSurfer, şu harika açık kaynak projeler üzerine inşa edilmiştir:

* [Browser Use](https://github.com/browser-use/browser-use)
* [Puppeteer](https://github.com/EmergenceAI/Agent-E)
* [Chrome Extension Boilerplate](https://github.com/Jonghakseo/chrome-extension-boilerplate-react-vite)
* [LangChain](https://github.com/langchain-ai/langchainjs)

Tüm yaratıcılarına ve katkıda bulunanlara büyük teşekkürler!

## 📄 Lisans

Bu proje Apache License 2.0 ile lisanslanmıştır – detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 🚀 Misyonumuz

**WebSurfer**, gelişmiş web otomasyonunu herkes için erişilebilir kılmak amacıyla inşa edildi. Yapay zekanın, kullanıcıların gizlilikten veya maliyetten ödün vermeden web'de daha verimli bir şekilde gezinmesini ve etkileşim kurmasını sağlaması gerektiğine inanıyoruz.

---

Sevgiyle yapıldı ❤️ WebSurfer Ekibi tarafından.

WebSurfer’ı sevdiniz mi? Bize GitHub'da bir yıldız 🌟 verin!

---

📘 **Türkçe çeviri katkısı**: Burak Can Öğüt
