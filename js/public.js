/* ============================================================
   Inu ID — Lógica de la página pública del collar
   ------------------------------------------------------------
   1. Lee el código del collar desde la URL:
        /m/qgl4hjdb        (ruta, vía rewrite de Vercel)
        m.html?code=xxxx   (respaldo local)
   2. Llama a GET /InuidPets/public/{code}
   3. Arma la página. Si isLost es true, muestra el modo perdido.
   ============================================================ */
(function () {
  const $ = (id) => document.getElementById(id);

  function getCode() {
    const q = new URLSearchParams(location.search).get("code");
    if (q) return q.trim();
    const m = location.pathname.match(/\/m\/([^/?#]+)/);
    return m ? decodeURIComponent(m[1]) : "";
  }

  function fill(pet) {
    // emoji por especie
    $("c-emoji").textContent = pet.species === "cat" ? "🐱" : "🐶";
    // foto de perfil si existe
    if (pet.photoUrl) {
      const im = $("c-photo"); im.src = pet.photoUrl; im.hidden = false;
      $("c-emoji").style.display = "none";
    }
    $("c-name").textContent = pet.name || "";
    const especie = pet.species === "cat" ? "Gato" : "Perro";
    const t1 = [especie, pet.breed].filter(Boolean).join(" · ");
    const tags = [t1, pet.sex, pet.age].filter(Boolean);
    $("c-tags").innerHTML = tags.map((t) => '<span class="tag">' + escapeHtml(t) + "</span>").join("");

    $("c-msg-normal").textContent = pet.msgNormal || "";
    $("c-msg-lost").textContent = pet.msgLost || "";

    $("c-owner").textContent = pet.ownerDisplayName || "";
    $("c-addr").textContent = pet.address || "";

    // datos importantes
    const health = [];
    if (pet.vaccinated) health.push("Vacunado");
    if (pet.microchip) health.push("Con microchip");
    if (health.length) $("c-health").textContent = health.join(" · ");
    else $("c-health-row").style.display = "none";

    if (pet.careNotes) $("c-care").textContent = pet.careNotes;
    else $("c-care-row").style.display = "none";

    if (!health.length && !pet.careNotes) $("c-important").style.display = "none";

    // acciones
    const phone = (pet.phone || "").replace(/\s+/g, "");
    const wa = (pet.whatsapp || pet.phone || "").replace(/[^0-9]/g, "");
    $("c-call").href = "tel:" + phone;
    $("c-wa").href = "https://wa.me/" + wa + "?text=" + encodeURIComponent("Hola, encontré a " + (pet.name || "tu mascota") + " 🐾");
    $("c-map").href = "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(pet.address || "");
    if (!wa) $("c-wa").style.display = "none";
    if (!pet.address) $("c-map").style.display = "none";

    // modo
    if (pet.isLost) document.body.classList.add("is-lost");

    $("loading").classList.add("hidden");
    $("content").classList.remove("hidden");
  }

  function notFound() {
    $("loading").classList.add("hidden");
    $("notfound").classList.remove("hidden");
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }

  async function init() {
    const code = getCode();
    if (!code) return notFound();
    try {
      const pet = await Api.publicPet(code);
      if (!pet) return notFound();
      fill(pet);
    } catch (e) {
      notFound();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
