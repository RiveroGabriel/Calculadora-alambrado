/* =========================================================
   ui.js
   Render del panel de resultados y acciones del panel.
   Se apoya en AL.calc (cálculo) y AL.map (puntos dibujados).
   ========================================================= */

window.AL = window.AL || {};

AL.ui = (function () {
  // Tranqueras del alambrado en edición (se configura en la Fase 6)
  const estado = { tranqueras: 0 };

  // ---- formato de números (es-AR) ----
  function formatearEntero(n) {
    return Math.round(n).toLocaleString("es-AR");
  }
  function formatearHa(v) {
    return v.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
  }

  /* ---------------------------------------------------------
     actualizar(): se llama cada vez que cambia la medición.
     Recalcula y pinta el resultado en vivo.
     --------------------------------------------------------- */
  function actualizar() {
    const puntos = AL.map.getPuntos();
    const tipo = AL.map.getModo();
    const res = AL.calc.calcular({
      puntos: puntos,
      tipo: tipo,
      tranqueras: estado.tranqueras,
      parametros: AL.config.parametros
    });

    const pocos = puntos.length < 2;

    // Estado vacío
    const elVacio = document.getElementById("res-vacio");
    if (elVacio) {
      elVacio.hidden = !pocos;
      elVacio.textContent = puntos.length === 0
        ? "Tocá el mapa para marcar el primer punto."
        : "Marcá un segundo punto para cerrar un tramo.";
    }

    // Valores
    setTexto("res-largo", pocos ? "—" : formatearEntero(res.largoTotal));
    setTexto("res-alambre", pocos ? "—" : formatearEntero(res.metrosAlambre));
    setTexto("res-rollos", pocos ? "—" : formatearEntero(res.rollos));
    setTexto("res-postes", pocos ? "—" : formatearEntero(res.postesTotal));
    setTexto("res-reforzados", pocos ? "—" : formatearEntero(res.reforzados));
    setTexto("res-varillas", pocos ? "—" : formatearEntero(res.varillas));
    setTexto("res-tranqueras", formatearEntero(res.tranqueras));

    // Superficie (solo corral con 3+ puntos)
    const haySup = tipo === "corral" && puntos.length >= 3;
    setTexto("res-superficie", haySup ? formatearHa(res.superficieHa) : "—");
    setTexto("res-superficie-unidad", haySup ? formatearEntero(res.superficieM2) + " m²" : "hectáreas");

    // Detalle de postes
    setTexto("res-detalle-postes",
      "Esquinas/extremos: " + formatearEntero(res.postesEsquinas) +
      " · Intermedios: " + formatearEntero(res.postesIntermedios));

    // Costo (solo si hay precios cargados)
    const costo = AL.calc.costoEstimado(res, AL.config.precios);
    const elCosto = document.getElementById("res-costo");
    if (elCosto) {
      elCosto.hidden = costo <= 0;
      if (costo > 0) elCosto.textContent = "Costo estimado: $" + formatearEntero(costo);
    }

    // Resumen del encabezado del panel
    setTexto("panel-resumen",
      pocos ? "Sin puntos aún"
            : formatearEntero(res.largoTotal) + " m · " + formatearEntero(res.postesTotal) + " postes");

    // Botones
    setarPressionado("btn-linea", tipo === "linea");
    setarPressionado("btn-corral", tipo === "corral");
    deshabilitar("btn-deshacer", puntos.length === 0);
    deshabilitar("btn-limpiar", puntos.length === 0);
    deshabilitar("btn-copiar", pocos);

    return res;
  }

  function setarPressionado(id, activo) {
    const el = document.getElementById(id);
    if (el) el.setAttribute("aria-pressed", activo ? "true" : "false");
  }
  function deshabilitar(id, si) {
    const el = document.getElementById(id);
    if (el) el.disabled = !!si;
  }

  /* ---------------------------------------------------------
     Copiar resumen (texto listo para WhatsApp)
     --------------------------------------------------------- */
  function construirResumen() {
    const puntos = AL.map.getPuntos();
    const tipo = AL.map.getModo();
    const res = AL.calc.calcular({
      puntos: puntos,
      tipo: tipo,
      tranqueras: estado.tranqueras,
      parametros: AL.config.parametros
    });

    const lineas = [];
    lineas.push("Alambrado (" + (tipo === "corral" ? "corral" : "línea") + ")");
    lineas.push("Largo total: " + formatearEntero(res.largoTotal) + " m");
    if (tipo === "corral" && puntos.length >= 3) {
      lineas.push("Superficie: " + formatearHa(res.superficieHa) + " ha (" + formatearEntero(res.superficieM2) + " m²)");
    }
    lineas.push("Alambre: " + formatearEntero(res.metrosAlambre) + " m (" + AL.config.parametros.hilos + " hilos)");
    lineas.push("Rollos: " + res.rollos);
    lineas.push("Postes: " + formatearEntero(res.postesTotal) +
      " (" + formatearEntero(res.postesEsquinas) + " esquinas/extremos + " +
      formatearEntero(res.postesIntermedios) + " intermedios)");
    lineas.push("Reforzados: " + formatearEntero(res.reforzados));
    lineas.push("Varillas: " + formatearEntero(res.varillas));
    if (res.tranqueras > 0) lineas.push("Tranqueras: " + res.tranqueras);
    return lineas.join("\n");
  }

  function copiarResumen() {
    const texto = construirResumen();
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(texto).then(
        function () { avisoCopia(true); },
        function () { copiarFallback(texto); }
      );
    } else {
      copiarFallback(texto);
    }
  }

  // Alternativa para file:// donde navigator.clipboard puede no estar disponible
  function copiarFallback(texto) {
    const ta = document.createElement("textarea");
    ta.value = texto;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-1000px";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    avisoCopia(ok);
  }

  function avisoCopia(ok) {
    const btn = document.getElementById("btn-copiar");
    if (!btn) return;
    const original = "Copiar resumen";
    btn.textContent = ok ? "¡Copiado!" : "No se pudo copiar";
    setTimeout(function () { btn.textContent = original; }, 1600);
  }

  return {
    actualizar: actualizar,
    copiarResumen: copiarResumen,
    construirResumen: construirResumen,
    getEstado: function () { return estado; }
  };
})();
