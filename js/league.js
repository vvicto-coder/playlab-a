/* A안 리그 페이지 — 스포츠 탭의 리그 아이콘에서 진입(league.html?id=○○). 홈 · 동영상 · 경기 일정 · 순위.
   리그·팀·경기·순위·점수는 모두 가상(교육용 비영리 테스트 데이터) */
(async function () {
  App.mountShell();
  const L = App.Logger, esc = App.esc, root = document.getElementById("app");
  let S;
  try { S = await (await fetch("data/sports.json?v=1")).json(); }
  catch (e) { root.innerHTML = '<p class="page">데이터를 불러오지 못했어요. 로컬 서버로 열어 주세요.</p>'; return; }
  const q = new URLSearchParams(location.search);
  const lg = S.leagues.find((l) => l.id === q.get("id")) || S.leagues[0];
  const team = {}; Object.values(S.teams).flat().forEach((t) => (team[t.id] = t));
  const M = Object.fromEntries(S.matches.map((m) => [m.id, m]));
  const WD = "일월화수목금토", BASE = new Date((S.meta.baseDate || "2026-11-09") + "T00:00:00");
  const dl = (day) => { const d = new Date(BASE); d.setDate(d.getDate() + day); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
  const dls = (day) => { const d = new Date(BASE); d.setDate(d.getDate() + day); return `${d.getMonth() + 1}월 ${d.getDate()}일 (${WD[d.getDay()]})`; };
  const img = (k) => `<img src="assets/sports/${esc(k)}.jpg" alt="" loading="lazy" onerror="this.remove()">`;
  const tlogo = (t) => `<span class="tlogo" style="--c:${t.color}">${esc(t.short)}</span>`;
  const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const wishKey = "wish_sports_A", wishes = () => App.LS.get(wishKey, []);
  const matches = S.matches.filter((m) => m.league === lg.id).sort((a, b) => a.day - b.day);
  const vids = S.videos.filter((v) => v.league === lg.id);
  const st = { tab: ["home", "video", "sched", "rank"].includes(q.get("t")) ? q.get("t") : "home", status: "upcoming", schedF: "all" };
  document.title = `${lg.name} · PLAYLAB A안`;
  L.log("page_view", { section: "league", value: lg.id });

  const tags = (a, b) => `<span class="lg-tags"><i class="pass">패스</i>${b ? `<i>${esc(b)}</i>` : ""}</span>`;
  const stText = (m) => (m.status === "live" ? "LIVE" : m.status === "finished" ? "종료" : "예정");
  const matchCard = (m) => {
    const h = team[m.home], a = team[m.away], on = wishes().includes(m.id);
    const mid = m.status === "finished" && m.hs != null ? `<b class="sc">${m.hs} : ${m.as}</b>` : `<b>${esc(m.time)}</b>`;
    return `<div class="lg-match ${m.status}" data-m="${m.id}">${tags("", stText(m))}
      <div class="lg-mbody">${h && a ? `<div class="tm">${tlogo(h)}<span>${esc(h.name)}</span></div>` : `<div class="tm solo"><span>${esc(m.title)}</span></div>`}
        <div class="md">${mid}<small>${dls(m.day)}</small></div>
        ${h && a ? `<div class="tm">${tlogo(a)}<span>${esc(a.name)}</span></div>` : '<div class="tm"></div>'}</div>
      <button class="lg-bell ${on ? "on" : ""}" data-wish="${m.id}" aria-label="알림"><span>🔔</span><em>${hash(m.id) % 2 ? "HDR" : "4K"}</em></button></div>`;
  };
  const vCard = (v, rank) => `<button class="lg-v" data-v="${v.id}">${rank ? `<span class="rk">${rank}</span>` : ""}<div class="th">${img(v.img)}${tags("", v.tag)}${v.fourK ? '<span class="k4">4K</span>' : ""}<span class="du">${esc(v.dur)}</span></div><b>${esc(v.title)}</b>${rank ? `<small>${dl(v.day)}</small>` : ""}</button>`;

  function standings() {
    const solo = lg.solo;
    const names = solo ? ["한서준", "이도윤", "박하준", "최민재", "정우진", "강시우", "조예준", "윤지호", "장도현", "임건우"].map((n, i) => ({ id: "p" + i, name: n, color: ["#1f6feb", "#c0392b", "#27ae60", "#8e44ad", "#e67e22"][i % 5], short: n.slice(0, 1) })) : (S.teams[lg.id] || []);
    const P = Math.max(10, ...matches.map((m) => m.round || 0)) - 4;
    const rows = names.map((t) => { const h = hash(t.id + lg.id); const w = solo ? h % 7 : Math.max(1, Math.min(P - 1, 3 + (h % (P - 3)))); const d = solo ? (h >> 3) % 6 : (h >> 3) % Math.max(1, Math.min(4, P - w)); const l = P - w - d; return { t, p: P, w, d, l, pts: solo ? w * 25 + d * 10 : w * 3 + d }; }).sort((a, b) => b.pts - a.pts);
    return `<table class="lg-tbl"><thead><tr><th>순위</th><th class="l">${solo ? "선수" : "팀"}</th><th>${solo ? "출전" : "경기"}</th><th>${solo ? "우승" : "승"}</th><th>${solo ? "포디움" : "무"}</th>${solo ? "" : "<th>패</th>"}<th>승점</th></tr></thead><tbody>${rows.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${tlogo(r.t)}<span>${esc(r.t.name)}</span></td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td>${solo ? "" : `<td>${r.l}</td>`}<td><b>${r.pts}</b></td></tr>`).join("")}</tbody></table>`;
  }

  function tabHome() {
    const list = matches.filter((m) => (st.status === "upcoming" ? m.status !== "finished" : m.status === "finished")).slice(0, 3);
    const top = S.top10.map((id) => S.videos.find((v) => v.id === id)).filter((v) => v && v.league === lg.id);
    const topv = top.concat(vids.filter((v) => !top.includes(v))).slice(0, 10);
    const groups = {}; vids.slice().sort((a, b) => b.day - a.day).forEach((v) => (groups[v.day] = (groups[v.day] || []).concat(v)));
    return `<section class="lg-sec"><div class="lg-h"><h2>경기 일정</h2><button data-go="sched">전체보기 ›</button></div>
        <div class="lg-chips"><button class="${st.status === "upcoming" ? "on" : ""}" data-st="upcoming">예정</button><button class="${st.status === "finished" ? "on" : ""}" data-st="finished">종료</button></div>
        ${list.length ? list.map(matchCard).join("") : '<p class="lg-empty">표시할 경기가 없어요.</p>'}<div class="lg-dots"><i class="on"></i><i></i><i></i><i></i></div></section>
      <section class="lg-top"><h2>인기 영상 TOP 10</h2><div class="lg-strip">${topv.map((v, i) => vCard(v, i + 1)).join("")}</div></section>
      ${Object.keys(groups).sort((a, b) => b - a).map((d) => { const m = M[groups[d][0].match]; const h = m && team[m.home], a = m && team[m.away];
        return `<section class="lg-sec lg-grp"><p class="dt">${dl(+d)}</p>${h && a ? `<div class="vs">${tlogo(h)}<span>${esc(h.name)}</span><em>vs</em><span>${esc(a.name)}</span>${tlogo(a)}</div>` : (m ? `<div class="vs solo"><span>${esc(m.title)}</span></div>` : "")}
          <div class="lg-strip">${groups[d].map((v) => vCard(v)).join("")}${h ? `<button class="lg-v rep" data-v="rep"><div class="th" style="--c:${h.color}"><span class="rt">다시보기</span><b>${esc(h.name)}</b>${tlogo(h)}</div><b>${esc(m.title)} 다시보기</b></button>` : ""}</div></section>`; }).join("")}`;
  }
  const tabVideo = () => `<section class="lg-sec"><div class="lg-h"><h2>동영상 <small>${vids.length}</small></h2></div><div class="lg-vgrid">${vids.map((v) => vCard(v)).join("")}</div></section>`;
  const tabSched = () => {
    const list = matches.filter((m) => st.schedF === "all" || (st.schedF === "finished" ? m.status === "finished" : m.status !== "finished"));
    return `<section class="lg-sec"><div class="lg-chips">${[["all", "전체"], ["upcoming", "예정"], ["finished", "종료"]].map(([k, n]) => `<button class="${st.schedF === k ? "on" : ""}" data-sf="${k}">${n}</button>`).join("")}</div>${list.map(matchCard).join("") || '<p class="lg-empty">표시할 경기가 없어요.</p>'}</section>`;
  };
  const tabRank = () => `<section class="lg-sec"><div class="lg-h"><h2>${esc(lg.name)} 순위</h2></div>${standings()}<p class="lg-note">※ 교육용 가상 순위입니다. 실제 경기 결과와 무관해요.</p></section>`;

  function render() {
    const TABS = [["home", "홈"], ["video", "동영상"], ["sched", "경기 일정"], ["rank", "순위"]];
    root.innerHTML = `<div class="lg-page" style="--lc:${lg.color}"><header class="lg-top-bar"><div class="lg-bar"><button class="ac-back" aria-label="뒤로">←</button><h1>${esc(lg.name)}</h1><span><button data-m="add" aria-label="마이 리그 추가">＋</button><button data-m="group" aria-label="팀">👥</button></span></div>
      <nav class="lg-tabs" role="tablist">${TABS.map(([k, n]) => `<button role="tab" class="${st.tab === k ? "on" : ""}" data-tab="${k}">${n}</button>`).join("")}</nav></header>
      <div class="lg-body">${{ home: tabHome, video: tabVideo, sched: tabSched, rank: tabRank }[st.tab]()}</div></div>`;
  }
  root.addEventListener("click", (e) => {
    const t = e.target.closest("[data-tab],[data-go]");
    if (t) { st.tab = t.dataset.tab || t.dataset.go; L.log("tab_click", { section: "league", value: `${lg.id}:${st.tab}` }); render(); scrollTo(0, 0); return; }
    const s = e.target.closest("[data-st]"); if (s) { st.status = s.dataset.st; render(); return; }
    const sf = e.target.closest("[data-sf]"); if (sf) { st.schedF = sf.dataset.sf; render(); return; }
    if (e.target.closest(".ac-back")) { history.length > 1 ? history.back() : (location.href = "sports.html"); return; }
    if (e.target.closest("[data-m]")) { App.toast("교육용 테스트 페이지: 이 기능은 제공되지 않아요."); return; }
    const w = e.target.closest("[data-wish]");
    if (w) { const id = w.dataset.wish, arr = wishes(), i = arr.indexOf(id); i >= 0 ? arr.splice(i, 1) : arr.push(id); App.LS.set(wishKey, arr); L.log("release_notify", { target_id: id, section: "league", value: i >= 0 ? "off" : "on" }); App.toast(i >= 0 ? "경기 알림을 해제했어요." : "경기 알림을 설정했어요. (교육용: 실제 알림은 없어요)"); render(); return; }
    const v = e.target.closest("[data-v]"); if (v) { L.log("card_click", { target_id: v.dataset.v, section: "league_video" }); App.toast("교육용 테스트 페이지: 영상 재생은 제공되지 않아요."); return; }
    const m = e.target.closest(".lg-match"); if (m) L.log("match_click", { target_id: m.dataset.m, section: "league" });
  });
  render();
})();
