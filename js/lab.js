/* ============================================================
   Inu ID — Panel de laboratorio (admin)
   ------------------------------------------------------------
   Login con la misma cuenta (v2/login), pero solo entra si role=admin.
   Endpoints admin:
     GET   /InuidPets/admin/all
     PATCH /InuidPets/admin/{id}/collar   body { hasCollar: true }
   ============================================================ */
(function () {
  const CFG = window.INUID_CONFIG;
  const BASE = CFG.API_BASE;
  const TOKEN_KEY = "inuid_lab_token";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function show(view) {
    ["lab-login", "lab-app", "lab-assign"].forEach((v) => $(v).classList.toggle("hidden", v !== view));
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(window._t); window._t = setTimeout(() => t.classList.remove("show"), 2600);
  }
  function paintBrand() {
    const svg = $("brand-tpl").content.firstElementChild;
    document.querySelectorAll("[data-brandicon]").forEach((el) => { if (!el.firstChild) el.appendChild(svg.cloneNode(true)); });
  }

  /* ---------- API ---------- */
  async function apiLogin(u, p) {
    const res = await fetch(BASE + "/Auth/v2/login", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, password: p })
    });
    if (!res.ok) { const e = new Error("login"); e.status = res.status; throw e; }
    return res.json();
  }
  async function apiAll() {
    const res = await fetch(BASE + "/InuidPets/admin/all", {
      headers: { Authorization: "Bearer " + Store.get(TOKEN_KEY) }
    });
    if (!res.ok) { const e = new Error("all"); e.status = res.status; throw e; }
    return res.json();
  }
  async function apiSetCollar(id) {
    const res = await fetch(BASE + "/InuidPets/admin/" + id + "/collar", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + Store.get(TOKEN_KEY) },
      body: JSON.stringify({ hasCollar: true })
    });
    if (!res.ok) { const e = new Error("collar"); e.status = res.status; throw e; }
    return res.json().catch(() => ({}));
  }

  /* ---------- estado ---------- */
  let all = [];
  let tab = "con";      // 'con' | 'sin'
  let search = "";
  let assigning = null; // mascota en asignación

  /* ---------- login ---------- */
  async function doLogin() {
    const u = $("lab-user").value.trim();
    const p = $("lab-pass").value;
    $("lab-err").textContent = "";
    if (!u || !p) { $("lab-err").textContent = "Completa usuario y contraseña."; return; }
    const btn = $("lab-login-btn"); btn.disabled = true; btn.textContent = "Ingresando…";
    try {
      const r = await apiLogin(u, p);
      const isAdmin = r.role === "admin" || (r.user && r.user.type === "admin");
      if (!isAdmin) { $("lab-err").textContent = "Esta cuenta no es de laboratorio."; return; }
      Store.set(TOKEN_KEY, r.token);
      $("lab-pass").value = "";
      await loadAll(); show("lab-app");
    } catch (e) {
      $("lab-err").textContent = e.status === 401 ? "Usuario o contraseña incorrectos." : "No se pudo ingresar. Intenta de nuevo.";
    } finally { btn.disabled = false; btn.textContent = "Ingresar"; }
  }
  function logout() { Store.del(TOKEN_KEY); $("lab-pass").value = ""; show("lab-login"); }

  /* ---------- lista ---------- */
  async function loadAll() {
    const list = $("lab-list");
    list.innerHTML = '<div class="empty"><div class="em">🐾</div><p>Cargando…</p></div>';
    try { all = await apiAll(); render(); }
    catch (e) {
      if (e.status === 401 || e.status === 403) { logout(); return; }
      list.innerHTML = '<div class="empty"><div class="em">⚠️</div><p>No se pudo cargar la lista.</p></div>';
    }
  }

  function render() {
    const list = $("lab-list");
    const wantCollar = tab === "con";
    const q = search.trim().toLowerCase();
    const rows = all
      .filter((p) => !!p.hasCollar === wantCollar)
      .filter((p) => !q || (p.name || "").toLowerCase().includes(q) || (p.ownerName || "").toLowerCase().includes(q));

    if (!rows.length) {
      list.innerHTML = '<div class="empty"><div class="em">🐶</div><p>' +
        (q ? "Sin resultados para tu búsqueda." : (wantCollar ? "Aún no hay mascotas con collar." : "No hay mascotas pendientes de collar.")) +
        '</p></div>';
      return;
    }

    const iEye = '<svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>';
    const iTag = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h7l9 9-7 7-9-9V4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/></svg>';

    list.innerHTML = "";
    rows.forEach((pet) => {
      const emoji = pet.species === "cat" ? "🐱" : "🐶";
      const card = document.createElement("div");
      card.className = "card labcard";
      const action = wantCollar
        ? '<a class="linkbtn act" href="/m/' + encodeURIComponent(pet.publicCode) + '" target="_blank" rel="noopener">' + iEye + 'Ver</a>'
        : '<button class="linkbtn act" data-assign="' + pet.id + '">' + iTag + 'Asignar</button>';
      card.innerHTML =
        '<div class="ava">' + emoji + '</div>' +
        '<div><div class="nm">' + esc(pet.name) + '</div><div class="meta">' + esc(pet.ownerName || pet.ownerDisplayName || "") + '</div></div>' +
        action;
      list.appendChild(card);
    });

    list.querySelectorAll("[data-assign]").forEach((el) => {
      el.addEventListener("click", () => openAssign(all.find((p) => p.id === el.getAttribute("data-assign"))));
    });
  }

  /* ---------- asignar collar ---------- */
  function openAssign(pet) {
    assigning = pet;
    $("assign-emoji").textContent = pet.species === "cat" ? "🐱" : "🐶";
    $("assign-name").textContent = pet.name || "";
    $("assign-owner").textContent = pet.ownerName || pet.ownerDisplayName || "";
    $("assign-url").value = location.origin + "/m/" + pet.publicCode;
    const cb = $("assign-copy"); cb.textContent = "Copiar"; cb.classList.remove("ok");
    show("lab-assign");
  }

  async function copyUrl() {
    const url = $("assign-url").value;
    try { await navigator.clipboard.writeText(url); }
    catch (_) { const i = $("assign-url"); i.focus(); i.select(); try { document.execCommand("copy"); } catch (e) {} }
    const cb = $("assign-copy"); cb.textContent = "¡Copiado!"; cb.classList.add("ok");
    setTimeout(() => { cb.textContent = "Copiar"; cb.classList.remove("ok"); }, 1800);
  }

  async function markAssigned() {
    if (!assigning) return;
    const btn = $("assign-done"); btn.disabled = true; btn.textContent = "Guardando…";
    try {
      await apiSetCollar(assigning.id);
      const p = all.find((x) => x.id === assigning.id); if (p) p.hasCollar = true;
      toast("Collar asignado ✅");
      tab = "con";
      document.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === "con"));
      render(); show("lab-app");
    } catch (e) {
      toast("No se pudo marcar. Intenta de nuevo.");
    } finally { btn.disabled = false; btn.textContent = "Collar asignado"; }
  }

  /* ---------- boot ---------- */
  function bind() {
    $("lab-login-btn").addEventListener("click", doLogin);
    $("lab-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
    $("lab-logout").addEventListener("click", logout);
    $("lab-search").addEventListener("input", (e) => { search = e.target.value; render(); });
    document.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => {
      tab = b.dataset.tab;
      document.querySelectorAll(".seg-btn").forEach((x) => x.classList.toggle("active", x === b));
      render();
    }));
    $("assign-back").addEventListener("click", () => show("lab-app"));
    $("assign-copy").addEventListener("click", copyUrl);
    $("assign-done").addEventListener("click", markAssigned);
  }

  async function boot() {
    paintBrand(); bind();
    if (Store.get(TOKEN_KEY)) {
      try { await loadAll(); show("lab-app"); return; } catch (_) { Store.del(TOKEN_KEY); }
    }
    show("lab-login");
  }
  document.addEventListener("DOMContentLoaded", boot);
})();
