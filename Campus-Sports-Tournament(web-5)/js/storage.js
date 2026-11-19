/* storage.js - shared data layer. Every page reads/writes the same localStorage keys,
   so what the Admin Control Panel saves shows up on the other pages.
   One unified "matches" list drives fixtures, live scores, results and standings. */
const CSD = (function () {
  const P = "csd_v2_";
  const DEPTS = ["CSE", "ISE", "AI & ML", "ECE", "EEE", "Mechanical", "Civil", "Management"];
  // name, icon, players per team, venue, typical match length (minutes)
  const SPORT_LIST = [
    { name: "Cricket", icon: "🏏", size: 11, venue: "Main Ground", dur: 180 },
    { name: "Basketball", icon: "🏀", size: 5, venue: "Court A", dur: 60 },
    { name: "Volleyball", icon: "🏐", size: 6, venue: "Court B", dur: 60 },
    { name: "Throwball", icon: "🥎", size: 7, venue: "Court C", dur: 50 },
    { name: "Football", icon: "⚽", size: 11, venue: "Main Ground", dur: 90 },
    { name: "Badminton", icon: "🏸", size: 2, venue: "Indoor Hall", dur: 45 },
    { name: "Table Tennis", icon: "🏓", size: 2, venue: "Indoor Hall", dur: 40 },
    { name: "Kabaddi", icon: "🤼", size: 7, venue: "Mud Court", dur: 50 },
    { name: "Kho-Kho", icon: "🏃", size: 9, venue: "Mud Court", dur: 45 },
    { name: "Athletics", icon: "🥇", size: 1, venue: "Track", dur: 60 },
    { name: "Chess", icon: "♟️", size: 1, venue: "Library Hall", dur: 90 },
    { name: "Tennis", icon: "🎾", size: 2, venue: "Tennis Court", dur: 90 },
    { name: "Hockey", icon: "🏑", size: 11, venue: "Turf", dur: 70 },
    { name: "Carrom", icon: "⚪", size: 2, venue: "Indoor Hall", dur: 45 }
  ];
  const SPORTS = SPORT_LIST.map(s => s.name);
  const SPORT = {}; SPORT_LIST.forEach(s => { SPORT[s.name] = s; });
  const AWARDS = ["Best Player", "Top Scorer", "Best Defender", "Best Team Player", "Rising Star", "Fair Play Award"];

  const pad = n => String(n).padStart(2, "0");
  const ymd = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const fmtDate = s => new Date(s + "T00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const t12 = t => { if (!/^\d\d:\d\d$/.test(t)) return t; const p = t.split(":"); return pad(p[0] % 12 || 12) + ":" + p[1] + " " + (p[0] >= 12 ? "PM" : "AM"); };
  const hm = d => t12(pad(d.getHours()) + ":" + pad(d.getMinutes()));
  const now = () => new Date().toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  const offDay = n => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); };

  /* ---------- match timing ---------- */
  function start(m) {
    if (m.ts) return m.ts;
    const x = /(\d+):(\d+) (AM|PM)/.exec(m.time || "") || [0, 9, 0, "AM"];
    const mins = ((+x[1] % 12) + (x[3] === "PM" ? 12 : 0)) * 60 + (+x[2]);
    return new Date(m.date + "T00:00").getTime() + mins * 60000;
  }
  const end = m => start(m) + ((SPORT[m.sport] || {}).dur || 60) * 60000;

  /* ---------- storage ---------- */
  function defaults() {
    return {
      announcements: [
        { id: 3, text: "Sportsmanship: All participants are expected to follow tournament rules and respect fellow teams.", time: "" },
        { id: 2, text: "Schedule: Match times are on the Schedule page. Matches go live and finish automatically at their scheduled time.", time: "" },
        { id: 1, text: "Registration: All eight departments are invited to participate. Team captains can submit their details on the registration page.", time: "" }
      ],
      registrations: [],
      matches: null,           // seeded on first read
      awards: {},
      podium: { first: "", second: "", third: "" },
      inquiries: []
    };
  }

  // 30 days of deterministic sample matches around today
  function seed() {
    const out = []; let x = 11;
    const r = () => (x = (x * 9301 + 49297) % 233280) / 233280;
    const T = ["09:00 AM", "10:30 AM", "12:00 PM", "02:00 PM", "03:30 PM", "05:00 PM"];
    const mid = ["Basketball", "Kabaddi", "Kho-Kho", "Throwball"];
    for (let d = -30; d <= 7; d++) {
      const n = d === 0 ? 2 : 1 + Math.floor(r() * 2);
      for (let i = 0; i < n; i++) {
        const sp = SPORT_LIST[Math.floor(r() * SPORT_LIST.length)];
        const a = Math.floor(r() * DEPTS.length), b = (a + 1 + Math.floor(r() * (DEPTS.length - 1))) % DEPTS.length;
        const f = () => sp.name === "Cricket" ? 90 + Math.floor(r() * 90) : mid.includes(sp.name) ? 12 + Math.floor(r() * 30) : Math.floor(r() * 5);
        let sa = f(), sb = f(); if (sa === sb) sa++;
        const st = d < 0 ? "done" : (d > 0 || i) ? "upcoming" : "live";
        let tm = T[Math.floor(r() * T.length)], ts;
        if (d === 0) {
          if (st === "live") { ts = Date.now() - 30 * 60000; tm = hm(new Date(ts)); }
          else tm = hm(new Date(Date.now() + 90 * 60000));
        }
        const m = { id: "s" + out.length, sport: sp.name, a: DEPTS[a], b: DEPTS[b], sa: st === "upcoming" ? 0 : sa, sb: st === "upcoming" ? 0 : sb,
                    date: ymd(offDay(d)), time: tm, venue: sp.venue, status: st, tl: [] };
        if (ts) m.ts = ts;
        if (st === "live") m.tl = [{ min: "0'", text: "Match started" }, { min: "18'", text: DEPTS[a] + " scored (sample)" }];
        out.push(m);
      }
    }
    return out;
  }

  function get(key) {
    try { const raw = localStorage.getItem(P + key); if (raw !== null) return JSON.parse(raw); } catch (e) { /* fall through */ }
    if (key === "matches") { const m = seed(); set("matches", m); return m; }
    return defaults()[key];
  }
  function set(key, value) {
    try { localStorage.setItem(P + key, JSON.stringify(value)); return true; } catch (e) { return false; }
  }
  function reset() { Object.keys(defaults()).forEach(k => { try { localStorage.removeItem(P + k); } catch (e) {} }); }
  function nextId(list) { return list.reduce((m, x) => Math.max(m, +x.id || 0), 0) + 1; }

  /* ---------- matches ---------- */
  const matches = () => get("matches");
  const saveMatches = list => set("matches", list);
  const done = () => matches().filter(m => m.status === "done").sort((a, b) => b.date.localeCompare(a.date) || end(b) - end(a));

  // Moves matches upcoming -> live -> done by the clock. Returns true when something changed.
  function sync() {
    const list = matches(), t = Date.now(); let changed = false;
    list.forEach(m => {
      if (m.status === "done") return;
      const n = t >= end(m) ? "done" : t >= start(m) ? "live" : "upcoming";
      if (n !== m.status) {
        if (n === "live" && !m.ts) m.ts = start(m);
        if (n === "done") { m.tl = m.tl || []; m.tl.push({ min: "FT", text: "Full time: " + m.a + " " + m.sa + " - " + m.sb + " " + m.b }); }
        m.status = n; changed = true;
      }
    });
    if (changed) saveMatches(list);
    return changed;
  }

  function addMatch(o) {
    const list = matches(), live = o.status === "live", fin = o.status === "done";
    const m = { id: "m" + Date.now() + Math.floor(Math.random() * 1000), sport: o.sport, a: o.a, b: o.b,
                sa: live || fin ? o.sa || 0 : 0, sb: live || fin ? o.sb || 0 : 0,
                date: live ? ymd(new Date()) : o.date, time: live ? hm(new Date()) : t12(o.time),
                venue: (SPORT[o.sport] || {}).venue || "", status: o.status, tl: [] };
    if (live) { m.ts = Date.now(); m.tl = [{ min: "0'", text: "Match started" }]; }
    if (fin) m.tl = [{ min: "FT", text: "Full time: " + m.a + " " + m.sa + " - " + m.sb + " " + m.b }];
    list.push(m); saveMatches(list); return m;
  }

  /* ---------- standings: win 3, draw 1, loss 0 ---------- */
  function standings() {
    const t = {};
    DEPTS.forEach(d => { t[d] = { dept: d, played: 0, won: 0, drawn: 0, lost: 0, points: 0 }; });
    matches().filter(m => m.status === "done").forEach(m => {
      if (!t[m.a] || !t[m.b]) return;
      t[m.a].played++; t[m.b].played++;
      if (m.sa > m.sb) { t[m.a].won++; t[m.b].lost++; t[m.a].points += 3; }
      else if (m.sb > m.sa) { t[m.b].won++; t[m.a].lost++; t[m.b].points += 3; }
      else { t[m.a].drawn++; t[m.b].drawn++; t[m.a].points++; t[m.b].points++; }
    });
    return Object.values(t).sort((a, b) => b.points - a.points || b.won - a.won || a.lost - b.lost || DEPTS.indexOf(a.dept) - DEPTS.indexOf(b.dept));
  }

  return { DEPTS, SPORTS, SPORT, SPORT_LIST, AWARDS, pad, ymd, fmtDate, t12, hm, now, offDay,
           get, set, reset, nextId, start, end, matches, saveMatches, done, sync, addMatch, standings };
})();
if (typeof module !== "undefined") module.exports = CSD;
