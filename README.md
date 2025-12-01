# mehdavia-hijri-calendar-app1

Responsive Hijri & Gregorian calendar with Firebase backend, role-based access control, announcements, prayer times, and PWA support for mobile and large-screen TVs.

## Quick Start

### 1. Local Development with Firebase Emulator Suite

Prerequisites:
- Node.js 18+
- Firebase CLI (`npm install -g firebase-tools`)
- Python 3 (for static server)

Steps:

```bash
# Install Firebase functions dependencies
cd functions && npm install && cd ..

# Start Firebase Emulator Suite (Auth, Firestore, Functions)
firebase emulators:start --only auth,firestore,functions

# In another terminal, start the static server
python3 -m http.server 8000

# Open http://localhost:8000 in your browser
```

Features:
- Hijri & Gregorian calendar with month/year navigation
- Firebase Google Sign-In
- Role-based dashboards: `user`, `admin`, `master_admin`
- Events CRUD (users manage personal events, admins manage user events)
- Announcements (global by master admin, scoped by admins)
- Prayer times fetched from Aladhan API with countdown
- Digital & analog clocks (TV-only)
- TV remote D-pad navigation (arrow keys cycle focus)
- PWA support (installable on mobile/TV)
- Firestore security rules with role/adminId write protection

### 2. Production Deployment

#### Prerequisites:
- Firebase project created in Google Cloud Console with:
  - Google Sign-In enabled in Authentication
  - Firestore enabled in Firestore Database
  - Firebase CLI authenticated: `firebase login`

#### Deployment Steps:

1. **Update Firebase Project Configuration:**

   ```bash
   # Link to your production Firebase project
   firebase use --add
   # Choose your project and set alias (e.g., "production")
   
   # Update .firebaserc if needed:
   # {
   #   "projects": {
   #     "default": "your-project-id"
   #   }
   # }
   ```

2. **Update Firebase Config in JavaScript:**

   Edit `js/firebase-config.js` and replace the config with your production project credentials:

   ```javascript
   const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT.appspot.com",
     messagingSenderId: "YOUR_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```

3. **Deploy Cloud Functions and Firestore Rules:**

   ```bash
   firebase deploy --only functions,firestore:rules
   ```

   This will:
   - Deploy the `setRole` Cloud Function (callable from frontend to set user roles)
   - Deploy Firestore security rules to enforce role-based access control

4. **Deploy Static Files (Optional - for Firebase Hosting):**

   If you want to host the frontend on Firebase:

   ```bash
   # Configure hosting in firebase.json if not already done
   firebase init hosting
   
   # Deploy everything
   firebase deploy
   ```

#### Post-Deployment:

1. **Set Master Admin:**

   Use the Firebase Console to set custom claims for your master admin user:
   - Go to Authentication → Users
   - Click the user email
   - Set custom claims (JSON):
     ```json
     { "master_admin": true, "admin": false }
     ```
   
   Or use the Cloud Function from the backend:
   ```javascript
   // Call from an authenticated admin user's frontend
   const setRole = firebase.functions().httpsCallable('setRole');
   await setRole({ uid: 'user-uid', role: 'master_admin' });
   ```

2. **Test the App:**
   - Sign in with Google
   - Create events and announcements
   - Test role-based access (admins can manage users, master admins can promote admins)

## File Structure

```
.
├── index.html                # Main UI with calendar, auth, dashboards
├── css/styles.css            # Responsive styles (mobile, TV, kiosk mode)
├── js/
│   ├── app.js                # Calendar logic, auth, prayer times, clocks
│   ├── firebase-config.js    # Firebase SDK config (production)
│   └── firebase-config.example.js  # Config template
├── functions/
│   ├── index.js              # Cloud Functions entry point
│   ├── package.json          # Function dependencies
│   └── setRole/
│       ├── index.js          # setRole callable function (master_admin only)
│       └── package.json
├── scripts/
│   ├── test-rules.sh         # Shell-based Firestore rules validation
│   └── e2e-test.js           # E2E test against emulator
├── manifest.json             # PWA manifest
├── sw.js                     # Service Worker (offline support)
├── firestore.rules           # Firestore security rules
├── firebase.json             # Firebase project config
└── .firebaserc               # Firebase CLI project aliases
```

## Security Notes

1. **Firestore Rules** (`firestore.rules`):
   - Users cannot write `role` or `adminId` fields (prevents privilege escalation)
   - Only authenticated users can read/write
   - Admins can create events for their managed users
   - Announcements require `admin` or `master_admin` custom claim

2. **Cloud Function `setRole`**:
   - Only `master_admin` custom claim can call it
   - Sets `admin` or `master_admin` claims on other users
   - Cannot demote the master admin

3. **Default Master Admin**:
   - Set manually via Firebase Console → Authentication → Custom Claims
   - Or use the `setRole` function from an existing master admin

## Features

### Calendar
- Hijri (Islamic calendar) dates displayed with Gregorian dates
- Month/year navigation
- Responsive grid layout for mobile and TV screens

### Authentication
- Firebase Google Sign-In
- Role-based access: `user`, `admin`, `master_admin`
- User docs stored in Firestore with metadata

### Events
- Users create and manage personal events
- Admins can create events for their managed users
- Real-time Firestore listeners update the calendar

### Announcements
- Global announcements by `master_admin`
- Scoped announcements by `admin` (visible to their users)
- Real-time updates

### Prayer Times
- Fetched from Aladhan API by geolocation
- Live countdown to next prayer
- Admins can set custom prayer timings per user

### Clocks (TV-only)
- Digital clock (24-hour format)
- Analog clock (canvas-based)
- Hidden on mobile/smaller screens
- Toggleable via localStorage preference

### TV Remote Navigation
- Use arrow keys (↑ ↓) to cycle through focusable elements
- Focus indicators visible on large screens
- Touch-friendly for TV remotes

### PWA Support
- Installable on mobile and TV browsers
- Service Worker with offline fallback
- App shell caching strategy

## Development Notes

### Hijri Conversion
The Hijri conversion is algorithmic (Julian Day Number method) and approximate. For regional accuracy, use the Umm al-Qura table or consult local Islamic authorities.

### Emulator Testing
Run local tests to validate Firestore rules:

```bash
# Start emulator in one terminal
firebase emulators:start --only auth,firestore,functions

# In another terminal, run tests
bash scripts/test-rules.sh      # Firestore rules validation
node scripts/e2e-test.js        # End-to-end test
```

Expected Results:
- All Firestore rules tests pass (4/4)
- E2E test confirms auth, Firestore operations, and Cloud Function work

### Extending the App
- Add more prayer times tracking features
- Integrate with calendar systems (Google Calendar, Outlook)
- Mobile app (React Native, Flutter)
- Multi-language support

## License

[Your License Here]

## Contributing

Feel free to submit issues and pull requests.
