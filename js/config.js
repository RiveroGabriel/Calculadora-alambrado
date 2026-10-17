/* =========================================================
   config.js
   Valores por defecto y constantes de la app.
   Todo cuelga de window.AL para que los scripts se hablen
   entre sí sin módulos ES (compatible con file://).
   ========================================================= */

window.AL = window.AL || {};

AL.config = {
  // Centro inicial del mapa: Las Toscas, Santa Fe, Argentina
  centro: {
    lat: -28.35,
    lng: -59.25,
    zoom: 15
  },

  // Capas base disponibles
  capas: {
    satelite: {
      nombre: "Satélite",
      url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      atribucion: "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics",
      maxZoom: 19
    },
    calles: {
      nombre: "Calles",
      url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      atribucion: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }
  },

  // Capa que se muestra al abrir
  capaInicial: "satelite",

  // Parámetros del alambrado (sección 6 del plan)
  parametros: {
    hilos: 5,
    sepPoste: 10,
    sepVarilla: 2.5,
    atajoCada: 200,
    desperdicio: 5,
    largoRollo: 1000,
    anchoTranquera: 4,
    postesPorTranquera: 2
  },

  // Precios unitarios (opcionales, vacíos por defecto)
  precios: {
    poste: null,
    varilla: null,
    rolloAlambre: null,
    tranquera: null
  },

  // Estilo del dibujo sobre el mapa
  estilo: {
    colorLinea: "#FFB020",
    grosorLinea: 4,
    puntoFondo: "#FFFFFF",
    puntoBorde: "#2E5E3E",
    tamanoPunto: 22
  }
};
