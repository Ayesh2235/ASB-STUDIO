# ASB Movies - Mobile App Instructions

## Project Overview
ASB Movies යනු Netflix වගේ streaming app එකක්. Main purpose: Admin (Ayesh) විසින් unlimited films upload කිරීම සහ users විසින් ඒ films බැලීම.

Tech Stack: HTML5, Tailwind CSS, Vanilla JavaScript, Dexie.js (offline-first DB)

## Required Screens & Features (අනිවාර්යයෙන්ම implement කළ යුතුයි)

1. **Splash Screen** - ASB Movies logo සහ loading animation (3s auto redirect to Onboarding or Login)
2. **Onboarding Screens** (3-4 slides) - Swipeable or Next buttons. Content: "Unlimited Sri Lankan & International Movies", "Offline Downloads", "Personalized Recommendations" etc. Skip button.
3. **Auth Screens**
   - Login: Email/Password, Google, Apple, Phone (simulated buttons)
   - Sign Up: Form with email, password
   - Guest mode option

4. **Home Screen** (Netflix style)
   - Top Nav: Logo, Search icon, Profile
   - Hero Banner: Auto-sliding large poster with "Play" and "More Info" buttons (smooth transition)
   - Horizontal scrollable rows:
     - Trending Now
     - Top 10 in Sri Lanka
     - Continue Watching
     - Popular on ASB Movies
     - New Releases
     - Action, Drama, Sri Lankan Movies, Comedy etc. (category rows)

5. **Search Screen**
   - Search bar (title, actor, director, genre)
   - Voice Search button (simulated)
   - Filters (Genre, Year, Rating)
   - Results grid with posters

6. **Browse / Categories Screen** - All categories as cards or tabs

7. **Movie / TV Detail Screen**
   - Large poster + auto-play trailer (YouTube embed or HLS placeholder)
   - Description, Cast & Crew, Similar titles
   - Buttons: Play, Add to My List, Download, Share, Rate

8. **Video Player Screen**
   - Fullscreen video (use <video> tag + HLS.js for streaming simulation)
   - Controls: Play/Pause, Progress bar, Volume, Quality selector (480p, 720p, 1080p), Playback speed, Subtitles (Sinhala/English/Tamil - simulated), Skip Intro, Next Episode (for series)
   - PIP mode support (browser default)

9. **My List / Watchlist** - Saved items grid

10. **Downloads Screen** - Offline downloaded items (DexieJS භාවිතයෙන් simulate)

11. **Profile Screen**
    - Multiple profiles support (switch between profiles)
    - Kids Mode toggle
    - Edit profile, Manage devices

12. **Settings Screen** - Language, Notifications, Subscription, Logout

## Additional Requirements
- **Dark Mode** default (Netflix black/gray theme)
- Smooth animations (Tailwind transitions, JS for sliders)
- **Recommendation system** - Simple (based on watched history or random)
- **Subscription Plans**: Free (limited) + Premium (unlimited, offline, HD)
- Push notifications simulation for new releases
- Watch history & Continue Watching (DexieJS එකේ save කරන්න, devices අතර sync simulation)
- Responsive design (mobile-first, looks good on phone)

## Admin Portal (admin.html)
- Login: username `Ayesh` , password `Ayesh`
- Dashboard: Uploaded films list
- **Upload Film Form**:
  - Title, Description, Poster URL (or file upload simulation), Trailer URL, Video HLS URL (or mp4 placeholder), Genre, Cast, Director, Year, Rating
  - Category selection (Action, Drama, Sri Lankan etc.)
- Film list with Edit/Delete buttons
- All uploaded films automatically appear in user app (DexieJS shared DB simulation)

## Data Storage (Dexie.js)
- Tables: movies, users, watchlist, downloads, history, profiles
- All data client-side (IndexedDB). Real app එකකට Firebase හෝ Supabase එකතු කරන්න.

## Video Streaming
- Use HLS.js library for adaptive streaming simulation
- Example: `<video>` tag + sample m3u8 URLs or local mp4

## How to Run
1. Tailwind CDN or local setup use කරන්න (`<script src="https://cdn.tailwindcss.com"></script>`)
2. All buttons & functions **real-time** work කළ යුතුයි (no broken links)
3. Smooth UI, modern Netflix-like feel

## Future Improvements
- Convert to PWA (installable on mobile)
- Real backend + user authentication
- Actual video hosting (Vimeo, Bunny.net, or own HLS server)

Main Goal: Admin විසින් films upload කළ පස්සේ users ට ඒවා seamless විදිහට බලන්න පුළුවන් වීම.
