/* A안 상세/재생 — 다크 테마. 시리즈: 에피소드·리뷰·관련영상·추천 콘텐츠 / 영화: 리뷰·추천 콘텐츠.
   교육용 비영리 테스트 페이지 (리뷰·영상·인물은 모두 가상) */
(async function () {
  App.mountShell();
  const root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }

  const L = App.Logger, esc = App.esc;
  const params = new URLSearchParams(location.search);
  const c = App.byId[params.get("id")];
  if (!c) { root.innerHTML = '<div class="page"><p>작품을 찾을 수 없어요.</p><p><a class="btn" href="index.html">홈으로</a></p></div>'; return; }

  document.title = `${c.title} · PLAYLAB A안`;
  L.log("detail_view", { target_id: c.id });

  const isMovie = c.format === "movie";
  const hash = (s) => { let h = 7; for (const ch of s) h = (h * 33 + ch.charCodeAt(0)) >>> 0; return h; };
  const H = hash(c.id);

  /* 회차 */
  const n = isMovie ? 1 : c.episodes;
  const base = new Date(2026, 8, 12);
  const eps = Array.from({ length: n }, (_, i) => {
    const d = new Date(base.getTime() + i * 7 * 86400000);
    return { i, n: i + 1, label: isMovie ? "본편" : `${i + 1}회`, date: `${d.getMonth() + 1}월 ${d.getDate()}일`, runtime: c.runtime,
      locked: c.access === "paid" || !!c.partnerPass,   // 멤버십 포함 작품은 전 회차 재생 / 패스·개별구매는 구독·구매 필요
      desc: i === 0 ? c.synopsis.replace(" (가상 작품)", "") : `${i + 1}회: ${c.title}의 이야기가 이어집니다. (가상 줄거리)` };
  });
  const PASS = c.partnerPass && App.pass(c.partnerPass);
  const firstPlayable = () => eps.find((e) => !e.locked) || eps[0];

  /* 리뷰(가상): 작품 ID로 결정되는 고정 값 */
  const NAMES = ["별빛수집가", "밤하늘고래", "소소한일상", "주말영화관", "초록바람", "느린걸음", "달콤쌉싸름", "몰아보기장인", "새벽감성"];
  const TEXTS = ["끝까지 몰입해서 봤어요. 배우들 연기가 좋았어요.", "기대보다 담담한데 여운이 오래 남네요.", "초반은 느리지만 후반이 좋아요.", "가볍게 보기 좋은 작품이에요.", "연출과 음악이 특히 인상적이었어요.", "취향은 갈릴 것 같지만 저는 만족했어요.", "한 번 더 보고 싶어지는 장면이 많아요."];
  const reviews = Array.from({ length: 6 }, (_, i) => {
    const h = hash(c.id + i);
    return { name: NAMES[h % NAMES.length], star: 3 + (h % 3), text: TEXTS[(H + i * 3) % TEXTS.length], likes: (h >> 5) % 90, day: `2026년 ${10 - (i % 3)}월 ${((h >> 7) % 27) + 1}일`, hue: h % 360 };
  });
  const rcount = 80 + (H % 900);
  const stars = (v) => "★".repeat(Math.round(v)) + '<span class="off">' + "★".repeat(5 - Math.round(v)) + "</span>";

  /* 추천: 장르가 겹치는 작품 */
  const reco = App.data.contents.filter((x) => x.id !== c.id && x.genres.some((g) => c.genres.includes(g))).slice(0, 12);
  /* 관련영상(가상 클립) */
  const clips = [["메인 예고편", "예고편"], ["하이라이트", "하이라이트"], ["메이킹 필름", "메이킹"], ["출연진 인터뷰", "인터뷰"]].map(([t, tag], i) => ({ title: `${c.title} ${t}`, tag, dur: `${1 + ((H >> i) % 3)}:${String((H >> (i + 2)) % 60).padStart(2, "0")}`, pos: `${(i * 31 + H) % 100}% ${(i * 47) % 100}%` }));

  const p = c.partnerPass && App.pass(c.partnerPass);
  const tabs = isMovie ? [["review", "리뷰"], ["reco", "추천콘텐츠"], ["info", "상세정보"]] : [["eps", "에피소드"], ["review", "리뷰"], ["clips", "관련영상"], ["reco", "추천콘텐츠"], ["info", "상세정보"]];
  let tab = tabs[0][0], playing = -1, sort = "asc", filter = "", showSearch = false, timer = null;

  root.innerHTML = `<div class="detail">
    <section class="left">
      <a class="back" href="index.html">‹ 홈으로</a>
      <div class="pcard">
        <div class="player" id="player">
          <a class="pback" href="index.html" id="pback" aria-label="뒤로">←</a>
          ${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.title)} 대표 이미지">` : ""}
          <span class="state"></span>
          <button class="big" id="big-play" aria-label="재생">▶</button>
          <button class="btn primary next" id="next-ep">다음 회차 ▶</button>
          <div class="prog"><div class="track"><i></i></div><span class="time">00:00 / 00:10</span> <small>(모의 재생 · 실제 영상 없음)</small></div>
        </div>
        <div class="pinfo">
          <div class="pmain">
            <div class="tagline">${esc(c.genres.slice(0, 3).join(" · "))} · ${c.year}${p ? " · " + esc(p.name) : ""}</div>
            <h1>${esc(c.title)}</h1>
            <div class="dmeta"><span class="star">★ ${c.rating.toFixed(1)} <u>(${rcount})</u></span><span>· ${esc(c.type)}</span><span>· ${c.year}</span><span>· ${App.runtime(c.runtime)}</span><span class="age">${App.age(c.age)}</span><span class="age hd">HD</span></div>
          </div>
          <div class="pacts"><button class="round ${App.wish.has(c.id) ? "on" : ""}" id="wish" aria-label="찜"><span class="ic">${App.wish.has(c.id) ? "♥" : "♡"}</span><span class="lbl">찜</span></button><button class="round" id="share" aria-label="공유"><span class="ic">⇪</span><span class="lbl">공유</span></button>
            <button class="btn primary playbtn ${PASS || c.access === "paid" ? "buy" : ""}" id="play-btn">${c.access === "paid" ? "구매하고 재생하기" : PASS ? esc(PASS.name) + " 가입하기" : "재생하기"}</button></div>
        </div>
      </div>
      <section class="synopsis"><h2>시놉시스</h2><p>${esc(c.synopsis.replace(" (가상 작품)", ""))}</p>
        <dl><dt>장르</dt><dd>${esc(c.genres.join(", "))}</dd><dt>이용 형태</dt><dd>${c.access === "paid" ? "개별 구매 " + App.priceText(c) : PASS ? esc(PASS.name) + " 구독 필요" : "멤버십 포함"}</dd></dl></section>
    </section>
    <aside class="right">
      <div class="tabs" role="tablist">${tabs.map(([k, t], i) => `<button role="tab" data-tab="${k}" class="${i ? "" : "on"}">${t}</button>`).join("")}</div>
      <div id="tabbody"></div>
    </aside></div>`;

  const player = root.querySelector("#player"), stateEl = player.querySelector(".state");
  const track = player.querySelector(".track i"), timeEl = player.querySelector(".time");

  /* ── 탭 본문 ── */
  function epHTML(e) {
    const st = `object-position:${(e.i * 37) % 100}% ${(e.i * 53) % 100}%;transform:scale(${1.05 + (e.i % 4) * 0.12})`;
    const line = e.locked ? `<span class="wow buy">${c.access === "paid" ? "개별구매 " + App.priceText(c) : PASS ? esc(PASS.name) + " 가입 후 시청" : "시청 불가"} ›</span>` : `<p>${esc(e.desc)}</p>`;
    return `<li class="ep ${playing === e.i ? "playing" : ""}" data-i="${e.i}" tabindex="0"><div class="et">${c.image ? `<img src="${esc(c.image)}" alt="" style="${st}">` : ""}${e.locked ? '<div class="lock" aria-label="잠김">🔒</div>' : ""}</div>
      <div><b>${e.label}</b><small>${e.date} · ${App.runtime(e.runtime)}</small>${line}</div></li>`;
  }
  function render() {
    const body = root.querySelector("#tabbody");
    root.querySelectorAll(".tabs button").forEach((b) => b.classList.toggle("on", b.dataset.tab === tab));
    if (tab === "eps") {
      let list = eps.filter((e) => !filter || e.label.includes(filter) || String(e.n) === filter);
      if (sort === "desc") list = list.slice().reverse();
      body.innerHTML = `<div class="tools"><button class="sq" id="ep-search" aria-label="회차 검색">🔍</button>
        ${showSearch ? `<input id="ep-q" placeholder="회차 번호" value="${esc(filter)}" inputmode="numeric">` : `<select id="ep-sort" aria-label="정렬"><option value="asc" ${sort === "asc" ? "selected" : ""}>오래된 순</option><option value="desc" ${sort === "desc" ? "selected" : ""}>최신 순</option></select>`}</div>
        <ul class="eps">${list.map(epHTML).join("") || '<li class="soon">해당 회차가 없어요.</li>'}</ul>`;
      const q = body.querySelector("#ep-q");
      if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); q.oninput = () => { filter = q.value.trim(); render(); }; }
      const s = body.querySelector("#ep-sort");
      if (s) s.onchange = () => { sort = s.value; L.log("tab_click", { target_id: c.id, value: "sort_" + sort }); render(); };
      body.querySelector("#ep-search").onclick = () => { showSearch = !showSearch; filter = ""; render(); };
    } else if (tab === "review") {
      body.innerHTML = `<div class="rsum"><div class="l"><span class="big-stars">${stars(c.rating)}</span><small class="cnt">${rcount.toLocaleString("ko-KR")}개 평점</small></div><b>${c.rating.toFixed(1)}</b></div>
        ${App.SS.get("rnotice_closed") ? "" : '<div class="rnotice"><b>리뷰를 작성하려면 이 콘텐츠를 충분히 감상해주세요</b><p>고객님의 리뷰는 다른 사용자들에게 큰 도움이 됩니다.</p><button aria-label="닫기" data-rnclose>✕</button></div>'}
        <ul class="reviews">${reviews.map((r) => `<li><div class="rtop"><span class="rstar">${stars(r.star)} <small>· ${r.day}</small></span><button class="kebab" aria-label="더보기" data-kebab>⋮</button></div>
          <div class="rh"><span class="rav" style="background:hsl(${r.hue} 55% 45%)">${esc(r.name[0])}</span><b>${esc(r.name)}</b></div><p>${esc(r.text)}</p><div class="rlike"><button data-like>👍 ${r.likes}</button><button data-like>👎</button></div></li>`).join("")}</ul>`;
    } else if (tab === "info") {
      body.innerHTML = `<div class="info-tab"><h3>시놉시스</h3><p>${esc(c.synopsis.replace(" (가상 작품)", ""))}</p>
        <dl><dt>장르</dt><dd>${esc(c.genres.join(", "))}</dd><dt>공개</dt><dd>${c.year}년</dd><dt>러닝타임</dt><dd>${App.runtime(c.runtime)}${isMovie ? "" : " (회차당)"}</dd><dt>연령등급</dt><dd>${App.age(c.age)}</dd><dt>이용 형태</dt><dd>${c.access === "paid" ? "개별 구매 " + App.priceText(c) : PASS ? esc(PASS.name) + " 구독 필요" : "멤버십 포함"}</dd>${isMovie ? "" : `<dt>회차</dt><dd>총 ${c.episodes}부작</dd>`}</dl></div>`;
    } else if (tab === "clips") {
      body.innerHTML = `<ul class="clips">${clips.map((k, i) => `<li class="clip" data-clip="${i}" tabindex="0"><div class="et">${c.image ? `<img src="${esc(c.image)}" alt="" style="object-position:${k.pos}">` : ""}<span class="dur">${k.dur}</span></div><div><b>${esc(k.title)}</b><small>${esc(k.tag)}</small></div></li>`).join("")}</ul>`;
    } else {
      body.innerHTML = `<ul class="reco">${reco.map((x) => `<li><a href="detail.html?id=${x.id}" data-reco="${x.id}"><div class="et">${x.image ? `<img src="${esc(x.image)}" alt="" loading="lazy">` : ""}</div><div><b>${esc(x.title)}</b><small>★ ${x.rating.toFixed(1)} · ${esc(x.genres[0])} · ${App.runtime(x.runtime)}</small></div></a></li>`).join("") || '<li class="soon">추천할 콘텐츠가 없어요.</li>'}</ul>`;
    }
  }
  render();

  root.querySelector(".tabs").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    tab = b.dataset.tab; L.log("tab_click", { target_id: c.id, value: tab }); render();
  });
  root.querySelector("#tabbody").addEventListener("click", (ev) => {
    const li = ev.target.closest(".ep"); if (li) return play(eps[+li.dataset.i]);
    const cl = ev.target.closest(".clip"); if (cl) { L.log("card_click", { target_id: c.id, section: "clip", value: cl.dataset.clip }); App.toast("교육용 테스트 페이지: 관련영상 재생은 제공되지 않아요."); return; }
    const rc = ev.target.closest("[data-reco]"); if (rc) { L.log("card_click", { target_id: rc.dataset.reco, section: "detail_reco" }); return; }
    const lk = ev.target.closest("[data-like]"); if (lk) { lk.classList.toggle("on"); return; }
    if (ev.target.closest("[data-rnclose]")) { App.SS.set("rnotice_closed", "1"); render(); return; }
    if (ev.target.closest("[data-kebab]")) App.toast("교육용 테스트 페이지: 신고·삭제 기능은 제공되지 않아요.");
  });
  root.querySelector("#tabbody").addEventListener("keydown", (ev) => { if (ev.key === "Enter") { const li = ev.target.closest(".ep"); if (li) play(eps[+li.dataset.i]); } });

  /* ── 재생 ── */
  const fmt = (s) => "00:" + String(Math.floor(s)).padStart(2, "0");
  let playToken = 0;
  /* 같은 장르의 추천 콘텐츠: 장르 겹침 수 → 평점 순, 개별구매는 뒤로 */
  const recoForPlayer = () => App.data.contents
    .filter((x) => x.id !== c.id && x.image && x.genres.some((g) => c.genres.includes(g)))
    .map((x) => ({ x, k: x.genres.filter((g) => c.genres.includes(g)).length * 10 + x.rating - (x.access === "paid" ? 6 : 0) }))
    .sort((a, b) => b.k - a.k || a.x.id.localeCompare(b.x.id)).slice(0, 8).map((o) => o.x);
  function showRec() {
    if (player.querySelector(".rec-ov")) return;
    const list = recoForPlayer(); if (!list.length) return;
    const ov = document.createElement("div");
    ov.className = "rec-ov";
    ov.innerHTML = `<div class="rec-head"><b>추천 콘텐츠</b><button type="button" class="rec-tg" aria-label="추천 콘텐츠 접기" aria-expanded="true">⌄</button></div>
      <div class="rec-row">${list.map((x) => `<a class="rec-card" href="detail.html?id=${x.id}" data-id="${x.id}"><div class="th">${App.tagHTML(x)}<img src="${esc(x.image)}" alt=""></div><b>${esc(x.title)}</b><small>${esc(x.synopsis.replace(" (가상 작품)", ""))}</small></a>`).join("")}</div>`;
    player.appendChild(ov);
    L.log("reco_view", { target_id: c.id, value: c.genres[0], section: "player_end" });
    ov.querySelector(".rec-tg").addEventListener("click", (e) => { const col = ov.classList.toggle("col"); e.currentTarget.setAttribute("aria-expanded", !col); });
    ov.addEventListener("click", (e) => { const a = e.target.closest(".rec-card"); if (a) L.log("card_click", { target_id: a.dataset.id, section: "player_reco" }); });
  }
  const hideRec = () => { const r = player.querySelector(".rec-ov"); if (r) r.remove(); };

  async function play(e, opts) {
    opts = opts || {};
    L.log("episode_click", { target_id: c.id, value: e.n, section: opts.auto ? "auto_next" : "" });
    if (e.locked) {
      L.log("locked_click", { target_id: c.id, value: e.n });
      App.openGate(c, { epLabel: (eps.find((x) => x.locked) || e).label }); return;
    }
    const token = ++playToken;                       // 다른 회차를 누르면 이전 재생·광고는 취소
    clearInterval(timer); if (player._adCancel) player._adCancel();
    hideRec(); playing = e.i;
    const isLast = e.i === eps.length - 1;            // 단편(영화) 또는 시리즈의 마지막 회차
    player.classList.remove("done", "playing"); player.classList.add("adding");
    stateEl.textContent = "";
    if (tab === "eps") render();
    /* ① 광고: 재생 전(프리롤). 시리즈는 한 편이 끝나면 다음 화로 넘어가기 전에 같은 방식으로 광고가 나옴.
       (재생 중간·마지막 영상 끝의 광고는 없음) */
    await App.playAd(player, "preroll", c);
    if (token !== playToken) return;
    player.classList.remove("adding"); player.classList.add("playing");
    stateEl.textContent = `${e.label} ${opts.auto ? "자동 재생 중" : "재생 중"} (모의)`;
    L.log("play_start", { target_id: c.id, value: e.n, section: opts.auto ? "auto_next" : "" });
    /* ② 모의 재생 10초 — 마지막 영상은 종료 3초 전(7초)에 추천 콘텐츠 */
    let elapsed = 0, busy = false;
    timer = setInterval(async () => {
      if (busy) return;
      elapsed = Math.min(10, elapsed + 0.1);
      track.style.width = elapsed * 10 + "%"; timeEl.textContent = fmt(elapsed) + " / 00:10";
      if (isLast && elapsed >= 7) showRec();
      if (elapsed >= 10) {
        clearInterval(timer);
        L.log("play_complete", { target_id: c.id, value: e.n });
        const nx = eps[e.i + 1];
        if (nx) {                                       // ③-a 시리즈 중간 회차: 다음 화로 자동 재생(재생 전 광고 후)
          stateEl.textContent = `${nx.label} 자동 재생`;
          busy = true; await new Promise((r) => setTimeout(r, 900));
          if (token !== playToken) return;
          if (!nx.locked) { play(nx, { auto: true }); return; }
          player.classList.remove("playing"); player.classList.add("done");
          stateEl.textContent = `${e.label} 시청 완료`;
          L.log("locked_click", { target_id: c.id, value: nx.n, section: "auto_next" });
          App.openGate(c, { epLabel: nx.label }); return;
        }
        busy = true;                                    // ③-b 마지막 영상: 광고 없이 완료, 추천 콘텐츠 유지
        player.classList.remove("playing"); player.classList.add("done");
        stateEl.textContent = `${e.label} 시청 완료`;
        root.querySelector("#next-ep").style.display = "none";   // 다음 회차 없음
        showRec();
      }
    }, 100);
  }
  const go = () => play(firstPlayable());
  root.querySelector("#pback").addEventListener("click", (e) => { if (history.length > 1 && document.referrer.startsWith(location.origin)) { e.preventDefault(); history.back(); } });
  root.querySelector("#big-play").onclick = go;
  root.querySelector("#play-btn").onclick = go;

  const wish = root.querySelector("#wish");
  wish.onclick = () => {
    const added = App.wish.toggle(c.id);
    wish.classList.toggle("on", added); wish.querySelector(".ic").textContent = added ? "♥" : "♡";
    if (added) L.log("wishlist_add", { target_id: c.id, section: "detail" });
    App.toast(added ? "찜 목록에 추가했어요." : "찜 목록에서 뺐어요.");
  };
  root.querySelector("#share").onclick = () => { L.log("share_click", { target_id: c.id }); App.toast("교육용 테스트 페이지에서는 공유 기능을 제공하지 않아요."); };

  if (params.get("play") === "1") go();
})();
