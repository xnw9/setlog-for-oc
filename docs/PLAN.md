# PLAN — Local-only group day log (Setlog-inspired)

A public, static website where one local user makes photo logs of a group's day. Each day is split into time slots, and each slot holds one picture per member. Slots can be exported as images. **Nothing is stored on a server.** All data lives in the user's browser.

---

## 1. Core rules

- **No accounts:** there is a single local user. There is no backend, no sync and no content analytics.
- **Images only:** JPEG, PNG, WebP and HEIC (converted in the browser). For an animated file only the first frame is kept. No video or GIF.
- **Global People library:** the user creates people (name + avatar) once and picks which of them belong to each log.
- **Many logs:** the user can create any number of logs.

## 2. Data model (IndexedDB via Dexie)

```ts
Person { id, name, avatarBlob, color }                 // global library

Log {
  id, name, memberIds[],                               // ordered subset of People
  dayMode: 'date' | 'weekday',
  firstDayKey,                                         // ISO date, or starting weekday ('mon'…'sun')
  slotHours: 1 | 2 | 4,
  startHour, endHour,                                  // endHour <= startHour ⇒ ends next day
  labelMode: 'range' | 'start',                        // "08:00–10:00" or "08:00"
  imageRatio: '16:9' | '4:3' | '3:2',                  // photo shape, always landscape; default '16:9'
  theme
}

Day   { id, logId, index }                             // contiguous: 0..n-1
Entry { id, dayId, personId, slotStartHour,            // keyed by clock hour, not slot position
        imageBlob, width, height, crop {x,y,zoom}, caption? }
```

- **Day labels:**
  - Date mode: `firstDate + index` days, for example "Tue 30 Sep 2026".
  - Weekday mode: the weekday name, plus `#n` from the second week on. Example: `Monday … Sunday, Monday #2, …`.
- **Slots:** run from `startHour` to `endHour` in steps of `slotHours`, and the range is always a whole number of slots.

## 3. Log settings and their rules

