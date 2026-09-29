/**
 * home.js - fills in the "Live Scoreboard" on the homepage.
 * It asks the server for all students and works out three numbers:
 * how many students, the most popular subject and the average rating.
 */

(() => {
  'use strict';

  const totalEl = document.getElementById('statTotal');
  const topEl = document.getElementById('statTop');
  const topSubEl = document.getElementById('statTopSub');
  const ratingEl = document.getElementById('statRating');
  const errorEl = document.getElementById('statsError');

  let students = null; // remembered so we can redraw when the language changes

  /** Average of all ratings that exist (students without a rating are skipped). */
  function averageRating(list) {
    const ratings = list.map((s) => s.rating).filter((r) => Number.isInteger(r));
    if (ratings.length === 0) return null;
    return ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
  }

  /** Make a number "count up" from 0 for a little celebration effect. */
  function countUp(element, target) {
    if (FS.prefersReducedMotion() || target === 0) {
      element.textContent = String(target);
      return;
    }
    const duration = 900;
    const start = performance.now();
    function tick(now) {
      const progress = Math.min((now - start) / duration, 1);
      element.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /** The text parts of the scoreboard (they change with the language). */
  function showTexts() {
    const ranking = FS.countBySubject(students);
    if (ranking.length > 0) {
      const top = ranking[0];
      const info = FS.subjectInfo(top.key);
      topEl.textContent = `${info.icon} ${info.short}`;
      topSubEl.textContent = FS.t(top.count === 1 ? 'stat.pickedOne' : 'stat.pickedMany', { n: top.count });
    } else {
      topEl.textContent = '-';
      topSubEl.textContent = FS.t('stat.first');
    }
  }

  function showStats() {
    countUp(totalEl, students.length);
    showTexts();
    const average = averageRating(students);
    ratingEl.textContent = average === null ? '-' : `${average.toFixed(1)} ★`;
  }

  async function init() {
    try {
      ({ students } = await FS.fetchStudents());
      errorEl.hidden = true;
      showStats();
    } catch (err) {
      errorEl.hidden = false;
    }
  }

  // New language: only the words change, the numbers stay.
  document.addEventListener('fs:langchange', () => {
    if (students) showTexts();
  });

  init();
})();
