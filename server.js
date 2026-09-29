/**
 * server.js - the tiny web server for the "Favorite Subject" project.
 *
 * It uses ONLY Node.js built-in modules, so there is nothing to install.
 * Start it with:   node server.js
 *
 * What it does:
 *   1. Serves the website files from the /public folder (HTML, CSS, JS, images).
 *   2. Exposes a small API that the website talks to:
 *        GET  /api/mode      -> which storage is active ("local" or "sheets")
 *        GET  /api/students  -> the list of all student profiles
 *        POST /api/students  -> save a new student profile
 *   3. Saves profiles in one of two places (chosen in config.json):
 *        - Local mode  : data/students.json  (default, works immediately)
 *        - Sheets mode : a Google Sheet, through your Google Apps Script web app
 *
 * Extra command:   node server.js --clear-demo   (removes the demo profiles)
 */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// ---------------------------------------------------------------------------
// 1. Settings and constants
// ---------------------------------------------------------------------------

const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_FILE = path.join(__dirname, 'data', 'students.json');
const CONFIG_FILE = path.join(__dirname, 'config.json');

// The official subject list is shared with the browser (public/js/subjects.js).
const { findSubject } = require('./public/js/subjects.js');

// Maximum text lengths (the browser enforces the same numbers).
const LIMITS = { name: 40, className: 20, note: 200 };

const MAX_BODY_BYTES = 10 * 1024;       // reject request bodies bigger than 10 KB
const RATE_LIMIT_MAX = 30;              // max profile submissions ...
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // ... per minute, per visitor address
const SHEETS_TIMEOUT_MS = 20 * 1000;    // give Google this long to answer
const SHEETS_CACHE_MS = 5 * 1000;       // remember the sheet's rows for 5 seconds

// File types the static file server knows how to send.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
};

/**
 * Read config.json. Two environment variables can override it, which is handy
 * on a hosting service (PORT and APPS_SCRIPT_URL).
 */
function loadConfig() {
  let fromFile = {};
  try {
    fromFile = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('i No config.json found - using defaults (local mode, port 3000).');
      console.log('  To change settings, copy config.example.json to config.json.');
    } else {
      console.warn('! Could not read config.json (is it valid JSON?) - using default settings.');
    }
  }

  let appsScriptUrl = String(process.env.APPS_SCRIPT_URL || fromFile.appsScriptUrl || '').trim();

  // Only real Apps Script web-app links are accepted.
  if (appsScriptUrl && !/^https:\/\/script\.google\.com\//.test(appsScriptUrl)) {
    console.warn('! appsScriptUrl in config.json does not look like a Google Apps Script link');
    console.warn('  (it should start with https://script.google.com/). Falling back to local mode.');
    appsScriptUrl = '';
  }

  const port = Number(process.env.PORT || fromFile.port || 3000);
  // On a hosting service (PORT is set) we must listen on all addresses.
  // On your own computer we only listen on localhost so nobody else can reach it.
  const host = process.env.HOST || (process.env.PORT ? '0.0.0.0' : '127.0.0.1');

  return { port, host, appsScriptUrl };
}

const config = loadConfig();

/** Which storage is active right now? */
function currentMode() {
  return config.appsScriptUrl ? 'sheets' : 'local';
}

// ---------------------------------------------------------------------------
// 2. Validation - every profile is checked here, on the server
// ---------------------------------------------------------------------------

/**
 * Turn any value into safe single-line text: remove control characters,
 * squash repeated spaces and trim the ends.
 */
function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[\u0000-\u001F\u007F]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Check a profile sent by the browser.
 * Returns { errors, codes, student }.
 *   errors  = English messages, per field (handy when testing with curl)
 *   codes   = short codes per field ("required", "tooLong", "invalid"). The website
 *             uses these to show the message in the visitor's language.
 * If `errors` is empty, `student` is clean and ready to save.
 */