| Setting | Behaviour |
|---|---|
| Name, members (pick and reorder from the library) | Editable at any time. |
| Day mode (date / weekday) | Chosen at creation. **Locked while the log has entries.** |
| Day range | Chosen at creation, which creates those days. Date mode: start and end date. Weekday mode: first weekday to last label (e.g. Monday → Sunday #2). Afterwards it can **only be trimmed** from the start or the end. Settings can never add days. A day in the middle can't be removed, but it can be **cleared** (see §4). |
| Slot length (1 / 2 / 4 h) | **Locked while the log has entries.** Unlocks when every entry is deleted. |
| Start / end hour | Always editable, but the choices follow the slot length: start moves in steps of the slot length, and end = start + a whole number of slots. With no entries, any aligned range is allowed. |
| Image ratio (16:9 / 4:3 / 3:2, always landscape) | Editable at any time. Changing it doesn't touch the stored pictures. Each crop is a focal point plus zoom, so it fits the new frame shape. |
| Label mode, theme | Editable at any time. |

- **Trimming days or narrowing hours:** if this would remove slots or days that contain pictures, show a warning that lists what will be deleted, and require a confirm or cancel.

## 4. Screens

1. **Home:** Log cards, "+ New Log", and a People tab.
2. **People library:** add, edit and delete people.
   - The avatar can be an upload with a circle crop, or colour + initials as a fallback.
   - Deleting someone who is in logs asks whether to remove them and delete their entries.
3. **Create / edit Log:** all the settings from §3.
4. **Day view** shows **one slot at a time**:

```
‹   Tue 30 Sep 2026 / Monday #2   ›          ← date switcher
<        08:00–10:00  (2/8)       >  ⤓       ← slot switcher + export-slot icon
┌─────────────────────────────────┐
│ ◯ Ava   [ photo               ] │          List layout:
│ ◯ Ben   [ + add               ] │          one full-width row per member
│ ◯ Cleo  [ photo               ] │
└─────────────────────────────────┘
   [ Export day ]  [ + Create new day ]      ← Create new day only on the last existing day
```

- **Date switcher:** `‹` is disabled on the first day and `›` on the last day. The only way to change day is the date switcher.
- **Create new day:** the button sits next to the Export day button at the bottom. It appears only on the last existing day and appends the next date or weekday label. **It is the only way to create a day**, in both modes.
- **Slot switcher:** `<` and `>` **stop at the first and last slot of the day**, so they never cross into another day.
  - Tapping the slot label opens a jump list, with filled slots marked.
  - Arrow keys and swiping also work.
- **Clear day:** an action in the day view's menu deletes every picture in that day, after a confirmation. The day itself stays in the sequence, empty. This works on any day, including the ones in the middle.
- **Opening a day:** it opens on the current slot if the day is today, otherwise on the first slot.
- **Layout:** the list layout is the only layout for now. A grid layout is deferred (see §12).
- **List layout sizing:**
  - Every photo row is the full width of the page, and its height comes from the log's **image ratio** (16:9, 4:3 or 3:2, always landscape). Rows never stretch or shrink to fit the screen.
  - If all the rows together are taller than the space available, the list **scrolls with a scroll bar**. The date switcher, slot switcher and Export day button stay where they are. This applies whatever the member count.
- **What you see is what you export:** the export uses the same layout and image ratio as the day view.

## 5. Adding images

- **Ways to add:** tap a member card to open the file picker (`accept="image/*"`). Drag-and-drop and paste work on desktop. **There is no bulk fill.**
- **Cell editor:** replace, delete, crop and zoom (the frame matches the log's image ratio; the crop is stored as a focal point plus zoom, so it still works after the ratio changes), and caption.
- **Size:** images are downscaled to about 2048 px on the long side before storing.

## 6. Export (drawn on a canvas, not a DOM screenshot)

**Contents of each slot image:**

- A header with the log name, the day label and the slot label (following the label mode).
- The member photos in the list layout, with names and captions.

**Options:**

- Show avatars: on or off.
- Format: PNG or JPEG.
- Width: 1080 or 2160 px.
- **List-layout image size:** each slot is always exported as one image. Its width is the chosen export width, and its height is the header plus every member row at the log's image ratio. **The image always grows to fit all the rows**, with no fixed page size, no shrinking and no splitting. For example, 4 members at 16:9 and 1080 px wide gives an image about 1080×2600.
- Theme.
- Whether to show empty members.

**File name:** `LogName_<day>_<HHMM>.png`, for example `MyLog_2026-09-30_0800.png` or `MyLog_Monday-2_0800.png`.

**Export slot:** the icon saves one image.

**Export day:** every filled slot is saved as **its own image file, with no zip**:

| Where | How the files are saved |
|---|---|
| Desktop, Chrome or Edge | Pick a folder once (File System Access API), and all the files are written into it. |
| Other desktop browsers | Each image downloads as its own file, one after another. |
| Mobile | Web Share with `files`, so the images can go to Photos. Falls back to one download per image. |

## 7. Local-only guarantees

- **Hosting:** a static site on GitHub Pages or Cloudflare Pages.
- **Storage:** IndexedDB, with `navigator.storage.persist()` requested.
- **Backup / Restore:** all people, logs and images as one zip file. This is the only place a zip is used.
- **Clear data:** a "Clear all data" button, and a privacy line saying your photos never leave this device.
- **Offline:** a PWA that installs on phones and works offline.

## 8. Tech stack

- Vite + React + TypeScript.
- Dexie (IndexedDB), JSZip (backup only), heic2any, and exifr (optional, to read an image's orientation).
- A rounded font (Nunito / M PLUS Rounded 1c), pastel colours, rounded cards, and light and dark themes.

## 9. Build phases

1. **Scaffold:** Vite + React + TS, Dexie schema, routing, theme tokens.
2. **People library:** CRUD with avatar crop.
3. **Log settings:** member picker, day mode, day range (create and trim with a warning), slot length lock, aligned start and end hours, and a warning when narrowing hours.
4. **Day view:** date switcher with stops at both ends, Create new day, slot switcher with stops at both ends, jump list, list layout with the image ratio, and a scroll bar when needed.
5. **Images:** upload, drag-and-drop and paste, crop and caption.
6. **Export:** canvas renderer for the list layout, all the options, single-slot export, and day export (folder, multiple downloads or Web Share).
7. **Wrap-up:** backup and restore, clear data, PWA, accessibility, mobile polish, deployment.

## 10. Risks

- **iOS Safari storage quota:** the quota is small, so encourage backups.
- **HEIC decoding:** needs the in-browser converter on some browsers.
- **Multiple downloads:** some browsers ask once for permission.
- **Big slots:** list-layout exports for large groups get long. iOS Safari limits a canvas to about 16.7 million pixels. At 2160 px wide with 16:9 rows, about 6 or more members can pass that limit, and at 1080 px wide about 25 or more can. Decision: the app lowers the export width automatically until the image fits, and tells the user.

## 11. Resolved questions (rounds 6–8)

1. **Deleting days:** trimming the range from the start or end is still the only way to remove days, so days stay in sequence. Any day can also be **cleared** of its pictures (§4).
2. **List-layout sizing** (changed in round 8, which replaces round 7): the user sets an **image ratio** per log (16:9, 4:3 or 3:2, always landscape). The list scrolls whenever the rows are taller than the screen, and export **always grows the image** to fit every row (§3, §4, §6).
3. **Export widths:** 1080 and 2160 px, as planned.

4. **Image ratio** (round 9): this is a setting on each log, and the default is 16:9.
5. **Canvas limit** (round 9): when an export would be too large to draw, its width drops automatically until it fits, and the user is told.
6. **Grid layout** (round 9): out of scope for now (§12).

No open questions remain.

## 12. Deferred

- **Grid layout:** an alternative to the list layout, set per log, plus a layout override in export. When it's picked up later, decide how it sizes cells and how the image ratio applies to it.
