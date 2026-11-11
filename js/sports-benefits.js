/* A안 스포츠 패스 소개 페이지 — 스포츠 탭 첫 진입 화면(실제 사이트도 가입 전에는 소개 페이지가 먼저 열림).
   리그·혜택·문구는 모두 가상. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  let S;
  try { S = await (await fetch("data/sports.json?v=1")).json(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  L.log("page_view", { section: "sports_benefits" });

  const img = (k) => `<img src="assets/sports/${k}.jpg" alt="" loading="lazy" onerror="this.remove()">`;
  const BANNER_IMG = { gaon: "soccer1", nova: "soccer3", atlas: "soccer4", sky: "basket1", court: "basket3", grand: "racing2", hanul: "baseball1", smash: "volley1" };
  const DESC = {
    gaon: ["국내 최고의 축구 무대, 가온리그", "서해 호랑이와 동해 파도가 만드는 매 라운드의 라이벌전", "가온리그의 모든 경기를 라이브로 만나보세요."],
    nova: ["노바 프리미어, 세계가 주목하는 축구 리그", "노바 시티와 리버사이드의 치열한 선두 다툼", "노바 프리미어 전 경기 라이브와 하이라이트."],
    atlas: ["아틀라스리그, 낭만의 축구", "아틀라스 유나이티드와 마리나 SC의 라이벌전", "아틀라스리그의 모든 순간을 한곳에서."],
    sky: ["스카이 농구리그, 코트 위의 명승부", "서해 불독스와 한라 나이츠의 시즌 맞대결", "스카이 농구리그 전 경기를 무제한으로."],
    court: ["블루코트 G리그, 신예들의 무대", "에이스 베어스와 블루 파이럿츠의 접전", "블루코트 G리그 전 경기 시청 가능."],
    grand: ["그랜드 레이싱, 시속 300km의 승부", "서해 그랑프리부터 남해 그랑프리까지 전 라운드", "예선부터 결승까지 레이스 전 과정을 라이브로."],
    open: ["클리어 오픈, 필드 위의 정점", "1라운드부터 4라운드까지 전 홀 중계", "클리어 오픈의 모든 샷을 놓치지 마세요."],
    hanul: ["한울 베이스볼, 매일 밤 야구", "한울 라이노스와 동해 마린즈의 시즌 대결", "한울 베이스볼 전 경기와 홈런 모음."],
    smash: ["스매시 배구리그, 짜릿한 랠리", "오로라 스파이크와 썬더 블록의 선두 경쟁", "스매시 배구리그 전 경기 라이브."],
  };
  const ACC = [["국제 축구 대회", ["가상 컵 챔피언십", "대륙간 친선경기", "여름 국가대표 매치"]], ["유럽형 축구 리그", ["노바 프리미어", "아틀라스리그", "하이랜드컵"]],
    ["아시아 축구", ["가온리그", "가온컵", "아시아 주간 대회"]], ["농구", ["스카이 농구리그", "블루코트 G리그"]], ["모터스포츠", ["그랜드 레이싱", "서킷 시리즈"]], ["골프·야구·배구", ["클리어 오픈", "한울 베이스볼", "스매시 배구리그"]]];
  const FEAT = [
    { cls: "", title: "최대 4경기<br>동시에 즐기기", sub: "화면 전환 없는 진짜 집중", note: "* 기기 사양에 따라 가능한 화면 수가 다를 수 있어요.", img: "soccer2" },
    { cls: "teal", title: "스포츠 시청하며<br>멀티태스킹", sub: "시청하던 영상을 다른 앱에서도<br>PIP로 끊김 없이 즐기기", note: "* 일부 기기에서만 제공돼요.", img: "racing1" },
    { cls: "", title: "타임머신 타고<br>바로 그 장면으로", sub: "라이브 중에도 놓친 명장면으로<br>되돌아가 다시 보기", note: "* 경기·기기에 따라 제공 범위가 달라요.", img: "soccer4" },
  ];
  const FAQ = [["스포츠 패스가 무엇인가요?", "교육용 테스트 페이지의 가상 상품입니다. 실제 가입·결제는 이루어지지 않습니다."],
    ["어떤 기기에서 볼 수 있나요?", "이 페이지는 웹 브라우저에서만 동작하는 연구용 화면입니다."],
    ["스포츠 패스는 연간으로 구매하나요?", "가상 데이터로, 요금·기간 정보는 제공되지 않습니다."],
    ["이용 요금이 바뀔 수도 있나요?", "실제 서비스와 무관한 가상 안내입니다."]];

  root.innerHTML = `<div class="b-skip"><label><input type="checkbox" id="skip"> 일주일 동안 그만 보기</label><button id="bclose" aria-label="닫고 스포츠로 이동">✕</button></div>
    <section class="b-hero"><div class="b-logo">스포츠 패스</div>
      <h1>쿠플의 모든 스포츠를<br>무제한으로 즐겨보세요</h1><button class="btn primary" id="bjoin">지금 가입하기</button></section>
    <div class="strip-wrap"><button class="arrow l" aria-label="이전">‹</button><div class="strip b-leagues">${S.leagues.map((l) => `<button class="b-lg" data-l="${l.id}"><span class="llogo" style="--c:${l.color}">${esc(l.short)}</span><small>${esc(l.name)}</small></button>`).join("")}</div><button class="arrow" aria-label="다음">›</button></div>
    <section class="b-banners">${S.leagues.filter((l) => !l.solo || l.id === "grand").slice(0, 7).map((l) => `<a class="b-banner" href="#" data-l="${l.id}" style="--c:${l.color}"><div class="txt"><h2>${esc(DESC[l.id][0].split(",")[0])}</h2><p>${esc(DESC[l.id][1])}<br><b>${esc(DESC[l.id][2])}</b></p></div><div class="ph">${img(BANNER_IMG[l.id] || "arena1")}</div></a>`).join("")}</section>
    <section class="b-more"><h2>이 외에도 볼 수 없던<br>스포츠 중계</h2><div class="acc">${ACC.map(([t, items]) => `<details><summary>${esc(t)}</summary><ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></details>`).join("")}</div></section>
    ${FEAT.map((f) => `<section class="b-feat ${f.cls}"><div class="inner"><div><h2>${f.title}</h2><p>${f.sub}</p><small>${f.note}</small></div><div class="ph">${img(f.img)}</div></div></section>`).join("")}
    <section class="b-faq"><h2>자주 묻는 질문</h2>${FAQ.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join("")}</section>`;

  root.querySelectorAll(".strip-wrap").forEach((w) => {
    const s = w.querySelector(".strip");
    w.querySelector(".arrow.l").onclick = () => s.scrollBy({ left: -s.clientWidth * 0.85, behavior: "smooth" });
    w.querySelector(".arrow:not(.l)").onclick = () => s.scrollBy({ left: s.clientWidth * 0.85, behavior: "smooth" });
  });

  /* 닫기(✕): 체크하면 일주일간 이 페이지를 건너뛰고, 스포츠 메인으로 이동 */
  root.querySelector("#bclose").onclick = () => {
    const skip = root.querySelector("#skip").checked;
    L.log("banner_click", { target_id: "sports_intro_close", section: "sports_benefits", value: skip ? "skip_7d" : "close" });
    if (skip) App.LS.set("sports_intro_skip_until", Date.now() + 7 * 86400000);
    App.SS.set("sports_intro_seen", "1");
    location.href = "sports.html";
  };
  const join = () => { L.log("banner_click", { target_id: "sports_join", section: "sports_benefits" }); App.toast("교육용 페이지입니다. 실제 가입은 진행되지 않아요."); };
  root.querySelector("#bjoin").onclick = join;
  root.addEventListener("click", (e) => {
    const l = e.target.closest("[data-l]"); if (l) { e.preventDefault(); L.log("league_click", { target_id: l.dataset.l, section: "sports_benefits" }); join(); }
  });
})();
