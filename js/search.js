/* A안 검색 — 전용 페이지(검색 홈 → 결과). 제목·장르로 검색. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const root = document.getElementById("app");
  let S;
  try { await App.load(); S = await (await fetch("data/sports.json?v=1")).json(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }

  const L = App.Logger, esc = App.esc, C = App.data.contents;
  const params = new URLSearchParams(location.search);
  const q = (params.get("q") || "").trim();
  let filter = params.get("f") || "all";
  const lg = Object.fromEntries(S.leagues.map((l) => [l.id, l]));
  const WD = "일월화수목금토";
  const BASE = new Date((S.meta.baseDate || "2026-11-09") + "T00:00:00");
  const dl = (day) => { const d = new Date(BASE); d.setDate(d.getDate() + day); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };

  /* 검색 가능한 장르: 데이터에 있는 것만(많은 순) */
  const gcount = {};
  C.forEach((c) => c.genres.forEach((g) => (gcount[g] = (gcount[g] || 0) + 1)));
  const GENRES = Object.keys(gcount).sort((a, b) => gcount[b] - gcount[a]).slice(0, 21);

  const card = (c, o) => {
    o = o || {};
    const tag = App.tagHTML(c);
    const cap = o.price && c.price ? `${c.price.toLocaleString("ko-KR")}원` : "";
    return `<a class="card ${o.kind || ""}" href="detail.html?id=${c.id}" data-id="${c.id}" data-section="${esc(o.section)}"><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${tag}<div class="ctitle">${esc(c.title)}</div>${cap ? `<div class="cap">${cap}</div>` : ""}</div>${o.rank ? `<span class="rank">${o.rank}</span>` : ""}</a>`;
  };

  /* 검색 */
  const match = (c) => c.title.includes(q) || c.genres.includes(q) || c.genres.some((g) => g.includes(q)) || c.type === q;
  function search() {
    const hits = C.filter(match);
    const tvmovie = hits.filter((c) => c.access === "subscription");
    const store = hits.filter((c) => c.access === "paid");
    const clips = S.videos.filter((v) => v.title.includes(q) || lg[v.league].name.includes(q))
      .map((v) => ({ title: v.title, tag: v.tag, dur: v.dur, meta: dl(v.day) + " · " + lg[v.league].name, img: `assets/sports/${v.img}.jpg` }));
    hits.slice(0, 4).forEach((c, i) => clips.push({ title: `${c.title} ${["하이라이트", "메인 예고편", "메이킹"][i % 3]}`, tag: ["하이라이트", "예고편", "메이킹"][i % 3], dur: `${1 + (i % 3)}:${String(10 + i * 13).padStart(2, "0")}`, meta: c.genres[0], img: c.image, id: c.id }));
    return { tvmovie, store, clips };
  }

  /* 상단 메뉴 오른쪽: 검색 아이콘 대신 검색창 */
  const icon = document.getElementById("open-search");
  if (icon) {
    const f = document.createElement("form");
    f.className = "hdr-search" + (q ? "" : " hide"); f.setAttribute("role", "search");
    f.innerHTML = `<input aria-label="검색어" value="${esc(q)}"><button aria-label="검색">🔍</button>`;
    icon.replaceWith(f);
    f.addEventListener("submit", (e) => { e.preventDefault(); submit(f.querySelector("input").value); });
  }
  function submit(v) {
    v = v.trim(); if (!v) return;
    L.log("search_submit", { value: v, section: "search" });
    location.href = "search.html?q=" + encodeURIComponent(v);
  }

  function landing() {
    const top = C.filter((c) => c.weeklyFree).concat(C.filter((c) => !c.weeklyFree).sort((a, b) => b.rating - a.rating)).slice(0, 12);
    root.innerHTML = `<section class="s-panel"><form class="s-box" id="sf" role="search"><input id="sq" placeholder="제목, 장르, 배우로 검색해보세요" autocomplete="off" autofocus><button aria-label="검색">🔍</button></form>
        <h2 class="s-gh">추천 장르</h2><div class="s-chips">${GENRES.map((g) => `<button data-g="${esc(g)}">${esc(g)}</button>`).join("")}</div></section>
      <section class="sec"><h2>지금 뜨는 콘텐츠 <span class="info" title="최근 시청 수 기준(교육용 가상 데이터)">ⓘ</span></h2><div class="s-grid rankgrid">${top.map((c, i) => card(c, { kind: "poster", rank: i + 1, section: "search_trend" })).join("")}</div></section>`;
    const inp = root.querySelector("#sq");
    root.querySelector("#sf").addEventListener("submit", (e) => { e.preventDefault(); submit(inp.value); });
    root.querySelector(".s-chips").addEventListener("click", (e) => { const b = e.target.closest("button"); if (b) { L.log("search_filter_apply", { value: "genre:" + b.dataset.g, section: "search_landing" }); submit(b.dataset.g); } });
    inp.focus();
  }

  function results() {
    const r = search();
    const none = !r.tvmovie.length && !r.store.length && !r.clips.length;
    const show = (k) => filter === "all" || filter === k;
    const FIL = [["all", "전체"], ["tv", "TV & 영화"], ["clip", "하이라이트"], ["store", "스토어"]];
    root.innerHTML = `<div class="s-res"><h1>"${esc(q)}" 검색 결과</h1>
      <div class="s-filter" role="tablist">${FIL.map(([k, t]) => `<button role="tab" data-f="${k}" class="${filter === k ? "on" : ""}">${t}</button>`).join("")}</div>
      ${none ? `<p class="soon big">"${esc(q)}"에 대한 검색 결과가 없어요. 다른 검색어를 입력해 보세요.</p>` : ""}
      ${show("tv") && r.tvmovie.length ? `<section><h2>TV & 영화</h2><div class="s-grid wide">${r.tvmovie.map((c) => card(c, { section: "search_tv" })).join("")}</div></section>` : ""}
      ${show("clip") && r.clips.length ? `<section><h2>하이라이트</h2><div class="s-grid clips">${r.clips.map((k) => `<button class="s-clip" data-clip="${esc(k.title)}"><div class="th">${k.img ? `<img src="${esc(k.img)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span class="sp-tag">${esc(k.tag)}</span><span class="dur">${esc(k.dur)}</span></div><b>${esc(k.title)}</b><small>${esc(k.meta)}</small></button>`).join("")}</div></section>` : ""}
      ${show("store") && r.store.length ? `<section><h2>스토어</h2><div class="s-grid wide">${r.store.map((c) => card(c, { section: "search_store", price: true })).join("")}</div></section>` : ""}</div>`;
    L.log("search_result", { value: q, section: "search", target_id: `${r.tvmovie.length}/${r.clips.length}/${r.store.length}` });
    root.querySelector(".s-filter").addEventListener("click", (e) => {
      const b = e.target.closest("button"); if (!b) return;
      filter = b.dataset.f; L.log("search_filter_apply", { value: "type:" + filter, section: "search_result" });
      history.replaceState(null, "", `search.html?q=${encodeURIComponent(q)}&f=${filter}`); results();
    });
    root.addEventListener("click", (e) => {
      const cd = e.target.closest(".card"); if (cd) { L.log("card_click", { target_id: cd.dataset.id, section: cd.dataset.section }); return; }
      const k = e.target.closest(".s-clip"); if (k) { L.log("card_click", { section: "search_clip", value: k.dataset.clip }); App.toast("교육용 테스트 페이지: 하이라이트 재생은 제공되지 않아요."); }
    });
  }

  L.log("search_open", { section: "search" });
  document.title = q ? `"${q}" 검색 · PLAYLAB A안` : "검색 · PLAYLAB A안";
  q ? results() : landing();
})();
