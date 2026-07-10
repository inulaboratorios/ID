/* ============================================================
   Almacenamiento del token / sesión.
   Usa localStorage en producción; si el entorno lo bloquea
   (algunas vistas previas), cae a memoria sin romperse.
   ============================================================ */
(function () {
  const mem = {};
  function safe(fn, fallback) {
    try { return fn(); } catch (_) { return fallback(); }
  }
  window.Store = {
    get(key) {
      return safe(() => localStorage.getItem(key), () => (key in mem ? mem[key] : null));
    },
    set(key, value) {
      return safe(() => localStorage.setItem(key, value), () => { mem[key] = value; });
    },
    del(key) {
      return safe(() => localStorage.removeItem(key), () => { delete mem[key]; });
    }
  };
})();
