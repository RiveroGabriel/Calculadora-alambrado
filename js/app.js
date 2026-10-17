/* =========================================================
   app.js
   Arranque de la app y conexión de los módulos.
   ========================================================= */

window.AL = window.AL || {};

document.addEventListener("DOMContentLoaded", function () {
  // Fase 2: iniciar el mapa
  AL.map.iniciar();
  actualizarBotonCapas();

  // Alternar Satélite / Calles
  const btnCapas = document.getElementById("btn-capas");
  if (btnCapas) {
    btnCapas.addEventListener("click", function () {
      AL.map.cambiarCapa();
      actualizarBotonCapas();
    });
  }

  // Centrar en la ubicación del usuario
  const btnUbicacion = document.getElementById("btn-ubicacion");
  if (btnUbicacion) {
    btnUbicacion.addEventListener("click", function () {
      AL.map.verUbicacion();
    });
  }
});

// El botón muestra a qué capa se cambia al tocarlo.
function actualizarBotonCapas() {
  const btnCapas = document.getElementById("btn-capas");
  if (!btnCapas) return;
  btnCapas.textContent = AL.map.getCapaActual() === "satelite" ? "Calles" : "Satélite";
}
