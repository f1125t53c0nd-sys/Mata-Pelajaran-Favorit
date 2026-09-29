/**
 * common.js - helpers shared by all three pages.
 *
 * Everything is grouped inside one object called `FS` (Favorite Subject),
 * so other files can call things like FS.createProfileCard(...).
 *
 * It relies on two files loaded before it:
 *   subjects.js -> FSSubjects  (the official subject list)
 *   i18n.js     -> I18N        (the language setting and translations)
 *
 * SAFETY RULE: text typed by students is NEVER put into the page with
 * innerHTML. We always use textContent, which treats it as plain text.
 */

const FS = (() => {
  'use strict';

  const t = I18N.t; // short name for "translate this key"

  // -------------------------------------------------------------------------
  // Subjects: name, icon and color, in the visitor's language
  // -------------------------------------------------------------------------

  /**
   * Everything needed to show a subject: { icon, color, short, full }.
   *   short = small label for stickers and chips, full = complete name.
   * Values that are not in our list (for example old rows in a Google Sheet)
   * are still shown, just with a plain star icon.
   */
  function subjectInfo(value) {
    const subject = FSSubjects.findSubject(value);
    if (!subject) {
      const text = String(value || '');
      return { icon: '⭐', color: '#FFD43B', short: text, full: text };
    }
    const indonesian = I18N.lang() === 'id';
    return {
      icon: subject.icon,
      color: subject.color,
      short: indonesian ? subject.shortId : subject.shortEn,
      full: indonesian ? subject.name : subject.en,
    };
  }

  /** One stable key per subject, so old spellings ("Math") and new ("Matematika") count together. */
  function subjectKey(value) {
    const subject = FSSubjects.findSubject(value);
    return subject ? subject.name : String(value || '');
  }

  // -------------------------------------------------------------------------
  // Tiny DOM helpers
  // -------------------------------------------------------------------------

  /** Create an element with an optional class name and plain-text content. */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text; // textContent = always safe
    return node;
  }

  // -------------------------------------------------------------------------
  // Talking to our own server
  // -------------------------------------------------------------------------

  /** Load every student. Resolves to { mode, students }. */
  async function fetchStudents() {
    const response = await fetch('/api/students', { headers: { Accept: 'application/json' } });
    if (!response.ok) throw Object.assign(new Error(t('api.loadFailed')), { code: 'loadFailed' });
    return response.json();
  }

  /**
   * Send a new profile to the server.
   * Resolves to the saved student. On failure throws an Error with:
   *   error.code   short reason ("validation", "rateLimited", "network", ...)
   *   error.codes  per-field reasons, e.g. { name: 'required' }, when code is "validation"
   */
  async function saveStudent(payload) {
    let response;
    try {
      response = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (networkError) {
      throw Object.assign(new Error('network'), { code: 'network' });
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw Object.assign(new Error(data.error || 'error'), { code: data.code || 'generic', codes: data.codes || null });
    }
    return data.student;
  }

  // -------------------------------------------------------------------------
  // The storage badge in the navigation bar
  // -------------------------------------------------------------------------

  let currentMode = 'loading';

  /** Draw the badge text in the current language. */
  function paintModeBadge() {
    const badge = document.getElementById('modeBadge');
    if (!badge) return;
    badge.dataset.mode = currentMode;
    if (currentMode === 'loading') return; // keep the static "Checking..." text
    badge.querySelector('.mode-badge__text').textContent = t(`mode.${currentMode}`);
  }

  /** Ask the server which storage is active ("local" or "sheets") and show it. */
  async function loadModeBadge() {
    try {
      const response = await fetch('/api/mode');
      const { mode } = await response.json();
      currentMode = mode === 'sheets' ? 'sheets' : 'local';
    } catch (err) {
      currentMode = 'error';
    }
    paintModeBadge();
  }

  // -------------------------------------------------------------------------
  // Avatars: a pastel color that is random-looking but always the same per name
  // -------------------------------------------------------------------------

  /** Turn a name into a number. The same name always gives the same number. */
  function hashString(text) {
    let hash = 0;
    for (const char of String(text).toLowerCase()) {
      hash = (hash * 31 + char.codePointAt(0)) >>> 0;
    }
    return hash;
  }

  /** A soft pastel color for a name. */
  function avatarColor(name) {
    const hue = hashString(name) % 360;
    return `hsl(${hue} 85% 76%)`;
  }

  /** "Aisyah Putri" -> "AP", "Bima" -> "B" */
  function initials(name) {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    const letters = words.slice(0, 2).map((word) => Array.from(word)[0]);
    return letters.join('').toUpperCase() || '?';
  }

  // -------------------------------------------------------------------------
  // Stars
  // -------------------------------------------------------------------------

  const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z';

  /** Build a row of 5 SVG stars, `rating` of them filled. */
  function createStars(rating, extraClass) {
    const row = el('span', `stars ${extraClass || ''}`.trim());
    row.setAttribute('role', 'img');
    row.setAttribute('aria-label', t('card.stars', { n: rating }));
    for (let i = 1; i <= 5; i += 1) {
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.classList.add('stars__star');
      if (i <= rating) svg.classList.add('is-on');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', STAR_PATH);
      svg.appendChild(path);
      row.appendChild(svg);
    }
    return row;
  }

  // -------------------------------------------------------------------------
  // Dates (formatted for the chosen language)
  // -------------------------------------------------------------------------

  /** "2026-09-29T08:00:00Z" -> "Sep 29, 2026" or "29 Sep 2026" (empty text if the date is broken) */
  function formatDate(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(I18N.locale(), { month: 'short', day: 'numeric', year: 'numeric' });
  }

  function joinedText(timestamp) {
    const formatted = formatDate(timestamp);
    return formatted ? t('card.joined', { date: formatted }) : '';
  }

  // -------------------------------------------------------------------------
  // Reusable building blocks
  // -------------------------------------------------------------------------

  /** The round avatar with initials. Pass "big" for the larger modal version. */
  function createAvatar(name, size) {
    const avatar = el('span', size === 'big' ? 'avatar avatar--big' : 'avatar', initials(name));
    avatar.style.setProperty('--av-bg', avatarColor(name));
    avatar.setAttribute('aria-hidden', 'true');
    return avatar;
  }

  /** The rotated class sticker, e.g. "8B". */
  function createClassSticker(className) {
    return el('span', 'sticker sticker--class', className);
  }

  /**
   * The colorful subject sticker with its icon.
   * options.full = true shows the complete subject name instead of the short label.
   */
  function createSubjectSticker(subject, options = {}) {
    const info = subjectInfo(subject);
    const sticker = el('span', 'sticker sticker--subject');
    sticker.style.setProperty('--tag-bg', info.color);
    const icon = el('span', 'sticker__icon', info.icon);
    icon.setAttribute('aria-hidden', 'true');
    sticker.append(icon, document.createTextNode(options.full ? info.full : info.short));
    return sticker;
  }

  /**
   * Build one profile card.
   *   options.interactive = true  -> a clickable <button> (gallery)
   *   options.interactive = false -> a plain <div> (live preview on the input page)
   * Missing rating / note are simply left out.
   */
  function createProfileCard(student, options = {}) {
    const interactive = options.interactive !== false;
    const card = el(interactive ? 'button' : 'div', 'pcard');
    if (interactive) {
      card.type = 'button';
      card.setAttribute('aria-label', t('card.open', { name: student.name }));
    }
    card.style.setProperty('--av-bg', avatarColor(student.name));

    if (student.demo) card.append(el('span', 'pcard__demo', t('card.demo')));

    card.append(createAvatar(student.name));
    card.append(el('span', 'pcard__name', student.name));

    const meta = el('span', 'pcard__meta');
    meta.append(createClassSticker(student.className), createSubjectSticker(student.favoriteSubject));
    card.append(meta);

    if (student.rating) card.append(createStars(student.rating));
    if (student.note) card.append(el('span', 'pcard__about', student.note));

    const joined = joinedText(student.timestamp);
    if (joined) card.append(el('span', 'pcard__date', joined));

    return card;
  }

  // -------------------------------------------------------------------------
  // Statistics
  // -------------------------------------------------------------------------

  /**
   * Count students per subject. Returns [{ key, count }], biggest first (ties A-Z).
   * `key` is the official subject name (see subjectKey).
   */
  function countBySubject(students) {
    const counts = new Map();
    students.forEach((s) => {
      const key = subjectKey(s.favoriteSubject);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts, ([key, count]) => ({ key, count }))
      .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  }

  /** True when the visitor asked their device to reduce animations. */
  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  // Every page shows the storage badge as soon as it loads,
  // and redraws it when the language changes.
  document.addEventListener('DOMContentLoaded', loadModeBadge);
  document.addEventListener('fs:langchange', paintModeBadge);

  return {
    t,
    SUBJECTS: FSSubjects.SUBJECTS,
    subjectInfo,
    subjectKey,
    el,
    fetchStudents,
    saveStudent,
    createProfileCard,
    createAvatar,
    createClassSticker,
    createSubjectSticker,
    createStars,
    joinedText,
    formatDate,
    countBySubject,
    prefersReducedMotion,
  };
})();
