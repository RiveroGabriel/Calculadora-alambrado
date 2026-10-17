/* =========================================================
   app.js
   Arranque de la app y conexión de los módulos.
   ========================================================= */

window.AL = window.AL || {};

document.addEventListener("DOMContentLoaded", function () {

  // 1) Mapa
  AL.map.iniciar();

  // Cada cambio en la medición refresca el panel de resultados
  AL.map.setAlCambiar(function () {
    AL.ui.actualizar();
  });

  // 2) Modo Línea / Corral
  const btnLinea = document.getElementById("btn-linea");
  if (btnLinea) {
    btnLinea.addEventListener("click", function () { AL.map.setModo("linea"); });
  }
  const btnCorral = document.getElementById("btn-corral");
  if (btnCorral) {
    btnCorral.addEventListener("click", function () { AL.map.setModo("corral"); });
  }

  // 3) Deshacer / Limpiar
  const btnDeshacer = document.getElementById("btn-deshacer");
  if (btnDeshacer) {
    btnDeshacer.addEventListener("click", function () { AL.map.deshacer(); });
  }
  const btnLimpiar = document.getElementById("btn-limpiar");
  if (btnLimpiar) {
    btnLimpiar.addEventListener("click", function () { AL.map.limpiar(); });
  }

  // 4) Mi ubicación / Capas
  const btnUbicacion = document.getElementById("btn-ubicacion");
  if (btnUbicacion) {
    btnUbicacion.addEventListener("click", function () { AL.map.verUbicacion(); });
  }
  const btnCapas = document.getElementById("btn-capas");
  if (btnCapas) {
    btnCapas.addEventListener("click", function () {
      AL.map.cambiarCapa();
      btnCapas.textContent = AL.map.getCapaActual() === "satelite" ? "Calles" : "Satélite";
    });
  }

  // 5) Abrir / cerrar el panel (hoja inferior en celular)
  const panel = document.getElementById("panel");
  const toggle = document.getElementById("panel-toggle");
  if (panel && toggle) {
    toggle.addEventListener("click", function () {
      const abierto = panel.classList.toggle("abierto");
      toggle.setAttribute("aria-expanded", abierto ? "true" : "false");
    });
  }

  // 6) Copiar resumen
  const btnCopiar = document.getElementById("btn-copiar");
  if (btnCopiar) {
    btnCopiar.addEventListener("click", function () { AL.ui.copiarResumen(); });
  }

  // Estado inicial del panel
  AL.ui.actualizar();

  // 7) Prueba obligatoria por consola (Fase 4)
  if (AL.calc.testCalc) AL.calc.testCalc();
});
