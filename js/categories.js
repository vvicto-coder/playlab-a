/* A안 모바일 '모든 카테고리' — 카테고리 버튼을 누르면 화면 전체가 이 목록으로 넘어간다. 교육용 비영리 테스트 페이지 */
(function () {
  App.mountShell();
  const root = document.getElementById("app"), L = App.Logger;
  L.log("page_view", { section: "categories" });
  root.innerHTML = `<div class="ac-top"><button class="ac-back" aria-label="뒤로">←</button><h1>모든 카테고리</h1></div>
    <ul class="ac-list">${App.CATS.map((c) => `<li><a href="category.html?c=${encodeURIComponent(c)}" data-c="${App.esc(c)}">${App.esc(c)}</a></li>`).join("")}</ul>`;
  root.querySelector(".ac-back").addEventListener("click", () => (history.length > 1 ? history.back() : (location.href = "index.html")));
  root.addEventListener("click", (e) => { const a = e.target.closest("[data-c]"); if (a) L.log("gnb_click", { value: "category:" + a.dataset.c }); });
})();
