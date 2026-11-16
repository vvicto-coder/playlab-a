/* A안 공개 예정 — 곧 공개되는 작품 카드(알림 받기·공유하기·예약 구매). 일정·작품은 모두 가상. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  L.log("page_view", { section: "upcoming" });

  /* 날짜는 기준일(2026-11-09, 월) 고정 — 참가자마다 같은 화면 */
  const BASE = new Date(2026, 10, 9), WD = "일월화수목금토";
  const when = (off, hour) => { const d = new Date(BASE); d.setDate(d.getDate() + off); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]}) 오후 ${hour}시 공개`; };
  const T = (title) => App.data.contents.find((c) => c.title === title);
  const LIST = [
    [T("최후의 저격"), "예약 구매하기", true],
    [T("썸 하우스"), "2기: 매주 화요일 오후 11시 55분 공개"],
    [T("우리 동네 의사들"), when(24, 5)],
    [T("교실 밖 청춘"), "시즌 2: 매주 금요일 오후 9시 공개"],
    [T("도시의 온도"), when(17, 8)],
    [T("검은 법정"), when(31, 10)],
    [T("별빛 마법학교"), when(38, 4)],
    [T("사이버 시티 2099"), "예약 구매하기", true],
  ].filter(([c]) => c);

  const bell = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
  const share = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.8 14.8 7.2M8.2 13.2l6.6 3.6"/></svg>';
  const notified = () => App.LS.get("notify_A", []);

  function render() {
    root.innerHTML = `<div class="up-wrap"><h1>공개 예정</h1><div class="up-grid">${LIST.map(([c, label, buy], i) => {
      const on = notified().includes(c.id);
      return `<article class="up-card" data-id="${c.id}">
        <a class="up-media" href="detail.html?id=${c.id}" data-open="${c.id}">${c.image ? `<img src="${esc(c.image)}" alt="${esc(c.title)}" loading="lazy" onerror="this.remove()">` : ""}
          ${i === 0 ? '<button class="up-mute" aria-label="음소거 해제" data-mute>🔇</button><span class="up-prog"><i></i></span>' : ""}</a>
        <div class="up-info"><div class="up-title"><h2>${esc(c.title)}</h2><p class="${buy ? "buy" : ""}">${esc(label)}</p></div>
          <div class="up-acts"><button data-notify="${c.id}" class="${on ? "on" : ""}" aria-pressed="${on}">${bell}<span>${on ? "알림 설정됨" : "알림 받기"}</span></button><button data-share="${c.id}">${share}<span>공유하기</span></button></div></div>
        <p class="up-desc">${esc(c.synopsis.replace(" (가상 작품)", ""))} ${esc(c.genres.slice(0, 2).join("·"))} 장르의 신작으로, 공개일에 맞춰 알림을 받아볼 수 있어요. (가상 소개)</p></article>`;
    }).join("")}</div></div>`;
  }
  render();

  root.addEventListener("click", (e) => {
    const mu = e.target.closest("[data-mute]");
    if (mu) { e.preventDefault(); mu.textContent = mu.textContent === "🔇" ? "🔊" : "🔇"; L.log("mute_toggle", { section: "upcoming" }); return; }
    const nt = e.target.closest("[data-notify]");
    if (nt) {
      const id = nt.dataset.notify, l = notified(), i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id);
      L.log("release_notify", { target_id: id, section: "upcoming", value: i >= 0 ? "off" : "on" });   // 찜(wishlist_add)과 분리
      App.LS.set("notify_A", l);
      App.toast(i >= 0 ? "알림을 해제했어요." : "공개되면 알려드릴게요. (교육용: 실제 알림은 없어요)");
      render(); return;
    }
    const sh = e.target.closest("[data-share]");
    if (sh) { L.log("share_click", { target_id: sh.dataset.share, section: "upcoming" }); App.toast("교육용 테스트 페이지에서는 공유 기능을 제공하지 않아요."); return; }
    const op = e.target.closest("[data-open]"); if (op) L.log("card_click", { target_id: op.dataset.open, section: "upcoming" });
  });
})();
