/* ============================================================
   Inu ID — Capa de API
   ------------------------------------------------------------
   Cada función habla con un endpoint real del backend de Jose.
   Si INUID_CONFIG.DEMO es true, devuelve datos simulados en su
   lugar (para poder ver el front sin servidor).

   Endpoints reales (base: INUID_CONFIG.API_BASE):
     POST  /Auth/v2/register
     POST  /Auth/v2/login
     POST  /Auth/v2/onboarding-inuid        [auth]
     GET   /InuidPets                         [auth]
     POST  /InuidPets                         [auth]
     PUT   /InuidPets/{id}                     [auth]
     PATCH /InuidPets/{id}/lost                [auth]
     GET   /InuidPets/public/{code}           (público, sin auth)
   ============================================================ */
(function () {
  const CFG = window.INUID_CONFIG;
  const TOKEN_KEY = "inuid_token";

  /* ---------- helper de red ---------- */
  async function req(method, path, body, auth) {
    const headers = { "Content-Type": "application/json" };
    if (auth) {
      const t = Store.get(TOKEN_KEY);
      if (t) headers["Authorization"] = "Bearer " + t;
    }
    const res = await fetch(CFG.API_BASE + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    if (!res.ok) {
      const err = new Error("HTTP " + res.status);
      err.status = res.status;
      try { err.data = await res.json(); } catch (_) {}
      throw err;
    }
    if (res.status === 204) return null;
    try { return await res.json(); } catch (_) { return null; }
  }

  /* ================= DEMO ================= */
  const uid = () => "demo-" + Math.random().toString(36).slice(2, 9);
  let demoProfile = { id: "demo", name: "María", lastName: "Fernández", phone: "+51 987 654 321", email: "" };
  let demoPets = [
    {
      id: "demo-max", name: "Max", species: "dog", breed: "Husky", sex: "Macho", age: "3 años",
      ownerDisplayName: "María Fernández", address: "Av. Los Álamos 245, Surco, Lima",
      phone: "+51 987 654 321", whatsapp: "+51 987 654 321",
      vaccinated: true, microchip: true,
      careNotes: "Alérgico a algunos alimentos — no me des comida",
      msgNormal: "¡Hola! Soy amigable 🐾 Estos son mis datos, por si algún día me llego a perder.",
      msgLost: "Soy amigable y me asusto con los carros. Si me encontraste, por favor avisa a mi familia — ellos me están buscando. 🐾",
      isLost: false, hasCollar: true, collarCode: "demo1234"
    },
    {
      id: "demo-luna", name: "Luna", species: "cat", breed: "Siamesa", sex: "Hembra", age: "2 años",
      ownerDisplayName: "María Fernández", address: "Av. Los Álamos 245, Surco, Lima",
      phone: "+51 987 654 321", whatsapp: "+51 987 654 321",
      vaccinated: true, microchip: false,
      careNotes: "Es tímida, no la persigas",
      msgNormal: "¡Hola! Soy Luna 🐾 Estos son mis datos.",
      msgLost: "Me perdí y soy miedosa. Por favor avisa a mi familia con calma. 🐾",
      isLost: false, hasCollar: false, collarRequested: false, collarCode: null
    }
  ];
  const wait = (v) => new Promise((r) => setTimeout(() => r(v), 250));

  /* ================= API pública del módulo ================= */
  window.Api = {
    saveToken(t) { if (t) Store.set(TOKEN_KEY, t); },
    clearToken() { Store.del(TOKEN_KEY); },
    hasToken() { return !!Store.get(TOKEN_KEY); },

    async register(username, password) {
      if (CFG.DEMO) return wait({ token: "demo-token", hasProfile: false, identityId: "demo" });
      return req("POST", "/Auth/v2/register", { username, password }, false);
    },

    async login(username, password) {
      if (CFG.DEMO) {
        // En demo, cualquier credencial entra y ya tiene perfil de Inu ID.
        return wait({ token: "demo-token", hasProfile: false, hasInuidProfile: true, user: null, inuidProfile: demoProfile });
      }
      return req("POST", "/Auth/v2/login", { username, password }, false);
    },

    async onboarding(data) {
      if (CFG.DEMO) { demoProfile = { id: "demo", ...data }; return wait({ token: "demo-token2", hasInuidProfile: true, profile: demoProfile }); }
      return req("POST", "/Auth/v2/onboarding-inuid", data, true);
    },

    async listPets() {
      if (CFG.DEMO) return wait(demoPets.map((p) => ({ ...p })));
      return req("GET", "/InuidPets", null, true);
    },

    async createPet(data) {
      if (CFG.DEMO) { const p = { id: uid(), isLost: false, hasCollar: false, collarRequested: false, collarCode: null, ...data }; demoPets.push(p); return wait({ id: p.id, name: p.name, species: p.species }); }
      return req("POST", "/InuidPets", data, true);
    },

    async updatePet(id, data) {
      if (CFG.DEMO) { const p = demoPets.find((x) => x.id === id); if (p) Object.assign(p, data); return wait({ message: "Mascota actualizada" }); }
      return req("PUT", "/InuidPets/" + id, data, true);
    },

    async setLost(id, isLost) {
      if (CFG.DEMO) { const p = demoPets.find((x) => x.id === id); if (p) p.isLost = isLost; return wait({ id, isLost }); }
      return req("PATCH", "/InuidPets/" + id + "/lost", { isLost }, true);
    },

    // Solicitar un collar para una mascota (el dueño hace el pedido).
    // ⚠️ Endpoint PROPUESTO: aún no existe en el backend de Jose; ver nota para él.
    async requestCollar(id) {
      if (CFG.DEMO) { const p = demoPets.find((x) => x.id === id); if (p) p.collarRequested = true; return wait({ ok: true }); }
      return req("POST", "/InuidPets/" + id + "/request-collar", {}, true);
    },

    async publicPet(code) {
      if (CFG.DEMO) {
        const p = demoPets.find((x) => x.collarCode === code) || demoPets[0];
        if (!p) { const e = new Error("not found"); e.status = 404; throw e; }
        const { id, hasCollar, collarCode, createdAt, ...pub } = p; // ocultar campos internos
        return wait(pub);
      }
      return req("GET", "/InuidPets/public/" + encodeURIComponent(code), null, false);
    }
  };
})();
