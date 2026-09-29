# Favorite Subject - Student Profile Website

Students fill in a fun profile card (name, class, favorite subject, optional rating and note).
Every submission is saved and shows up as a profile card in the gallery.

Built with plain **HTML, CSS and JavaScript** in the browser, plus a tiny **Node.js server that needs no
`npm install`** (it only uses Node's built-in modules).

## What is inside

```
favorite-subject/
├── server.js            The Node server: serves the website + the /api/students API
├── config.example.json  Template for your settings (copy it to config.json)
├── config.json          YOUR private settings (port + Google Apps Script link). Not on GitHub!
├── .gitignore           Tells Git to keep config.json private
├── data/students.json   Local storage (starts with 8 demo profiles)
├── apps-script/Code.gs  The Google Apps Script backend (only needed for Google Sheets mode)
└── public/              The website itself
    ├── index.html       Homepage
    ├── input.html       The form
    ├── profiles.html    The profile gallery
    ├── css/styles.css   All the styling
    ├── js/
    │   ├── subjects.js  The official subject list (used by the browser AND the server)
    │   ├── i18n.js      The language setting + all English / Indonesian texts
    │   ├── common.js    Shared helpers
    │   └── home.js, input.js, profiles.js   One script per page
    └── img/             Decorative illustrations (SVG)
```

How the pieces talk to each other:

```
Browser  ->  our Node server (server.js)  ->  data/students.json          (local mode)
                                          ->  Google Apps Script -> Sheet (Google Sheets mode)
```

The browser only ever talks to **our own server**, so there are no CORS problems.

---

## 1. Start the server

You need [Node.js](https://nodejs.org) version 18 or newer (check with `node --version`).

Open a terminal **inside the `favorite-subject` folder** and run:

```bash
node server.js
```

Then open **http://localhost:3000** in your browser. Stop the server with `Ctrl + C`.

The little badge in the top navigation shows where profiles are saved:
**"Saving locally"** or **"Connected to Google Sheets"**.

It works right away without any settings file (local mode, port 3000). To change the port or connect
Google Sheets, first copy the template:

```bash
copy config.example.json config.json
```

(on Mac/Linux: `cp config.example.json config.json`) and then edit `config.json`.

---

## Language setting (Indonesian / English)

Use the **ID | EN** switch in the top navigation bar. The whole site changes language straight away
(menus, buttons, messages, dates, subject names) and the choice is remembered in the browser.
The first time someone visits, the site uses Indonesian if their browser is set to Indonesian, otherwise English.

**How it works (good to explain in your presentation):** all texts live in one table in
`public/js/i18n.js`, once per language, under short keys such as `nav.home`. In the HTML, text is marked
with `data-i18n="nav.home"`, and JavaScript fills it in. To fix a translation, or to add a third language,
edit that table.

## Subjects

The favorite-subject dropdown has these 14 subjects (from the school curriculum):
Pendidikan Agama dan Budi Pekerti, Pendidikan Pancasila, Bahasa Indonesia, Matematika,
Matematika Tingkat Lanjut, Bahasa Inggris, Bahasa Inggris Tingkat Lanjut, PJOK, Sejarah,
Seni Budaya / Prakarya dan Kewirausahaan (PKWU), Bahasa Jawa, Geografi, Sosiologi, Ekonomi.

- Students **pick from the list**. There is no free-text "Other" box any more, and the server rejects
  anything that is not on the list.
- The **official Indonesian name is what gets saved** (in `students.json` or the Google Sheet), so the
  sheet stays easy to read. On screen, the subject is shown in the chosen language (for example
  `Matematika` / `Mathematics`), with a shorter label on stickers and filter chips.
- To add, remove or rename a subject, edit **only `public/js/subjects.js`**. The dropdown, icons, colors,
  filters and the server's validation all read that one file. Restart the server afterwards.
- Old rows that use other names (for example `Math` or `Science` from the first version) still display fine.
  `Math`, `English`, `History`, `PE` and `Art` are recognized as the matching new subjects.

---

## 2. Switch to Google Sheets mode

Until you do this, everything is saved in `data/students.json` and the site works fine.

### a) Create the Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a blank spreadsheet.
2. Rename the tab at the bottom (or add a new tab) to **Favorite Subject**.
   (`Code.gs` reads and writes the tab named in `SHEET_NAME`. Set `SHEET_NAME = ''` to use the first tab instead.)
3. In **row 1** of that tab, type these six headers, one per column, exactly like this:

   | A | B | C | D | E | F |
   |---|---|---|---|---|---|
   | Timestamp | Name | Class | FavoriteSubject | Rating | Note |

### b) Add the script

1. In the sheet, click **Extensions > Apps Script**.
2. Delete the sample code in the editor.
3. Open `apps-script/Code.gs` from this project, copy everything and paste it in.
4. Click the **Save** icon.

### c) Deploy it as a web app

1. Click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set **Execute as: Me** and **Who has access: Anyone**.
4. Click **Deploy** and, when asked, **Authorize access** (choose your Google account; if you see
   "Google hasn't verified this app", click **Advanced > Go to ... (unsafe)**. It is your own script).
5. Copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy.../exec`.

### d) Tell the server about it

Copy `config.example.json` to `config.json` (see step 1), open `config.json`, paste the URL and save:

```json
{
  "port": 3000,
  "appsScriptUrl": "https://script.google.com/macros/s/AKfy.../exec"
}
```

Restart the server (`Ctrl + C`, then `node server.js`). The badge should now say
**"Connected to Google Sheets"**. Submit a test profile and check that a new row appears in the sheet.

> **Troubleshooting**
> - Badge still says "Saving locally": the URL in `config.json` is empty or does not start with
>   `https://script.google.com/`. Check the terminal for a warning.
> - "Google Sheets did not send back JSON": the deployment is not set to *Who has access: Anyone*,
>   or you forgot to redeploy after editing the script (see below).

---

## 3. Redeploy the Apps Script after changes (a common beginner mistake!)

Saving the script is **not enough**. The web app keeps running the *old* version until you publish a new one:

1. In Apps Script click **Deploy > Manage deployments**.
2. Click the **pencil (Edit)** icon on your deployment.
3. Under **Version**, choose **New version**.
4. Click **Deploy**.

> **If you already deployed an earlier version of `Code.gs`:** the subject length limit was raised from
> 30 to 60 characters (the official subject names are long), so paste the new `Code.gs` and redeploy
> as described here. Otherwise long subjects like "Pendidikan Jasmani, Olahraga, dan Kesehatan (PJOK)"
> will be refused by the sheet.

Keep using **Manage deployments > Edit** (not "New deployment"). That way the **URL stays the same**
and you do not need to change `config.json`.

---

## 4. Clear the demo profiles

The 8 demo students in `data/students.json` are marked with `"demo": true` and show a small
**DEMO** label on their cards. To remove only the demo profiles (real ones are kept):

```bash
node server.js --clear-demo
```

(Or open `data/students.json` and delete the entries by hand.)
If you use Google Sheets mode, the demo profiles are not in the sheet, so there is nothing to clear.

---

## 5. Putting the project on GitHub

**Never upload your real Apps Script URL.** Anyone who has it can add rows to your sheet. That is why
`config.json` is listed in `.gitignore`: Git skips it, and only the safe `config.example.json` (with an empty
URL) is uploaded. Before you push, check that `config.json` does **not** appear in `git status`.

```bash
git init
git add .
git status
git commit -m "Favorite Subject website"
git branch -M main
git remote add origin https://github.com/YOUR-NAME/YOUR-REPO.git
git push -u origin main
```

Uploading through the GitHub website instead? Drag in the **contents** of the project folder, but **not**
`config.json`.

If a real URL ever gets pushed by mistake, treat it as leaked: in Apps Script use **Deploy > Manage
deployments**, archive that deployment, create a new one, and use the new URL.

Note: while you use **local mode**, new profiles are written into `data/students.json`, which Git would upload
(with the students' names). Use Google Sheets mode for real data, or add `data/students.json` to `.gitignore`.

---

## 6. Free hosting ideas for later

- **The Node server needs a host that can run Node.js.** **GitHub Pages alone will not work**, because it
  only serves static files and cannot run `server.js`.
- **Render** ([render.com](https://render.com)): free web service tier. Upload the project to GitHub,
  create a "Web Service", set **Start command** to `node server.js`. Render sets the `PORT` for you.
  In *Environment*, add `APPS_SCRIPT_URL` with your Apps Script link (the server reads it, so you do not
  need `config.json` on the host, and the URL never touches GitHub).
- Other options with free tiers: **Railway**, **Fly.io**, **Glitch**.
- **Important:** on free hosts the disk is usually **wiped on restart**, so *local mode* would lose
  profiles. Use **Google Sheets mode** when you host online. It also lets you see and edit the data in the sheet.
- Free Render services "sleep" when nobody visits, so the first page load can take ~30 seconds.

---

## Security notes (good to mention in your presentation)

- Text typed by students is shown with `textContent`, never `innerHTML`, so scripts typed into a form
  cannot run.
- The server checks everything again (required fields, length limits, rating 1 to 5), even though the
  browser already checks it.
- Request bodies are limited to 10 KB and there is a simple "too many submissions" limit.
- Only the `public/` folder can be downloaded. `config.json`, `server.js` and `data/` are private.
- In the Google Sheet, cells are stored as plain text, so something like `=1+1` cannot run as a formula.
