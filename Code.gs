/**
 * Code.gs - Google Apps Script backend for the "Favorite Subject" project.
 *
 * This script lives INSIDE your Google Sheet (Extensions > Apps Script).
 * Our Node server talks to it like a tiny API:
 *
 *   POST  -> doPost(e)  adds one row to the sheet
 *   GET   -> doGet(e)   returns every row as JSON
 *
 * The sheet must have this header row in row 1:
 *   Timestamp | Name | Class | FavoriteSubject | Rating | Note
 *
 * IMPORTANT: after you change this file you must create a NEW deployment
 * version (Deploy > Manage deployments > edit > New version), see README.md.
 */

// The tab (sheet) inside the spreadsheet that we read from and write to.
// Leave empty ('') to use the FIRST tab instead.
var SHEET_NAME = 'Favorite Subject';

// The same limits the website and the Node server use.
// (subject is 60 because official names like "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)" are long)
var LIMITS = { name: 40, className: 20, subject: 60, note: 200 };

/** Find the sheet tab we read from and write to. */
function getSheet_() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = SHEET_NAME ? spreadsheet.getSheetByName(SHEET_NAME) : spreadsheet.getSheets()[0];
  if (!sheet) throw new Error('Sheet tab "' + SHEET_NAME + '" was not found.');
  return sheet;
}

/** Send a JavaScript object back as JSON. */
function jsonReply_(object) {
  return ContentService
    .createTextOutput(JSON.stringify(object))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Turn any value into clean single-line text. */
function cleanText_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[\u0000-\u001F\u007F]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check the incoming profile. Returns an error message, or '' if all is fine.
 * (The Node server already validated it - this is a second safety net,
 * in case someone calls the web app URL directly.)
 */
function validate_(data) {
  if (!data.name) return 'Name is required.';
  if (data.name.length > LIMITS.name) return 'Name is too long.';
  if (!data.className) return 'Class is required.';
  if (data.className.length > LIMITS.className) return 'Class is too long.';
  if (!data.favoriteSubject) return 'Favorite subject is required.';
  if (data.favoriteSubject.length > LIMITS.subject) return 'Subject is too long.';
  if (data.note.length > LIMITS.note) return 'Note is too long.';
  if (data.rating !== '' && !/^[1-5]$/.test(data.rating)) return 'Rating must be 1 to 5 or empty.';
  return '';
}

/** POST: add a new row. */
function doPost(e) {
  // A "lock" makes sure two students submitting at once do not clash.
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var raw = JSON.parse(e.postData.contents);
    var data = {
      name: cleanText_(raw.name),
      className: cleanText_(raw.className),
      favoriteSubject: cleanText_(raw.favoriteSubject),
      rating: raw.rating === null || raw.rating === undefined ? '' : cleanText_(raw.rating),
      note: cleanText_(raw.note)
    };

    var problem = validate_(data);
    if (problem) return jsonReply_({ ok: false, error: problem });

    var sheet = getSheet_();
    var row = sheet.getLastRow() + 1;
    var values = [[new Date().toISOString(), data.name, data.className, data.favoriteSubject, data.rating, data.note]];

    // Format the cells as plain text BEFORE writing, so text such as "=1+1"
    // is stored as text and never runs as a spreadsheet formula.
    var range = sheet.getRange(row, 1, 1, 6);
    range.setNumberFormat('@');
    range.setValues(values);

    return jsonReply_({ ok: true });
  } catch (err) {
    return jsonReply_({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    lock.releaseLock();
  }
}

/** GET: return all rows. */
function doGet(e) {
  try {
    var sheet = getSheet_();
    var lastRow = sheet.getLastRow();
    if (lastRow < 2) return jsonReply_({ ok: true, students: [] }); // only the header row

    var rows = sheet.getRange(2, 1, lastRow - 1, 6).getValues();
    var students = rows
      .filter(function (r) { return r[1] !== ''; }) // skip rows without a name
      .map(function (r) {
        return {
          timestamp: r[0] instanceof Date ? r[0].toISOString() : String(r[0]),
          name: String(r[1]),
          className: String(r[2]),
          favoriteSubject: String(r[3]),
          rating: r[4] === '' ? null : Number(r[4]),
          note: String(r[5])
        };
      });

    return jsonReply_({ ok: true, students: students });
  } catch (err) {
    return jsonReply_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}
