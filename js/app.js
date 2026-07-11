/* ============================================================
   Inu ID — Lógica del panel del dueño
   ============================================================ */
(function () {
  const CFG = window.INUID_CONFIG;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const VIEWS = ["login", "register", "onboarding", "dashboard", "edit", "help"];
  function show(name) {
    VIEWS.forEach((v) => $("view-" + v).classList.toggle("hidden", v !== name));
    window.scrollTo(0, 0);
  }
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(window._t); window._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* icono de marca en cada lugar marcado con [data-brandicon] */
  function paintBrand() {
    const svg = $("brand-tpl").content.firstElementChild;
    document.querySelectorAll("[data-brandicon]").forEach((el) => { if (!el.firstChild) el.appendChild(svg.cloneNode(true)); });
    if (!CFG.DEMO) document.querySelectorAll("[data-demo-only]").forEach((el) => el.remove());
  }

  /* estado */
  let profile = null;      // { name, lastName, ... }
  let editingId = null;    // id de mascota en edición, o null = crear

  /* ============ AUTH ============ */
  async function doLogin() {
    const u = $("login-user").value.trim();
    const p = $("login-pass").value;
    $("login-err").textContent = "";
    if (!u || !p) { $("login-err").textContent = "Completa usuario y contraseña."; return; }
    const btn = $("login-btn"); btn.disabled = true; btn.textContent = "Ingresando…";
    try {
      const r = await Api.login(u, p);
      Api.saveToken(r.token);
      profile = r.inuidProfile || null;
      if (r.hasInuidProfile) { await loadDashboard(); show("dashboard"); }
      else { show("onboarding"); }
    } catch (e) {
      $("login-err").textContent = e.status === 401 ? "Usuario o contraseña incorrectos." : "No se pudo iniciar sesión. Intenta de nuevo.";
    } finally { btn.disabled = false; btn.textContent = "Ingresar"; }
  }

  async function doRegister() {
    const u = $("reg-user").value.trim();
    const p = $("reg-pass").value;
    const p2 = $("reg-pass2").value;
    $("reg-err").textContent = "";
    if (!u) { $("reg-err").textContent = "Elige un usuario."; return; }
    if (p.length < 6) { $("reg-err").textContent = "La contraseña debe tener al menos 6 caracteres."; return; }
    if (p !== p2) { $("reg-err").textContent = "Las contraseñas no coinciden."; return; }
    const btn = $("reg-btn"); btn.disabled = true; btn.textContent = "Creando…";
    try {
      const r = await Api.register(u, p);
      Api.saveToken(r.token);
      show("onboarding"); // recién creado: nunca tiene perfil de Inu ID todavía
    } catch (e) {
      $("reg-err").textContent = e.status === 409 ? "Ese usuario ya existe." : "No se pudo crear la cuenta. Intenta de nuevo.";
    } finally { btn.disabled = false; btn.textContent = "Continuar"; }
  }

  async function doOnboarding() {
    const data = {
      name: $("ob-name").value.trim(),
      lastName: $("ob-last").value.trim(),
      phone: $("ob-phone").value.trim(),
      email: $("ob-email").value.trim()
    };
    $("ob-err").textContent = "";
    if (!data.name || !data.lastName || !data.phone) { $("ob-err").textContent = "Completa nombre, apellido y teléfono."; return; }
    const btn = $("ob-btn"); btn.disabled = true; btn.textContent = "Guardando…";
    try {
      const r = await Api.onboarding(data);
      if (r.token) Api.saveToken(r.token);
      profile = r.profile || data;
      await loadDashboard(); show("dashboard");
    } catch (e) {
      $("ob-err").textContent = "No se pudo guardar. Intenta de nuevo.";
    } finally { btn.disabled = false; btn.textContent = "Entrar al panel"; }
  }

  function logout() { Api.clearToken(); profile = null; $("login-pass").value = ""; show("login"); }

  /* ============ DASHBOARD ============ */
  async function loadDashboard() {
    $("hello").textContent = "Hola" + (profile && profile.name ? ", " + profile.name : "") + " 👋";
    const list = $("pets-list");
    list.innerHTML = '<div class="empty"><div class="em">🐾</div><p>Cargando…</p></div>';
    try {
      const pets = await Api.listPets();
      renderPets(pets);
    } catch (e) {
      list.innerHTML = '<div class="empty"><div class="em">⚠️</div><p>No se pudieron cargar tus mascotas.</p></div>';
    }
  }

  function renderPets(pets) {
    const list = $("pets-list");
    if (!pets || !pets.length) {
      list.innerHTML = '<div class="empty"><div class="em">🐶</div><p>Aún no tienes mascotas.<br>Agrega la primera con el botón de arriba.</p></div>';
      return;
    }
    // iconos
    const iWarn = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 9v4m0 4h.01M10.3 4.3l-7 12A2 2 0 005 19.4h14a2 2 0 001.7-3l-7-12a2 2 0 00-3.4 0z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>';
    const iClock = '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.8"/><path d="M12 7v5l3 2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
    const iTag = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 4h7l9 9-7 7-9-9V4z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.4" fill="currentColor"/></svg>';
    const iEye = '<svg viewBox="0 0 24 24" fill="none"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8"/></svg>';

    list.innerHTML = "";
    pets.forEach((pet) => {
      const emoji = pet.species === "cat" ? "🐱" : "🐶";
      const meta = [pet.breed, pet.age].filter(Boolean).join(" · ") || (pet.species === "cat" ? "Gato" : "Perro");
      const editBtn = '<button class="linkbtn" data-edit="' + pet.id + '">Editar</button>';

      let pillClass, pillText, foot;
      if (pet.hasCollar) {
        pillClass = pet.isLost ? "lost" : "";
        pillText = pet.isLost ? "Perdido" : "En casa";
        const ver = pet.collarCode
          ? '<a class="linkbtn" href="m.html?code=' + encodeURIComponent(pet.collarCode) + '" target="_blank" rel="noopener">' + iEye + 'Ver</a>'
          : "";
        foot =
          '<div class="foot">' +
            '<label class="lostmini">Modo perdido<span class="switch"><input type="checkbox" ' + (pet.isLost ? "checked" : "") + ' data-lost="' + pet.id + '"><span class="slider"></span></span></label>' +
            ver + editBtn +
          '</div>';
      } else if (pet.collarRequested) {
        pillClass = "pending"; pillText = "Solicitado";
        foot =
          '<div class="foot col">' +
            '<div class="notice info">' + iClock + 'Collar solicitado — te lo enviaremos a casa pronto.</div>' +
            '<div class="cactions"><span class="spacer"></span>' + editBtn + '</div>' +
          '</div>';
      } else {
        pillClass = "muted"; pillText = "Sin collar";
        foot =
          '<div class="foot col">' +
            '<div class="notice warn">' + iWarn + 'Este perfil aún no está conectado a un collar.</div>' +
            '<div class="cactions"><button class="btn-req" data-request="' + pet.id + '">' + iTag + 'Solicitar collar</button><span class="spacer"></span>' + editBtn + '</div>' +
          '</div>';
      }

      const card = document.createElement("div");
      card.className = "card petcard";
      card.innerHTML =
        '<div class="head">' +
          '<div class="ava">' + emoji + '</div>' +
          '<div><div class="nm">' + esc(pet.name) + '</div><div class="meta">' + esc(meta) + '</div></div>' +
          '<div class="pill ' + pillClass + '">' + pillText + '</div>' +
        '</div>' + foot;
      list.appendChild(card);
    });

    // switches de perdido
    list.querySelectorAll("[data-lost]").forEach((el) => {
      el.addEventListener("change", async (e) => {
        const id = e.target.getAttribute("data-lost");
        const on = e.target.checked;
        const pill = e.target.closest(".petcard").querySelector(".pill");
        pill.textContent = on ? "Perdido" : "En casa";
        pill.classList.toggle("lost", on);
        try { await Api.setLost(id, on); toast(on ? "Modo perdido activado" : "Modo perdido desactivado"); }
        catch (_) { e.target.checked = !on; pill.textContent = !on ? "Perdido" : "En casa"; pill.classList.toggle("lost", !on); toast("No se pudo actualizar."); }
      });
    });
    // botones editar
    list.querySelectorAll("[data-edit]").forEach((el) => {
      el.addEventListener("click", () => openEdit(pets.find((p) => p.id === el.getAttribute("data-edit"))));
    });
    // botones solicitar collar
    list.querySelectorAll("[data-request]").forEach((el) => {
      el.addEventListener("click", async () => {
        const id = el.getAttribute("data-request");
        el.disabled = true; el.textContent = "Enviando…";
        try { await Api.requestCollar(id); toast("Solicitud enviada 🎉 Te lo enviaremos a casa."); await loadDashboard(); }
        catch (_) { el.disabled = false; el.textContent = "Solicitar collar"; toast("No se pudo enviar. Intenta de nuevo."); }
      });
    });
  }

  /* ============ EDITAR / CREAR ============ */
  const DEFAULT_MSG_NORMAL = "¡Hola! Soy amigable 🐾 Estos son mis datos, por si algún día me llego a perder.";
  const DEFAULT_MSG_LOST = "Si me encontraste, por favor avisa a mi familia — me están buscando. 🐾";

  function openEdit(pet) {
    editingId = pet ? pet.id : null;
    $("edit-title").textContent = pet ? "Editar mascota" : "Nueva mascota";
    const v = (id, val) => { $(id).value = val == null ? "" : val; };
    v("f_name", pet && pet.name);
    $("f_species").value = (pet && pet.species) || "dog";
    v("f_breed", pet && pet.breed);
    v("f_age", pet && pet.age);
    v("f_sex", pet && pet.sex);
    v("f_owner", pet && pet.ownerDisplayName);
    v("f_addr", pet && pet.address);
    v("f_phone", pet && pet.phone);
    v("f_wa", pet && pet.whatsapp);
    $("f_vac").checked = !!(pet && pet.vaccinated);
    $("f_chip").checked = !!(pet && pet.microchip);
    v("f_care", pet && pet.careNotes);
    v("f_msg_normal", pet ? pet.msgNormal : DEFAULT_MSG_NORMAL);
    v("f_msg_lost", pet ? pet.msgLost : DEFAULT_MSG_LOST);
    $("edit-err").textContent = "";
    setTab("datos"); setMode("normal");
    show("edit");
  }

  function collectForm() {
    return {
      name: $("f_name").value.trim(),
      species: $("f_species").value,
      breed: $("f_breed").value.trim(),
      sex: $("f_sex").value.trim(),
      age: $("f_age").value.trim(),
      ownerDisplayName: $("f_owner").value.trim(),
      address: $("f_addr").value.trim(),
      phone: $("f_phone").value.trim(),
      whatsapp: $("f_wa").value.trim(),
      vaccinated: $("f_vac").checked,
      microchip: $("f_chip").checked,
      careNotes: $("f_care").value.trim(),
      msgNormal: $("f_msg_normal").value.trim(),
      msgLost: $("f_msg_lost").value.trim()
    };
  }

  async function saveEdit() {
    const data = collectForm();
    $("edit-err").textContent = "";
    if (!data.name || !data.ownerDisplayName || !data.address || !data.phone) {
      $("edit-err").textContent = "Completa los campos marcados con *."; setTab("datos"); return;
    }
    const btn = $("save-btn"); btn.disabled = true; btn.textContent = "Guardando…";
    try {
      if (editingId) await Api.updatePet(editingId, data);
      else await Api.createPet(data);
      toast("Mascota guardada");
      await loadDashboard(); show("dashboard");
    } catch (e) {
      $("edit-err").textContent = "No se pudo guardar. Intenta de nuevo.";
    } finally { btn.disabled = false; btn.textContent = "Guardar"; }
  }

  /* ---- pestañas / modo / preview ---- */
  function setTab(name) {
    document.querySelectorAll(".seg-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    $("tab-datos").classList.toggle("hidden", name !== "datos");
    $("tab-preview").classList.toggle("hidden", name !== "preview");
    if (name === "preview") renderPreview();
  }
  function setMode(m) {
    document.querySelectorAll(".mode-btn").forEach((b) => b.classList.toggle("active", b.dataset.mode === m));
    $("pv").classList.toggle("pv-lost", m === "perdido");
  }
  function renderPreview() {
    const g = (id) => $(id).value.trim();
    $("pv-name").textContent = g("f_name") || "Tu mascota";
    $("pv-emoji").textContent = $("f_species").value === "cat" ? "🐱" : "🐶";
    const especie = $("f_species").selectedOptions[0].text;
    const t1 = [especie, g("f_breed")].filter(Boolean).join(" · ");
    const tags = [t1, g("f_sex"), g("f_age")].filter(Boolean);
    $("pv-tags").innerHTML = tags.map((t) => '<span class="pv-tag">' + esc(t) + "</span>").join("");
    $("pv-owner").textContent = g("f_owner") || "—";
    $("pv-addr").textContent = g("f_addr") || "—";
    const h = [];
    if ($("f_vac").checked) h.push("Vacunado");
    if ($("f_chip").checked) h.push("Con microchip");
    $("pv-health").textContent = h.join(" · ") || "—";
    $("pv-care").textContent = g("f_care") || "—";
    $("pv-msg-normal").textContent = g("f_msg_normal");
    $("pv-msg-lost").textContent = g("f_msg_lost");
  }

  /* ============ BOOT ============ */
  function bind() {
    $("login-btn").addEventListener("click", doLogin);
    $("login-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") doLogin(); });
    $("go-register").addEventListener("click", () => { $("reg-err").textContent = ""; show("register"); });
    $("go-login").addEventListener("click", () => { $("login-err").textContent = ""; show("login"); });
    $("reg-btn").addEventListener("click", doRegister);
    $("ob-btn").addEventListener("click", doOnboarding);
    $("logout-btn").addEventListener("click", logout);
    $("help-btn").addEventListener("click", () => show("help"));
    $("add-pet-btn").addEventListener("click", () => openEdit(null));
    $("save-btn").addEventListener("click", saveEdit);
    document.querySelectorAll("[data-back]").forEach((b) => b.addEventListener("click", () => show("dashboard")));
    document.querySelectorAll(".seg-btn").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.tab)));
    document.querySelectorAll(".mode-btn").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.mode)));
    ["f_name", "f_species", "f_breed", "f_age", "f_sex", "f_owner", "f_addr", "f_care", "f_vac", "f_chip", "f_msg_normal", "f_msg_lost"]
      .forEach((id) => { $(id).addEventListener("input", renderPreview); $(id).addEventListener("change", renderPreview); });
  }

  async function boot() {
    paintBrand();
    bind();
    // Sesión previa: si hay token, intentamos entrar directo al panel.
    if (Api.hasToken()) {
      try { await loadDashboard(); show("dashboard"); return; }
      catch (_) { Api.clearToken(); }
    }
    show("login");
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
