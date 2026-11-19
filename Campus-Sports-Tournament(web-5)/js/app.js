/* app.js - page logic. Each page sets <body data-page="..."> and the matching object below runs. */
(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const opts = (arr, sel) => arr.map(a => `<option${a === sel ? " selected" : ""}>${esc(a)}</option>`).join("");
  const pad = n => String(n).padStart(2, "0");
  const num = v => { const n = parseInt(v, 10); return isNaN(n) || n < 0 ? 0 : n; };
  const D = CSD.DEPTS;
  const icon = n => (CSD.SPORT[n] || { icon: "🏅" }).icon;
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function toast(msg, bad) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.className = "show" + (bad ? " bad" : "");
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.className = ""; }, 3200);
  }

  /* ---------- shared renderers ---------- */
  const badge = d => `<i class="bd" style="background:hsl(${D.indexOf(d) * 47} 65% 42%)">${esc(d.replace(/[^A-Za-z]/g, "").slice(0, 3))}</i>`;
  const statusBadge = s => s === "live" ? '<span class="badge live">● Live</span>' : s === "done" ? '<span class="badge completed">Full time</span>' : '<span class="badge upcoming">Upcoming</span>';

  function matchCard(m) {
    const live = m.status === "live", up = m.status === "upcoming", s = CSD.start(m), e = CSD.end(m);
    return `<div class="mc ${m.status}"><div class="mt"><span>${icon(m.sport)} ${esc(m.sport)}</span>${statusBadge(m.status)}</div>
      <div class="vs"><span>${badge(m.a)}${esc(m.a)}</span><strong>${up ? "vs" : num(m.sa) + " : " + num(m.sb)}</strong><span>${badge(m.b)}${esc(m.b)}</span></div>
      ${live ? `<i class="pg"><b data-s="${s}" data-e="${e}"></b></i>
        <small><i class="ldot"></i><b>LIVE</b>, ${esc(m.venue)}<br>🕒 Now <b data-now></b>, match time <b data-el="${s}"></b><br>Started ${esc(m.time)}, ends about ${CSD.hm(new Date(e))}</small>`
      : `<small>${CSD.fmtDate(m.date)}, ${esc(m.time)}, ${esc(m.venue)}</small>`}</div>`;
  }
  const cards = list => `<div class="grid cards">${list.map(matchCard).join("")}</div>`;

  function standingsTable() {
    return `<div class="tablewrap"><table><thead><tr><th>Rank</th><th>Department</th><th>Played</th><th>Won</th><th>Drawn</th><th>Lost</th><th>Points</th></tr></thead><tbody>${
      CSD.standings().map((s, i) => `<tr><td>${i + 1}</td><td>${esc(s.dept)}</td><td>${s.played}</td><td>${s.won}</td><td>${s.drawn}</td><td>${s.lost}</td><td><b>${s.points}</b></td></tr>`).join("")}</tbody></table></div>`;
  }
  function podium() {
    const r = CSD.standings();
    return `<div class="pod">${[1, 0, 2].map(i => `<div class="p${i + 1}"><span>${["🥇", "🥈", "🥉"][i]}</span><b>${esc(r[i].dept)}</b><small>${r[i].points} pts, ${r[i].won} wins</small></div>`).join("")}</div>`;
  }

  function ticker() {
    const box = $("#ticker"); if (!box) return;
    // content is repeated twice so the loop is seamless (the CSS moves it by exactly half)
    const items = CSD.done().slice(0, 8).map(m => `<span>${icon(m.sport)} ${esc(m.a)} ${m.sa}-${m.sb} ${esc(m.b)}</span>`).join("");
    const sig = items;
    if (box.dataset.sig === sig) return;          // unchanged: don't restart the animation
    box.dataset.sig = sig;
    box.innerHTML = items ? `<div class="tkl">Latest</div><div class="tkt"><div class="tkr">${items}${items}</div></div>` : "";
  }
  function tick() {
    const n = new Date(), z = v => pad(v), nw = n.toLocaleTimeString("en-IN");
    const full = n.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) + ", " + nw;
    $$("[data-now]").forEach(e => { e.textContent = nw; });
    $$("[data-clock]").forEach(e => { e.textContent = full; });
    $$("[data-el]").forEach(e => { const q = Math.max(0, Math.floor((Date.now() - e.dataset.el) / 1000)); e.textContent = z(Math.floor(q / 60)) + ":" + z(q % 60); });
    $$("[data-s]").forEach(b => { b.style.width = Math.min(100, Math.max(0, (Date.now() - b.dataset.s) / (b.dataset.e - b.dataset.s) * 100)) + "%"; });
  }

  /* ---------- HOME ---------- */
  const home = {
    render() {
      const M = CSD.matches(), live = M.filter(m => m.status === "live"), dn = CSD.done();
      $("#mTeams").textContent = pad(D.length);
      $("#mSports").textContent = pad(CSD.SPORTS.length);
      $("#mRegs").textContent = pad(CSD.get("registrations").length);
      $("#mPlayed").textContent = pad(dn.length);
      $("#strip").textContent = CSD.SPORT_LIST.map(s => s.icon).join(" ");
      const p = CSD.get("podium");
      $("#champion").innerHTML = p.first ? `🏆 Champion: <strong>${esc(p.first)}</strong>` : "";
      $("#liveCard").innerHTML = live.length ? cards(live) : '<p class="empty">No match is live right now. Check the <a href="schedule.html">schedule</a> for what is next.</p>';
      const ann = CSD.get("announcements");
      $("#announcementList").innerHTML = ann.length
        ? ann.map(a => `<article class="note"><p>${esc(a.text)}</p>${a.time ? `<time>${esc(a.time)}</time>` : ""}</article>`).join("")
        : '<p class="empty">No announcements yet.</p>';
      $("#deptList").innerHTML = D.map(d => `<li><span>${badge(d)}</span><span style="flex:1;margin-left:10px">${esc(d)}</span></li>`).join("");
      $("#latestResults").innerHTML = dn.length ? cards(dn.slice(0, 3)) : '<p class="empty">No match results yet.</p>';
    }
  };

  /* ---------- SCHEDULE ---------- */
  const schedule = {
    init() {
      $("#fs").innerHTML = '<option value="">All sports</option>' + opts(CSD.SPORTS);
      $("#fs").onchange = $("#ft").onchange = () => schedule.render();
    },
    render() {
      const s = $("#fs").value, t = $("#ft").value;
      const r = CSD.matches().filter(m => (!s || m.sport === s) && (!t || m.status === t)).sort((a, b) => b.date.localeCompare(a.date) || CSD.start(b) - CSD.start(a));
      $("#fixtureBody").innerHTML = r.length ? r.map(m =>
        `<tr><td class="nw">${CSD.fmtDate(m.date)}</td><td class="nw">${esc(m.time)}</td><td class="nw">${icon(m.sport)} ${esc(m.sport)}</td><td class="nw">${esc(m.a)} v ${esc(m.b)}</td><td class="nw">${esc(m.venue)}</td><td class="nw">${m.status === "upcoming" ? "-" : m.sa + " : " + m.sb}</td><td>${statusBadge(m.status)}</td></tr>`).join("")
        : '<tr><td colspan="7" class="empty">No matches found.</td></tr>';
      $("#standingsBox").innerHTML = standingsTable();
    }
  };

  /* ---------- REGISTER ---------- */
  const register = {
    init() {
      $("#dept").innerHTML = opts(D);
      $("#sport").innerHTML = opts(CSD.SPORTS);
      $("#regForm").addEventListener("submit", e => {
        e.preventDefault();
        const v = id => $("#" + id).value.trim();
        const o = { dept: v("dept"), sport: v("sport"), team: v("team"), captain: v("captain"), email: v("email"), players: num(v("players")) };
        const msg = $("#regMsg");
        const fail = t => { msg.textContent = t; msg.className = "form-msg bad"; };
        if (!o.team || !o.captain) return fail("Please fill in the team name and the captain's full name.");
        if (!EMAIL.test(o.email)) return fail("Please enter a valid email address.");
        if (o.players < 1 || o.players > 20) return fail("Number of players must be between 1 and 20.");
        const list = CSD.get("registrations");
        if (list.some(r => r.dept === o.dept && r.sport === o.sport && r.status !== "Rejected")) return fail(o.dept + " already has a " + o.sport + " team registered.");
        list.push(Object.assign({ id: CSD.nextId(list), status: "Pending review", time: CSD.now() }, o));
        CSD.set("registrations", list);
        $("#regForm").reset(); register.render();
        msg.textContent = o.team + " registered for " + o.sport + ". The coordinators will review it in the Admin Control Panel."; msg.className = "form-msg ok";
      });
    },
    render() {
      const r = CSD.get("registrations");
      $("#regBody").innerHTML = r.length ? r.map(x =>
        `<tr><td class="nw">${esc(x.dept)}</td><td class="nw">${esc(x.sport)}</td><td class="nw">${esc(x.team || "-")}</td><td class="nw">${esc(x.captain)}</td><td>${esc(x.players || "-")}</td><td><span class="badge ${x.status === "Approved" ? "completed" : x.status === "Rejected" ? "rejected" : "upcoming"}">${esc(x.status)}</span></td></tr>`).join("")
        : '<tr><td colspan="6" class="empty">No teams registered yet. Be the first!</td></tr>';
    }
  };

  /* ---------- SPORTS ---------- */
  const sports = {
    render() {
      const regs = CSD.get("registrations"), M = CSD.matches();
      $("#sportGrid").innerHTML = CSD.SPORT_LIST.map((s, i) => `<div class="sc" style="--h:${i * 26}"><em>${pad(i + 1)}</em><div class="ic">${s.icon}</div><h3>${esc(s.name)}</h3>
        <small>${s.size} player${s.size > 1 ? "s" : ""} per team, ${esc(s.venue)}<br>${regs.filter(r => r.sport === s.name).length} teams registered, ${M.filter(m => m.sport === s.name && m.status === "done").length} matches played</small></div>`).join("");
    }
  };

  /* ---------- LIVE ---------- */
  const live = {
    render() {
      const M = CSD.matches(), lv = M.filter(m => m.status === "live");
      const up = M.filter(m => m.status === "upcoming" && m.date >= CSD.ymd(new Date())).sort((a, b) => CSD.start(a) - CSD.start(b)).slice(0, 4);
      $("#liveGrid").innerHTML = lv.length ? cards(lv) : '<p class="empty">No match is live right now.</p>';
      $("#timelines").innerHTML = lv.length ? lv.map(m => `<div class="panel"><h3>${icon(m.sport)} ${esc(m.a)} v ${esc(m.b)}</h3><ul class="timeline">${
        (m.tl && m.tl.length) ? m.tl.slice().reverse().map(e => `<li><b>${esc(e.min)}</b><span>${esc(e.text)}</span></li>`).join("") : '<li class="empty">No events yet.</li>'}</ul></div>`).join("")
        : '<p class="empty">Timelines appear here while a match is live.</p>';
      $("#upNext").innerHTML = up.length ? cards(up) : '<p class="empty">No upcoming matches scheduled.</p>';
    }
  };

  /* ---------- RESULTS ---------- */
  const results = {
    init() { $("#rd").onchange = () => results.render(); },
    render() {
      const aw = CSD.get("awards"), pod = CSD.get("podium");
      $("#awardGrid").innerHTML = CSD.AWARDS.map(a =>
        `<div class="card"><h3>${esc(a)}</h3><p>${aw[a] ? "Winner: <strong>" + esc(aw[a]) + "</strong>" : "Winner: To be announced"}</p></div>`).join("");
      $("#prizeBody").innerHTML = [["🥇 First Place", "Champion trophy + prize", pod.first], ["🥈 Second Place", "Runner-up trophy + prize", pod.second], ["🥉 Third Place", "Third-place award", pod.third]]
        .map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2] ? "<strong>" + esc(r[2]) + "</strong>" : "—"}</td></tr>`).join("");
      const any = pod.first || pod.second || pod.third;
      $("#finalResults").innerHTML = any
        ? `<ol class="podium">${pod.first ? `<li>🥇 ${esc(pod.first)}</li>` : ""}${pod.second ? `<li>🥈 ${esc(pod.second)}</li>` : ""}${pod.third ? `<li>🥉 ${esc(pod.third)}</li>` : ""}</ol>`
        : '<p class="empty">No official results published yet.</p>';
      const cut = CSD.ymd(CSD.offDay(-$("#rd").value)), g = {};
      CSD.done().filter(m => m.date >= cut).forEach(m => (g[m.date] = g[m.date] || []).push(m));
      $("#matchResults").innerHTML = Object.keys(g).map(d => `<h3 style="margin-top:1.2rem">${CSD.fmtDate(d)}</h3>${cards(g[d])}`).join("") || '<p class="empty">No results in this period.</p>';
      $("#leaderboard").innerHTML = podium() + standingsTable();
    }
  };

  /* ---------- ADMIN ---------- */
  const TABS = [["matches", "Matches & live scores"], ["add", "Add match"], ["ann", "Announcements"], ["regs", "Registrations"], ["awards", "Awards & final results"], ["contact", "Contact & inquiry"], ["data", "Data"]];
  const admin = {
    tab() { return sessionStorage.csd_tab || "matches"; },
    render() {
      const root = $("#adminRoot");
      if (!sessionStorage.csd_admin) {
        root.innerHTML = `<h2>🔐 Admin Login</h2><p class="sub">Phase 1 prototype login (not secure). Demo login: <b>admin</b> / <b>admin123</b></p>
          <form class="f panel login" id="loginForm"><label>Username<input name="u" autocomplete="username" required></label><label>Password<input name="p" type="password" autocomplete="current-password" required></label><button class="btn dark" type="submit">Log in</button></form>`;
        return;
      }
      const M = CSD.matches(), t = admin.tab();
      root.innerHTML = `<h2>⚙️ Admin Control Panel</h2>
        <p class="sub">Everything saved here appears on the other pages in this browser. Open Home or Live Match Center in a second tab to watch changes arrive.</p>
        <div class="mini"><div><b>${M.length}</b>Matches stored</div><div><b>${M.filter(m => m.status === "live").length}</b>Live now</div><div><b>${CSD.get("registrations").length}</b>Teams registered</div></div>
        <div class="tabs">${TABS.map(x => `<button type="button" class="${t === x[0] ? "on" : ""}" data-t="${x[0]}">${x[1]}</button>`).join("")}<button type="button" data-a="out">Log out</button></div>
        <div id="tabBody">${admin["t_" + t]()}</div>`;
    },
    t_matches() {
      const M = CSD.matches(), lv = M.filter(m => m.status === "live");
      const rows = M.slice().sort((a, b) => b.date.localeCompare(a.date) || CSD.start(b) - CSD.start(a)).slice(0, 40).map(m => {
        const act = m.status === "live"
          ? `<button type="button" class="btn small" data-a="pa" data-i="${esc(m.id)}">+A</button><button type="button" class="btn small" data-a="pb" data-i="${esc(m.id)}">+B</button><button type="button" class="btn small danger" data-a="ma" data-i="${esc(m.id)}">-A</button><button type="button" class="btn small danger" data-a="mb" data-i="${esc(m.id)}">-B</button><button type="button" class="btn small dark" data-a="end" data-i="${esc(m.id)}">Finish</button>`
          : m.status === "upcoming" ? `<button type="button" class="btn small" data-a="go" data-i="${esc(m.id)}">Go live</button>` : "";
        return `<tr><td class="nw">${CSD.fmtDate(m.date)}<br><small>${esc(m.time)}</small></td><td class="nw">${icon(m.sport)} ${esc(m.sport)}: ${esc(m.a)} v ${esc(m.b)}</td><td>${m.sa}:${m.sb}</td><td>${statusBadge(m.status)}</td><td class="actions">${act}<button type="button" class="btn small danger" data-a="del" data-i="${esc(m.id)}">Delete</button></td></tr>`;
      }).join("");
      return `<div class="panel"><h3>🔴 Add timeline event</h3>${lv.length ? `<form class="f" id="evForm">
          <label>Live match<select id="evMatch">${lv.map(m => `<option value="${esc(m.id)}">${esc(m.sport)}: ${esc(m.a)} v ${esc(m.b)}</option>`).join("")}</select></label>
          <div class="row2"><label>Minute (optional)<input type="text" id="evMin" placeholder="e.g. 45" maxlength="5"></label><label>Event<input type="text" id="evText" placeholder="e.g. Yellow card, CSE" maxlength="80"></label></div>
          <button class="btn small dark" type="submit">Add event</button></form>` : '<p class="empty">No match is live. Use "Go live" below, or add a live match.</p>'}</div>
        <p class="sub">Matches go live and finish automatically at their scheduled time. +A / +B add a goal or point and log it in the timeline; -A / -B correct a mistake.</p>
        <div class="tablewrap scroll"><table><thead><tr><th>Date</th><th>Match</th><th>Score</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    },
    t_add() {
      return `<form class="f panel" id="af"><h3>📅 Add match / fixture / result</h3>
        <label>Sport<select name="sport">${opts(CSD.SPORTS)}</select></label>
        <div class="row2"><label>Team A<select name="a">${opts(D, D[0])}</select></label><label>Team B<select name="b">${opts(D, D[1])}</select></label></div>
        <div class="row2"><label>Date<input type="date" name="date" required value="${CSD.ymd(new Date())}"></label><label>Time<input type="time" name="time" required value="10:00"></label></div>
        <label>Status<select name="status"><option value="upcoming">Upcoming (fixture)</option><option value="live">Live now</option><option value="done">Completed (record a result)</option></select></label>
        <div class="row2"><label>Team A score<input type="number" name="sa" min="0" value="0"></label><label>Team B score<input type="number" name="sb" min="0" value="0"></label></div>
        <p class="note-small">Scores are used for Live and Completed matches. A Live match uses the current time as its start.</p>
        <button class="btn dark" type="submit">Add match</button></form>`;
    },
    t_ann() {
      const ann = CSD.get("announcements");
      return `<div class="panel"><h3>📢 Publish Announcement</h3><form class="f" id="annForm"><label>Announcement<textarea id="annText" rows="3" maxlength="300" placeholder="Write a tournament announcement..."></textarea></label>
        <button class="btn dark" type="submit">Publish to Home page</button></form>
        <ul class="clean" style="margin-top:12px">${ann.length ? ann.map(a => `<li><span>${esc(a.text)}</span><button type="button" class="btn small danger" data-a="dann" data-i="${a.id}">Delete</button></li>`).join("") : '<li class="empty">No announcements posted.</li>'}</ul></div>`;
    },
    t_regs() {
      const r = CSD.get("registrations");
      return `<div class="panel"><h3>📋 Registration Review</h3><div class="tablewrap scroll"><table><thead><tr><th>Department</th><th>Sport</th><th>Team</th><th>Captain</th><th>Players</th><th>Status</th><th></th></tr></thead><tbody>${
        r.length ? r.map(x => `<tr><td class="nw">${esc(x.dept)}</td><td class="nw">${esc(x.sport)}</td><td class="nw">${esc(x.team || "-")}</td><td class="nw">${esc(x.captain)}<br><small>${esc(x.email || "")}</small></td><td>${esc(x.players || "-")}</td><td>${esc(x.status)}</td>
          <td class="actions"><button type="button" class="btn small" data-a="reg" data-i="${x.id}" data-st="Approved">Approve</button><button type="button" class="btn small danger" data-a="reg" data-i="${x.id}" data-st="Rejected">Reject</button><button type="button" class="btn small dark" data-a="dr" data-i="${x.id}">Delete</button></td></tr>`).join("")
        : '<tr><td colspan="7" class="empty">No registrations yet.</td></tr>'}</tbody></table></div></div>`;
    },
    t_awards() {
      const aw = CSD.get("awards"), p = CSD.get("podium");
      const sel = v => '<option value="">— not decided —</option>' + opts(D, v);
      return `<form class="f panel" id="awardForm"><h3>🏅 Awards &amp; Final Results</h3>
        ${CSD.AWARDS.map((a, i) => `<label>${esc(a)}<input type="text" id="aw${i}" maxlength="60" placeholder="Player / team name" value="${esc(aw[a] || "")}"></label>`).join("")}
        <div class="row2"><label>First place<select id="pdFirst">${sel(p.first)}</select></label><label>Second place<select id="pdSecond">${sel(p.second)}</select></label></div>
        <label>Third place<select id="pdThird">${sel(p.third)}</select></label>
        <button class="btn dark" type="submit">Publish to Results page</button></form>`;
    },
    t_contact() {
      const inq = CSD.get("inquiries");
      return `<div class="panel"><h3>☎️ Contact &amp; Inquiry</h3>
        <p><strong>Student Sports Coordinator:</strong> Arjun · <a href="mailto:arjun.sports@college.edu">arjun.sports@college.edu</a><br>
        <strong>Sports Faculty:</strong> Ravi · <a href="mailto:ravi.faculty@college.edu">ravi.faculty@college.edu</a></p>
        <form class="f" id="inqForm"><div class="row2"><label>Your name<input type="text" id="inqName" maxlength="60"></label><label>Email<input type="email" id="inqEmail" maxlength="80"></label></div>
        <label>Message<textarea id="inqMsg" rows="3" maxlength="300"></textarea></label><button class="btn dark" type="submit">Submit inquiry</button></form>
        <ul class="clean" style="margin-top:12px">${inq.length ? inq.map(q => `<li><span><b>${esc(q.name)}</b> (${esc(q.email)}): ${esc(q.message)}</span></li>`).join("") : '<li class="empty">No inquiries yet.</li>'}</ul></div>`;
    },
    t_data() {
      return `<div class="panel"><h3>Demo data</h3><p class="sub">Match data (last 30 days of sample matches) is stored in this browser. Resetting clears everything saved here and restores the sample data.</p><button class="btn danger" type="button" data-a="reset">Reset demo data</button></div>`;
    },
    init() {
      const root = $("#adminRoot");
      const redraw = () => admin.render();
      root.addEventListener("click", e => {
        const b = e.target.closest("button"); if (!b) return;
        if (b.dataset.t) { sessionStorage.csd_tab = b.dataset.t; return redraw(); }
        const a = b.dataset.a; if (!a) return;
        if (a === "out") { sessionStorage.removeItem("csd_admin"); return redraw(); }
        if (a === "reset") { if (confirm("Reset all demo data (matches, announcements, registrations, awards)?")) { CSD.reset(); location.reload(); } return; }
        if (a === "dann") { CSD.set("announcements", CSD.get("announcements").filter(x => String(x.id) !== b.dataset.i)); return redraw(); }
        if (a === "dr") { CSD.set("registrations", CSD.get("registrations").filter(x => String(x.id) !== b.dataset.i)); return redraw(); }
        if (a === "reg") { const l = CSD.get("registrations"), r = l.find(x => String(x.id) === b.dataset.i); if (r) { r.status = b.dataset.st; CSD.set("registrations", l); } return redraw(); }
        const list = CSD.matches(), m = list.find(x => x.id === b.dataset.i); if (!m) return;
        const min = () => Math.max(0, Math.floor((Date.now() - CSD.start(m)) / 60000)) + "'";
        m.tl = m.tl || [];
        if (a === "pa") { m.sa++; m.tl.push({ min: min(), text: m.a + " scored (" + m.sa + "-" + m.sb + ")" }); }
        if (a === "pb") { m.sb++; m.tl.push({ min: min(), text: m.b + " scored (" + m.sa + "-" + m.sb + ")" }); }
        if (a === "ma" && m.sa > 0) m.sa--;
        if (a === "mb" && m.sb > 0) m.sb--;
        if (a === "end") { m.status = "done"; m.tl.push({ min: "FT", text: "Full time: " + m.a + " " + m.sa + " - " + m.sb + " " + m.b }); toast("Match finished. Standings and Results are updated."); }
        if (a === "go") { m.status = "live"; m.ts = Date.now(); m.date = CSD.ymd(new Date()); m.time = CSD.hm(new Date()); m.tl.push({ min: "0'", text: "Match started" }); toast("Match is live."); }
        if (a === "del") { if (!confirm("Delete this match?")) return; list.splice(list.indexOf(m), 1); }
        CSD.saveMatches(list); redraw();
      });
      root.addEventListener("submit", e => {
        e.preventDefault();
        const id = e.target.id, v = x => ($("#" + x) ? $("#" + x).value.trim() : "");
        if (id === "loginForm") {
          const o = Object.fromEntries(new FormData(e.target));
          if (o.u === "admin" && o.p === "admin123") { sessionStorage.csd_admin = 1; return redraw(); }
          return toast("Wrong username or password.", true);
        }
        if (id === "af") {
          const o = Object.fromEntries(new FormData(e.target));
          if (o.a === o.b) return toast("Choose two different departments.", true);
          CSD.addMatch({ sport: o.sport, a: o.a, b: o.b, date: o.date, time: o.time, status: o.status, sa: num(o.sa), sb: num(o.sb) });
          sessionStorage.csd_tab = "matches"; redraw(); return toast("Match added. It now appears on the Schedule page.");
        }
        if (id === "annForm") {
          const text = v("annText"); if (!text) return toast("Write an announcement first.", true);
          const l = CSD.get("announcements"); l.unshift({ id: CSD.nextId(l), text, time: CSD.now() }); CSD.set("announcements", l);
          redraw(); return toast("Published. It now appears on the Home page.");
        }
        if (id === "evForm") {
          const text = v("evText"); if (!text) return toast("Describe the event.", true);
          const l = CSD.matches(), m = l.find(x => x.id === $("#evMatch").value); if (!m) return;
          const mn = v("evMin"); m.tl = m.tl || [];
          m.tl.push({ min: (mn ? mn.replace(/'$/, "") : Math.max(0, Math.floor((Date.now() - CSD.start(m)) / 60000))) + "'", text });
          CSD.saveMatches(l); redraw(); return toast("Event added to the match timeline.");
        }
        if (id === "awardForm") {
          const aw = {}; CSD.AWARDS.forEach((n, i) => { const x = v("aw" + i); if (x) aw[n] = x; });
          const pods = [v("pdFirst"), v("pdSecond"), v("pdThird")].filter(Boolean);
          if (new Set(pods).size !== pods.length) return toast("Each position needs a different department.", true);
          CSD.set("awards", aw); CSD.set("podium", { first: v("pdFirst"), second: v("pdSecond"), third: v("pdThird") });
          return toast("Awards and final results published on the Results page.");
        }
        if (id === "inqForm") {
          const name = v("inqName"), email = v("inqEmail"), message = v("inqMsg");
          if (!name || !message || !EMAIL.test(email)) return toast("Enter your name, a valid email and a message.", true);
          const l = CSD.get("inquiries"); l.unshift({ id: CSD.nextId(l), name, email, message, time: CSD.now() }); CSD.set("inquiries", l);
          redraw(); return toast("Inquiry saved.");
        }
      });
    }
  };

  /* ---------- boot ---------- */
  const pages = { home, schedule, register, sports, live, results, admin };
  document.addEventListener("DOMContentLoaded", () => {
    const pg = pages[document.body.dataset.page]; if (!pg) return;
    CSD.sync();
    if (pg.init) pg.init();
    const paint = () => { pg.render(); ticker(); tick(); };
    paint();
    setInterval(tick, 1000);
    // every 15s: move matches upcoming -> live -> done by the clock, then refresh
    setInterval(() => {
      if (!CSD.sync()) return;
      const f = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
      if (document.body.dataset.page === "admin" && f) return;
      paint();
    }, 15000);
    // another tab (e.g. Admin) changed data: refresh straight away
    window.addEventListener("storage", e => {
      if (e.key && e.key.indexOf("csd_v2_") !== 0) return;
      const f = document.activeElement && /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
      if (document.body.dataset.page === "admin" && f) return;
      paint();
    });
  });
})();
