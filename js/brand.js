/* A안 브랜드관(패스) — 해당 패스 구독 시 볼 수 있는 작품 모음. 브랜드·작품·이벤트는 모두 가상. 교육용 비영리 테스트 페이지 */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  try { await App.load(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  const pid = new URLSearchParams(location.search).get("p") || "star";
  const p = App.pass(pid);
  if (!p) { root.innerHTML = '<div class="page"><p>브랜드관을 찾을 수 없어요.</p><a class="btn" href="index.html">홈으로</a></div>'; return; }
  document.title = `${p.brand} 브랜드관 · PLAYLAB A안`;
  L.log("pass_hub_view", { value: pid, section: "brand" });

  const all = App.data.contents;
  const items = all.filter((c) => c.partnerPass === pid).sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id));
  const fresh = items.slice().sort((a, b) => b.year - a.year || a.id.localeCompare(b.id));
  const genres = [...new Set(items.flatMap((c) => c.genres))].slice(0, 8);
  const like = all.filter((c) => !c.partnerPass && c.access === "subscription" && c.genres.some((g) => genres.includes(g))).slice(0, 12);
  const BASE = new Date(2026, 10, 9), WD = "일월화수목금토";
  const when = (off, h) => { const d = new Date(BASE); d.setDate(d.getDate() + off); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]}) 오후 ${h}시 공개`; };

  const card = (c, o) => `<a class="card ${o.kind || ""}" href="detail.html?id=${c.id}" data-id="${c.id}" data-section="${esc(o.section)}"><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}${App.tagHTML(c)}<div class="ctitle">${esc(c.title)}</div></div>${o.rank ? `<span class="rank">${o.rank}</span>` : ""}</a>`;
  const bell = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 7H4c0-1 2-2 2-7z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>';
  const share = '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.2 10.8 14.8 7.2M8.2 13.2l6.6 3.6"/></svg>';
  const notified = () => App.LS.get("notify_A", []);
  const lead = items[0];

  root.innerHTML = `<section class="br-hero" style="--pc:${p.color}">${lead && lead.image ? `<img class="bg" src="${esc(lead.image)}" alt="">` : ""}<span class="shade"></span>
      <a class="bk" href="javascript:history.back()" aria-label="뒤로">←</a><button class="sh" id="br-share" aria-label="공유">${share}</button>
      <div class="ctr"><div class="wm" style="color:#fff">${esc(p.brand)}</div><div class="sub">${esc(p.desc)}</div><p class="slogan">${esc(p.tagline)}</p>
        <button class="btn buy" id="br-join">${esc(p.brand)} 가입하기</button></div></section>
    <div class="br-pills"><button class="on">전체이용가</button>${genres.map((g) => `<button data-g="${esc(g)}">${esc(g)}</button>`).join("")}</div>
    ${lead ? `<a class="br-banner" href="detail.html?id=${lead.id}" data-id="${lead.id}" data-section="brand_banner">${lead.image ? `<img src="${esc(lead.image)}" alt="">` : ""}<span class="shade"></span><div><b>${esc(lead.title)}</b><p>최초 공개 기념 정주행 이벤트</p><small>지금 응모하기</small></div></a>` : ""}
    <section class="br-sec"><h2>인기 TOP 20</h2><div class="strip poster">${items.slice(0, 20).map((c, i) => card(c, { kind: "poster", rank: i + 1, section: "brand_top" })).join("")}</div></section>
    <section class="br-sec"><h2>${esc(p.brand)} 공개 예정작</h2><div class="strip up">${items.slice(0, 3).map((c, i) => `<div class="up-mini"><a class="card" href="detail.html?id=${c.id}" data-id="${c.id}" data-section="brand_upcoming"><div class="thumb" style="--h:${App.hue(c.id)}">${c.image ? `<img src="${esc(c.image)}" alt="">` : ""}</div></a>
      <div class="row"><div><b>${esc(c.title)}</b><small>${when(10 + i * 7, 8 + i)}</small></div><div class="acts"><button data-notify="${c.id}" class="${notified().includes(c.id) ? "on" : ""}" aria-label="알림 받기">${bell}</button><button data-share="${c.id}" aria-label="공유하기">${share}</button></div></div></div>`).join("")}</div></section>
    <section class="br-sec"><h2><a href="#" data-more="new">새로 올라온 콘텐츠 ›</a></h2><div class="strip wide">${fresh.slice(0, 12).map((c) => card(c, { section: "brand_new" })).join("")}</div></section>
    ${like.length >= 4 ? `<section class="br-sec"><h2>내가 좋아할 만한 콘텐츠</h2><div class="strip wide">${like.map((c) => card(c, { section: "brand_like" })).join("")}</div></section>` : ""}
    <button class="br-join-fixed btn buy" id="br-join2">${esc(p.brand)} 가입하기</button>`;

  const join = (where) => { L.log("pass_icon_click", { value: pid, section: "brand_" + where }); App.openPassSheet(pid, null); };
  root.querySelector("#br-join").onclick = () => join("hero");
  root.querySelector("#br-join2").onclick = () => join("fixed");
  const sharer = () => { L.log("share_click", { target_id: pid, section: "brand" }); App.toast("교육용 테스트 페이지에서는 공유 기능을 제공하지 않아요."); };
  root.querySelector("#br-share").onclick = sharer;
  document.getElementById("br-share2").onclick = sharer;
  document.getElementById("br-wm").textContent = p.brand;
  root.addEventListener("click", (e) => {
    const cd = e.target.closest(".card,.br-banner"); if (cd) { L.log("card_click", { target_id: cd.dataset.id, section: cd.dataset.section }); return; }
    const nt = e.target.closest("[data-notify]");
    if (nt) {
      const id = nt.dataset.notify, l = notified(), i = l.indexOf(id);
      if (i >= 0) l.splice(i, 1); else l.push(id);
      App.LS.set("notify_A", l); nt.classList.toggle("on", i < 0);
      L.log("release_notify", { target_id: id, section: "brand", value: i < 0 ? "on" : "off" });
      App.toast(i >= 0 ? "알림을 해제했어요." : "공개되면 알려드릴게요. (교육용: 실제 알림은 없어요)"); return;
    }
    if (e.target.closest("[data-share]")) { sharer(); return; }
    const g = e.target.closest(".br-pills button"); if (g) { root.querySelectorAll(".br-pills button").forEach((b) => b.classList.toggle("on", b === g)); L.log("tab_click", { value: "brand_genre:" + (g.dataset.g || "all"), section: "brand" }); App.toast("교육용 테스트 페이지: 필터 목록 화면은 제공되지 않아요."); return; }
    if (e.target.closest("[data-more]")) { e.preventDefault(); App.toast("교육용 테스트 페이지: 전체보기 화면은 제공되지 않아요."); }
  });
  const top = document.getElementById("br-top");
  const fixed = root.querySelector("#br-join2");
  const upd = () => { top.classList.toggle("show", scrollY > 300); fixed.classList.toggle("show", scrollY > 420); };   // 고정 가입 버튼은 히어로 버튼이 화면에서 벗어난 뒤에 표시
  window.addEventListener("scroll", upd, { passive: true }); upd();
})();
