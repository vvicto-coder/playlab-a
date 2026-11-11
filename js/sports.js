/* A안 스포츠 탭 — 가상 리그·팀·경기. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc;
  const root = document.getElementById("app");
  let S;
  try { S = await (await fetch("data/sports.json?v=1")).json(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  if (!App.SS.get("home_t0")) App.SS.set("home_t0", String(Date.now()));
  L.log("page_view", { section: "sports" });

  /* ───── 헬퍼 ───── */
  const lg = Object.fromEntries(S.leagues.map((l) => [l.id, l]));
  const team = {}; Object.values(S.teams).flat().forEach((t) => (team[t.id] = t));
  const M = Object.fromEntries(S.matches.map((m) => [m.id, m]));
  const V = Object.fromEntries(S.videos.map((v) => [v.id, v]));
  const WD = "일월화수목금토";
  const BASE = new Date((S.meta.baseDate || "2026-11-09") + "T00:00:00");   // 기준일 고정(참가자 간 동일 화면)
  const dl = (day) => { const d = new Date(BASE); d.setDate(d.getDate() + day); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
  const img = (k) => `<img src="assets/sports/${esc(k)}.jpg" alt="" loading="lazy" onerror="this.remove()">`;
  const llogo = (l, cls) => `<span class="llogo ${cls || ""}" style="--c:${l.color}">${esc(l.short)}</span>`;
  const tlogo = (t) => `<span class="tlogo" style="--c:${t.color}">${esc(t.short)}</span>`;
  const wishKey = "wish_sports_A";
  const wishes = () => App.LS.get(wishKey, []);
  const $ = (s) => document.querySelector(s);

  const st = { cat: "전체", league: null, status: "upcoming", score: false, tip: true, promo: 0, feat: null, played: null };
  const leaguesInCat = () => S.leagues.filter((l) => st.cat === "전체" || l.cat === st.cat);

  const featOfMatch = (m) => ({ id: m.id, kind: "match", title: m.title, meta: `${lg[m.league].name} · ${dl(m.day)}${m.round && !lg[m.league].solo ? " · " + m.round + " 라운드" : ""}`,
    tags: m.status === "live" ? ["패스", "LIVE"] : ["패스", m.status === "finished" ? "다시보기" : "예정"], img: m.img, league: m.league });
  const featOfVideo = (v) => ({ id: v.id, kind: "video", title: v.title, meta: `${lg[v.league].name} · ${dl(v.day)}`, tags: ["패스", v.tag], img: v.img, league: v.league });
  st.feat = featOfMatch(S.matches.find((m) => m.status === "live") || S.matches[0]);

  /* 가로 스트립 화살표 */
  function bindStrips(scope) {
    scope.querySelectorAll(".strip-wrap").forEach((w) => {
      if (w._b) return; w._b = 1;
      const s = w.querySelector(".strip");
      w.querySelector(".arrow.l").onclick = () => s.scrollBy({ left: -s.clientWidth * 0.85, behavior: "smooth" });
      w.querySelector(".arrow:not(.l)").onclick = () => s.scrollBy({ left: s.clientWidth * 0.85, behavior: "smooth" });
    });
  }
  const strip = (cls, html) => `<div class="strip-wrap"><button class="arrow l" aria-label="이전">‹</button><div class="strip ${cls}">${html}</div><button class="arrow" aria-label="다음">›</button></div>`;
  const tag = (t) => (t === "패스" ? '<span class="sp-tag pass">패스</span>' : t === "LIVE" ? '<span class="sp-tag live">● LIVE</span>' : `<span class="sp-tag">${esc(t)}</span>`);

  /* ───── 1. 대표 영상 + 실시간 라이브 ───── */
  function renderFeat() {
    const f = st.feat, lives = S.matches.filter((m) => m.status === "live");
    $("#sec-feat").innerHTML = `<div class="sp-feat">
      <div class="sp-feat-l"><div class="sp-tags">${f.tags.map(tag).join("")}</div>
        <h1>${esc(f.title)}</h1><p class="sp-meta">${esc(f.meta)}</p>
        <div class="sp-livehead"><h2>실시간 라이브 경기</h2></div>
        ${strip("sp-live", lives.map((m) => `<button class="sp-livecard" data-m="${m.id}"><div class="th">${img(m.img)}<span class="sp-tag pass">패스</span><span class="sp-tag live">● LIVE</span></div><b>${esc(m.title)}</b><small>${esc(lg[m.league].name)}</small></button>`).join("") || '<p class="soon">지금 진행 중인 라이브가 없어요.</p>')}
      </div>
      <div class="sp-feat-r" id="sp-player">${img(f.img)}<span class="sp-veil"></span>
        <button class="mute" aria-label="음소거">🔇</button>
        <button class="big" id="sp-play" aria-label="재생">▶</button>
        <div class="prog"><div class="track"><i></i></div><span class="time">00:00 / 00:10</span> <small>(모의 재생 · 실제 영상 없음)</small></div>
        <span class="state"></span></div></div>`;
    bindStrips($("#sec-feat"));
  }
  let timer;
  function playFeat(item, auto) {
    if (item) { st.feat = item; renderFeat(); }
    const p = $("#sp-player"); if (!p) return;
    if (auto) $("#sec-feat").scrollIntoView({ behavior: "smooth", block: "start" });
    clearInterval(timer);
    p.classList.remove("done"); p.classList.add("playing");
    p.querySelector(".state").textContent = st.feat.tags.includes("LIVE") ? "LIVE 재생 중 (모의)" : "재생 중 (모의)";
    L.log("play_start", { target_id: st.feat.id, section: "sports" });
    const t0 = Date.now(), tr = p.querySelector(".track i"), tm = p.querySelector(".time");
    timer = setInterval(() => {
      const s = Math.min(10, (Date.now() - t0) / 1000);
      tr.style.width = s * 10 + "%"; tm.textContent = "00:" + String(Math.floor(s)).padStart(2, "0") + " / 00:10";
      if (s >= 10) { clearInterval(timer); p.classList.remove("playing"); p.classList.add("done"); p.querySelector(".state").textContent = "시청 완료"; L.log("play_complete", { target_id: st.feat.id, section: "sports" }); }
    }, 100);
  }

  /* ───── 2. 스포츠 리그 ───── */
  function renderLeagues() {
    $("#sec-leagues").innerHTML = `<h2>스포츠 리그 ›</h2>
      <div class="sp-tabs" role="tablist">${S.cats.map((c) => `<button role="tab" class="${c === st.cat ? "on" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("")}</div>
      ${strip("sp-lg", `<button class="sp-lgi my" data-my="1"><span class="llogo add">＋</span><small>마이 리그</small></button>` +
        leaguesInCat().map((l) => `<button class="sp-lgi ${st.league === l.id ? "on" : ""}" data-l="${l.id}">${llogo(l)}<small>${esc(l.name)}</small></button>`).join(""))}`;
    bindStrips($("#sec-leagues"));
  }

  /* ───── 3. 경기 배너 캐러셀 ───── */
  function renderPromo() {
    const items = S.promo.map((id) => M[id]); const m = items[st.promo % items.length], l = lg[m.league];
    const wished = wishes().includes(m.id);
    $("#sec-promo").innerHTML = `<div class="sp-promo" style="--c:${l.color}">${img(m.img)}<span class="sp-pshade"></span>
      <div class="copy"><div class="sp-tags">${tag("패스")}${tag(m.status === "live" ? "LIVE" : "예정")}</div>
        <h2>${esc(m.title)}</h2><p>${dl(m.day)} ${esc(m.time)}</p>
        <button class="btn primary" id="promo-wish">${wished ? "찜 완료 ✓" : "경기 찜하기"}</button></div>
      <div class="ctl"><button id="pp" aria-label="이전">‹</button><span>${(st.promo % items.length) + 1} / ${items.length}</span><button id="pn" aria-label="다음">›</button></div></div>`;
    $("#promo-wish").onclick = () => toggleWish(m.id, "promo");
    $("#pp").onclick = () => { st.promo = (st.promo - 1 + items.length) % items.length; renderPromo(); L.log("hero_slide_change", { target_id: M[S.promo[st.promo]].id, section: "sports", value: "user" }); };
    $("#pn").onclick = () => { st.promo = (st.promo + 1) % items.length; renderPromo(); L.log("hero_slide_change", { target_id: M[S.promo[st.promo]].id, section: "sports", value: "user" }); };
  }
  function toggleWish(id, section) {
    const w = wishes(), i = w.indexOf(id);
    if (i >= 0) w.splice(i, 1); else { w.push(id); L.log("wishlist_add", { target_id: id, section: "sports_" + section }); }
    App.LS.set(wishKey, w);
    App.toast(i >= 0 ? "경기 찜을 해제했어요." : "경기를 찜했어요. (교육용: 실제 알림은 없어요)");
    renderPromo(); renderSched();
  }
  let ptimer;
  const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  let pPaused = false;
  if (!reduce) ptimer = setInterval(() => { if (!pPaused && !document.hidden) { st.promo++; renderPromo(); } }, 6000);

  /* ───── 4. 경기 일정 ───── */
  function matchCard(m) {
    const l = lg[m.league], wished = wishes().includes(m.id);
    const badge = m.status === "live" ? '<span class="sp-tag live">● LIVE</span>' : m.status === "upcoming" ? '<span class="sp-tag">예정</span>' : '<span class="sp-tag dark">종료</span>';
    let mid;
    if (l.solo) mid = `<div class="solo">${llogo(l, "lg")}<b>${esc(m.title)}</b></div>`;
    else {
      const h = team[m.home], a = team[m.away];
      const center = m.status === "finished"
        ? (st.score ? `<b class="score">${m.hs} : ${m.as}</b><small>종료 · ${dl(m.day)}</small>` : `<b class="time">VS</b><small>종료 · ${dl(m.day)}</small>`)
        : `<b class="time">${esc(m.time)}</b><small>${dl(m.day)}</small>`;
      mid = `<div class="teams"><div class="tm">${tlogo(h)}<span>${esc(h.name)}</span></div><div class="ct">${center}<small>${esc(l.name)}</small></div><div class="tm">${tlogo(a)}<span>${esc(a.name)}</span></div></div>`;
    }
    const act = m.status === "upcoming" ? `<button class="act" data-wish="${m.id}" aria-label="경기 찜">${wished ? "✓" : "＋"}</button>` : `<button class="act play" data-play="${m.id}" aria-label="${m.status === "live" ? "라이브 보기" : "다시보기"}">▶</button>`;
    return `<div class="sp-match ${m.status}" data-m="${m.id}"><span class="sp-tag pass">패스</span>${badge}${mid}${act}</div>`;
  }
  function renderSched() {
    const order = { live: 0, upcoming: 1, finished: 2 };
    let list = S.matches.filter((m) => (st.cat === "전체" || lg[m.league].cat === st.cat) && (!st.league || m.league === st.league));
    if (st.status === "upcoming") list = list.filter((m) => m.status !== "finished");
    else if (st.status === "finished") list = list.filter((m) => m.status === "finished");
    list.sort((a, b) => order[a.status] - order[b.status] || (a.status === "finished" ? b.day - a.day : a.day - b.day));
    $("#sec-sched").innerHTML = `<div class="sp-schedhead"><h2>경기 일정 ›</h2>
        <div class="sp-score"><button class="scorebtn ${st.score ? "on" : ""}" id="scorebtn" aria-pressed="${st.score}">점수 ${st.score ? "ON" : "OFF"}</button>
        ${st.tip ? '<div class="sp-tip" role="status">종료된 경기의 점수를 켜고 끌 수 있습니다 <button id="tipx" aria-label="닫기">✕</button></div>' : ""}</div></div>
      <div class="sp-filters"><select id="sstatus" aria-label="경기 상태"><option value="upcoming" ${st.status === "upcoming" ? "selected" : ""}>예정</option><option value="finished" ${st.status === "finished" ? "selected" : ""}>종료</option><option value="all" ${st.status === "all" ? "selected" : ""}>전체</option></select>
        <div class="sp-tabs sm">${[["", "전체"]].concat(leaguesInCat().map((l) => [l.id, l.name])).map(([id, n]) => `<button class="${(st.league || "") === id ? "on" : ""}" data-sl="${id}">${esc(n)}</button>`).join("")}</div></div>
      ${list.length ? strip("sp-sched", list.map(matchCard).join("")) : '<p class="soon">조건에 맞는 경기가 없어요.</p>'}`;
    bindStrips($("#sec-sched"));
    $("#scorebtn").onclick = () => { st.score = !st.score; L.log("score_toggle", { section: "sports", value: st.score ? "on" : "off" }); renderSched(); };
    const x = $("#tipx"); if (x) x.onclick = () => { st.tip = false; renderSched(); };
    $("#sstatus").onchange = (e) => { st.status = e.target.value; L.log("tab_click", { section: "sports", value: "status_" + st.status }); renderSched(); };
  }

  /* ───── 5. 인기 영상 TOP 10 ───── */
  function renderTop() {
    $("#sec-top").innerHTML = `<div class="inner"><h2>인기 영상 Top 10</h2>${strip("sp-topstrip", S.top10.map((id, i) => {
      const v = V[id], l = lg[v.league];
      return `<button class="sp-vid" data-v="${v.id}"><span class="rank">${i + 1}</span><div class="th">${img(v.img)}<span class="sp-tag pass">패스</span><span class="sp-tag">${esc(v.tag)}</span>${v.fourK ? '<span class="k4">4K</span>' : ""}<span class="dur">${esc(v.dur)}</span></div>
        <div class="vm">${llogo(l, "sm")}<span><b>${esc(v.title)}</b><small>2026년 ${dl(v.day)} · ${esc(l.name)}</small></span></div></button>`;
    }).join(""))}</div>`;
    bindStrips($("#sec-top"));
  }

  /* ───── 6. 리그 스포트라이트 ───── */
  function renderSpot() {
    const l = st.league ? lg[st.league] : leaguesInCat()[0] || S.leagues[0];
    const vs = S.videos.filter((v) => v.league === l.id), main = vs[0], side = vs.slice(1, 4);
    const ms = S.matches.filter((m) => m.league === l.id);
    $("#sec-spot").innerHTML = `<div class="sp-spot"><div class="sp-spot-l">${llogo(l, "xl")}<h3>${esc(main.title.replace(/ (풀영상|주요장면)$/, ""))}</h3></div>
      <button class="sp-main" data-v="${main.id}"><div class="th">${img(main.img)}<span class="sp-tag pass">패스</span><span class="sp-tag">${esc(main.tag)}</span><span class="dur">${esc(main.dur)}</span></div><div class="scap"><b>${esc(main.title)}</b><small>2026년 ${dl(main.day)}</small></div></button>
      <div class="sp-side">${side.map((v) => `<button class="sp-sv" data-v="${v.id}"><div class="th">${img(v.img)}<span class="sp-tag pass">패스</span><span class="sp-tag">${esc(v.tag)}</span></div><span><b>${esc(v.title)}</b><small>${dl(v.day)} · ${esc(l.name)}</small></span></button>`).join("")}</div></div>
      <h2 class="sp-lgh">${llogo(l, "sm")} ${esc(l.name)} 주요 경기</h2>
      ${strip("wide sp-lgrow", (ms.length ? ms : []).map((m) => `<button class="sp-vid wide" data-m="${m.id}" data-open="1"><div class="th">${img(m.img)}<span class="sp-tag pass">패스</span></div><div class="vm"><span><b>${esc(m.title)}</b><small>${dl(m.day)} · ${esc(m.status === "live" ? "LIVE" : m.status === "upcoming" ? "예정" : "종료")}</small></span></div></button>`).join(""))}`;
    bindStrips($("#sec-spot"));
  }

  /* ───── 이벤트 ───── */
  document.addEventListener("click", (e) => {
    const c = e.target.closest("[data-cat]");
    if (c) { st.cat = c.dataset.cat; st.league = null; L.log("sports_tab_click", { section: "sports", value: st.cat }); renderLeagues(); renderSched(); renderSpot(); return; }
    if (e.target.closest("[data-my]")) { App.toast("교육용 테스트 페이지: 마이 리그 설정은 제공되지 않아요."); return; }
    const lgi = e.target.closest("[data-l]");
    if (lgi) { L.log("league_click", { target_id: lgi.dataset.l, section: "sports" }); location.href = "league.html?id=" + encodeURIComponent(lgi.dataset.l); return; }   // 리그 아이콘 → 리그 페이지
    const sl = e.target.closest("[data-sl]");
    if (sl) { st.league = sl.dataset.sl || null; L.log("league_click", { target_id: sl.dataset.sl || "all", section: "sports_schedule" }); renderLeagues(); renderSched(); renderSpot(); return; }
    const w = e.target.closest("[data-wish]");
    if (w) { toggleWish(w.dataset.wish, "schedule"); return; }
    const pl = e.target.closest("[data-play]");
    if (pl) { L.log("match_click", { target_id: pl.dataset.play, section: "sports_schedule", value: "play" }); playFeat(featOfMatch(M[pl.dataset.play]), true); return; }
    const lc = e.target.closest(".sp-livecard");
    if (lc) { L.log("match_click", { target_id: lc.dataset.m, section: "sports_live" }); playFeat(featOfMatch(M[lc.dataset.m]), true); return; }
    const v = e.target.closest("[data-v]");
    if (v) { L.log("card_click", { target_id: v.dataset.v, section: "sports_video" }); playFeat(featOfVideo(V[v.dataset.v]), true); return; }
    const mo = e.target.closest("[data-open]");
    if (mo) { L.log("match_click", { target_id: mo.dataset.m, section: "sports_league" }); playFeat(featOfMatch(M[mo.dataset.m]), true); return; }
    const mc = e.target.closest(".sp-match");
    if (mc) { L.log("match_click", { target_id: mc.dataset.m, section: "sports_schedule" }); App.toast(M[mc.dataset.m].status === "upcoming" ? "아직 시작 전인 경기예요. ＋ 로 찜할 수 있어요." : "▶ 버튼으로 시청할 수 있어요."); return; }
    if (e.target.closest("#sp-play")) { playFeat(null, false); return; }
    const mu = e.target.closest(".sp-feat-r .mute"); if (mu) { mu.textContent = mu.textContent === "🔇" ? "🔊" : "🔇"; return; }
    if (e.target.closest("#passbar")) { e.preventDefault(); L.log("banner_click", { target_id: "sports_pass" }); App.toast("교육용 페이지입니다. 실제 가입은 진행되지 않아요."); return; }
  });
  $("#sec-promo").addEventListener("mouseenter", () => (pPaused = true));
  $("#sec-promo").addEventListener("mouseleave", () => (pPaused = false));

  const seen = new Set();
  window.addEventListener("scroll", () => {
    const d = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
    [25, 50, 75, 100].forEach((t) => { if (d >= t - 1 && !seen.has(t)) { seen.add(t); L.log("scroll_depth", { section: "sports", value: t }); } });
  }, { passive: true });

  renderFeat(); renderLeagues(); renderPromo(); renderSched(); renderTop(); renderSpot();
})();
