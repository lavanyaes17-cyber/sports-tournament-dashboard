# Campus Sports Tournament Dashboard (Phase 1)

Pages: index, schedule, register, sports, live-scores, results, admin (HTML5 + CSS3 + JavaScript, no framework).

## Folder layout
```
index.html  schedule.html  register.html  sports.html  live-scores.html  results.html  admin.html
css/style.css
js/storage.js   (shared data layer, localStorage)
js/app.js       (page logic)
```

## Run locally
Open `index.html` in a browser (or run `python -m http.server` in this folder and visit http://localhost:8000).

## Features
- Live clock in the header and a scrolling ticker of the latest results on every page
- 8 departments, 14 sports (team size + venue), 30 days of sample matches
- Matches go Upcoming -> Live -> Full time automatically by the clock (progress bar, match timer, end time)
- Schedule with sport and status filters; standings with rank, played, won, drawn, lost, points (win 3, draw 1)
- Team registration: team name, captain, email, players; one team per department per sport; coordinator approval
- Sports page with registered-team and matches-played counts
- Live Match Center with per-match timeline and "Up next"
- Results: 7/30 day filter grouped by date, auto leaderboard podium, plus official final results, awards and prize pool
- Admin login (demo: admin / admin123) with tabs: Matches & live scores (+A/+B, -A/-B, Go live, Finish, Delete, timeline events), Add match (fixture / live / completed result), Announcements, Registrations (approve / reject / delete), Awards & final results, Contact & inquiry, Data reset

## How Admin connects to the other pages
All pages share `js/storage.js`, which keeps data in the browser's localStorage. Changes appear in other open tabs straight away.

Limit: localStorage is per browser and device, and the admin login is a demo (not secure).
Sharing updates with every visitor needs a backend/database (planned for a later phase).

## Deploy to GitHub Pages
Replace the files in your repo folder with these (keep the css/ and js/ folders), commit and push,
then hard-refresh the site (Ctrl+Shift+R).
