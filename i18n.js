/**
 * i18n.js - the language setting ("internationalization").
 *
 * How it works, in three steps:
 *   1. Every piece of text lives in the STRINGS table below, once in English (en)
 *      and once in Indonesian (id), under a short key like "nav.home".
 *   2. In the HTML we mark text with   data-i18n="nav.home"
 *      or an attribute with            data-i18n-attr="placeholder:input.name.placeholder"
 *      and apply() fills them in with the chosen language.
 *   3. The chosen language is remembered in the browser (localStorage). When it
 *      changes, we announce a "fs:langchange" event so pages can redraw their
 *      dynamic parts (cards, stats, ...).
 *
 * In JavaScript use:  I18N.t('key')  or  I18N.t('key', { name: 'Sam' })  for {name} placeholders.
 */

const I18N = (() => {
  'use strict';

  const STORAGE_KEY = 'fs-lang';
  const LANGS = ['id', 'en'];

  const STRINGS = {
    en: {
      // ---- Navigation, badge, footer (all pages) ----
      'nav.label': 'Main',
      'nav.brand': 'Fav Subject',
      'nav.home': 'Home',
      'nav.fillIn': 'Fill In',
      'nav.profiles': 'Profiles',
      'skip': 'Skip to content',
      'lang.label': 'Language',
      'mode.title': 'Where profiles are saved',
      'mode.checking': 'Checking...',
      'mode.local': 'Saving locally',
      'mode.sheets': 'Connected to Google Sheets',
      'mode.error': 'Server offline',
      'footer.home': 'Home',
      'footer.fill': 'Fill in your profile',
      'footer.all': 'See all profiles',

      // ---- Homepage ----
      'home.docTitle': 'Favorite Subject - Class Yearbook',
      'home.desc': "Tell the class your favorite school subject and see everyone else's profile card.",
      'home.kicker': '★ Class Yearbook Project ★',
      'home.title1': "What's your",
      'home.title2': 'Favorite',
      'home.title3': 'Subject?',
      'home.lead': 'Make your own profile card, rate your favorite class and tell us why you love it. Then meet the whole school in the gallery!',
      'home.ctaFill': 'Fill In Your Profile',
      'home.ctaSee': "See Everyone's Profiles",
      'stat.title': 'Live Scoreboard',
      'stat.students': 'Students so far',
      'stat.top': 'Most popular subject',
      'stat.rating': 'Average rating',
      'stat.pickedOne': '{n} student picked it',
      'stat.pickedMany': '{n} students picked it',
      'stat.first': 'Be the first to pick one!',
      'stat.error': 'Could not load the scoreboard right now. Is the server running?',
      'how.title': 'How It Works',
      'how.1.title': 'Fill in the card',
      'how.1.text': 'Add your name, class and favorite subject. Rating and a note are optional.',
      'how.2.title': 'Get your profile',
      'how.2.text': 'Your card pops up in the gallery with a colorful avatar made from your initials.',
      'how.3.title': 'Meet the class',
      'how.3.text': 'Search, filter by subject and sort to find friends who love the same class.',
      'how.cta': 'Add my card',
      'footer.big': 'Made for our class ❤',
      'footer.small': 'A school project built with HTML, CSS, JavaScript and Node.js.',

      // ---- Input page ----
      'input.docTitle': 'Fill In Your Profile - Favorite Subject',
      'input.desc': 'Fill in your profile card: name, class, favorite subject, rating and a note.',
      'input.title1': 'Your Profile',
      'input.title2': 'Card',
      'input.lead': 'Two minutes, five little questions. Only the first three are required.',
      'input.tab': '★ My Profile Card',
      'input.required': 'required',
      'input.optional': 'optional',
      'input.name.label': "What's your name?",
      'input.name.placeholder': 'e.g. Aisyah Putri',
      'input.class.label': 'Which class are you in?',
      'input.class.placeholder': 'e.g. 7A or 8B',
      'input.subject.label': 'Your favorite subject',
      'input.subject.choose': 'Choose a subject...',
      'input.rating.label': 'How much do you like it?',
      'input.rating.hint': 'Tap a star, or skip this one.',
      'input.rating.chosen': '{n} out of 5 - nice!',
      'input.rating.clear': 'Clear rating',
      'input.rating.star1': '1 star',
      'input.rating.starN': '{n} stars',
      'input.note.label': 'Why do you like it?',
      'input.note.placeholder': 'Why do you like it?',
      'input.submit': 'Add me to the gallery!',
      'input.sending': 'Sending...',
      'input.lookAround': 'Just want to look around?',
      'input.seeGallery': 'See the profile gallery',
      'input.preview': 'Live preview',
      'input.preview.name': 'Your Name',
      'input.preview.class': '7A',
      'input.preview.subject': 'Subject',
      'input.preview.note': 'Your note will show up here.',
      'success.title': 'Woohoo, {name}!',
      'success.text': 'Your profile card is now in the gallery. Go say hi to the class!',
      'success.gallery': 'See the gallery',
      'success.another': 'Add another profile',
      'form.oops': 'Oops! {message}',

      // ---- Form and server error messages ----
      'err.name.required': 'Please tell us your name.',
      'err.name.tooLong': 'Name can be at most 40 characters.',
      'err.className.required': 'Please enter your class, like 7A.',
      'err.className.tooLong': 'Class can be at most 20 characters.',
      'err.subject.required': 'Please pick your favorite subject.',
      'err.subject.invalid': 'Please choose a subject from the list.',
      'err.note.tooLong': 'The note can be at most 200 characters.',
      'err.rating.invalid': 'The rating must be a whole number from 1 to 5.',
      'api.validation': 'Please fix the highlighted fields.',
      'api.rateLimited': 'Too many submissions. Please wait a minute and try again.',
      'api.unsupportedType': 'The server could not read that. Please try again.',
      'api.tooBig': 'That was too much text. Please shorten it.',
      'api.badJson': 'The server could not read that. Please try again.',
      'api.saveFailed': 'Your profile could not be saved. Please try again in a moment.',
      'api.loadFailed': 'Could not load the profiles right now.',
      'api.network': 'Could not reach the server. Is it running? Please try again.',
      'api.generic': 'Something went wrong. Please try again.',

      // ---- Gallery page ----
      'profiles.docTitle': 'Profile Gallery - Favorite Subject',
      'profiles.desc': "Meet the class! Every student's favorite subject as a profile card.",
      'profiles.title1': 'Meet The',
      'profiles.title2': 'Class',
      'profiles.lead': "Everyone's favorite subject in one place. Tap a card to see the full profile.",
      'profiles.searchLabel': 'Search by name',
      'profiles.searchPlaceholder': 'Search by name...',
      'profiles.sortBy': 'Sort by',
      'profiles.sort.newest': 'Newest first',
      'profiles.sort.name': 'Name A-Z',
      'profiles.sort.rating': 'Highest rated',
      'profiles.chipsLabel': 'Filter by favorite subject',
      'profiles.all': 'All',
      'profiles.showingOne': 'Showing {shown} of {total} profile',
      'profiles.showingMany': 'Showing {shown} of {total} profiles',
      'profiles.loading': 'Loading profiles',
      'profiles.empty.title': 'No profiles yet, be the first!',
      'profiles.empty.text': 'The gallery is waiting for its very first card.',
      'profiles.empty.cta': 'Fill in your profile',
      'profiles.none.title': 'Nobody matches that',
      'profiles.none.text': 'Try a different name or pick another subject.',
      'profiles.none.cta': 'Show everyone',
      'profiles.error.title': 'Could not load the profiles',
      'profiles.error.text': 'Something went wrong talking to the server.',
      'profiles.error.cta': 'Try again',
      'profiles.updated': 'Updated {time}',
      'profiles.close': 'Close profile',
      'card.open': "Open {name}'s profile",
      'card.demo': 'Demo',
      'card.joined': 'Joined {date}',
      'card.stars': '{n} out of 5 stars',
      'detail.rating': 'Rating',
      'detail.about': 'About',
      'detail.noRating': 'No rating given.',
      'detail.noNote': 'No note shared.',
      'detail.demo': 'This is a demo profile.',
    },

    id: {
      // ---- Navigasi, lencana, footer (semua halaman) ----
      'nav.label': 'Utama',
      'nav.brand': 'Mapel Favorit',
      'nav.home': 'Beranda',
      'nav.fillIn': 'Isi Profil',
      'nav.profiles': 'Profil',
      'skip': 'Langsung ke konten',
      'lang.label': 'Bahasa',
      'mode.title': 'Tempat profil disimpan',
      'mode.checking': 'Memeriksa...',
      'mode.local': 'Disimpan lokal',
      'mode.sheets': 'Terhubung ke Google Sheets',
      'mode.error': 'Server mati',
      'footer.home': 'Beranda',
      'footer.fill': 'Isi profilmu',
      'footer.all': 'Lihat semua profil',

      // ---- Beranda ----
      'home.docTitle': 'Mapel Favorit - Buku Tahunan Kelas',
      'home.desc': 'Ceritakan pelajaran favoritmu ke teman sekelas dan lihat kartu profil semua orang.',
      'home.kicker': '★ Proyek Buku Tahunan Kelas ★',
      'home.title1': 'Apa pelajaran',
      'home.title2': 'Favorit',
      'home.title3': 'kamu?',
      'home.lead': 'Buat kartu profilmu sendiri, beri nilai pelajaran favoritmu, dan ceritakan kenapa kamu suka. Lalu kenalan dengan seluruh sekolah di galeri!',
      'home.ctaFill': 'Isi Profilmu',
      'home.ctaSee': 'Lihat Profil Semua Orang',
      'stat.title': 'Papan Skor Langsung',
      'stat.students': 'Jumlah siswa',
      'stat.top': 'Pelajaran terpopuler',
      'stat.rating': 'Rata-rata rating',
      'stat.pickedOne': '{n} siswa memilihnya',
      'stat.pickedMany': '{n} siswa memilihnya',
      'stat.first': 'Jadilah yang pertama memilih!',
      'stat.error': 'Papan skor belum bisa dimuat. Apakah servernya menyala?',
      'how.title': 'Cara Kerja',
      'how.1.title': 'Isi kartunya',
      'how.1.text': 'Tulis nama, kelas, dan pelajaran favoritmu. Rating dan catatan boleh dikosongkan.',
      'how.2.title': 'Dapatkan profilmu',
      'how.2.text': 'Kartumu muncul di galeri dengan avatar warna-warni dari inisial namamu.',
      'how.3.title': 'Kenalan dengan kelas',
      'how.3.text': 'Cari, saring berdasarkan pelajaran, dan urutkan untuk menemukan teman yang suka pelajaran yang sama.',
      'how.cta': 'Tambah kartuku',
      'footer.big': 'Dibuat untuk kelas kita ❤',
      'footer.small': 'Proyek sekolah yang dibuat dengan HTML, CSS, JavaScript, dan Node.js.',

      // ---- Halaman isi profil ----
      'input.docTitle': 'Isi Profilmu - Mapel Favorit',
      'input.desc': 'Isi kartu profilmu: nama, kelas, pelajaran favorit, rating, dan catatan.',
      'input.title1': 'Kartu Profil',
      'input.title2': 'Kamu',
      'input.lead': 'Dua menit, lima pertanyaan singkat. Hanya tiga yang pertama wajib diisi.',
      'input.tab': '★ Kartu Profilku',
      'input.required': 'wajib',
      'input.optional': 'opsional',
      'input.name.label': 'Siapa namamu?',
      'input.name.placeholder': 'mis. Aisyah Putri',
      'input.class.label': 'Kamu kelas berapa?',
      'input.class.placeholder': 'mis. 7A atau 8B',
      'input.subject.label': 'Pelajaran favoritmu',
      'input.subject.choose': 'Pilih pelajaran...',
      'input.rating.label': 'Seberapa kamu suka?',
      'input.rating.hint': 'Ketuk bintang, atau lewati saja.',
      'input.rating.chosen': '{n} dari 5 - keren!',
      'input.rating.clear': 'Hapus rating',
      'input.rating.star1': '1 bintang',
      'input.rating.starN': '{n} bintang',
      'input.note.label': 'Kenapa kamu suka?',
      'input.note.placeholder': 'Kenapa kamu suka pelajaran ini?',
      'input.submit': 'Masukkan aku ke galeri!',
      'input.sending': 'Mengirim...',
      'input.lookAround': 'Hanya ingin melihat-lihat?',
      'input.seeGallery': 'Lihat galeri profil',
      'input.preview': 'Pratinjau langsung',
      'input.preview.name': 'Namamu',
      'input.preview.class': '7A',
      'input.preview.subject': 'Pelajaran',
      'input.preview.note': 'Catatanmu akan muncul di sini.',
      'success.title': 'Hore, {name}!',
      'success.text': 'Kartu profilmu sudah ada di galeri. Yuk, sapa teman-teman sekelas!',
      'success.gallery': 'Lihat galeri',
      'success.another': 'Tambah profil lain',
      'form.oops': 'Ups! {message}',

      // ---- Pesan kesalahan formulir dan server ----
      'err.name.required': 'Tolong isi namamu.',
      'err.name.tooLong': 'Nama paling banyak 40 karakter.',
      'err.className.required': 'Tolong isi kelasmu, misalnya 7A.',
      'err.className.tooLong': 'Kelas paling banyak 20 karakter.',
      'err.subject.required': 'Tolong pilih pelajaran favoritmu.',
      'err.subject.invalid': 'Tolong pilih pelajaran dari daftar.',
      'err.note.tooLong': 'Catatan paling banyak 200 karakter.',
      'err.rating.invalid': 'Rating harus bilangan bulat dari 1 sampai 5.',
      'api.validation': 'Tolong perbaiki kolom yang ditandai.',
      'api.rateLimited': 'Terlalu banyak kiriman. Tunggu semenit lalu coba lagi.',
      'api.unsupportedType': 'Server tidak bisa membaca kirimanmu. Coba lagi.',
      'api.tooBig': 'Teksnya terlalu panjang. Tolong dipersingkat.',
      'api.badJson': 'Server tidak bisa membaca kirimanmu. Coba lagi.',
      'api.saveFailed': 'Profilmu belum bisa disimpan. Coba lagi sebentar lagi.',
      'api.loadFailed': 'Profil belum bisa dimuat sekarang.',
      'api.network': 'Tidak bisa terhubung ke server. Apakah servernya menyala? Coba lagi.',
      'api.generic': 'Terjadi masalah. Silakan coba lagi.',

      // ---- Halaman galeri ----
      'profiles.docTitle': 'Galeri Profil - Mapel Favorit',
      'profiles.desc': 'Kenalan dengan kelas! Pelajaran favorit setiap siswa dalam bentuk kartu profil.',
      'profiles.title1': 'Kenalan dengan',
      'profiles.title2': 'Kelas',
      'profiles.lead': 'Pelajaran favorit semua orang di satu tempat. Ketuk kartu untuk melihat profil lengkap.',
      'profiles.searchLabel': 'Cari berdasarkan nama',
      'profiles.searchPlaceholder': 'Cari berdasarkan nama...',
      'profiles.sortBy': 'Urutkan',
      'profiles.sort.newest': 'Terbaru dulu',
      'profiles.sort.name': 'Nama A-Z',
      'profiles.sort.rating': 'Rating tertinggi',
      'profiles.chipsLabel': 'Saring berdasarkan pelajaran favorit',
      'profiles.all': 'Semua',
      'profiles.showingOne': 'Menampilkan {shown} dari {total} profil',
      'profiles.showingMany': 'Menampilkan {shown} dari {total} profil',
      'profiles.loading': 'Memuat profil',
      'profiles.empty.title': 'Belum ada profil, jadilah yang pertama!',
      'profiles.empty.text': 'Galeri ini masih menunggu kartu pertamanya.',
      'profiles.empty.cta': 'Isi profilmu',
      'profiles.none.title': 'Tidak ada yang cocok',
      'profiles.none.text': 'Coba nama lain atau pilih pelajaran lain.',
      'profiles.none.cta': 'Tampilkan semua',
      'profiles.error.title': 'Profil tidak bisa dimuat',
      'profiles.error.text': 'Ada masalah saat menghubungi server.',
      'profiles.error.cta': 'Coba lagi',
      'profiles.updated': 'Diperbarui {time}',
      'profiles.close': 'Tutup profil',
      'card.open': 'Buka profil {name}',
      'card.demo': 'Contoh',
      'card.joined': 'Bergabung {date}',
      'card.stars': '{n} dari 5 bintang',
      'detail.rating': 'Rating',
      'detail.about': 'Tentang',
      'detail.noRating': 'Belum memberi rating.',
      'detail.noNote': 'Belum ada catatan.',
      'detail.demo': 'Ini adalah profil contoh.',
    },
  };

  // -------------------------------------------------------------------------
  // Choosing and remembering the language
  // -------------------------------------------------------------------------

  /** Saved choice first; otherwise Indonesian if the browser is set to Indonesian; otherwise English. */
  function detectLanguage() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (LANGS.includes(saved)) return saved;
    } catch (err) { /* storage blocked: just continue */ }
    return String(navigator.language || '').toLowerCase().startsWith('id') ? 'id' : 'en';
  }

  let currentLang = detectLanguage();

  function lang() { return currentLang; }

  /** Locale code for dates: "id-ID" or "en-US". */
  function locale() { return currentLang === 'id' ? 'id-ID' : 'en-US'; }

  // -------------------------------------------------------------------------
  // Translating
  // -------------------------------------------------------------------------

  /** Look up a key in the current language (English if missing) and fill in {placeholders}. */
  function t(key, vars) {
    let text = (STRINGS[currentLang] && STRINGS[currentLang][key]) ?? STRINGS.en[key] ?? key;
    if (vars) {
      text = text.replace(/\{(\w+)\}/g, (match, name) => (vars[name] !== undefined ? String(vars[name]) : match));
    }
    return text;
  }

  /**
   * Fill in every marked element inside `root`:
   *   data-i18n="key"                       -> replaces the text
   *   data-i18n-attr="attr:key;attr2:key2"  -> sets attributes (placeholder, aria-label, title, content)
   */
  function apply(root = document) {
    document.documentElement.lang = currentLang;

    root.querySelectorAll('[data-i18n]').forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });

    root.querySelectorAll('[data-i18n-attr]').forEach((node) => {
      node.dataset.i18nAttr.split(';').forEach((pair) => {
        const [attr, key] = pair.split(':').map((part) => part.trim());
        if (attr && key) node.setAttribute(attr, t(key));
      });
    });

    // The language switch buttons show which language is active.
    document.querySelectorAll('.lang-switch__btn').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.lang === currentLang));
    });
  }

  /** Switch language, remember it, update the page and tell everyone. */
  function setLang(newLang) {
    if (!LANGS.includes(newLang) || newLang === currentLang) return;
    currentLang = newLang;
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch (err) { /* ignore */ }
    apply();
    document.dispatchEvent(new CustomEvent('fs:langchange', { detail: { lang: newLang } }));
  }

  // Wire up the ID / EN buttons in the navigation bar and translate the static text.
  document.querySelectorAll('.lang-switch__btn').forEach((button) => {
    button.addEventListener('click', () => setLang(button.dataset.lang));
  });
  apply();

  return { t, lang, locale, setLang, apply };
})();
