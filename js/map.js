/* =========================================================
   map.js
   Leaflet: mapa base, capas, puntos, tramos y etiquetas.
   La lógica de cálculo vive en calc.js; acá solo se dibuja.
   ========================================================= */

window.AL = window.AL || {};

AL.map = (function () {
  let mapa = null;
  let capaActual = null;
  let modo = "linea"; // 'linea' | 'corral'

  const capas = {};

  let puntos = [];        // [[lat, lng], ...]
  const marcadores = [];  // un L.marker por punto
  let capaTramos = null;  // L.layerGroup con líneas y etiquetas
  let alCambiar = null;   // callback que avisa a la UI

  // ---- utilidades de formato (solo presentación) ----
  function formatoMetros(m) {
    if (m >= 100) return Math.round(m).toLocaleString("es-AR") + " m";
    if (m >= 10) return Math.round(m) + " m";
    return m.toFixed(1).replace(".", ",") + " m";
  }

  function notificar() {
    if (typeof alCambiar === "function") alCambiar();
  }

  // ---- inicialización ----
  function iniciar() {
    const cfg = AL.config;

    mapa = L.map("map", {
      center: [cfg.centro.lat, cfg.centro.lng],
      zoom: cfg.centro.zoom,
      zoomControl: false,
      attributionControl: false
    });

    // Controles abajo para no chocar con la barra de herramientas
    L.control.zoom({ position: "bottomright" }).addTo(mapa);
    L.control.attribution({ position: "bottomleft", prefix: false }).addTo(mapa);

    capas.satelite = L.tileLayer(cfg.capas.satelite.url, {
      attribution: cfg.capas.satelite.atribucion,
      maxZoom: cfg.capas.satelite.maxZoom
    });
    capas.calles = L.tileLayer(cfg.capas.calles.url, {
      attribution: cfg.capas.calles.atribucion,
      maxZoom: cfg.capas.calles.maxZoom
    });

    capaActual = cfg.capaInicial;
    capas[capaActual].addTo(mapa);

    capaTramos = L.layerGroup().addTo(mapa);
    modo = "linea";

    // Tocar/clickear el mapa agrega un punto
    mapa.on("click", function (e) {
      agregarPunto(e.latlng.lat, e.latlng.lng);
    });

    return mapa;
  }

  // ---- puntos ----
  function crearMarcador(lat, lng, indice) {
    const estilo = AL.config.estilo;
    const tam = estilo.tamanoPunto;
    const icono = L.divIcon({
      className: "punto-alambre",
      iconSize: [tam, tam],
      iconAnchor: [tam / 2, tam / 2]
    });

    const marcador = L.marker([lat, lng], {
      icon: icono,
      draggable: true,
      keyboard: false
    }).addTo(mapa);

    // Arrastrar el punto (funciona con mouse y con el dedo)
    marcador.on("drag", function () {
      const p = marcador.getLatLng();
      puntos[indice] = [p.lat, p.lng];
      redibujar();
      notificar();
    });

    return marcador;
  }

  function agregarPunto(lat, lng) {
    const indice = puntos.length;
    puntos.push([lat, lng]);
    marcadores.push(crearMarcador(lat, lng, indice));
    redibujar();
    notificar();
  }

  function deshacer() {
    if (!puntos.length) return;
    puntos.pop();
    const marcador = marcadores.pop();
    if (marcador) mapa.removeLayer(marcador);
    redibujar();
    notificar();
  }

  function limpiar() {
    if (!puntos.length) return;
    marcadores.forEach(function (m) { mapa.removeLayer(m); });
    marcadores.length = 0;
    puntos = [];
    redibujar();
    notificar();
  }

  // ---- dibujo de líneas y etiquetas ----
  function agregarEtiqueta(a, b, metros) {
    const lat = (a[0] + b[0]) / 2;
    const lng = (a[1] + b[1]) / 2;
    // El div externo queda de 0x0; el texto se centra con CSS adentro
    // (no se puede usar transform en el div porque Leaflet lo usa para posicionar).
    const icono = L.divIcon({
      className: "etiqueta-tramo-wrap",
      html: '<span class="etiqueta-tramo">' + formatoMetros(metros) + "</span>",
      iconSize: [0, 0],
      iconAnchor: [0, 0]
    });
    capaTramos.addLayer(L.marker([lat, lng], { icon: icono, interactive: false }));
  }

  function redibujar() {
    capaTramos.clearLayers();

    const n = puntos.length;
    if (n < 2) return;

    const estilo = AL.config.estilo;
    const largos = AL.calc.largosTramos(puntos, modo);

    // Línea principal (tramos consecutivos)
    capaTramos.addLayer(L.polyline(puntos, {
      color: estilo.colorLinea,
      weight: estilo.grosorLinea,
      opacity: 0.95
    }));

    // Cierre del corral, punteado
    const cierra = modo === "corral" && n >= 3;
    if (cierra) {
      capaTramos.addLayer(L.polyline([puntos[n - 1], puntos[0]], {
        color: estilo.colorLinea,
        weight: estilo.grosorLinea,
        opacity: 0.95,
        dashArray: "6,8"
      }));
    }

    // Etiquetas de metros por tramo (mismo orden que largosTramos)
    let k = 0;
    for (let i = 0; i < n - 1; i++) {
      agregarEtiqueta(puntos[i], puntos[i + 1], largos[k++]);
    }
    if (cierra) {
      agregarEtiqueta(puntos[n - 1], puntos[0], largos[k++]);
    }
  }

  // ---- capas ----
  function cambiarCapa() {
    mapa.removeLayer(capas[capaActual]);
    capaActual = capaActual === "satelite" ? "calles" : "satelite";
    capas[capaActual].addTo(mapa);
    return capaActual;
  }

  function verUbicacion() {
    if (!navigator.geolocation) {
      window.alert("Tu dispositivo no permite geolocalización.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        mapa.setView([lat, lng], 17);
        L.marker([lat, lng]).addTo(mapa).bindPopup("Estás acá").openPopup();
      },
      function (err) {
        window.alert("No pudimos obtener tu ubicación: " + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }

  // ---- modo ----
  function setModo(nuevo) {
    if (nuevo !== "linea" && nuevo !== "corral") return;
    modo = nuevo;
    redibujar();
    notificar();
  }

  // ---- getters / callback ----
  function getPuntos() {
    return puntos.map(function (p) { return [p[0], p[1]]; });
  }
  function getModo() { return modo; }
  function getMapa() { return mapa; }
  function getCapaActual() { return capaActual; }
  function setAlCambiar(fn) { alCambiar = fn; }

  return {
    iniciar: iniciar,
    agregarPunto: agregarPunto,
    deshacer: deshacer,
    limpiar: limpiar,
    setModo: setModo,
    cambiarCapa: cambiarCapa,
    verUbicacion: verUbicacion,
    getPuntos: getPuntos,
    getModo: getModo,
    getMapa: getMapa,
    getCapaActual: getCapaActual,
    setAlCambiar: setAlCambiar
  };
})();