function validateStudent(body) {
  const errors = {};
  const codes = {};
  const input = body && typeof body === 'object' && !Array.isArray(body) ? body : {};

  function fail(field, code, message) {
    errors[field] = message;
    codes[field] = code;
  }

  // Name: required, max 40 characters
  const name = cleanText(input.name);
  if (!name) fail('name', 'required', 'Please enter your name.');
  else if (name.length > LIMITS.name) fail('name', 'tooLong', `Name can be at most ${LIMITS.name} characters.`);

  // Class: required, max 20 characters (free text, so any school naming works)
  const className = cleanText(input.className);
  if (!className) fail('className', 'required', 'Please enter your class (for example 7A).');
  else if (className.length > LIMITS.className) fail('className', 'tooLong', `Class can be at most ${LIMITS.className} characters.`);

  // Favorite subject: required, and it must be one of the official subjects.
  // We save the official (Indonesian) name, whatever spelling was sent.
  const subjectText = cleanText(input.favoriteSubject);
  const subject = findSubject(subjectText);
  if (!subjectText) fail('favoriteSubject', 'required', 'Please choose your favorite subject.');
  else if (!subject) fail('favoriteSubject', 'invalid', 'Please choose a subject from the list.');
  const favoriteSubject = subject ? subject.name : '';

  // Rating: optional. Empty is fine, otherwise it must be a whole number from 1 to 5.
  let rating = null;
  const rawRating = input.rating;
  if (rawRating !== undefined && rawRating !== null && rawRating !== '') {
    const asNumber = typeof rawRating === 'number'
      ? rawRating
      : (typeof rawRating === 'string' && /^[1-5]$/.test(rawRating.trim()) ? Number(rawRating.trim()) : NaN);
    if (Number.isInteger(asNumber) && asNumber >= 1 && asNumber <= 5) rating = asNumber;
    else fail('rating', 'invalid', 'Rating must be a whole number from 1 to 5.');
  }

  // Note: optional, max 200 characters
  const note = cleanText(input.note);
  if (note.length > LIMITS.note) fail('note', 'tooLong', `Note can be at most ${LIMITS.note} characters.`);

  return {
    errors,
    codes,
    student: {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      name,
      className,
      favoriteSubject,
      rating,
      note,
    },
  };
}

// ---------------------------------------------------------------------------
// 3. Storage, option A: local JSON file (data/students.json)
// ---------------------------------------------------------------------------

// Saves are lined up one after another so two students submitting at the
// same moment can never overwrite each other.
let localWriteQueue = Promise.resolve();

function readLocalFile() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    if (err.code === 'ENOENT') return []; // file not created yet = no students yet
    throw err;
  }
}

/** Write the file safely: write a temp file first, then swap it in. */
function writeLocalFile(students) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tempFile = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tempFile, JSON.stringify(students, null, 2) + '\n', 'utf8');
  fs.renameSync(tempFile, DATA_FILE);
}

const localStore = {
  async list() {
    return readLocalFile();
  },
  add(student) {
    const job = localWriteQueue.then(() => {
      const students = readLocalFile();
      students.push(student);
      writeLocalFile(students);
    });
    localWriteQueue = job.catch(() => {}); // keep the queue alive if one save fails
    return job;
  },
};

// ---------------------------------------------------------------------------
// 4. Storage, option B: Google Sheets through the Apps Script web app
// ---------------------------------------------------------------------------

let sheetsCache = { at: 0, students: null };

/** Read a value from a row no matter how the column was named (Name, name, ...). */
function pick(row, ...keys) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return '';
}

/** Turn one raw sheet row into our standard student object. */
function normalizeSheetRow(row, index) {
  const ratingNumber = Number(pick(row, 'rating', 'Rating'));
  return {
    id: `sheet-${index + 1}`,
    timestamp: String(pick(row, 'timestamp', 'Timestamp')),
    name: cleanText(String(pick(row, 'name', 'Name'))),
    className: cleanText(String(pick(row, 'className', 'Class', 'class'))),
    favoriteSubject: cleanText(String(pick(row, 'favoriteSubject', 'FavoriteSubject'))),
    rating: Number.isInteger(ratingNumber) && ratingNumber >= 1 && ratingNumber <= 5 ? ratingNumber : null,
    note: cleanText(String(pick(row, 'note', 'Note'))),
  };
}

