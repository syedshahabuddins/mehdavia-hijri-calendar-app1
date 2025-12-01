# mehdavia-hijri-calendar-app1

Responsive Hijri & Gregorian calendar (static web prototype)

Files added:

- `index.html` — main UI
- `css/styles.css` — responsive styles for mobile and TV
- `js/app.js` — Gregorian→Hijri conversion and calendar renderer

Run locally

Option 1 — Open in browser

Open `index.html` in a browser (double-click or `file://` URL). For full functionality (fullscreen, keyboard) use a local server.

Option 2 — Simple local server (recommended)

From the project root run:

```bash
python3 -m http.server 8000
# then open http://localhost:8000 in your device/browser
```

Notes and next steps

- Features added in this update:
  - Firebase Google Sign-In (client-side) + Firestore-based user docs with roles: `user`, `admin`, `master_admin`.
  - Dashboards for users, admins, and master admins: events CRUD, announcements, timezone and hijri adjustments.
  - Announcements: master admins can post global announcements; admins can post announcements scoped to their users.
  - Prayer times fetched via the Aladhan API (by geolocation). Admins can set custom timings for their users. A live countdown to the next prayer is shown.
  - TV-only clocks: digital and analog clocks; TV users can choose which to display. Clocks are hidden on smaller/mobile screens.
  - Firestore security rules example and Cloud Function example to safely set roles and custom claims.

- Important security notes and next steps (required before production):
  1. Implement and deploy Firestore Security Rules (see `firestore.rules`) to prevent clients from setting sensitive fields like `role` or `adminId`.
  2. Use a server-side Cloud Function (example in `functions/setRole`) to set custom claims (`admin`, `master_admin`) and enforce that only master admins can promote users.
  3. Review the rules to match your exact production needs and test with the Firebase Emulator Suite.

- Production accuracy: The Hijri conversion included is algorithmic and approximate. For regional accuracy use the Umm al-Qura table or authoritative sources.

- Running locally

1. Create a Firebase project and enable Google sign-in and Firestore.
2. Copy `js/firebase-config.example.js` to `js/firebase-config.js` and fill with your project's config.
3. Optionally set up the Cloud Function using the `functions/setRole` example and deploy with the Firebase CLI.
4. Run a local server and open the app:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

