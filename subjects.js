/**
 * subjects.js - the ONE official list of school subjects.
 *
 * The browser (dropdown, icons, colors) and the Node server (validation) both
 * read this same file, so they can never disagree.
 *
 * Each subject has:
 *   name     the official Indonesian name. This is what gets SAVED (in the file or the Google Sheet)
 *   en       the English name shown when the site language is English
 *   shortId  a shorter Indonesian label for small stickers and filter chips
 *   shortEn  a shorter English label for small stickers and filter chips
 *   icon     an emoji, color = sticker color
 *   aliases  other spellings we also understand (for example the old English names)
 */

(function (root) {
  'use strict';

  const SUBJECTS = [
    { id: 'religion',   name: 'Pendidikan Agama dan Budi Pekerti', en: 'Religious Education and Character',
      shortId: 'Agama', shortEn: 'Religion', icon: '🕊️', color: '#9BE8E8', aliases: ['Religion'] },
    { id: 'pancasila',  name: 'Pendidikan Pancasila', en: 'Pancasila Education',
      shortId: 'Pancasila', shortEn: 'Pancasila', icon: '🦅', color: '#FF7A93', aliases: [] },
    { id: 'indonesian', name: 'Bahasa Indonesia', en: 'Indonesian Language',
      shortId: 'B. Indonesia', shortEn: 'Indonesian', icon: '🌴', color: '#FF8A5C', aliases: ['Indonesian'] },
    { id: 'math',       name: 'Matematika', en: 'Mathematics',
      shortId: 'Matematika', shortEn: 'Math', icon: '🧮', color: '#4CC3FF', aliases: ['Math'] },
    { id: 'advmath',    name: 'Matematika Tingkat Lanjut', en: 'Advanced Mathematics',
      shortId: 'Mat. Lanjut', shortEn: 'Adv. Math', icon: '➗', color: '#33D6C7', aliases: [] },
    { id: 'english',    name: 'Bahasa Inggris', en: 'English',
      shortId: 'B. Inggris', shortEn: 'English', icon: '📖', color: '#C58BFF', aliases: [] },
    { id: 'advenglish', name: 'Bahasa Inggris Tingkat Lanjut', en: 'Advanced English',
      shortId: 'B. Inggris Lanjut', shortEn: 'Adv. English', icon: '📚', color: '#FF8AD8', aliases: [] },
    { id: 'pe',         name: 'Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)', en: 'Physical Education, Sports, and Health (PJOK)',
      shortId: 'PJOK', shortEn: 'PE', icon: '⚽', color: '#B5E655', aliases: ['PE', 'PJOK'] },
    { id: 'history',    name: 'Sejarah', en: 'History',
      shortId: 'Sejarah', shortEn: 'History', icon: '🏛️', color: '#FFB84D', aliases: [] },
    { id: 'art',        name: 'Seni Budaya / Prakarya dan Kewirausahaan (PKWU)', en: 'Arts & Culture / Crafts and Entrepreneurship (PKWU)',
      shortId: 'Seni Budaya / PKWU', shortEn: 'Arts & Crafts', icon: '🎨', color: '#FFD43B', aliases: ['Art', 'Arts', 'PKWU'] },
    { id: 'javanese',   name: 'Bahasa Jawa', en: 'Javanese Language',
      shortId: 'B. Jawa', shortEn: 'Javanese', icon: '🎭', color: '#E6C07B', aliases: [] },
    { id: 'geography',  name: 'Geografi', en: 'Geography',
      shortId: 'Geografi', shortEn: 'Geography', icon: '🌍', color: '#6FE0A0', aliases: [] },
    { id: 'sociology',  name: 'Sosiologi', en: 'Sociology',
      shortId: 'Sosiologi', shortEn: 'Sociology', icon: '👥', color: '#8AA9FF', aliases: [] },
    { id: 'economics',  name: 'Ekonomi', en: 'Economics',
      shortId: 'Ekonomi', shortEn: 'Economics', icon: '💰', color: '#FFCF33', aliases: [] },
  ];

  /**
   * Find a subject from whatever text we are given: the official name, the id,
   * the English name, a short label or an alias - ignoring upper/lower case.
   * Returns the subject object, or null if it is not one of ours.
   */
  function findSubject(value) {
    const wanted = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
    if (!wanted) return null;
    return SUBJECTS.find((s) =>
      [s.name, s.id, s.en, s.shortId, s.shortEn, ...s.aliases].some((text) => text.toLowerCase() === wanted)
    ) || null;
  }

  const api = { SUBJECTS, findSubject };

  // In Node this file is loaded with require(); in the browser it becomes window.FSSubjects.
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FSSubjects = api;
})(typeof window !== 'undefined' ? window : globalThis);