/** Ask Google for a reply and make sure it is real JSON (not an error web page). */
async function callAppsScript(url, options) {
  const response = await fetch(url, {
    ...options,
    redirect: 'follow', // Apps Script always answers through a redirect
    signal: AbortSignal.timeout(SHEETS_TIMEOUT_MS),
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(
      'Google Sheets did not send back JSON. Check that the web app is deployed ' +
      'with "Who has access: Anyone" and that you redeployed after editing the script.'
    );
  }
}

const sheetsStore = {
  async list() {
    if (sheetsCache.students && Date.now() - sheetsCache.at < SHEETS_CACHE_MS) {
      return sheetsCache.students;
    }
    const url = new URL(config.appsScriptUrl);
    url.searchParams.set('action', 'list');
    const data = await callAppsScript(url.toString(), { method: 'GET' });
    if (!data || data.ok === false || !Array.isArray(data.students)) {
      throw new Error((data && data.error) || 'Unexpected answer from Google Sheets.');
    }
    const students = data.students.map(normalizeSheetRow).filter((s) => s.name);
    sheetsCache = { at: Date.now(), students };
    return students;
  },
  async add(student) {
    // text/plain avoids a browser-style "preflight" request that Apps Script cannot answer.
    const data = await callAppsScript(config.appsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(student),
    });
    if (!data || data.ok !== true) {
      throw new Error((data && data.error) || 'Google Sheets refused the new profile.');
    }
    sheetsCache = { at: 0, students: null }; // force a fresh read next time
  },
};

/** Pick the storage that matches the current mode. */
function getStore() {
  return currentMode() === 'sheets' ? sheetsStore : localStore;
}

// ---------------------------------------------------------------------------
// 5. Small helpers for HTTP replies
// ---------------------------------------------------------------------------

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
  });
  res.end(body);
}

/** Extra browser protections sent with every reply. */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Only allow our own scripts, plus Google Fonts for the typefaces.
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' https://fonts.googleapis.com; " +
    "font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; " +
    "frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
  );
}

/**
 * Read the request body as JSON, refusing anything bigger than MAX_BODY_BYTES.
 * Rejects with an error that has a `status` property for the reply.
 */
function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const type = String(req.headers['content-type'] || '');
    if (!type.toLowerCase().startsWith('application/json')) {
      return reject(Object.assign(new Error('Please send JSON.'), { status: 415, code: 'unsupportedType' }));
    }

    const chunks = [];
    let size = 0;
    let tooBig = false;
    req.on('data', (chunk) => {
      if (tooBig) return; // already refused: just throw the rest away
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooBig = true;
        chunks.length = 0;
        reject(Object.assign(new Error('That request is too big.'), { status: 413, code: 'tooBig' }));
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (err) {
        reject(Object.assign(new Error('That was not valid JSON.'), { status: 400, code: 'badJson' }));
      }
    });
    req.on('error', reject);
  });
}

// A very small "slow down" guard against spam: remember recent POST times per address.
const recentPosts = new Map();

