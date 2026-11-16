/* A안 프로필(내 정보) — 앱 화면 구성: 프로필 헤더(+멤버십) → 프리미엄 배너 → 클럽 카드(포인트·스포츠 패스 클럽·퀴즈) → 혜택 알림 → 시청기록 → 개별구매 → 찜한 콘텐츠 → 설정 → 로그아웃.
   이름·포인트 등 개인 값은 가상 값. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  L.log("page_view", { section: "profile" });

  /* 시청기록(가상): 홈 '시청 중' 작품 + 1편, 진행률 */
  const bh = JSON.parse(localStorage.getItem("behav_A") || '{"click":[],"play":[]}');   // 시청기록: 고정 데이터 대신 실제 재생 기록
  const hist = (bh.play || []).map((id) => ({ c: App.byId[id], ep: (bh.ep || {})[id] || 1 })).filter((x) => x.c).slice(0, 8);
  const bought = App.data.contents.find((c) => c.access === "paid" && c.format === "movie");
  const wished = App.wish.list().map((id) => App.byId[id]).filter(Boolean);
  const reviews = App.LS.get("reviews_A", []).length;
  const notiOn = App.LS.get("benefit_noti_A", false);
  const thumb = (c, extra) => `<div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${extra || ""}</div>`;
  const cast = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18a3 3 0 0 1 3 3M3 14a7 7 0 0 1 7 7M3 10a11 11 0 0 1 11 11"/><path d="M5 6h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"/><path d="M3 6v0"/></svg>';
  const gear = '<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';

  root.innerHTML = `<div class="pf-wrap">
    <header class="pf-top"><a class="pf-id" href="profiles.html" id="pf-switch"><span class="pa me teal">나</span><span class="nm"><b>내 프로필 <i>›</i></b><em class="mem"><u>M+</u> 멤버십</em></span></a>
      <div class="pf-ic"><button data-m="화면 전송" aria-label="화면 전송">${cast}</button><button data-m="설정" aria-label="설정">${gear}</button></div></header>

    <a class="pf-premium" href="premium.html?from=profile" data-premium><span class="lg"><i></i></span><span><b>premium</b> 구독하고 <u>광고 없이</u> 시청하세요</span><i class="ch">›</i></a>

    <section class="pf-club">
      <button class="top" data-m="플레이클럽"><span><b class="club">플레이클럽</b><small>상위 12%</small></span><span class="pt">12,340점 <i>›</i></span></button>
      <div class="bot"><button data-m="스포츠 패스 클럽" class="row"><b class="sc">스포츠 패스 클럽</b><span class="pt2">지금 가입하면 <u>받는 혜택</u> <i>›</i></span></button>
        <div class="quiz"><span><em class="tro">🏆</em> 모든 문제 적중하면 경품이!</span><button data-m="퀴즈 도전">도전하기</button></div></div>
    </section>

    <section class="pf-noti ${notiOn ? "open" : ""}"><button class="head" id="noti-head" aria-expanded="${notiOn}"><span class="bell">🔔</span><span><b>혜택 알림 받기</b><small>신규 콘텐츠와 다양한 이벤트 소식 알려드려요</small></span><i>⌄</i></button>
      <div class="body"><label class="sw"><input type="checkbox" id="noti-sw" ${notiOn ? "checked" : ""}><span></span> 혜택 알림 ${notiOn ? "켜짐" : "꺼짐"}</label></div></section>

    <section class="pf-sec"><h2><a href="#" data-more="시청기록">시청기록 ›</a></h2>
      ${hist.length ? `<div class="pf-row">${hist.map((h) => `<a class="pf-w" href="detail.html?id=${h.c.id}" data-id="${h.c.id}">${thumb(h.c, `<span class="pf-play">▶</span>`)}<small>${esc(h.c.title)}${h.c.format === "movie" ? "" : " " + h.ep + "화"}</small></a>`).join("")}</div>` : '<div class="pf-empty">시청한 콘텐츠가 여기에서 보여집니다.</div>'}</section>

    <section class="pf-sec"><h2><a href="#" data-more="내 구독내역">내 구독내역 ›</a></h2></section>

    <section class="pf-sec"><div class="pf-h2row"><h2><a href="#" data-more="개별구매">개별구매 ›</a></h2><span class="pf-only"><em>M+</em> 멤버십 회원 전용</span></div>
      ${bought ? `<div class="pf-buy">${thumb(bought)}<small>${esc(bought.title)} (개별구매)<br><span>2026년 1월 10일 만료됨</span></small></div>` : ""}</section>

    <section class="pf-sec"><h2>찜한 콘텐츠</h2>
      ${wished.length ? `<div class="pf-row wish">${wished.map((c) => `<a class="pf-w" href="detail.html?id=${c.id}" data-id="${c.id}">${thumb(c)}<small>${esc(c.title)}</small></a>`).join("")}</div>` : '<div class="pf-empty">찜한 콘텐츠가 여기에서 보여집니다.</div>'}</section>

    <ul class="pf-list">
      <li><button data-m="내 리뷰 관리"><span>내 리뷰 관리</span><em>${reviews ? `<i class="pf-badge">${reviews}</i>` : ""}<i>›</i></em></button></li>
      <li><button data-m="피드백 남기기"><span>피드백 남기기</span><em><i>›</i></em></button></li>
      <li><button data-m="언어 설정"><span>언어 설정</span><em><b class="ok">한국어 ✓</b><i>›</i></em></button></li>
      <li><button data-m="화면 테마 설정"><span>화면 테마 설정</span><em><b class="ok">라이트 모드 ✓</b><i>›</i></em></button></li>
    </ul>
    <div class="pf-out"><button data-m="로그아웃">로그아웃</button></div></div>`;

  const noti = root.querySelector(".pf-noti");
  root.querySelector("#noti-head").addEventListener("click", (e) => { const o = noti.classList.toggle("open"); e.currentTarget.setAttribute("aria-expanded", o); });
  root.querySelector("#noti-sw").addEventListener("change", (e) => {
    App.LS.set("benefit_noti_A", e.target.checked);
    L.log("benefit_notify", { section: "profile_benefit", value: e.target.checked ? "on" : "off" });
    e.target.closest("label").lastChild.textContent = ` 혜택 알림 ${e.target.checked ? "켜짐" : "꺼짐"}`;
    App.toast(e.target.checked ? "혜택 알림을 켰어요. (교육용: 실제 알림은 없어요)" : "혜택 알림을 껐어요.");
  });
  root.addEventListener("click", (e) => {
    if (e.target.closest("[data-premium]")) { L.log("premium_cta_click", { section: "profile", value: "profile" }); return; }
    if (e.target.closest("#pf-switch")) { L.log("gnb_click", { value: "profile_switch" }); return; }
    const more = e.target.closest("[data-more]");
    if (more) { e.preventDefault(); L.log("row_more_click", { section: "profile:" + more.dataset.more }); App.toast("교육용 테스트 페이지: 전체보기 화면은 제공되지 않아요."); return; }
    const m = e.target.closest("[data-m]");
    if (m) { e.preventDefault(); L.log("gnb_click", { value: "menu:" + m.dataset.m }); App.toast(m.dataset.m === "로그아웃" ? "교육용 테스트 페이지: 로그아웃은 제공되지 않아요." : "교육용 테스트 페이지: 이 메뉴는 제공되지 않아요."); return; }
    const w = e.target.closest(".pf-w"); if (w) L.log("card_click", { target_id: w.dataset.id, section: "profile" });
  });
})();
