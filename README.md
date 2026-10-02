# setlog-for-oc

A local-only photo log of a group's day, inspired by [Setlog](https://apps.apple.com/app/id6587576438). It is a public static website. **Everything stays in your browser, and your photos never leave your device.**

> Status: scaffold in progress (landing page and blank pages). The full spec is in [`docs/PLAN.md`](docs/PLAN.md), and the decision history is in [`docs/HANDOFF.md`](docs/HANDOFF.md).

## Running locally

You need Node 20.19+ or 22.12+.

```
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # type-check, then a production build in dist/
npm run preview    # serve the production build
```

## Plan summary

### What it is
- **One local user, no accounts, no server.** All data is kept in the browser (IndexedDB).
- **People library:** you create people once, each with a name and an avatar (a photo or initials).
- **Many logs:** each log picks and orders its members from the People library.
- **Uploads, not live capture:** images only (JPEG, PNG, WebP or HEIC), uploaded with the file picker, drag-and-drop or paste. There is no video and no bulk fill.

### Log settings
| Setting | Rule |
|---|---|
| Name, members | Editable at any time. |
| Day mode: dates (`Tue 30 Sep 2026`) or weekdays (`Monday … Monday #2`) | Locked once the log has entries. |
| Day range | Set when the log is created. Afterwards it can only be trimmed from the start or end, with a warning if pictures would be deleted. |
| Slot length: 1, 2 or 4 hours | Locked once the log has entries. Unlocks when every entry is deleted. |
| Start and end hour | Always editable, in steps that match the slot length. Warns before removing slots that contain pictures. |
| Slot label: time range or start time only | Editable at any time. |
| Image ratio: 16:9, 4:3 or 3:2 (always landscape) | Editable at any time. Default 16:9. |
| Theme | Editable at any time. |

Entries are keyed by clock hour, so changing the start or end hour never moves pictures.

### Day view
```
‹   Tue 30 Sep 2026 / Monday #2   ›          ← date switcher (stops at first/last day)
<        08:00–10:00  (2/8)       >  ⤓       ← slot switcher (stops at first/last slot) + export slot
┌─────────────────────────────────┐
│ ◯ Ava   [ photo               ] │          one full-width row per member,
│ ◯ Ben   [ + add               ] │          sized by the log's image ratio;
│ ◯ Cleo  [ photo               ] │          scrolls when taller than the screen
└─────────────────────────────────┘
   [ Export day ]  [ + Create new day ]      ← Create new day only on the last day
```
- **One slot at a time.** Tap the slot label to jump to a slot. Arrow keys and swiping also work.
- **Changing days:** the date switcher is the only way to move between days.
- **Creating days:** Create new day is the only way to add a day.
- **Clear day:** wipes all of a day's pictures after a confirmation. The empty day stays in place.
- **Opening a day:** today opens on the current slot. Any other day opens on the first slot.
- **Editing a photo:** crop by setting a focal point and zoom, framed to the image ratio, and add a caption.

### Export
The export is drawn on a canvas and matches the day view.
- **Contents:** a header with the log name, day and slot, then each member's photo with their name and caption.
- **Image height:** the image always grows to fit every member, so there's no shrinking or splitting.
- **Options:** show avatars or not, PNG or JPEG, 1080 or 2160 px wide, theme, and whether to show empty members.
- **Large exports:** if an image would be too big for the browser to draw, its width drops automatically and the user is told.
- **File names:** `MyLog_2026-09-30_0800.png` or `MyLog_Monday-2_0800.png`.
- **Export slot:** saves one image.
- **Export day:** saves one image per filled slot, with no zip.
  - Chrome or Edge: pick a folder once and every image is saved there.
  - Other desktop browsers: each image downloads separately.
  - Mobile: the share sheet, so images can go to Photos.

### Data safety
- **Backup and restore:** everything is saved in one zip file.
- **Clear all data** button.
- **Persistent storage** is requested so the browser doesn't delete your data.
- **Works offline** as an installable PWA.

### Build phases
1. **Scaffold:** project setup, database schema, routing and theme.
2. **People library:** add, edit and delete people, with avatar crop.
3. **Log settings:** day range, slot length lock, start and end hours, and warnings.
4. **Day view:** date and slot switchers, Create new day, jump list, and the list layout.
5. **Images:** upload, drag-and-drop and paste, crop and caption.
6. **Export:** the canvas renderer, single-slot export and day export.
7. **Wrap-up:** backup and restore, clear data, PWA, accessibility, mobile polish and deployment.

### Deferred
- **Grid layout:** a grid as an alternative to the list layout.

## Folder structure

The code is grouped by feature, and shared code lives in a few common folders.

```
setlog-for-oc/
├─ public/                  static files served as-is (PWA manifest, icons)
├─ src/
│  ├─ app/                  app shell: root component, routes, global providers
│  ├─ features/             one folder per product area
│  │  ├─ people/            People library: list, add/edit, avatar crop
│  │  ├─ logs/              Home log cards, create/edit log settings
│  │  ├─ day-view/          date/slot switchers, list layout, Create new day,
│  │  │                     image upload, drag/paste, crop + caption editor
│  │  ├─ export/            canvas renderer, slot/day export, save strategies
│  │  └─ backup/            backup/restore zip, clear all data
│  ├─ components/           shared UI used by several features (buttons, dialogs, confirm warning)
│  ├─ db/                   Dexie database and schema
│  ├─ hooks/                shared React hooks
│  ├─ lib/                  pure helpers with no React (slot maths, day labels, image resizing)
│  ├─ styles/               theme tokens, global CSS, fonts
│  └─ types/                shared TypeScript types (Person, Log, Day, Entry)
├─ docs/                    planning docs (PLAN.md, HANDOFF.md)
└─ README.md
```

**Conventions**
- Each feature folder has only the subfolders it needs: `pages/` for route-level screens, plus `components/`, `hooks/` and `lib/`.
- A feature exposes its public pieces through an `index.ts`, and other features import from there instead of reaching into deep paths.
- Tests sit next to the file they test, for example `slots.test.ts` beside `slots.ts`.
- Code used by only one feature stays in that feature. It moves to `src/components`, `hooks` or `lib` once a second feature needs it.

## Commit messages

Use the form `<type>[(scope)]: Summary`, for example `feat(day-view): Add slot switcher`.
- **Types:** `scaffold`, `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `style`, `perf`, `build` and `ci`.
- **Summary:** imperative and capitalised, with no full stop at the end. The whole first line is at most 72 characters.
- **Body:** optional, after a blank line, e.g. `Co-Authored-By:` trailers.

Claude Code enforces this through a hook in `.claude/settings.json` that runs `.claude/hooks/check-commit-msg.mjs`. It needs Node installed and nothing else. It only checks commits Claude makes, not commits typed in your own terminal.

## Tech stack

**App:** Vite + React + TypeScript.

**Libraries**
- **Dexie:** the database layer over the browser's IndexedDB. It stores people, logs, days and photos.
- **JSZip:** used only for the backup zip.
- **heic2any:** converts iPhone HEIC photos in the browser.
- **exifr:** optional. It reads photo orientation.

**Built-in browser features**
- **Canvas:** draws the exported images.
- **File System Access API:** saves a day export into one folder in Chrome and Edge.
- **Web Share:** sends exports to Photos on mobile.
- **`navigator.storage.persist()`:** asks the browser to keep the data.
- **Service worker and manifest:** make the app an installable PWA that works offline.

**Look:** a rounded font (Nunito or M PLUS Rounded 1c), pastel colours, rounded cards, and light and dark themes.

**Hosting:** a static site on GitHub Pages or Cloudflare Pages, with no backend.
