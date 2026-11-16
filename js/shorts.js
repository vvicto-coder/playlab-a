/* A안 숏플 — 세로 전체화면 숏폼 피드(위/아래로 넘기기). 영상은 정지 이미지+천천히 확대로 대체, 자막·대사는 모두 가상.
   하단 정보 막대: 찜(✓) / 파란 ▶ → 상세 화면. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  L.log("page_view", { section: "shorts" });

  /* 가상 대사: 장르별 */
  const SUB = {
    액션: ["지금 아니면 기회가 없어.", "따라와, 시간이 없다고."], 범죄: ["이 장부에 이름이 있는 사람이 전부야.", "누가 먼저 입을 열지 지켜보자고."],
    로맨스: ["그때 하려던 말, 아직 기억나?", "우리 이대로 괜찮을까."], 코미디: ["이게 왜 여기서 나오는 거죠?", "저 오늘 진짜 운이 없네요."],
    스릴러: ["문 밖에 누군가 있어.", "72시간, 그게 전부였어."], 공포: ["불 끄지 마, 제발.", "방금 그 소리 들었지?"],
    드라마: ["그래도 내일은 오겠죠.", "말하지 않아도 알고 있었어요."], 판타지: ["이 문을 열면 돌아올 수 없어.", "별이 길을 알려줄 거야."],
    SF: ["신호가 끊기기 전에 가야 해.", "이건 기억이 아니야."], 애니메이션: ["같이 가자, 우리 친구잖아!", "오늘은 어떤 모험일까?"],
    가족: ["밥은 먹고 다니는 거지?", "우리 집이 제일 좋아요."], 키즈: ["하나, 둘, 셋! 같이 해보자!", "와, 정말 신나요!"],
  };
  const CAP = ["이 장면, 다시 보고 싶어요", "여기서부터 분위기가 달라져요", "놓치면 아쉬운 명장면", "마지막 반전을 기대하세요"];
  const pick = (c) => SUB[c.genres.find((g) => SUB[g])] || SUB.드라마;

  /* 피드: 이미지가 있는 작품을 평점·고정 순서로 섞어서 20편 */
  const feed = App.data.contents.filter((c) => c.image).map((c, i) => ({ c, k: (parseInt(c.id.slice(1), 10) * 37) % 101 })).sort((a, b) => a.k - b.k).slice(0, 20).map((x) => x.c);

  root.innerHTML = `<div class="sh-feed" tabindex="0" aria-label="숏플 영상 목록">${feed.map((c, i) => {
    const s = pick(c);
    const on = App.wish.has(c.id);
    return `<section class="sh-item" data-id="${c.id}" aria-label="${esc(c.title)}">
      <div class="sh-bg"><img src="${esc(c.image)}" alt="" ${i < 2 ? "" : 'loading="lazy"'}></div>
      <div class="sh-shade"></div>
      <div class="sh-top"><span class="sh-title">${esc(c.title)}</span><span class="sh-logo"><i></i>PLAYLAB</span></div>
      <div class="sh-sub"><b data-sub>${esc(s[0])}</b></div>
      <div class="sh-cap">${esc(CAP[i % CAP.length])}</div>
      <div class="sh-bar"><a class="sh-poster" href="detail.html?id=${c.id}" data-open="${c.id}"><img src="${esc(c.image)}" alt=""></a>
        <a class="sh-meta" href="detail.html?id=${c.id}" data-open="${c.id}"><b>${esc(c.title)} ›</b><small>★ ${c.rating.toFixed(1)} · ${App.age(c.age)} · ${esc(c.genres[0])}</small></a>
        <button class="sh-wish ${on ? "on" : ""}" data-wish="${c.id}" aria-label="찜" aria-pressed="${on}">${on ? "✓" : "✓"}</button>
        <a class="sh-play" href="detail.html?id=${c.id}" data-open="${c.id}" aria-label="상세 화면에서 재생">▶</a></div></section>`;
  }).join("")}</div>`;

  /* 보이는 영상만 '재생'(자막 교체) + 노출 로그 */
  const items = [...root.querySelectorAll(".sh-item")];
  const timers = new Map(), dwell = new Map(), completed = new Set();
  const io = new IntersectionObserver((es) => {
    es.forEach((e) => {
      const el = e.target, c = App.byId[el.dataset.id];
      if (e.isIntersecting && e.intersectionRatio > 0.6) {
        el.classList.add("on");
        L.log("short_view", { target_id: c.id, section: "shorts" });
        clearTimeout(dwell.get(el));
        if (!completed.has(c.id)) dwell.set(el, setTimeout(() => { completed.add(c.id); L.log("short_complete", { target_id: c.id, section: "shorts", value: "dwell10s" }); }, 10000));   // 10초 체류 = 시청 완료
        const s = pick(c), b = el.querySelector("[data-sub]"); let n = 0;
        clearInterval(timers.get(el));
        timers.set(el, setInterval(() => { n = (n + 1) % s.length; b.textContent = s[n]; }, 2800));
      } else { el.classList.remove("on"); clearInterval(timers.get(el)); clearTimeout(dwell.get(el)); }
    });
  }, { threshold: [0, 0.6, 1] });
  items.forEach((el) => io.observe(el));

  root.addEventListener("click", (e) => {
    const w = e.target.closest("[data-wish]");
    if (w) {
      const added = App.wish.toggle(w.dataset.wish);
      w.classList.toggle("on", added); w.setAttribute("aria-pressed", added);
      if (added) L.log("wishlist_add", { target_id: w.dataset.wish, section: "shorts" });
      App.toast(added ? "찜 목록에 추가했어요." : "찜 목록에서 뺐어요.");
      return;
    }
    const o = e.target.closest("[data-open]");
    if (o) L.log("card_click", { target_id: o.dataset.open, section: "shorts", value: o.classList.contains("sh-play") ? "play" : "info" });
  });
  /* 데스크톱: 키보드 ↑↓ 로 넘기기 */
  root.querySelector(".sh-feed").addEventListener("keydown", (e) => {
    const f = e.currentTarget;
    if (e.key === "ArrowDown") { e.preventDefault(); f.scrollBy({ top: f.clientHeight, behavior: "smooth" }); }
    if (e.key === "ArrowUp") { e.preventDefault(); f.scrollBy({ top: -f.clientHeight, behavior: "smooth" }); }
  });
})();
