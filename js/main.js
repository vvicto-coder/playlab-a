/* A안 홈 + 카테고리 탭(드라마·예능/영화/스토어/키즈) — 모든 사용자에게 동일한 편성(개인화 없음).
   페이지는 <body data-page>로 구분하고 편성은 home_A(contents.json) 또는 pages.json 에서 읽는다. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const root = document.getElementById("app");
  try { await App.load(); }
  catch (e) {
    root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버(예: <code>python3 -m http.server</code>)로 열어 주세요.</p>';
    return;
  }
  const PAGE = document.body.dataset.page || "home";
  let H = App.data.home_A;
  if (PAGE !== "home") {
    try { H = (await (await fetch("data/pages.json?v=20261111")).json())[PAGE]; }
    catch (e) { root.innerHTML = '<p class="page">편성 데이터를 불러오지 못했어요.</p>'; return; }
  }
  if (!App.SS.get("home_t0")) App.SS.set("home_t0", String(Date.now()));
  App.Logger.log("page_view", { section: PAGE });

  const L = App.Logger, esc = App.esc;
  const discount = (c) => Math.round((c.price * 0.8) / 100) * 100;
  const playable = (c) => App.canPlay(c);   // 멤버십 포함 작품(패스·개별구매 제외)만 바로 재생

  /* ───── 카드 ───── */
  function card(c, o) {
    o = o || {};
    const tag = App.tagHTML(c);   // 개별구매(주황) / 패스(패스별 색) / ▶ 시리즈·영화
    let cap = c.badge && !["쿠플 시리즈", "쿠플 영화", "개별구매"].includes(c.badge) ? esc(c.badge) : "";
    if ((H.showPrice || o.deal) && c.price) cap = o.deal ? `<s>${c.price.toLocaleString("ko-KR")}원</s> <b>${discount(c).toLocaleString("ko-KR")}원</b> · 20%` : `${c.price.toLocaleString("ko-KR")}원`;
    const img = c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : "";
    return `<a class="card ${o.kind || ""} ${o.pass ? "pass-card" : ""}" href="detail.html?id=${c.id}" data-id="${c.id}" data-section="${esc(o.section)}">
      <div class="thumb" style="--h:${App.hue(c.id)}">${img}${tag}<div class="ctitle">${esc(c.title)}</div>${cap ? `<div class="cap">${cap}</div>` : ""}${o.pass ? '<span class="pill">프리뷰 이벤트</span>' : ""}</div>
      ${o.rank ? `<span class="rank">${o.rank}</span>` : ""}${o.below || ""}</a>`;
  }
  const strip = (cls, html) => `<div class="strip-wrap"><button class="arrow l" aria-label="이전">‹</button><div class="strip ${cls}">${html}</div><button class="arrow" aria-label="다음">›</button></div>`;

  /* ───── 히어로 ───── */
  function hero() {
    const items = H.hero.items.map((id) => App.byId[id]);
    return `<section class="hero" aria-roledescription="carousel" aria-label="추천 콘텐츠">
      ${items.map((c, i) => `<div class="slide ${i ? "" : "on"}" data-id="${c.id}" style="background-image:url('${esc(c.image)}')"></div>`).join("")}
      <button class="mutebtn" id="hero-mute" aria-label="음소거 해제">🔇</button>
      <div class="copy"><div class="meta"></div><h1></h1>
        <div class="btns"><button class="btn primary ${H.hero.ctaMode === "buy" ? "buy" : ""}" id="hero-cta">${esc(H.hero.cta)}</button>${H.hero.cta2 ? `<button class="btn white" id="hero-cta2">${esc(H.hero.cta2)}</button>` : ""}<a class="btn ghost" id="hero-info" href="#">ⓘ 상세정보</a></div></div>
      <div class="ctl"><button id="h-prev" aria-label="이전">‹</button>${items.map((_, i) => `<button class="dot ${i ? "" : "on"}" data-i="${i}" aria-label="${i + 1}번 슬라이드"></button>`).join("")}<button id="h-next" aria-label="다음">›</button></div></section>`;
  }
  function bindHero() {
    const items = H.hero.items.map((id) => App.byId[id]);
    const slides = [...root.querySelectorAll(".hero .slide")], dots = [...root.querySelectorAll(".hero .dot")];
    const meta = root.querySelector(".hero .meta"), h1 = root.querySelector(".hero h1");
    let cur = 0, timer;
    function go(i, byUser, init) {
      cur = (i + items.length) % items.length;
      slides.forEach((s, k) => s.classList.toggle("on", k === cur));
      dots.forEach((d, k) => d.classList.toggle("on", k === cur));
      const c = items[cur];
      meta.textContent = `★ ${c.rating.toFixed(1)} · ${App.runtime(c.runtime)}`;
      h1.textContent = c.title;
      if (!init) L.log("hero_slide_change", { target_id: c.id, value: byUser ? "user" : "auto" });
    }
    const reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    let paused = false;
    const arm = () => {
      clearInterval(timer);
      if (reduce) return;                       // 모션 줄이기 설정이면 자동 전환 끔
      timer = setInterval(() => { if (!paused && !document.hidden) go(cur + 1); }, H.hero.autoplayMs || 5000);
    };
    const heroEl = root.querySelector(".hero");
    ["mouseenter", "focusin"].forEach((ev) => heroEl.addEventListener(ev, () => (paused = true)));
    ["mouseleave", "focusout"].forEach((ev) => heroEl.addEventListener(ev, () => (paused = false)));
    go(0, false, true); arm();
    root.querySelector("#h-prev").onclick = () => { go(cur - 1, true); arm(); };
    root.querySelector("#h-next").onclick = () => { go(cur + 1, true); arm(); };
    dots.forEach((d) => (d.onclick = () => { go(+d.dataset.i, true); arm(); }));
    root.querySelector("#hero-mute").onclick = (e) => { const b = e.currentTarget; const on = b.textContent === "🔇"; b.textContent = on ? "🔊" : "🔇"; b.setAttribute("aria-label", on ? "음소거" : "음소거 해제"); L.log("mute_toggle", { section: "hero", value: on ? "on" : "off" }); };
    root.querySelector("#hero-cta").onclick = () => {
      const c = items[cur]; L.log("hero_cta_click", { target_id: c.id, section: "hero" });
      if (H.hero.ctaMode === "play" && playable(c)) location.href = `detail.html?id=${c.id}&play=1`;   // 재생 가능하면 바로 재생
      else App.openGate(c);                                                                              // 아니면 멤버십/구매 안내
    };
    const c2 = root.querySelector("#hero-cta2");
    if (c2) c2.onclick = () => { L.log("banner_click", { target_id: "hero_event", section: PAGE }); App.toast("교육용 페이지: 이벤트 응모는 제공되지 않아요."); };
    root.querySelector("#hero-info").onclick = (e) => {
      e.preventDefault(); const c = items[cur]; L.log("card_click", { target_id: c.id, section: "hero" }); location.href = "detail.html?id=" + c.id;
    };
  }

  /* ───── 섹션 렌더 ───── */
  function block(b, idx) {
    const sec = (b.kind === "row" ? "row_" + idx : b.kind) + (b.title ? ":" + b.title : "");
    switch (b.kind) {
      case "promo": {
        const t = b.target && App.byId[b.target];
        if (b.adult) return `<section class="sec"><div class="promo adult" data-promo="${b.id}" role="button" tabindex="0"><b>${esc(b.title)}</b><span>${esc(b.sub)}</span></div></section>`;
        return `<section class="sec"><div class="promo" data-promo="${b.id}" ${t ? `data-target="${t.id}"` : ""} ${b.pass ? `data-pass="${b.pass}"` : ""} style="--h:${b.hue != null ? b.hue : App.hue(b.id)}" role="link" tabindex="0"><b>${esc(b.title)}</b><span>${esc(b.sub)}</span></div></section>`;
      }
      case "shortcuts":
        return `<section class="sec">${strip("tiles", b.items.map((it, i) => {
          const c = it.type === "content" ? App.byId[it.target] : null;
          const bg = c && c.image ? ` has-img" style="background-image:url('${esc(c.image)}')` : it.type === "event" ? " event" : `" style="--h:${it.hue != null ? it.hue : App.hue(it.label)}`;
          return `<button class="tile${bg}" data-type="${it.type}" data-target="${esc(it.target || "")}" data-label="${esc(it.label)}"><span>${esc(it.label)}</span>${it.pill ? `<em class="tpill ${it.buy ? "buy" : ""}">✨ ${esc(it.pill)} ✨</em>` : ""}</button>`;
        }).join(""))}</section>`;
      case "continue":
        return `<section class="sec"><h2>${esc(b.title)}</h2>${strip("cw wide", b.items.map((it) => {
          const c = App.byId[it.id];
          return card(c, { section: "continue", kind: "cw", below: it.progress != null ? `<div class="bar"><i style="width:${Math.round(it.progress * 100)}%"></i></div>` : "" });
        }).join(""))}</section>`;
      case "top20":
        return `<section class="sec"><h2>${esc(b.title)}</h2>${strip("poster", b.items.map((id, i) => card(App.byId[id], { section: "top20", kind: "poster", rank: i + 1 })).join(""))}</section>`;
      case "originals":
        return `<section class="sec originals"><h2>${b.more ? `<a href="#" data-more="${esc(b.title)}">${esc(b.title)} ›</a>` : esc(b.title)}</h2><div class="orig-glow">${strip("origs", b.items.map((id) => card(App.byId[id], { section: "originals", kind: "big" })).join(""))}</div></section>`;
      case "brands":
        return `<section class="sec">${strip("brands", b.items.map((id) => { const ps = App.pass(id); return `<a class="btile" href="brand.html?p=${id}" data-brand="${id}" style="--bc:${ps.color}"><span class="bw ${id}">${esc(ps.brand)}</span></a>`; }).join("") + [["sports", "스포츠 패스", "#1b6fe8", "sports-benefits.html"], ["premium", "premium", "#7a5cff", "premium.html?from=home"], ["shorts", "하이라이트 숏플", "#e5484d", "shorts.html"], ["upcoming", "공개 예정", "#14a3b8", "upcoming.html"]].map(([id, nm, col, href]) => `<a class="btile" href="${href}" data-brand="${id}" style="--bc:${col}"><span class="bw ${id}">${esc(nm)}</span></a>`).join(""))}</section>`;
      case "shortsrow":
        return `<section class="sec"><h2><a href="shorts.html" data-more-short>${esc(b.title)} ›</a></h2>${strip("shortsr", b.items.map((id) => { const c = App.byId[id]; return `<a class="card short" href="shorts.html" data-id="${c.id}" data-section="home_shorts"><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy">` : ""}<div class="sh-tit">${esc(c.title)}</div><div class="sh-sub2">${esc(c.genres[0])} · ★ ${c.rating.toFixed(1)}</div></div></a>`; }).join(""))}</section>`;
      case "brandcard": {
        const ps = App.pass(b.pass); const its = App.data.contents.filter((c) => c.partnerPass === b.pass).sort((a, z) => z.rating - a.rating).slice(0, 4);
        return `<section class="sec"><a class="brandcard" href="brand.html?p=${b.pass}" data-brand="${b.pass}" style="--bc:${ps.color}"><span class="bw2 ${b.pass}">${esc(ps.brand)}</span><small>${esc(ps.tagline)}</small>
          <span class="mini">${its.map((c) => `<span class="mp" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy">` : ""}</span>`).join("")}</span><span class="go">둘러보기</span></a></section>`;
      }
      case "passRow":
        return `<section class="sec"><h2>${esc(b.title)}</h2>${strip("wide", b.items.map((id) => card(App.byId[id], { section: "pass", pass: true })).join(""))}</section>`;
      default:
        return `<section class="sec"><h2>${b.more ? `<a href="#" data-more="${esc(b.title)}">${esc(b.title)} ›</a>` : esc(b.title)}</h2>${strip("wide rowp", b.items.map((id) => card(App.byId[id], { section: b.title, deal: b.deal })).join(""))}</section>`;
    }
  }

  if (PAGE === "home") {                                  // 시청 중인 콘텐츠: 고정 데이터 대신 실제 재생 기록(없으면 줄 숨김)
    const bh0 = JSON.parse(localStorage.getItem("behav_A") || '{"click":[],"play":[]}');
    const cont = (bh0.play || []).filter((id) => App.byId[id]).slice(0, 6).map((id) => ({ id }));
    H = Object.assign({}, H, { layout: H.layout.map((b) => (b.kind === "continue" ? Object.assign({}, b, { items: cont }) : b)).filter((b) => b.kind !== "continue" || b.items.length) });
  }
  if (PAGE === "home") {                                  // 회원님이 좋아할 만한 콘텐츠: 관심사 기반, 홈 아래쪽에 배치(기존 고정 '내가 좋아할 만한' 줄 대체)
    const free = App.data.contents.filter((c) => c.access === "subscription" && c.image);
    const it = App.Pers.interests() || [];
    const chips = it.filter((g) => free.some((c) => App.Pers.matches(c, g)));
    const liked = free.filter((c) => chips.some((g) => App.Pers.matches(c, g)));
    const items = App.Pers.rank(liked.length >= 4 ? liked : free).slice(0, 12).map((c) => c.id);
    const row = { kind: "row", title: "내가 좋아할 만한 콘텐츠", items };
    /* ○○을/를 보셨다면: 마지막 재생 → 찜 → 클릭 → 시청 중 작품(강철 날개) 순으로 기준 작품을 잡고, 같은 카테고리(장르가 겹치는) 작품만 보여준다 */
    const bh = JSON.parse(localStorage.getItem("behav_A") || '{"click":[],"play":[]}');
    const okC = (arr) => (arr || []).map((id) => App.byId[id]).filter((c) => c && c.access === "subscription" && c.image)[0];
    const wishedC = App.wish.list().slice().reverse().map((id) => App.byId[id]).filter((c) => c && c.access === "subscription" && c.image)[0];
    const playedC = okC(bh.play), clickedC = okC(bh.click);
    const seed = playedC || wishedC || clickedC;       // 기록이 없으면 줄을 만들지 않음
    const how = !playedC && wishedC ? "찜했다면" : "보셨다면";
    const similar = !seed ? [] : App.Pers.rank(free.filter((c) => c.id !== seed.id && c.genres.some((g) => seed.genres.includes(g))));
    const seenRow = { kind: "row", title: seed ? `${seed.title}${App.josa(seed.title, "을", "를")} ${how}` : "", items: similar.slice(0, 12).map((c) => c.id) };
    const lay = H.layout.filter((b) => !(b.kind === "row" && b.title === "내가 좋아할 만한 콘텐츠"));
    const at = lay.findIndex((b) => b.title === "다큐멘터리 · 시사교양");   // 홈 중·하단
    lay.splice(at >= 0 ? at + 1 : Math.floor(lay.length * 0.65), 0, row);
    if (seenRow.items.length) lay.splice((at >= 0 ? at + 1 : Math.floor(lay.length * 0.65)) + 1, 0, seenRow);   // 좋아할 만한 줄 바로 아래
    H = Object.assign({}, H, { layout: lay });
  }
  root.innerHTML = hero() + H.layout.map(block).join("");
  bindHero();
  if (PAGE === "home") {                                  // 실제처럼 긴 홈의 맨 아래: 서비스 정보(가상)
    const info = document.createElement("section");
    info.className = "home-info";
    info.innerHTML = `<div class="hi-logo"><i></i>PLAYLAB</div>
      <p>교육용 비영리 UI/UX A/B 테스트 프로젝트입니다. 실제 OTT 서비스 및 해당 기업과 관련이 없으며, 아래 정보는 모두 가상의 예시입니다.</p>
      <p class="hi-l">상호: (가상) 플레이랩 · 대표: - · 사업자등록번호: 없음 · 통신판매업 신고: 없음<br>연락처: 없음 (실제 문의·결제·가입이 불가능한 테스트 페이지)</p>
      <p class="hi-links"><a href="#" data-info>이용약관</a><a href="#" data-info>개인정보처리방침</a><a href="#" data-info>청소년보호정책</a><a href="#" data-info>고객센터</a><a href="#" data-info>자주 묻는 질문</a></p>`;
    root.appendChild(info);
    info.addEventListener("click", (e) => { const a = e.target.closest("[data-info]"); if (a) { e.preventDefault(); L.log("gnb_click", { value: "footer:" + a.textContent }); App.toast("교육용 테스트 페이지: 이 화면은 제공되지 않아요."); } });
  }
  if (H.toastBar) {                                                   // 스토어: 하단 와우회원 안내 바
    const bar = document.createElement("div");
    bar.className = "buybar"; bar.setAttribute("role", "status");
    bar.innerHTML = `<span class="lk">🔒</span><span><b>${esc(H.toastBar.text)}</b><a href="#" id="buybar-join">${esc(H.toastBar.link)} ›</a></span><button aria-label="닫기">✕</button>`;
    document.body.appendChild(bar);
    bar.querySelector("button").onclick = () => bar.remove();
    bar.querySelector("#buybar-join").onclick = (e) => { e.preventDefault(); L.log("banner_click", { target_id: "buybar_join", section: PAGE }); App.toast("교육용 페이지입니다. 실제 가입은 진행되지 않아요."); };
  }

  /* ───── 스트립 화살표 ───── */
  root.querySelectorAll(".strip-wrap").forEach((w) => {
    const s = w.querySelector(".strip");
    w.querySelector(".arrow.l").onclick = () => s.scrollBy({ left: -s.clientWidth * 0.85, behavior: "smooth" });
    w.querySelector(".arrow:not(.l)").onclick = () => s.scrollBy({ left: s.clientWidth * 0.85, behavior: "smooth" });
  });

  /* ───── 클릭 위임 ───── */
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-more-short], .card.short")) L.log("shorts_tab_click", { value: "home_section" });   // 숏츠 진입 경로
    const cd = e.target.closest(".card");
    if (cd) { L.log("card_click", { target_id: cd.dataset.id, section: cd.dataset.section }); return; }
    const bcd = e.target.closest(".brandcard");
    if (bcd) { L.log("pass_icon_click", { value: bcd.dataset.brand, section: "home_brandcard" }); return; }
    const bt = e.target.closest(".btile");
    if (bt) { L.log("pass_icon_click", { value: bt.dataset.brand, section: "home_brands" }); return; }
    const t = e.target.closest(".tile");
    if (t) {
      L.log("shortcut_click", { target_id: t.dataset.target || t.dataset.label, section: "shortcuts", value: t.dataset.type });
      if (t.dataset.type === "content") location.href = "detail.html?id=" + t.dataset.target;
      else if (t.dataset.type === "category" && t.dataset.target === "sports") location.href = App.sportsDest();
      else if (t.dataset.type === "pass") location.href = "brand.html?p=" + t.dataset.target;
      else App.toast("교육용 테스트 페이지: 해당 기능은 제공되지 않아요.");
      return;
    }
    const pr = e.target.closest(".promo");
    if (pr) {
      L.log("banner_click", { target_id: pr.dataset.promo });
      if (pr.classList.contains("adult")) App.toast("교육용 테스트 페이지: 성인 인증 화면은 제공되지 않아요.");
      else if (pr.dataset.pass) location.href = "brand.html?p=" + pr.dataset.pass;
      else if (pr.dataset.target) location.href = "detail.html?id=" + pr.dataset.target;
      else App.toast("교육용 페이지로 외부 이동은 없어요.");
      return;
    }
    const mo = e.target.closest("[data-more]");
    if (mo) { e.preventDefault(); L.log("row_more_click", { section: mo.dataset.more }); App.toast("교육용 테스트 페이지: 전체보기 화면은 제공되지 않아요."); }
  });
  root.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList.contains("promo")) e.target.click(); });

  /* ───── 호버 프리뷰 (300ms 지연) ───── */
  const hv = document.getElementById("hover");
  let showT, hideT, curCard = null;
  const hide = () => { hv.classList.remove("show"); curCard = null; };
  const scheduleHide = () => { clearTimeout(hideT); hideT = setTimeout(hide, 160); };

  function showHover(cd) {
    const c = App.byId[cd.dataset.id]; curCard = cd;
    const wished = App.wish.has(c.id);
    hv.innerHTML = `<div class="vid">${c.image ? `<img src="${esc(c.image)}" alt="">` : ""}<div class="lbl">${esc(c.badge === "신규 에피소드" ? "신규 에피소드" : c.badge && c.badge !== "개별구매" ? c.badge : "")}</div><button class="mute" aria-label="음소거">🔇</button></div>
      <div class="body"><h3>${esc(c.title)}</h3>
      <div class="mrow"><span>★ ${c.rating.toFixed(1)}</span><span>· ${esc(c.genres[0])}</span><span>· ${App.runtime(c.runtime)}</span><span class="age">${App.age(c.age)}</span></div>
      ${App.accessMsg(c) ? `<div class="msg">${esc(App.accessMsg(c))}</div>` : '<div class="msg none"></div>'}
      <div class="acts"><button class="rb pri" data-a="play" aria-label="재생">▶</button><button class="rb" data-a="wish" aria-label="찜">${wished ? "✓" : "＋"}</button><span class="sp"></span><button class="rb" data-a="info" aria-label="상세정보">i</button></div></div>`;
    const r = cd.getBoundingClientRect(), W = Math.max(Math.round(r.width * 1.1), 250);
    hv.style.width = W + "px";
    let left = r.left + scrollX + r.width / 2 - W / 2;
    left = Math.max(8 + scrollX, Math.min(left, scrollX + innerWidth - W - 16));
    hv.style.left = left + "px"; hv.style.top = "0px"; hv.classList.add("show");
    const hh = hv.offsetHeight;
    let top = r.top + scrollY - 6;                         // 실제 사이트처럼 카드 위치에서 아래로 펼쳐짐
    top = Math.max(scrollY + 80, Math.min(top, scrollY + innerHeight - hh - 12));
    hv.style.top = top + "px";
    hv.dataset.id = c.id; hv.dataset.section = cd.dataset.section;
    hv._t0 = Date.now();
    L.log("card_hover", { target_id: c.id, section: cd.dataset.section });
  }
  document.addEventListener("mouseover", (e) => {
    if (e.target.closest("#hover")) { clearTimeout(hideT); return; }
    const cd = e.target.closest(".card");
    if (!cd) { clearTimeout(showT); scheduleHide(); return; }
    clearTimeout(hideT);
    if (cd === curCard) return;
    clearTimeout(showT);
    showT = setTimeout(() => showHover(cd), 300);
  });
  window.addEventListener("scroll", () => { clearTimeout(showT); if (curCard) hide(); }, { passive: true });
  hv.addEventListener("click", (e) => {
    const c = App.byId[hv.dataset.id], sec = hv.dataset.section;
    const b = e.target.closest("button"), a = b && b.dataset.a;
    /* 음소거·찜(＋)만 제자리에서 동작하고, 그 외 카드 어디를 눌러도 상세 페이지로 이동 */
    if (b && b.classList.contains("mute")) { b.textContent = b.textContent === "🔇" ? "🔊" : "🔇"; return; }
    if (a === "wish") {
      const added = App.wish.toggle(c.id);
      b.textContent = added ? "✓" : "＋";
      if (added) L.log("wishlist_add", { target_id: c.id, section: sec });
      App.toast(added ? "찜 목록에 추가했어요." : "찜 목록에서 뺐어요.");
      return;
    }
    if (a === "play") {                                   // 파란 ▶: 상세 페이지에서 바로 영상 재생(재생 불가면 상세에서 멤버십/구매 안내)
      L.log("card_click", { target_id: c.id, section: sec, value: "hover_play" });
      location.href = `detail.html?id=${c.id}&play=1`;
      return;
    }
    L.log("card_click", { target_id: c.id, section: sec, value: a === "info" ? "hover_info" : "hover_card" });
    location.href = "detail.html?id=" + c.id;
  });

  /* ───── 스크롤 깊이 ───── */
  const seen = new Set();
  function depth() {
    const d = (scrollY + innerHeight) / document.documentElement.scrollHeight * 100;
    [25, 50, 75, 100].forEach((t) => { if (d >= t - 1 && !seen.has(t)) { seen.add(t); L.log("scroll_depth", { section: "home", value: t }); } });
  }
  window.addEventListener("scroll", depth, { passive: true }); depth();
})();
