# HANDOFF — Setlog-inspired local photo log

_Last updated: 2026-10-01_

## Status

- **Planning is complete (round 6 answered the last open questions). No code has been written yet.**
- The full spec is in `PLAN.md` in this folder.
- **Phase 1 has started:** only the folder structure exists so far (see the README), with `.gitkeep` placeholders. `day-view/` also covers image upload and editing. There is no config or code yet. **Next step:** wait for the user to ask for the next part of phase 1.

## What we did

1. **Researched the original "Setlog" app** (via a subagent):
   - It is "setlog – friends camera" by New Chat Inc. (Korea), released Dec 2025 and viral in KR, HK and TW in Apr–May 2026.
   - It works like a BeReal-style group vlog. An hourly alarm prompts each member of a group of 2–20 to film a 2-second live clip.
   - The day runs 4 AM to 4 AM, and at the end the clips are stitched into a split-screen video.
   - Groups join with a code. It is mobile only, needs an account (Passkey or Apple), and stores everything in the cloud.
   - Style: "pop and cute", rounded fonts, minimal backgrounds.
   - Users complain about: no camera-roll uploads, no backfilling, the 20-member cap, no fonts or captions, privacy worries, and bugs.
   - Sources: SCMP, JoongAng Daily, Business Insider Japan, comnico, the App Store listing (id6587576438).
2. **Refined the clone's plan over five rounds** of feedback from the user, which became PLAN.md.

## Where the clone differs from Setlog on purpose

- It's a public static website that works only on the user's own device. **Nothing goes to a server or database.**
- Pictures are uploaded instead of filmed live. **Images only.**
- Export is **images per slot**, not a compiled video.

## Decisions the user made (in order)

**Round 1 (initial ask)**
- A public website, with no server or database storage, for local use only.
- Media can be uploaded.
- The number of people in a log can be adjusted.
- Days can be exported as images.

**Round 2**
- There is one user only. That user can have **many log groups**.
- There is a **global People library** (name + avatar), and each log picks its members from it.
- **Images only.** No video or GIF.
- The user chooses the **slot length: 1, 2 or 4 hours**.
- **Export each slot as its own image**, with a **bulk export for a whole day**.

**Round 3**
- The user sets the **start and end hour** as well as the slot length.
- The user chooses whether slots are labelled with a **time range or just the start time**.
- The **day view shows one slot at a time**, with `<` and `>` below the date switcher. The export icons stay.
- **No bulk fill.**
- On desktop, day export saves **individual images, not a zip**.
- **Slot length locks once the log has entries**, and unlocks when every entry is deleted.

**Round 4**
- A choice of **layout**: the **default is a list of landscape images**, and grid is the alternative. _The grid was deferred in round 9._
- `<` and `>` **stop at the start and end of each day**. Only the date switcher changes the day.
- **Unspecific days are an option**: Monday, Tuesday … then Monday #2 and so on for longer than a week.
- An export option to **show avatars or not**.
- **Start and end hours stay editable** when entries exist, but only in steps that match the slot length.

**Round 5**
- **Each log has a day range**, chosen for it.
- A **"Create new day" button appears on the last existing day**.
- **That button is the only way to create a day**, in both date and weekday modes.

**Round 6** (2026-10-01)
- **Days can't be deleted from the middle**, but any day can be **cleared** of all its pictures, and the empty day stays.
- **Large-group export:** cap the height and shrink the photos, one image per slot. _This was replaced in round 7._
- **Export widths:** 1080 and 2160 px are confirmed.

**Round 7** (2026-10-01) _This was replaced in round 8._
- **List layout shows at most 4 rows per page.** With 1 to 4 members the rows stretch to fill the page. Above 4 members, the rows keep their 4-member height and the list scrolls.
- **List-layout export** matches this. With 1 to 4 members it's a fixed page. Above 4 members the image gets **longer** instead of shrinking.

**Round 8** (2026-10-01)
- **The user sets the photo ratio**: 16:9, 4:3 or 3:2, always landscape.
- **A scroll bar appears** whenever all the photos together are taller than the screen.
- **Export always makes the image long enough** to fit every photo.

**Round 9** (2026-10-01)
- **Image ratio:** set on each log, default 16:9.
- **Grid layout:** not needed for now, so it's deferred and the app is list-only (PLAN.md §12).
- **Oversized exports:** the width drops automatically until the image fits, and the user is told.

**Round 10** (2026-10-01)
- **The Create new day button moves next to the Export day button.** Everything else stays the same.

## Choices the assistant made (not objected to, but can be revisited)

- **Storage:** IndexedDB (Dexie), plus a Backup and Restore zip, which is the only place a zip is used, and a "Clear all data" button. It's a PWA that works offline.
- **Entries are keyed by clock hour (`slotStartHour`)**, so editing start and end hours doesn't move pictures.
- **Warnings before deleting:** narrowing hours or trimming days that contain pictures shows a warning and needs confirmation.
- **Day mode (date or weekday) locks** once a log has entries.
- **Day range after creation can only be trimmed** from the start or end, never extended from settings, and single days in the middle can't be deleted, so days stay in sequence.
- **Export is drawn on a canvas** rather than screenshotted.
  - Day export on Chrome or Edge uses a folder picker. Other browsers get one download per image, and mobile uses the Web Share sheet.
- **Opening a day** starts on the current slot when that day is today.
- **Stack:** Vite + React + TS, Dexie, JSZip (backup only), heic2any, and a rounded font with a pastel theme.
- **Deploy target:** GitHub Pages or Cloudflare Pages.

## Open questions and notes for whoever picks this up

- **All questions and proposals have been settled.** Grid layout is deferred (PLAN.md §12).
- **Git:** working branch `main-scaffold`. The planning docs were moved from `setlog-clone/` to `docs/` and are not committed yet.
- **No code has been written yet.** A Phase 1 scaffold was started on 2026-10-01, but the user asked for it to be removed and for no code to be written until they ask.
