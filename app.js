
(function () {
  "use strict";

  const LPT_DEFAULT = 12;
  const LOCAL_KEY = "cuaderno-cosecha-v1";
  const S = { items: {}, open: null, armed: null, err: "", aviso: false, respaldo: false, edit: null };
  const app = document.getElementById("app");

  const nf0 = new Intl.NumberFormat("es-BO", { maximumFractionDigits: 2 });
  const nf2 = new Intl.NumberFormat("es-BO", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const num = (v) => { const n = parseFloat(String(v).replace(",", ".")); return isFinite(n) ? n : NaN; };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const uid = (p) => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  function calc(h) {
    const lpt = h.lpt || LPT_DEFAULT;
    const precio = +h.precio || 0;
    const rows = (h.trabajadores || []).map((w) => {
      const libras = (w.pesadas || []).reduce((a, b) => a + (+b || 0), 0);
      const teradas = libras / lpt;
      return { w, libras, teradas, pago: teradas * precio };
    });
    const tot = rows.reduce((a, r) => ({ libras: a.libras + r.libras, teradas: a.teradas + r.teradas, pago: a.pago + r.pago }), { libras: 0, teradas: 0, pago: 0 });
    return { rows, tot, lpt, precio };
  }

  function fechaLarga(f) {
    if (!f) return "Sin fecha";
    const [y, m, d] = f.split("-").map(Number);
    const meses = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
    return d + " de " + meses[m - 1] + " " + y;
  }
  function hoy() {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  function cargar() {
    try {
      const raw = localStorage.getItem(LOCAL_KEY);
      if (raw) {
        const items = JSON.parse(raw);
        if (items.c_ejemplo && items.c_ejemplo.creado === 1) delete items.c_ejemplo;
        for (const id in items) if (estaVacia(items[id])) delete items[id];
        return items;
      }
    } catch (e) { S.err = "No se pudo leer lo guardado en este celular."; }
    return {};
  }
  function estaVacia(h) {
    return !h.fecha && !String(h.lugar || "").trim() && (h.precio === "" || h.precio == null) && !(h.trabajadores || []).length;
  }
  function faltan(h) {
    const f = [];
    if (!h.fecha) f.push("fecha");
    if (!String(h.lugar || "").trim()) f.push("lugar");
    return f;
  }
  function guardar() {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(S.items)); S.err = ""; }
    catch (e) { S.err = "No se pudo guardar. Puede que el celular esté sin espacio."; }
  }

  let undo = null, toastT;
  function toast(msg, conDeshacer) {
    const el = document.getElementById("toast");
    el.innerHTML = "<span>" + esc(msg) + "</span>" + (conDeshacer ? '<button data-act="undo">Deshacer</button>' : "");
    el.hidden = false;
    clearTimeout(toastT);
    toastT = setTimeout(() => { el.hidden = true; undo = null; }, 3000);
  }
  function guardarDeshacer(id, msg) {
    undo = { id, data: JSON.parse(JSON.stringify(S.items[id])) };
    toast(msg, true);
  }

  /* ---------- acciones ---------- */
  const cur = () => S.items[S.open];
  function cambiar(fn, sinRender) {
    const h = cur(); if (!h) return;
    fn(h); guardar();
    if (!sinRender) render(); else actualizarCifras();
  }

  function agregarPesada(wid) {
    const inp = document.getElementById("peso-" + wid);
    const v = num(inp.value);
    if (!(v > 0)) { inp.focus(); toast("Escribe las libras de la pesada, por ejemplo 45."); return; }
    cambiar((h) => h.trabajadores.find((w) => w.id === wid).pesadas.push(v));
    const otra = document.getElementById("peso-" + wid);
    if (otra) { otra.value = ""; otra.focus(); }
  }
  function guardarEdicion() {
    const inp = document.getElementById("edit-peso");
    const v = num(inp.value);
    if (!(v > 0)) { inp.focus(); toast("Escribe las libras correctas, por ejemplo 45."); return; }
    const ed = S.edit; S.edit = null;
    guardarDeshacer(S.open, "Pesada corregida.");
    cambiar((h) => { h.trabajadores.find((x) => x.id === ed.w).pesadas[ed.j] = v; });
  }
  function agregarTrabajador() {
    const inp = document.getElementById("nuevo-nombre");
    const n = inp.value.trim();
    if (!n) { inp.focus(); toast("Escribe el nombre del trabajador."); return; }
    const id = uid("w");
    cambiar((h) => h.trabajadores.push({ id, nombre: n, pesadas: [] }));
    const p = document.getElementById("peso-" + id);
    if (p) p.focus();
  }
  function nuevaCosecha() {
    const id = uid("c");
    S.items[id] = { fecha: "", lugar: "", precio: "", lpt: LPT_DEFAULT, creado: Date.now(), trabajadores: [] };
    guardar(); S.open = id; entrar(); render(); window.scrollTo(0, 0);
  }

  /* ---------- navegación (botón atrás) ---------- */
  const enCosecha = () => !!(history.state && history.state.cosecha);
  function entrar() { history.pushState({ cosecha: S.open }, ""); }
  // Devuelve false si falta fecha o lugar: muestra la alerta y se queda en la cosecha.
  function intentarSalir() {
    const c = cur();
    if (c && estaVacia(c)) { delete S.items[S.open]; guardar(); return true; }
    if (c && faltan(c).length) {
      S.aviso = true; render(); window.scrollTo(0, 0);
      const f = faltan(c)[0];
      const inp = document.getElementById(f === "fecha" ? "f-fecha" : "f-lugar");
      if (inp) inp.focus();
      toast(f === "fecha" ? "Pon la fecha de la cosecha." : "Pon el lugar de la cosecha.");
      return false;
    }
    return true;
  }
  function cerrarCosecha() {
    S.aviso = false; S.open = null; S.armed = null; S.edit = null; render(); window.scrollTo(0, 0);
  }
  function armar(key) {
    S.armed = key; render();
    setTimeout(() => { if (S.armed === key) { S.armed = null; render(); } }, 3500);
  }

  function resumenTexto(h) {
    const c = calc(h), L = [];
    L.push("Cosecha " + fechaLarga(h.fecha) + (h.lugar ? " – " + h.lugar : ""));
    L.push("Precio: " + nf2.format(c.precio) + " Bs por terada (" + c.lpt + " libras)");
    L.push("");
    c.rows.forEach((r, i) => L.push((i + 1) + ". " + r.w.nombre + ": " + nf0.format(r.libras) + " lb = " + nf2.format(r.teradas) + " teradas = " + nf2.format(r.pago) + " Bs" + (r.w.pagado ? " (pagado)" : "")));
    L.push("");
    L.push("TOTAL: " + nf0.format(c.tot.libras) + " lb, " + nf2.format(c.tot.teradas) + " teradas, " + nf2.format(c.tot.pago) + " Bs");
    return L.join("\n");
  }
  async function copiarTexto(txt, idCaja, msgOk) {
    try { await navigator.clipboard.writeText(txt); toast(msgOk); }
    catch (e) {
      const ta = document.getElementById(idCaja);
      ta.hidden = false; ta.value = txt; ta.focus(); ta.select();
      toast("Mantén presionado el texto y elige Copiar.");
    }
  }
  async function compartir() {
    const txt = resumenTexto(cur());
    if (navigator.share) {
      try { await navigator.share({ text: txt }); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    copiarTexto(txt, "resumen-txt", "Resumen copiado. Pégalo en WhatsApp.");
  }

  function exportar() {
    const datos = JSON.stringify({ app: "cuaderno-cosecha", version: 1, guardado: new Date().toISOString(), cosechas: S.items }, null, 1);
    const blob = new Blob([datos], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "respaldo-cosechas-" + hoy() + ".json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast("Respaldo guardado en Descargas. Envíalo por WhatsApp para no perderlo.");
  }
  function importar(texto) {
    try {
      const d = JSON.parse(texto);
      const cos = d && d.cosechas;
      if (!cos || typeof cos !== "object") throw new Error("formato");
      let n = 0;
      for (const id in cos) {
        const c = cos[id];
        if (c && Array.isArray(c.trabajadores)) { S.items[id] = c; n++; }
      }
      guardar(); render();
      toast(n === 1 ? "Se recuperó 1 cosecha." : "Se recuperaron " + n + " cosechas.");
    } catch (e) {
      toast("Ese archivo no es un respaldo del Cuaderno de Cosecha.");
    }
  }
  document.getElementById("archivo-respaldo").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => importar(r.result);
    r.readAsText(f);
    e.target.value = "";
  });

  function estado() {
    return '<div class="status"><span class="dot"></span>Guardado en este celular. Funciona sin internet.</div>';
  }
  function alerta() { return S.err ? '<div class="card alerta">' + esc(S.err) + "</div>" : ""; }

  function vistaLista() {
    const lista = Object.entries(S.items).sort((a, b) => (b[1].fecha || "").localeCompare(a[1].fecha || "") || (b[1].creado || 0) - (a[1].creado || 0));
    let h = '<header style="display:flex;flex-direction:column;gap:6px"><h1>Cuaderno de Cosecha</h1>'
      + '<p class="muted">Anota las pesadas y te calcula el pago.</p>' + estado() + "</header>";
    h += alerta();
    h += '<button class="btn-main btn-wide" data-act="new">+ Nueva cosecha</button>';
    if (!lista.length) {
      h += '<div class="card empty"><h3>Todavía no hay cosechas</h3><p class="muted">Toca “Nueva cosecha” para empezar a anotar las pesadas.</p></div>';
    }
    lista.forEach(([id, c]) => {
      const k = calc(c);
      const key = "h:" + id;
      h += '<div class="harvest-item"><button class="harvest" data-act="open" data-id="' + esc(id) + '"><span><h3>' + esc(fechaLarga(c.fecha)) + '</h3><span class="muted small">'
        + esc(c.lugar || "Sin lugar") + " · " + k.rows.length + " trabajador" + (k.rows.length === 1 ? "" : "es") + "</span></span>"
        + '<span class="r num"><span class="bs">' + nf2.format(k.tot.pago) + ' Bs</span><br><span class="muted small">' + nf0.format(k.tot.libras) + " lb</span></span></button>"
        + '<button class="harvest-del' + (S.armed === key ? " armed" : "") + '" data-act="delitem" data-id="' + esc(id) + '">'
        + (S.armed === key ? "¿Eliminar? Toca otra vez" : "🗑 Eliminar") + "</button></div>";
    });
    h += '<section class="card"><h3>Respaldo</h3><p class="muted small">Las cosechas se guardan solo en este celular. Guarda un respaldo de vez en cuando y mándalo por WhatsApp, por si se pierde o se cambia el celular.</p>'
      + '<div class="acciones"><button class="btn-soft" data-act="export">Guardar respaldo</button><button class="btn-ghost" data-act="import">Recuperar respaldo</button></div></section>';
    return h;
  }

  function vistaCosecha() {
    const c = cur();
    if (!c) { S.open = null; return vistaLista(); }
    const k = calc(c);
    let h = '<div class="top"><button class="btn-ghost" data-act="back">← Cosechas</button></div>';
    h += alerta();
    const falta = S.aviso ? faltan(c) : [];
    if (!falta.length) S.aviso = false;
    if (falta.length) {
      const que = falta.length === 2 ? "la fecha y el lugar" : falta[0] === "fecha" ? "la fecha" : "el lugar";
      h += '<div class="card alerta" role="alert"><b>Falta ' + que + ' de la cosecha.</b> Escríbelo antes de volver, para no perder la cosecha en la lista.</div>';
    }
    h += '<section class="card"><h1>' + esc(c.fecha ? fechaLarga(c.fecha) : "Nueva cosecha") + '</h1><div class="row2">'
      + '<label>Fecha<input type="date" id="f-fecha" data-field="fecha"' + (falta.includes("fecha") ? ' class="falta"' : "") + ' value="' + esc(c.fecha) + '"></label>'
      + '<label>Lugar<input id="f-lugar" data-field="lugar"' + (falta.includes("lugar") ? ' class="falta"' : "") + ' placeholder="Ej. Las lomas" value="' + esc(c.lugar) + '"></label></div></section>';
    h += '<section class="card price"><label>Precio de venta (Bs por terada)<input id="f-precio" data-field="precio" inputmode="decimal" value="' + esc(c.precio) + '">'
      + '<span class="hint">Cuando cambie el precio de venta, cámbialo aquí: todos los pagos se recalculan solos. 1 terada = ' + k.lpt + " libras.</span></label></section>";

    k.rows.forEach((r, i) => {
      const w = r.w, key = "w:" + w.id;
      h += '<section class="card' + (w.pagado ? " pagada" : "") + '"><div class="worker-head"><h2>' + (i + 1) + ". " + esc(w.nombre) + '</h2><span class="muted small">'
        + w.pesadas.length + " pesada" + (w.pesadas.length === 1 ? "" : "s") + "</span></div>";
      h += '<div class="chips">' + (w.pesadas.length
        ? w.pesadas.map((p, j) => {
            const sel = S.edit && S.edit.w === w.id && S.edit.j === j;
            return '<button class="chip num' + (sel ? " sel" : "") + '" data-act="editw" data-w="' + w.id + '" data-j="' + j + '" aria-label="Corregir pesada de ' + nf0.format(p) + ' libras">' + nf0.format(p) + ' lb<span class="x" aria-hidden="true">✎</span></button>';
          }).join("")
        : '<span class="muted small">Sin pesadas todavía.</span>') + "</div>";
      if (S.edit && S.edit.w === w.id && w.pesadas[S.edit.j] !== undefined) {
        h += '<div class="edit-box"><label for="edit-peso">Corregir pesada ' + (S.edit.j + 1) + '</label>'
          + '<div class="add"><input id="edit-peso" inputmode="decimal" enterkeyhint="done" data-enter="editar" value="' + esc(w.pesadas[S.edit.j]) + '">'
          + '<button class="btn-main" data-act="saveedit">Guardar</button></div>'
          + '<div class="acciones"><button class="btn-danger" data-act="rmedit">Quitar pesada</button><button class="btn-ghost" data-act="canceledit">Cancelar</button></div></div>';
      }
      h += '<div class="add"><input id="peso-' + w.id + '" inputmode="decimal" enterkeyhint="done" placeholder="Libras de esta pesada" data-enter="peso" data-w="' + w.id + '">'
        + '<button class="btn-main" data-act="addw" data-w="' + w.id + '">Añadir</button></div>';
      h += '<div class="figures num"><div class="fig"><span class="lab">Libras</span><b>' + nf0.format(r.libras) + '</b></div>'
        + '<div class="fig"><span class="lab">Teradas</span><b>' + nf2.format(r.teradas) + '</b></div>'
        + '<div class="fig pay"><span class="lab">Pago Bs</span><b data-pago="' + w.id + '">' + nf2.format(r.pago) + "</b></div></div>";
      h += '<button class="pagado' + (w.pagado ? " si" : "") + '" data-act="pagado" data-w="' + w.id + '" aria-pressed="' + !!w.pagado + '">'
        + (w.pagado ? "✓ Pagado (tocar para desmarcar)" : "☐ Marcar como pagado") + "</button>";
      h += '<button class="' + (S.armed === key ? "btn-danger" : "btn-ghost") + '" data-act="delw" data-w="' + w.id + '">'
        + (S.armed === key ? "Toca otra vez para quitar a " + esc(w.nombre) : "Quitar trabajador") + "</button></section>";
    });

    h += '<section class="card"><label for="nuevo-nombre">Agregar trabajador</label><div class="add"><input id="nuevo-nombre" placeholder="Nombre" enterkeyhint="done" data-enter="nombre" autocomplete="off">'
      + '<button class="btn-soft" data-act="addworker">Agregar</button></div></section>';

    if (k.rows.length) {
      h += '<section class="card total"><h2>Total de la cosecha</h2><div class="figures num">'
        + '<div class="fig"><span class="lab">Libras</span><b>' + nf0.format(k.tot.libras) + '</b></div>'
        + '<div class="fig"><span class="lab">Teradas</span><b>' + nf2.format(k.tot.teradas) + '</b></div>'
        + '<div class="fig pay"><span class="lab">A pagar Bs</span><b data-pago="total">' + nf2.format(k.tot.pago) + "</b></div></div>"
        + '<p class="small muted" data-pago="pendiente">' + textoPendiente(k) + "</p></section>";
      h += '<section class="card"><h2>Resumen de pagos</h2><div class="table-wrap"><table><thead><tr><th>Nombre</th><th>Libras</th><th>Teradas</th><th>Pago Bs</th></tr></thead><tbody>'
        + k.rows.map((r) => "<tr><td>" + esc(r.w.nombre) + (r.w.pagado ? ' <span class="ok" title="Pagado">✓</span>' : "") + "</td><td>" + nf0.format(r.libras) + "</td><td>" + nf2.format(r.teradas) + '</td><td data-pago="t-' + r.w.id + '">' + nf2.format(r.pago) + "</td></tr>").join("")
        + '</tbody><tfoot><tr><td>Total</td><td>' + nf0.format(k.tot.libras) + "</td><td>" + nf2.format(k.tot.teradas) + '</td><td data-pago="t-total">' + nf2.format(k.tot.pago) + "</td></tr></tfoot></table></div>"
        + '<button class="btn-soft" data-act="share">Enviar resumen por WhatsApp</button>'
        + '<textarea id="resumen-txt" hidden rows="8" readonly></textarea></section>';
    }
    h += '<button class="' + (S.armed === "h" ? "btn-danger" : "btn-ghost") + '" data-act="delh">'
      + (S.armed === "h" ? "Toca otra vez para borrar esta cosecha" : "Borrar esta cosecha") + "</button>";
    return h;
  }

  function textoPendiente(k) {
    const pag = k.rows.filter((r) => r.w.pagado);
    if (!pag.length) return "Todavía no se marcó a nadie como pagado.";
    if (pag.length === k.rows.length) return "✓ Ya se les pagó a todos.";
    const ya = pag.reduce((a, r) => a + r.pago, 0);
    return "Pagados " + pag.length + " de " + k.rows.length + " · Falta pagar " + nf2.format(k.tot.pago - ya) + " Bs";
  }

  function render() {
    app.innerHTML = S.open ? vistaCosecha() : vistaLista();
  }
  function actualizarCifras() {
    const k = calc(cur());
    k.rows.forEach((r) => {
      document.querySelectorAll('[data-pago="' + r.w.id + '"],[data-pago="t-' + r.w.id + '"]').forEach((el) => { el.textContent = nf2.format(r.pago); });
    });
    document.querySelectorAll('[data-pago="total"],[data-pago="t-total"]').forEach((el) => { el.textContent = nf2.format(k.tot.pago); });
    const p = document.querySelector('[data-pago="pendiente"]'); if (p) p.textContent = textoPendiente(k);
  }

  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const act = b.dataset.act, w = b.dataset.w;
    if (act === "new") nuevaCosecha();
    else if (act === "open") { S.aviso = false; S.open = b.dataset.id; S.armed = null; S.edit = null; entrar(); render(); window.scrollTo(0, 0); }
    else if (act === "back") {
      // Con historial, el botón usa el mismo camino que el "atrás" del celular (popstate).
      if (enCosecha()) history.back();
      else if (intentarSalir()) cerrarCosecha();
    }
    else if (act === "pagado") {
      cambiar((h) => { const x = h.trabajadores.find((t) => t.id === w); x.pagado = !x.pagado; });
    }
    else if (act === "addw") agregarPesada(w);
    else if (act === "addworker") agregarTrabajador();
    else if (act === "editw") {
      S.edit = { w, j: +b.dataset.j }; render();
      const inp = document.getElementById("edit-peso");
      if (inp) { inp.focus(); inp.select(); }
    }
    else if (act === "saveedit") guardarEdicion();
    else if (act === "canceledit") { S.edit = null; render(); }
    else if (act === "rmedit") {
      const ed = S.edit; S.edit = null;
      guardarDeshacer(S.open, "Pesada quitada.");
      cambiar((h) => h.trabajadores.find((x) => x.id === ed.w).pesadas.splice(ed.j, 1));
    }
    else if (act === "delw") {
      if (S.armed !== "w:" + w) return armar("w:" + w);
      S.armed = null; guardarDeshacer(S.open, "Trabajador quitado.");
      cambiar((h) => { h.trabajadores = h.trabajadores.filter((x) => x.id !== w); });
    }
    else if (act === "delh") {
      if (S.armed !== "h") return armar("h");
      S.armed = null; const id = S.open; guardarDeshacer(id, "Cosecha borrada.");
      delete S.items[id]; guardar(); S.open = null; render();
      if (enCosecha()) history.back();
    }
    else if (act === "delitem") {
      const id = b.dataset.id;
      if (S.armed !== "h:" + id) return armar("h:" + id);
      S.armed = null; guardarDeshacer(id, "Cosecha eliminada."); undo.lista = true;
      delete S.items[id]; guardar(); render();
    }
    else if (act === "share") compartir();
    else if (act === "export") exportar();
    else if (act === "import") document.getElementById("archivo-respaldo").click();
    else if (act === "undo" && undo) {
      S.items[undo.id] = undo.data; guardar();
      if (!undo.lista && S.open !== undo.id) { S.open = undo.id; entrar(); }
      undo = null;
      document.getElementById("toast").hidden = true; render();
    }
  });

  document.addEventListener("input", (e) => {
    const f = e.target.dataset.field; if (!f || !S.open) return;
    let v = e.target.value;
    if (f === "precio") { if (v.trim() === "") v = ""; else { v = num(v); if (isNaN(v)) return; } }
    cambiar((h) => { h[f] = v; }, true);
    if (f === "fecha" || f === "lugar") e.target.classList.toggle("falta", S.aviso && !String(v).trim());
  });
  document.addEventListener("change", (e) => { if (e.target.dataset.field === "fecha") render(); });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter") return;
    const t = e.target.dataset.enter; if (!t) return;
    e.preventDefault();
    if (t === "peso") agregarPesada(e.target.dataset.w);
    else if (t === "editar") guardarEdicion();
    else agregarTrabajador();
  });

  // Botón/gesto "atrás" del celular: vuelve a la lista en vez de cerrar la app.
  window.addEventListener("popstate", () => {
    if (!S.open) { render(); return; }
    if (intentarSalir()) cerrarCosecha();
    else history.pushState({ cosecha: S.open }, "");
  });

  S.items = cargar();
  guardar();
  if (enCosecha()) history.replaceState(null, "");
  render();

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
  }
})();
