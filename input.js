/**
 * input.js - the "Fill In Your Profile" form.
 *
 * Jobs of this file:
 *   1. Fill the subject dropdown from the official list (in the chosen language)
 *   2. Build and paint the star picker, and allow clearing the rating
 *   3. Count the note characters
 *   4. Validate before sending and show friendly messages
 *   5. Send the profile to the server and celebrate
 *   6. Keep a live preview card in sync with the form
 *   7. Redraw all the words when the language changes
 */

(() => {
  'use strict';

  const t = FS.t;

  const form = document.getElementById('profileForm');
  const nameInput = document.getElementById('name');
  const classInput = document.getElementById('className');
  const subjectSelect = document.getElementById('subject');
  const noteInput = document.getElementById('note');
  const noteCount = document.getElementById('note-count');
  const starPicker = document.getElementById('starPicker');
  const ratingHint = document.getElementById('ratingHint');
  const clearRatingBtn = document.getElementById('clearRating');
  const submitBtn = document.getElementById('submitBtn');
  const formError = document.getElementById('formError');
  const success = document.getElementById('success');
  const successTitle = document.getElementById('successTitle');
  const addAnotherBtn = document.getElementById('addAnother');
  const previewSlot = document.getElementById('previewSlot');

  const NOTE_MAX = 200;
  let isSending = false;
  let savedName = ''; // remembered so the success title can change language

  // -------------------------------------------------------------------------
  // Subject dropdown
  // -------------------------------------------------------------------------

  /**
   * (Re)build the subject options. The option VALUE is the official Indonesian name
   * (that is what gets saved); the visible TEXT follows the chosen language.
   */
  function populateSubjects() {
    const previous = subjectSelect.value;
    const indonesian = I18N.lang() === 'id';

    subjectSelect.replaceChildren();
    const placeholder = FS.el('option', '', t('input.subject.choose'));
    placeholder.value = '';
    subjectSelect.appendChild(placeholder);

    FS.SUBJECTS.forEach((subject) => {
      const option = FS.el('option', '', indonesian ? subject.name : subject.en);
      option.value = subject.name;
      subjectSelect.appendChild(option);
    });
    subjectSelect.value = previous; // keep the student's choice
  }

  // -------------------------------------------------------------------------
  // Stars: five radio buttons, highlighted on hover and on selection
  // -------------------------------------------------------------------------

  const STAR_PATH = 'M12 2.5l2.9 6.1 6.6.9-4.8 4.6 1.2 6.6L12 17.5l-5.9 3.2 1.2-6.6L2.5 9.5l6.6-.9z';
  const starLabels = [];
  const starRadios = [];

  /** Build the five stars once. Their hidden text is set by refreshStarLabels(). */
  function buildStars() {
    for (let value = 1; value <= 5; value += 1) {
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'rating';
      radio.id = `star${value}`;
      radio.value = String(value);
      radio.className = 'sr-only';

      const label = document.createElement('label');
      label.htmlFor = radio.id;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', STAR_PATH);
      svg.appendChild(path);

      label.append(svg, FS.el('span', 'sr-only'));
      label.addEventListener('mouseenter', () => paintStars(value));

      starPicker.append(radio, label);
      starRadios.push(radio);
      starLabels.push(label);
    }
  }

  /** "1 star" / "3 stars" in the chosen language (also used as the tooltip). */
  function refreshStarLabels() {
    starLabels.forEach((label, index) => {
      const text = index === 0 ? t('input.rating.star1') : t('input.rating.starN', { n: index + 1 });
      label.querySelector('.sr-only').textContent = text;
      label.title = text;
    });
  }

  /** The rating as a number, or null if the student did not pick one. */
  function chosenRating() {
    const checked = starRadios.find((radio) => radio.checked);
    return checked ? Number(checked.value) : null;
  }

  /** Light up the first `count` stars. */
  function paintStars(count) {
    starLabels.forEach((label, index) => label.classList.toggle('is-on', index < count));
  }

  function refreshStars() {
    const rating = chosenRating() || 0;
    paintStars(rating);
    clearRatingBtn.hidden = rating === 0;
    ratingHint.textContent = rating === 0 ? t('input.rating.hint') : t('input.rating.chosen', { n: rating });
  }

  starPicker.addEventListener('mouseleave', refreshStars);
  starPicker.addEventListener('change', () => { refreshStars(); updatePreview(); });

  clearRatingBtn.addEventListener('click', () => {
    starRadios.forEach((radio) => { radio.checked = false; });
    refreshStars();
    updatePreview();
  });

  // -------------------------------------------------------------------------
  // Note counter
  // -------------------------------------------------------------------------

  function refreshNoteCounter() {
    const length = noteInput.value.length;
    noteCount.textContent = `${length} / ${NOTE_MAX}`;
    noteCount.classList.toggle('counter--warn', length >= NOTE_MAX - 20);
  }

  // -------------------------------------------------------------------------
  // Validation and error messages
  //
  // We remember the error CODE (not the words), so the message can be
  // translated again if the student switches language.
  // -------------------------------------------------------------------------

  const errorBoxes = {
    name: document.getElementById('name-error'),
    className: document.getElementById('className-error'),
    subject: document.getElementById('subject-error'),
    note: document.getElementById('note-error'),
  };

  const errorInputs = {
    name: [nameInput],
    className: [classInput],
    subject: [subjectSelect],
    note: [noteInput],
  };

  const fieldErrors = {};   // { name: 'required', ... }
  let formErrorCode = null; // top-of-button error, e.g. 'saveFailed'

  function showError(field, code) {
    fieldErrors[field] = code;
    errorBoxes[field].textContent = t(`err.${field}.${code}`);
    errorInputs[field].forEach((input) => input.setAttribute('aria-invalid', 'true'));
  }

  function clearError(field) {
    delete fieldErrors[field];
    errorBoxes[field].textContent = '';
    errorInputs[field].forEach((input) => input.removeAttribute('aria-invalid'));
  }

  function showFormError(code) {
    formErrorCode = code;
    formError.textContent = t('form.oops', { message: t(`api.${code}`) });
    formError.hidden = false;
  }

  function clearAllErrors() {
    Object.keys(errorBoxes).forEach(clearError);
    formErrorCode = null;
    formError.hidden = true;
    formError.textContent = '';
  }

  /** Write every visible message again in the current language. */
  function redrawErrors() {
    Object.keys(fieldErrors).forEach((field) => {
      errorBoxes[field].textContent = t(`err.${field}.${fieldErrors[field]}`);
    });
    if (formErrorCode) showFormError(formErrorCode);
  }

  /**
   * Check the required fields. Shows messages and returns true if everything is OK.
   * (The server checks again - this is just for quick, friendly feedback.)
   */
  function validateForm() {
    clearAllErrors();
    let firstBad = null;

    function fail(field, code, input) {
      showError(field, code);
      if (!firstBad) firstBad = input;
    }

    if (!nameInput.value.trim()) fail('name', 'required', nameInput);
    if (!classInput.value.trim()) fail('className', 'required', classInput);
    if (!subjectSelect.value) fail('subject', 'required', subjectSelect);

    if (firstBad) firstBad.focus();
    return firstBad === null;
  }

  // Remove an error as soon as the student starts fixing that field.
  nameInput.addEventListener('input', () => clearError('name'));
  classInput.addEventListener('input', () => clearError('className'));
  subjectSelect.addEventListener('change', () => clearError('subject'));
  noteInput.addEventListener('input', () => clearError('note'));

  // -------------------------------------------------------------------------
  // Live preview
  // -------------------------------------------------------------------------

  /** Rebuild the preview card from whatever is currently typed in the form. */
  function updatePreview() {
    const name = nameInput.value.trim();
    const student = {
      name: name || t('input.preview.name'),
      className: classInput.value.trim() || t('input.preview.class'),
      favoriteSubject: subjectSelect.value || t('input.preview.subject'),
      rating: chosenRating(),
      note: noteInput.value.trim() || (name ? '' : t('input.preview.note')),
      timestamp: new Date().toISOString(),
    };
    const card = FS.createProfileCard(student, { interactive: false });
    if (!name) card.classList.add('pcard--ghost'); // faded until the student types a name
    previewSlot.replaceChildren(card);
  }

  [nameInput, classInput, noteInput].forEach((input) => input.addEventListener('input', updatePreview));
  subjectSelect.addEventListener('change', updatePreview);
  noteInput.addEventListener('input', refreshNoteCounter);

  // -------------------------------------------------------------------------
  // Celebration
  // -------------------------------------------------------------------------

  /** Drop a few colorful confetti pieces. Skipped when animations are reduced. */
  function launchConfetti() {
    if (FS.prefersReducedMotion()) return;
    const colors = ['#FF5C7A', '#FFD43B', '#38B6FF', '#5BE08A', '#C58BFF'];
    const layer = FS.el('div', 'confetti');
    layer.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 40; i += 1) {
      const piece = FS.el('span', 'confetti__piece');
      piece.style.setProperty('--x', `${Math.random() * 100}%`);
      piece.style.setProperty('--delay', `${Math.random() * 0.4}s`);
      piece.style.setProperty('--drift', `${Math.random() * 160 - 80}px`);
      piece.style.setProperty('--spin', `${Math.random() * 720 - 360}deg`);
      piece.style.background = colors[i % colors.length];
      layer.appendChild(piece);
    }
    document.body.appendChild(layer);
    setTimeout(() => layer.remove(), 3200);
  }

  function showSuccess(name) {
    savedName = name;
    successTitle.textContent = t('success.title', { name }); // textContent = safe
    success.hidden = false;
    success.scrollIntoView({ behavior: FS.prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    success.focus({ preventScroll: true });
    launchConfetti();
  }

  addAnotherBtn.addEventListener('click', () => {
    success.hidden = true;
    savedName = '';
    nameInput.focus();
  });

  // -------------------------------------------------------------------------
  // Submitting
  // -------------------------------------------------------------------------

  function refreshSubmitLabel() {
    submitBtn.querySelector('.btn__label').textContent = t(isSending ? 'input.sending' : 'input.submit');
  }

  function setSending(sending) {
    isSending = sending;
    submitBtn.disabled = sending;
    refreshSubmitLabel();
  }

  function resetForm() {
    form.reset();
    refreshStars();
    refreshNoteCounter();
    clearAllErrors();
    updatePreview();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (isSending) return; // already sending
    if (!validateForm()) return;

    const payload = {
      name: nameInput.value,
      className: classInput.value,
      favoriteSubject: subjectSelect.value,
      rating: chosenRating(),
      note: noteInput.value,
    };

    setSending(true);
    try {
      const saved = await FS.saveStudent(payload);
      resetForm();
      showSuccess(saved.name);
    } catch (err) {
      // The server may point at specific fields that need fixing.
      const fieldMap = { name: 'name', className: 'className', favoriteSubject: 'subject', note: 'note' };
      let showedField = false;
      Object.entries(err.codes || {}).forEach(([serverField, code]) => {
        const field = fieldMap[serverField];
        if (field) { showError(field, code); showedField = true; }
      });
      showFormError(showedField ? 'validation' : (err.code || 'generic'));
    } finally {
      setSending(false);
    }
  });

  // -------------------------------------------------------------------------
  // Language changes: redraw every word that JavaScript wrote
  // -------------------------------------------------------------------------

  document.addEventListener('fs:langchange', () => {
    populateSubjects();
    refreshStarLabels();
    refreshStars();
    refreshSubmitLabel();
    redrawErrors();
    updatePreview();
    if (!success.hidden && savedName) successTitle.textContent = t('success.title', { name: savedName });
  });

  // First paint
  populateSubjects();
  buildStars();
  refreshStarLabels();
  refreshStars();
  refreshNoteCounter();
  updatePreview();
})();
