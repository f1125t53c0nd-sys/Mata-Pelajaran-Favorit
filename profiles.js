/**
 * profiles.js - the profile gallery page.
 *
 * Flow:  load students -> apply search / subject filter / sort -> draw cards.
 * The list refreshes by itself every 30 seconds, and every word is redrawn
 * when the visitor changes the language.
 */

(() => {
  'use strict';

  const t = FS.t;
  const REFRESH_MS = 30 * 1000;

  // All the parts of the page we need to update
  const grid = document.getElementById('grid');
  const loadingEl = document.getElementById('loading');
  const emptyState = document.getElementById('emptyState');
  const noResults = document.getElementById('noResults');
  const errorState = document.getElementById('errorState');
  const chipsEl = document.getElementById('chips');
  const resultLine = document.getElementById('resultLine');
  const updatedEl = document.getElementById('updated');
  const searchInput = document.getElementById('search');
  const sortSelect = document.getElementById('sort');
  const detailDialog = document.getElementById('detail');
  const detailBody = document.getElementById('detailBody');

  // The page's "memory": what data we have and what the visitor chose
  const state = {
    students: [],
    signature: '',      // used to notice when the data really changed
    query: '',
    subject: 'all',     // 'all' or an official subject name (see FS.subjectKey)
    sort: 'newest',
    lastUpdated: null,  // Date of the last successful load
    detail: null,       // the student shown in the open modal (if any)
  };

  // -------------------------------------------------------------------------
  // Filtering and sorting
  // -------------------------------------------------------------------------

  /** Newest first. Broken dates count as oldest. */
  function timeOf(student) {
    const time = new Date(student.timestamp).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  const sorters = {
    newest: (a, b) => timeOf(b) - timeOf(a),
    name: (a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    // Highest rating first, students without a rating last, ties: newest first
    rating: (a, b) => (b.rating || 0) - (a.rating || 0) || timeOf(b) - timeOf(a),
  };

  /** The students that match the search text and the chosen subject, in the chosen order. */
  function visibleStudents() {
    const query = state.query.trim().toLowerCase();
    return state.students
      .filter((s) => !query || s.name.toLowerCase().includes(query))
      .filter((s) => state.subject === 'all' || FS.subjectKey(s.favoriteSubject) === state.subject)
      .sort(sorters[state.sort]);
  }

  // -------------------------------------------------------------------------
  // Drawing the page
  // -------------------------------------------------------------------------

  /** Show exactly one of: loading, grid, empty, no results or error. */
  function showOnly(which) {
    loadingEl.hidden = which !== 'loading';
    grid.hidden = which !== 'grid';
    emptyState.hidden = which !== 'empty';
    noResults.hidden = which !== 'noResults';
    errorState.hidden = which !== 'error';
  }

  /** Build the filter chips, like "Matematika (12)", from the data. */
  function renderChips() {
    const ranking = FS.countBySubject(state.students);
    chipsEl.replaceChildren();
    chipsEl.hidden = ranking.length === 0;

    function addChip(value, label, count, info) {
      const chip = FS.el('button', 'chip');
      chip.type = 'button';
      chip.setAttribute('aria-pressed', String(state.subject === value));
      if (info) {
        chip.style.setProperty('--tag-bg', info.color);
        const icon = FS.el('span', 'chip__icon', info.icon);
        icon.setAttribute('aria-hidden', 'true');
        chip.append(icon);
      }
      chip.append(document.createTextNode(`${label} (${count})`));
      chip.addEventListener('click', () => {
        state.subject = value;
        render();
      });
      chipsEl.appendChild(chip);
    }

    addChip('all', t('profiles.all'), state.students.length, null);
    ranking.forEach(({ key, count }) => {
      const info = FS.subjectInfo(key);
      addChip(key, info.short, count, info);
    });
  }

  /** Draw everything. `animate` makes the cards pop in (used after loading new data). */
  function render(animate = false) {
    // If the chosen subject vanished (for example after a refresh), go back to "all".
    if (state.subject !== 'all' && !state.students.some((s) => FS.subjectKey(s.favoriteSubject) === state.subject)) {
      state.subject = 'all';
    }

    renderChips();

    if (state.students.length === 0) {
      resultLine.textContent = '';
      return showOnly('empty');
    }

    const list = visibleStudents();
    resultLine.textContent = t(state.students.length === 1 ? 'profiles.showingOne' : 'profiles.showingMany', {
      shown: list.length,
      total: state.students.length,
    });

    if (list.length === 0) return showOnly('noResults');

    const cards = document.createDocumentFragment();
    list.forEach((student, index) => {
      const card = FS.createProfileCard(student);
      card.style.setProperty('--i', String(Math.min(index, 12))); // stagger the pop-in
      card.addEventListener('click', () => openDetail(student));
      cards.appendChild(card);
    });
    grid.replaceChildren(cards);
    grid.classList.toggle('grid--animate', animate && !FS.prefersReducedMotion());
    showOnly('grid');
  }

  /** "Updated 9:05 AM" in the chosen language. */
  function renderUpdated() {
    updatedEl.textContent = state.lastUpdated
      ? t('profiles.updated', { time: state.lastUpdated.toLocaleTimeString(I18N.locale(), { hour: 'numeric', minute: '2-digit' }) })
      : '';
  }

  // -------------------------------------------------------------------------
  // The big detail view (modal)
  // -------------------------------------------------------------------------

  /** Fill the dialog with one student's full profile (in the current language). */
  function fillDetail(student) {
    const body = FS.el('div', 'detail');
    body.append(FS.createAvatar(student.name, 'big'));

    const name = FS.el('h2', 'detail__name', student.name);
    name.id = 'detailName';
    body.append(name);

    const meta = FS.el('div', 'detail__meta');
    meta.append(FS.createClassSticker(student.className), FS.createSubjectSticker(student.favoriteSubject, { full: true }));
    body.append(meta);

    const rating = FS.el('div', 'detail__block');
    rating.append(FS.el('h3', 'detail__heading', t('detail.rating')));
    if (student.rating) {
      rating.append(FS.createStars(student.rating, 'stars--big'));
    } else {
      rating.append(FS.el('p', 'detail__muted', t('detail.noRating')));
    }
    body.append(rating);

    const about = FS.el('div', 'detail__block');
    about.append(FS.el('h3', 'detail__heading', t('detail.about')));
    about.append(FS.el('p', student.note ? 'detail__note' : 'detail__muted', student.note || t('detail.noNote')));
    body.append(about);

    const joined = FS.joinedText(student.timestamp);
    if (joined) body.append(FS.el('p', 'detail__date', joined));
    if (student.demo) body.append(FS.el('p', 'detail__demo', t('detail.demo')));

    detailBody.replaceChildren(body);
  }

  function openDetail(student) {
    state.detail = student;
    fillDetail(student);
    detailDialog.showModal();
  }

  // Close by the X button (Escape is handled by <dialog> itself) ...
  document.getElementById('detailClose').addEventListener('click', () => detailDialog.close());
  // ... or by clicking the dark backdrop. Clicks on the panel have a different target.
  detailDialog.addEventListener('click', (event) => {
    if (event.target === detailDialog) detailDialog.close();
  });
  detailDialog.addEventListener('close', () => { state.detail = null; });

  // -------------------------------------------------------------------------
  // Loading data
  // -------------------------------------------------------------------------

  /**
   * Ask the server for students. On the automatic refresh (`quiet`) we keep
   * showing the old cards if something fails, instead of an error screen.
   */
  async function load({ quiet = false } = {}) {
    if (!quiet && state.students.length === 0) showOnly('loading');
    try {
      const { students } = await FS.fetchStudents();
      const signature = JSON.stringify(students);
      const changed = signature !== state.signature;
      state.students = students;
      state.signature = signature;
      if (changed) render(true); // only redraw when something really changed
      state.lastUpdated = new Date();
      renderUpdated();
    } catch (err) {
      if (!quiet || state.students.length === 0) showOnly('error');
    }
  }

  // -------------------------------------------------------------------------
  // Wiring up the controls
  // -------------------------------------------------------------------------

  searchInput.addEventListener('input', () => {
    state.query = searchInput.value;
    render();
  });

  sortSelect.addEventListener('change', () => {
    state.sort = sortSelect.value;
    render();
  });

  document.getElementById('resetFilters').addEventListener('click', () => {
    state.query = '';
    state.subject = 'all';
    searchInput.value = '';
    render();
  });

  document.getElementById('retry').addEventListener('click', () => load());

  // New language: redraw cards, chips, counters, and the open modal (if any).
  document.addEventListener('fs:langchange', () => {
    if (state.signature) render();
    renderUpdated();
    if (state.detail) fillDetail(state.detail);
  });

  // Go!
  load();
  setInterval(() => load({ quiet: true }), REFRESH_MS);
})();
