/* A안 카테고리 목록 — 상단 '카테고리' 패널에서 진입(category.html?c=○○). 교육용 비영리 테스트 페이지
   작품 데이터에 '제작 국가' 정보가 없어, 국가·연령대형 카테고리(한국/미국/일본…·20대·영문 자막)는
   교육용 가상 분류(작품 id 기반 고정 규칙)로 나눈다 — 실제 국적과 무관하다. */
(async function () {
  App.mountShell();
  const root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  const L = App.Logger, esc = App.esc, C = App.data.contents;
  const name = (new URLSearchParams(location.search).get("c") || "").trim();
  const n = (c) => parseInt(c.id.replace(/\D/g, ""), 10) || 0;
  const has = (c, ...g) => c.genres.some((x) => g.includes(x));
  const isTv = (c) => c.type === "드라마" || c.type === "예능";
  const mv = (c) => c.type === "영화";
  const RULE = {
    "한국 TV 프로그램": (c) => isTv(c) && n(c) % 2 === 0 || c.type === "예능",
    "외국 TV 프로그램": (c) => (isTv(c) && n(c) % 2 === 1) || c.type === "애니메이션" || c.type === "다큐멘터리",
    "한국 영화": (c) => mv(c) && n(c) % 2 === 0,
    "외국 영화": (c) => mv(c) && n(c) % 2 === 1,
    "교육": (c) => has(c, "시사교양", "다큐멘터리", "유아", "동요", "동화", "자연", "동물", "역사"),
    "키즈": (c) => has(c, "키즈", "유아", "동화", "동요") || c.type === "애니메이션",
    "예능": (c) => c.type === "예능",
    "영문 자막": (c) => n(c) % 3 === 0,
    "한국": (c) => (isTv(c) || mv(c)) && n(c) % 2 === 0,
    "20대": (c) => has(c, "로맨스", "하이틴", "코미디", "로맨틱 코미디"),
    "미국 드라마": (c) => c.type === "드라마" && n(c) % 4 === 0,
    "중국 드라마": (c) => c.type === "드라마" && n(c) % 4 === 1,
    "일본 드라마": (c) => c.type === "드라마" && n(c) % 4 === 2,
    "영국 드라마": (c) => c.type === "드라마" && n(c) % 4 === 3,
    "미국 영화": (c) => mv(c) && n(c) % 8 === 1,
    "중화권 영화": (c) => mv(c) && n(c) % 8 === 3,
    "일본 영화": (c) => mv(c) && n(c) % 8 === 5,
    "유럽 영화": (c) => mv(c) && n(c) % 8 === 7,
  };
  const rule = RULE[name] || ((c) => c.genres.includes(name));
  const list = C.filter(rule).sort((a, b) => b.rating - a.rating);
  const card = (c) => `<a class="card" href="detail.html?id=${c.id}" data-id="${c.id}"><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${App.tagHTML(c)}<div class="ctitle">${esc(c.title)}</div>${c.access === "paid" && c.price ? `<div class="cap">${c.price.toLocaleString("ko-KR")}원</div>` : ""}</div></a>`;
  document.title = `${name || "카테고리"} · PLAYLAB A안`;
  root.innerHTML = `<div class="cat-top"><button class="ac-back" aria-label="뒤로">←</button><h2>${esc(name || "카테고리")}</h2><span><button data-m="cast" aria-label="화면 전송">⎘</button><button data-m="filter" aria-label="필터">☰</button></span></div>
    <div class="s-res"><h1>${esc(name || "카테고리")} <small class="cat-n">${list.length}개</small></h1>
    ${list.length ? `<div class="s-grid wide">${list.map(card).join("")}</div>` : '<p class="soon big">아직 준비된 작품이 없어요. 다른 카테고리를 선택해 보세요.</p>'}</div>`;
  root.querySelector(".ac-back").addEventListener("click", () => (history.length > 1 ? history.back() : (location.href = "index.html")));
  L.log("page_view", { section: "category", value: name, target_id: String(list.length) });
  root.addEventListener("click", (e) => { const mb = e.target.closest("[data-m]"); if (mb) { App.toast("교육용 테스트 페이지: 이 기능은 제공되지 않아요."); return; }
    const cd = e.target.closest(".card"); if (cd) L.log("card_click", { target_id: cd.dataset.id, section: "category:" + name }); });
})();