function isRateLimited(address) {
  const now = Date.now();
  const recent = (recentPosts.get(address) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  if (recent.length >= RATE_LIMIT_MAX) {
    recentPosts.set(address, recent);
    return true;
  }
  recent.push(now);
  recentPosts.set(address, recent);
  return false;
}

// ---------------------------------------------------------------------------
// 6. The API routes
// ---------------------------------------------------------------------------

async function handleGetStudents(req, res) {
  try {
    const students = await getStore().list();
    sendJson(res, 200, { mode: currentMode(), students });
  } catch (err) {
    console.error('GET /api/students failed:', err.message);
    sendJson(res, 502, { ok: false, code: 'loadFailed', error: 'Could not load the profiles right now.' });
  }
}

async function handlePostStudent(req, res) {
  if (isRateLimited(req.socket.remoteAddress || 'unknown')) {
    return sendJson(res, 429, { ok: false, code: 'rateLimited', error: 'Too many submissions. Please wait a minute and try again.' });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    if (err.status === 413) {
      // Answer first, then hang up so the oversized upload stops.
      res.setHeader('Connection', 'close');
      res.on('finish', () => req.destroy());
    }
    return sendJson(res, err.status || 400, { ok: false, code: err.code || 'badJson', error: err.message });
  }

  const { errors, codes, student } = validateStudent(body);
  if (Object.keys(errors).length > 0) {
    return sendJson(res, 400, { ok: false, code: 'validation', error: 'Please fix the highlighted fields.', fields: errors, codes });
  }

  try {
    await getStore().add(student);
    console.log(`+ New profile saved (${currentMode()} mode): ${student.name} (${student.className})`);
    sendJson(res, 201, { ok: true, student });
  } catch (err) {
    console.error('POST /api/students failed:', err.message);
    sendJson(res, 502, { ok: false, code: 'saveFailed', error: 'Your profile could not be saved. Please try again in a moment.' });
  }
}

// ---------------------------------------------------------------------------
// 7. Static file server (serves everything inside /public)
// ---------------------------------------------------------------------------

function serveStatic(req, res, pathname) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname);
  } catch (err) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (relativePath.includes('\0')) {
    res.writeHead(400);
    return res.end('Bad request');
  }
  if (relativePath.endsWith('/')) relativePath += 'index.html';

  // Security: make sure the final path is still INSIDE the public folder,
  // so nobody can ask for something like /../config.json
  const filePath = path.join(PUBLIC_DIR, path.normalize(relativePath));
  if (!filePath.startsWith(PUBLIC_DIR + path.sep)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('404 - Page not found');
    }
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache', // always check for a fresh copy while you are developing
    });
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(filePath).pipe(res);
  });
}

// ---------------------------------------------------------------------------
// 8. The main request handler
// ---------------------------------------------------------------------------

async function handleRequest(req, res) {
  setSecurityHeaders(res);
  const { pathname } = new URL(req.url, 'http://localhost');

  if (pathname === '/api/mode' && req.method === 'GET') {
    return sendJson(res, 200, { mode: currentMode() });
  }

  if (pathname === '/api/students') {
    if (req.method === 'GET') return handleGetStudents(req, res);
    if (req.method === 'POST') return handlePostStudent(req, res);
    res.setHeader('Allow', 'GET, POST');
    return sendJson(res, 405, { ok: false, error: 'Method not allowed.' });
  }

  if (req.method === 'GET' || req.method === 'HEAD') {
    return serveStatic(req, res, pathname);
  }

  res.writeHead(405);
  res.end('Method not allowed');
}

// ---------------------------------------------------------------------------
// 9. Start up
// ---------------------------------------------------------------------------

/** `node server.js --clear-demo` removes every profile marked "demo": true. */
function clearDemoProfiles() {
  const before = readLocalFile();
  const after = before.filter((student) => !student.demo);
  writeLocalFile(after);
  console.log(`Removed ${before.length - after.length} demo profile(s). ${after.length} profile(s) left.`);
}

if (process.argv.includes('--clear-demo')) {
  clearDemoProfiles();
  process.exit(0);
}

const server = http.createServer((req, res) => {
  handleRequest(req, res).catch((err) => {
    console.error('Unexpected error:', err);
    if (!res.headersSent) sendJson(res, 500, { ok: false, error: 'Something went wrong on the server.' });
    else res.end();
  });
});

server.listen(config.port, config.host, () => {
  const shownHost = config.host === '0.0.0.0' ? 'localhost' : config.host;
  console.log('');
  console.log('  Favorite Subject server is running!');
  console.log(`  Open:    http://${shownHost === '127.0.0.1' ? 'localhost' : shownHost}:${config.port}`);
  console.log(`  Storage: ${currentMode() === 'sheets' ? 'Google Sheets (Apps Script)' : 'local file (data/students.json)'}`);
  console.log('  Stop:    press Ctrl + C');
  console.log('');
});
