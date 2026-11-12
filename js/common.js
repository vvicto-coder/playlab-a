/* 공통: 데이터 로드, 로거, 교육용 고지, 토스트, 유틸 — 교육용 비영리 테스트 페이지 */
(function () {
  const VARIANT = "A";
  const LS = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const SS = {
    get(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} },
  };

  let sid = SS.get("sid");
  if (!sid) {
    sid = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2);
    SS.set("sid", sid);
  }

  /* ───── 로거: localStorage 에 쌓고 CSV 로 내보낸다 (익명, 연구용) ───── */
  const Logger = {
    sid,
    log(event, extra) {
      const row = Object.assign({ variant: VARIANT, session_id: sid, event, ts: Date.now() }, extra || {});
      if (event === "play_start" && !SS.get("first_play")) {
        SS.set("first_play", "1");
        const t0 = Number(SS.get("home_t0"));
        if (t0) row.ttfp_ms = row.ts - t0;
        row.first_play = true;
      }
      const all = LS.get("ablog_A", []);
      all.push(row);
      LS.set("ablog_A", all.slice(-3000));
      if (window.console && console.debug) console.debug("[log]", row);
      return row;
    },
    rows() { return LS.get("ablog_A", []); },
    csv() {
      const rows = this.rows();
      const cols = ["variant", "session_id", "ts", "event", "target_id", "section", "value", "ttfp_ms", "first_play"];
      const esc = (v) => (v == null ? "" : '"' + String(v).replace(/"/g, '""') + '"');
      return [cols.join(",")].concat(rows.map((r) => cols.map((c) => esc(r[c])).join(","))).join("\n");
    },
    download() {
      const blob = new Blob(["﻿" + this.csv()], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "ab_log_A_" + sid.slice(0, 8) + ".csv";
      a.click();
    },
    clear() { LS.set("ablog_A", []); },
  };

  /* ───── 데이터 ───── */
  const App = { data: null, byId: {}, LS, SS, Logger, VARIANT };
  App.load = async function () {
    const r = await fetch("data/contents.json?v=20261115");
    if (!r.ok) throw new Error("contents.json 로드 실패");
    App.data = await r.json();
    App.data.contents.forEach((c) => (App.byId[c.id] = c));
    return App.data;
  };

  /* ───── 유틸 ───── */
  App.esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
  App.hue = (id) => { let h = 0; for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) % 360; return h; };
  App.runtime = (m) => { const h = Math.floor(m / 60), mm = m % 60; return h ? (mm ? `${h}시간 ${mm}분` : `${h}시간`) : `${mm}분`; };
  App.age = (a) => (a === "all" ? "ALL" : a + "+");
  App.pass = (id) => (App.data.passes || []).find((p) => p.id === id);
  App.priceText = (c) => (c.price ? c.price.toLocaleString("ko-KR") + "원" : "");
  /* 호버 카드 문구(멤버십 이용 중): 멤버십 포함 작품은 안내 없음 · 패스/개별구매만 안내 */
  App.accessMsg = (c) => {
    if (c.access === "paid") return `개별 구매 콘텐츠입니다 · ${App.priceText(c)}`;
    const p = c.partnerPass && App.pass(c.partnerPass);
    return p ? `${p.name} 구독 후 시청할 수 있는 콘텐츠입니다` : "";
  };
  /* 카드 태그: 개별구매=주황 / 패스=패스별 색 / 멤버십 오리지널=파랑(▶ 시리즈·영화) */
  App.tagHTML = (c) => {
    if (c.access === "paid") return '<span class="tag buy">개별구매</span>';
    const p = c.partnerPass && App.pass(c.partnerPass);
    if (p) return `<span class="tag pass" style="background:${p.color}">${App.esc(p.name)}</span>`;
    return c.badge === "쿠플 시리즈" ? '<span class="tag">▶ 시리즈</span>' : c.badge === "쿠플 영화" ? '<span class="tag">▶ 영화</span>' : "";
  };
  /* 지금 바로 재생 가능한가(멤버십 포함 & 패스 아님) */
  App.canPlay = (c) => c.access === "subscription" && !c.partnerPass;
  App.wish = {
    list() { return LS.get("wish_A", []); },
    has(id) { return this.list().includes(id); },
    toggle(id) {
      const l = this.list(); const i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id);
      LS.set("wish_A", l); return i < 0;
    },
  };

  App.toast = function (msg) {
    let t = document.getElementById("toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(App._tt); App._tt = setTimeout(() => t.classList.remove("show"), 2600);
  };

  /* ───── 교육용 고지: 상단 띠 + 푸터 + 첫 진입 모달 ───── */
  App.mountShell = function () {
    const strip = document.createElement("div");
    strip.className = "edu-strip";
    strip.textContent = "교육용 비영리 UI/UX A/B 테스트 페이지 · 실제 OTT 서비스·기업과 무관 · 모든 작품은 가상";
    document.body.insertBefore(strip, document.body.firstChild);

    const f = document.createElement("footer");
    f.className = "site-footer";
    f.innerHTML = `<p>© 2026 교육용 UI/UX A/B 테스트 프로젝트 · 비영리 · 실제 서비스와 무관 · 모든 콘텐츠는 가상입니다.</p>
      <p>이미지 출처: Openverse(CC0·공공 도메인·CC BY) — <a href="credits.html">출처 보기</a> · <a href="#" id="dl-log">행동 로그(CSV) 내보내기</a> · <a href="#" id="clear-log">로그 초기화</a></p>`;
    document.body.appendChild(f);
    f.querySelector("#dl-log").addEventListener("click", (e) => { e.preventDefault(); Logger.download(); });
    f.querySelector("#clear-log").addEventListener("click", (e) => { e.preventDefault(); Logger.clear(); App.toast("로그를 초기화했어요"); });

    if (!LS.get("consent_A", false)) App.showConsent(); else App.showInterest();
  };

  App.showConsent = function () {
    const ov = document.createElement("div");
    ov.className = "overlay consent";
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="cm-t">
      <h2 id="cm-t">교육용 테스트 페이지 안내</h2>
      <p>본 페이지는 OTT 서비스 UI/UX 연구를 위한 <b>교육용 테스트 페이지</b>이며, 어떠한 영리 목적도 갖지 않습니다.</p>
      <p>실제 OTT 서비스 및 해당 기업과 관련이 없으며, 모든 콘텐츠·브랜드·이미지는 가상이거나 자유 이용 가능한 소재입니다.</p>
      <p>실제 결제·가입·영상 시청은 이루어지지 않습니다. 익명 행동 로그만 연구 목적으로 수집됩니다.</p>
      <div class="modal-actions"><button class="btn primary" id="consent-ok">동의하고 시작하기</button></div>
    </div>`;
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");
    const ok = ov.querySelector("#consent-ok");
    ok.focus();
    ok.addEventListener("click", () => {
      LS.set("consent_A", true);
      Logger.log("consent_accept");
      ov.remove();
      document.body.classList.remove("no-scroll");
      App.showInterest();
    });
  };

  /* ───── 관심사 선택(1~3개, 건너뛰기 가능, 브라우저에만 저장) + 점수 — 홈 '회원님이 좋아할 만한 콘텐츠'용 ───── */
  const INTEREST_CHIPS = {
    "드라마": ["드라마", "하이틴", "의학"], "로맨스": ["로맨스", "로맨틱 코미디"], "코미디": ["코미디", "예능", "리얼리티"], "액션": ["액션", "히어로", "밀리터리"],
    "SF": ["SF"], "판타지": ["판타지", "동화"], "애니메이션": ["애니메이션"], "키즈": ["키즈", "유아", "가족", "동요"],
    "다큐멘터리": ["다큐멘터리", "자연", "동물"], "시사교양": ["시사교양", "역사"], "음식": ["음식"], "음악": ["음악", "공연", "뮤지컬"],
  };
  const groupOf = (chip) => INTEREST_CHIPS[chip] || [chip];
  const overlapG = (c, g) => c.genres.some((x) => g.includes(x));
  App.Pers = {
    CHIPS: Object.keys(INTEREST_CHIPS),
    interests: () => LS.get("interest_A", null),               // null = 아직 묻지 않음, [] = 건너뜀
    matches: (c, chip) => overlapG(c, groupOf(chip)),
    /* 점수 = 선택 장르 일치(+3) + 찜한 작품과 장르 일치(+2) + 평점 보정(+0~1). 같은 점수는 작품 ID 순 */
    rank(list) {
      const want = (this.interests() || []).flatMap(groupOf);
      const wished = [...new Set(App.wish.list().map((id) => App.byId[id]).filter(Boolean).flatMap((c) => c.genres))];
      const sc = (c) => (want.length && overlapG(c, want) ? 3 : 0) + (wished.length && overlapG(c, wished) ? 2 : 0) + Math.max(0, Math.min(1, (c.rating - 3) / 2));
      return list.slice().sort((a, z) => sc(z) - sc(a) || a.id.localeCompare(z.id));
    },
  };
  App.showInterest = function () {
    if (App.Pers.interests() !== null || document.querySelector(".overlay.interest")) return;
    const ov = document.createElement("div");
    ov.className = "overlay interest";
    const picked = [];
    ov.innerHTML = `<div class="modal int-modal" role="dialog" aria-modal="true" aria-labelledby="int-t">
      <h2 id="int-t">어떤 콘텐츠를 좋아하세요?</h2>
      <p>관심 있는 장르를 <b>1~3개</b> 골라 주시면 홈에서 취향에 맞는 콘텐츠를 보여드려요. (브라우저에만 저장돼요)</p>
      <div class="int-chips">${App.Pers.CHIPS.map((g) => `<button type="button" data-g="${App.esc(g)}" aria-pressed="false">${App.esc(g)}</button>`).join("")}</div>
      <p class="fine int-cnt"></p>
      <div class="modal-actions"><button class="btn" data-a="skip">건너뛰기</button><button class="btn primary" data-a="ok">선택 완료</button></div></div>`;
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");
    const ok = ov.querySelector('[data-a="ok"]'), cnt = ov.querySelector(".int-cnt");
    const upd = () => { ok.disabled = !picked.length; cnt.textContent = picked.length ? `${picked.length}개 선택 (최대 3개)` : "1개 이상 선택해 주세요."; };
    upd();
    ov.querySelector(".int-chips").addEventListener("click", (e) => {
      const b = e.target.closest("[data-g]"); if (!b) return;
      const g = b.dataset.g, i = picked.indexOf(g);
      if (i >= 0) picked.splice(i, 1);
      else if (picked.length < 3) picked.push(g);
      else { App.toast("관심사는 최대 3개까지 고를 수 있어요."); return; }
      b.classList.toggle("on", picked.includes(g)); b.setAttribute("aria-pressed", picked.includes(g)); upd();
    });
    const close = (list) => { LS.set("interest_A", list); ov.remove(); document.body.classList.remove("no-scroll"); if (/index\.html$|\/$/.test(location.pathname)) location.reload(); };
    ok.addEventListener("click", () => { if (!picked.length) return; picked.forEach((g) => Logger.log("onboarding_interest_select", { value: g, section: "onboarding" })); close(picked.slice()); });
    ov.querySelector('[data-a="skip"]').addEventListener("click", () => { Logger.log("onboarding_skip", { section: "onboarding" }); close([]); });
    ok.focus();
  };

  /* ───── 멤버십/구매 안내 모달 (모의, 결제 없음) ───── */
  App.openGate = function (c, opts) {
    opts = opts || {};
    if (c.partnerPass && c.access !== "paid") return App.openPassSheet(c.partnerPass, c);
    const paid = c.access === "paid";
    const movie = c.format === "movie";
    const title = paid ? "개별 구매 콘텐츠입니다" : movie ? "멤버십 회원 전용 콘텐츠입니다" : "멤버십 회원 전용 회차입니다";
    const p = c.partnerPass && App.pass(c.partnerPass);
    const body = paid
      ? `‘${App.esc(c.title)}’은(는) 개별 구매 후 시청할 수 있어요. (${App.priceText(c)})`
      : `${opts.epLabel && !movie ? App.esc(opts.epLabel) + "부터는 " : ""}멤버십 가입 후 시청할 수 있어요.${p ? ` (${App.esc(p.name)} 작품은 별도 패스 필요)` : ""}`;
    const prev = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true">
      <h2>${title}</h2><p>${body}</p>
      <p class="fine">※ 교육용 테스트 페이지로 실제 가입·결제는 진행되지 않습니다.</p>
      <div class="modal-actions"><button class="btn" data-a="close">닫기</button>
      <button class="btn primary" data-a="join">${paid ? "구매하기" : "멤버십 가입하기"}</button></div></div>`;
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");
    const close = (how) => {
      Logger.log(how === "join" ? "membership_modal_join" : "membership_modal_close", { target_id: c.id, value: paid ? "paid" : "subscription" });
      ov.remove(); document.body.classList.remove("no-scroll");
      if (prev && prev.focus) prev.focus();
      if (how === "join") App.toast("교육용 페이지입니다. 실제 가입·결제는 진행되지 않아요.");
    };
    ov.querySelector('[data-a="close"]').addEventListener("click", () => close("close"));
    ov.querySelector('[data-a="join"]').addEventListener("click", () => close("join"));
    ov.addEventListener("click", (e) => { if (e.target === ov) close("close"); });
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape" && document.body.contains(ov)) { close("close"); document.removeEventListener("keydown", esc); } });
    ov.querySelector('[data-a="close"]').focus();
  };

  /* ───── 패스 구독 시트(모의, 결제 없음) — 패스 작품·브랜드관의 '가입하기'에서 열림 ───── */
  App.openPassSheet = function (passId, c) {
    const p = App.pass(passId); if (!p) return;
    const prev = document.activeElement;
    const ov = document.createElement("div");
    ov.className = "overlay sheet";
    ov.innerHTML = `<div class="pass-sheet" role="dialog" aria-modal="true" aria-label="${App.esc(p.name)} 구독">
      <div class="wm" style="color:${p.color}">${App.esc(p.brand)}</div>
      <h2>${App.esc(p.tagline)}</h2>
      <a class="look" href="brand.html?p=${p.id}" data-a="look">패스 둘러보기 ›</a>
      <div class="price"><b>${p.price.toLocaleString("ko-KR")}원</b>/월</div>
      <p class="fine">언제든지 해지할 수 있습니다.<br>※ 교육용 테스트 페이지로 실제 구독·결제는 진행되지 않습니다.</p>
      <button class="btn buy" data-a="sub">패스 구독하기</button>
      <button class="btn gray" data-a="close">닫기</button></div>`;
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");
    Logger.log("pass_detail_view", { target_id: c ? c.id : "", value: passId, section: "pass_sheet" });
    const close = (how) => {
      if (how === "sub") { Logger.log("membership_modal_join", { target_id: c ? c.id : "", value: "pass:" + passId }); App.toast("교육용 페이지입니다. 실제 구독·결제는 진행되지 않아요."); }
      else if (how === "close") Logger.log("membership_modal_close", { target_id: c ? c.id : "", value: "pass:" + passId });
      ov.remove(); document.body.classList.remove("no-scroll");
      if (prev && prev.focus) prev.focus();
    };
    ov.querySelector('[data-a="sub"]').addEventListener("click", () => close("sub"));
    ov.querySelector('[data-a="close"]').addEventListener("click", () => close("close"));
    ov.querySelector('[data-a="look"]').addEventListener("click", () => Logger.log("pass_icon_click", { value: passId, section: "pass_sheet" }));
    ov.addEventListener("click", (e) => { if (e.target === ov) close("close"); });
    document.addEventListener("keydown", function esc(e) { if (e.key === "Escape" && document.body.contains(ov)) { close("close"); document.removeEventListener("keydown", esc); } });
    ov.querySelector('[data-a="sub"]').focus();
  };

  /* ───── 모의 검색 오버레이 (제목 부분 일치) ───── */
  App.openSearch = function () {
    Logger.log("search_open");
    const ov = document.createElement("div");
    ov.className = "overlay";
    ov.innerHTML = `<div class="search-box"><input type="search" placeholder="작품 제목 검색" aria-label="검색어" autofocus><ul></ul></div>`;
    document.body.appendChild(ov);
    document.body.classList.add("no-scroll");
    const inp = ov.querySelector("input"), ul = ov.querySelector("ul");
    const close = () => { ov.remove(); document.body.classList.remove("no-scroll"); document.removeEventListener("keydown", onKey); };
    const onKey = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", onKey);
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
    inp.addEventListener("input", () => {
      const q = inp.value.trim();
      if (!q) { ul.innerHTML = ""; return; }
      const hits = App.data.contents.filter((c) => c.title.includes(q)).slice(0, 12);
      ul.innerHTML = hits.length
        ? hits.map((c) => `<li><a href="detail.html?id=${c.id}" data-id="${c.id}">${c.image ? `<img src="${App.esc(c.image)}" alt="">` : ""}<span><b>${App.esc(c.title)}</b><br><small>${App.esc(c.type)} · ${App.esc(c.genres.slice(0, 2).join(", "))}</small></span></a></li>`).join("")
        : '<li><small>검색 결과가 없어요.</small></li>';
    });
    ul.addEventListener("click", (e) => { const a = e.target.closest("a"); if (a) Logger.log("card_click", { target_id: a.dataset.id, section: "search" }); });
    inp.focus();
  };

  /* ───── 공통 상단 메뉴(GNB): 모든 페이지에서 한 곳에서 그린다 ───── */
  const CHIPS = ["스포츠", "드라마·예능", "영화", "스토어", "키즈"];
  const CATS = ["한국 TV 프로그램", "외국 TV 프로그램", "한국 영화", "외국 영화", "키즈", "교육", "액션", "로맨스", "코미디", "스릴러", "어드벤처", "범죄",
    "애니메이션", "예능", "판타지", "SF", "다큐멘터리", "미스터리", "공포", "영문 자막", "드라마", "가족", "무협", "오컬트", "한국", "20대",
    "미국 드라마", "중국 드라마", "일본 드라마", "영국 드라마", "미국 영화", "중화권 영화", "일본 영화", "유럽 영화"];
  App.CATS = CATS;
  const BRANDS = [["키즈플러스", "#18b394"], ["애니 라운지", "#ff6a00"], ["MOA-X", "#e5484d"], ["STAR+", "#2f6bff"], ["SONYX", "#555"], ["J-WAVE", "#1e9e6a"]];
  const MENU = ["프로필 관리", "내 구독내역", "구매내역", "할인쿠폰", "리뷰 관리", "의견 보내기", "로그아웃"];
  const TAB_PAGE = { "스포츠": "sports-benefits.html", "드라마·예능": "tv.html", "영화": "movies.html", "스토어": "store.html", "키즈": "kids.html" };

  /* 스포츠 탭: 실제 사이트처럼 가입 전에는 스포츠 패스 소개 페이지가 먼저(‘일주일 동안 그만 보기’ 또는 이미 닫았으면 메인) */
  App.sportsDest = () => (LS.get("sports_intro_skip_until", 0) > Date.now() || SS.get("sports_intro_seen") ? "sports.html" : "sports-benefits.html");

  App.renderGnb = function () {
    const g = document.getElementById("gnb");
    if (!g) return;
    const active = g.dataset.active || "";
    g.innerHTML = `<a class="logo" href="index.html" aria-label="PLAYLAB 홈"><i></i>PLAYLAB</a>
      <nav class="chips" aria-label="카테고리">${CHIPS.map((c) => {
        const cls = c === active ? "chip on fill" : c === "스포츠" ? "chip strong" : "chip";
        return `<button class="${cls}" data-chip="${c}" ${c === active ? 'aria-current="page"' : ""}>${c.replace("·", " · ")}</button>`;
      }).join("")}</nav>
      <div class="right">
        <div class="hov-wrap cat-wrap" ${active === "키즈" ? "hidden" : ""}><button class="cat-btn" aria-haspopup="true">카테고리</button>
          <div class="catpanel" role="menu"><div class="catgrid">${CATS.map((c) => `<button role="menuitem" data-cat-item="${c}">${c}</button>`).join("")}</div>
            <div class="brandgrid">${BRANDS.map(([n, col]) => `<button data-brand="${n}" style="color:${col}">${n}</button>`).join("")}</div></div></div>
        <button class="icon-btn cast-btn" id="open-cast" aria-label="화면 전송"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18a3 3 0 0 1 3 3M3 14a7 7 0 0 1 7 7M3 10a11 11 0 0 1 11 11"/><path d="M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"/></svg></button>
        <button class="icon-btn" id="open-search" aria-label="검색"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg></button>
        <div class="hov-wrap av-wrap"><button class="avatar" aria-haspopup="true" aria-label="프로필 메뉴">플</button>
          <div class="avmenu" role="menu">${MENU.map((m) => `<button role="menuitem" data-av="${m}">${m}</button>`).join("")}</div></div>
      </div>`;

    g.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-chip]");
      if (chip) {
        Logger.log("gnb_click", { value: chip.dataset.chip });
        const dest = chip.dataset.chip === "스포츠" ? App.sportsDest() : TAB_PAGE[chip.dataset.chip];
        const here = location.pathname.split("/").pop();
        if (dest === here || (dest.startsWith("sports") && here.startsWith("sports"))) window.scrollTo({ top: 0, behavior: "smooth" });   // 이미 그 탭이면 맨 위로
        else if (dest) location.href = dest;
        return;
      }
      if (e.target.closest(".cat-btn") && window.matchMedia("(max-width:640px)").matches) { Logger.log("gnb_click", { value: "category_menu" }); location.href = "categories.html"; return; }   // 모바일: 호버 패널 대신 전체 화면 목록
      const ci = e.target.closest("[data-cat-item],[data-brand]");
      const BR = { "STAR+": "star", SONYX: "sonyx", "MOA-X": "moa", "J-WAVE": "jwave", "애니 라운지": "lounge", "키즈플러스": "kidsplus" };
      if (ci && BR[ci.dataset.brand]) { Logger.log("gnb_click", { value: "brand:" + ci.dataset.brand }); location.href = "brand.html?p=" + BR[ci.dataset.brand]; return; }
      if (ci) { const nm = ci.dataset.catItem || ci.dataset.brand; Logger.log("gnb_click", { value: "category:" + nm }); location.href = "category.html?c=" + encodeURIComponent(nm); return; }
      if (e.target.closest(".avatar")) { Logger.log("gnb_click", { value: "profile" }); location.href = "profile.html"; return; }
      const av = e.target.closest("[data-av]");
      if (av && av.dataset.av === "프로필 관리") { Logger.log("gnb_click", { value: "menu:프로필 관리" }); location.href = "profiles.html"; return; }
      if (av) { Logger.log("gnb_click", { value: "menu:" + av.dataset.av }); App.toast(av.dataset.av === "로그아웃" ? "교육용 테스트 페이지: 로그아웃은 제공되지 않아요." : "교육용 테스트 페이지: 이 메뉴는 제공되지 않아요."); return; }
      if (e.target.closest("#open-cast")) { Logger.log("gnb_click", { value: "cast" }); App.toast("교육용 테스트 페이지: 화면 전송은 제공되지 않아요."); return; }
      if (e.target.closest("#open-search")) { Logger.log("search_open", { section: "gnb" }); location.href = "search.html"; }
    });
    /* 키보드 접근: 포커스가 들어와도 패널이 열린다(CSS :focus-within) */
    if (g.classList.contains("ghost")) {
      const upd = () => g.classList.toggle("over", window.scrollY < 40);
      window.addEventListener("scroll", upd, { passive: true }); upd();
    }
  };

  /* 모바일 하단 탭바(홈 · 숏플 · 공개 예정 · 검색 · 프로필) — 640px 이하에서만 보임 */
  App.mountTabbar = function () {
    const here = location.pathname.split("/").pop() || "index.html";
    const tabs = [["홈", "index.html", "⌂"], ["숏플", "shorts.html", "▶"], ["공개 예정", "upcoming.html", "▣"], ["검색", "search.html", "⌕"], ["프로필", "profile.html", "●"]];
    const nav = document.createElement("nav");
    nav.className = "tabbar"; nav.setAttribute("aria-label", "하단 메뉴");
    nav.innerHTML = tabs.map(([n, h, i]) => `<a href="${h || "#"}" data-tb="${n}" class="${h && h === here ? "on" : ""}"><span class="ic">${i}</span><span>${n}</span></a>`).join("");
    nav.addEventListener("click", (e) => {
      const a = e.target.closest("a"); if (!a) return;
      if (a.dataset.tb === "숏플") Logger.log("shorts_tab_click", { value: "tabbar" });          // A·B 공통 이름(결정 ③)
      else Logger.log("gnb_click", { value: "tabbar:" + a.dataset.tb });
      if (!a.getAttribute("href") || a.getAttribute("href") === "#") { e.preventDefault(); App.toast("교육용 테스트 페이지: 이 메뉴는 제공되지 않아요."); }
    });
    document.body.appendChild(nav);
  };

  window.App = App;
  App.renderGnb();
  App.mountTabbar();
})();
