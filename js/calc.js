/* =========================================================
   calc.js
   Funciones puras de cálculo. NO toca el DOM ni localStorage.
   Todos los valores salen de config.js (recibidos como parámetro).
   Se puede portar tal cual a Angular/Java.
   ========================================================= */

window.AL = window.AL || {};

AL.calc = (function () {
  const RADIO_TIERRA = 6371000; // metros

  function aRadianes(grados) {
    return (grados * Math.PI) / 180;
  }

  // Distancia haversine entre dos puntos [lat, lng], en metros.
  function distanciaMetros(p1, p2) {
    const dLat = aRadianes(p2[0] - p1[0]);
    const dLng = aRadianes(p2[1] - p1[1]);
    const lat1 = aRadianes(p1[0]);
    const lat2 = aRadianes(p2[0]);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * RADIO_TIERRA * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  // Largo de cada tramo en metros. En 'corral' agrega el tramo de cierre.
  function largosTramos(puntos, tipo) {
    const largos = [];
    if (!puntos || puntos.length < 2) return largos;

    for (let i = 0; i < puntos.length - 1; i++) {
      largos.push(distanciaMetros(puntos[i], puntos[i + 1]));
    }
    if (tipo === "corral" && puntos.length >= 3) {
      largos.push(distanciaMetros(puntos[puntos.length - 1], puntos[0]));
    }
    return largos;
  }

  function largoTotal(puntos, tipo) {
    return largosTramos(puntos, tipo).reduce(function (s, d) { return s + d; }, 0);
  }

  // Superficie en m² (solo tiene sentido con >= 3 puntos).
  // Proyección equirectangular alrededor del centroide + fórmula del polígono.
  function calcularSuperficieM2(puntos) {
    if (!puntos || puntos.length < 3) return 0;

    const lat0 = puntos.reduce(function (s, p) { return s + p[0]; }, 0) / puntos.length;
    const lng0 = puntos.reduce(function (s, p) { return s + p[1]; }, 0) / puntos.length;
    const cosLat0 = Math.cos(aRadianes(lat0));

    const xy = puntos.map(function (p) {
      return [
        RADIO_TIERRA * aRadianes(p[1] - lng0) * cosLat0,
        RADIO_TIERRA * aRadianes(p[0] - lat0)
      ];
    });

    let suma = 0;
    for (let i = 0; i < xy.length; i++) {
      const x1 = xy[i][0], y1 = xy[i][1];
      const x2 = xy[(i + 1) % xy.length][0], y2 = xy[(i + 1) % xy.length][1];
      suma += x1 * y2 - x2 * y1;
    }
    return Math.abs(suma) / 2;
  }

  // Cuántos vanos (espacios) hay en un tramo de largo d.
  function vanosDelTramo(d, sepPoste) {
    return Math.max(1, Math.ceil(d / sepPoste));
  }

  /* ---------------------------------------------------------
     Cálculo principal.
     entrada = { puntos, tipo, tranqueras, parametros }
     Devuelve un objeto con todos los resultados (números crudos).
     --------------------------------------------------------- */
  function calcular(entrada) {
    const puntos = entrada.puntos || [];
    const tipo = entrada.tipo === "corral" ? "corral" : "linea";
    const tranqueras = Math.max(0, parseInt(entrada.tranqueras, 10) || 0);
    const prm = entrada.parametros;

    // 1-2. Largos y largo total
    const largos = largosTramos(puntos, tipo);
    const total = largos.reduce(function (s, d) { return s + d; }, 0);

    // 3. Largo neto a alambrar (descuenta las tranqueras)
    const largoNeto = Math.max(0, total - tranqueras * prm.anchoTranquera);

    // 4-5. Alambre y rollos
    const metrosAlambre = largoNeto * prm.hilos * (1 + prm.desperdicio / 100);
    const rollos = metrosAlambre > 0 ? Math.ceil(metrosAlambre / prm.largoRollo) : 0;

    // 6. Postes intermedios y varillas, tramo por tramo
    let postesIntermedios = 0;
    let varillas = 0;
    largos.forEach(function (d) {
      const n = vanosDelTramo(d, prm.sepPoste);
      postesIntermedios += Math.max(0, n - 1);
      const vanoReal = d / n;
      const varillasPorVano = Math.max(0, Math.ceil(vanoReal / prm.sepVarilla) - 1);
      varillas += n * varillasPorVano;
    });

    // 7-8. Esquinas/extremos y total de postes
    const postesEsquinas = puntos.length;
    const postesTranqueras = tranqueras * prm.postesPorTranquera;
    const postesTotal = postesEsquinas + postesIntermedios + postesTranqueras;

    // 9. Reforzados (informativo: esquinas + atajos)
    const reforzados = postesEsquinas + Math.floor(total / prm.atajoCada);

    // 10. Superficie (solo corral con >= 3 puntos)
    const superficieM2 = tipo === "corral" ? calcularSuperficieM2(puntos) : 0;
    const superficieHa = superficieM2 / 10000;

    return {
      tipo: tipo,
      tranqueras: tranqueras,
      cantidadPuntos: puntos.length,
      largos: largos,
      largoTotal: total,
      largoNeto: largoNeto,
      metrosAlambre: metrosAlambre,
      rollos: rollos,
      postesEsquinas: postesEsquinas,
      postesIntermedios: postesIntermedios,
      postesTranqueras: postesTranqueras,
      postesTotal: postesTotal,
      reforzados: reforzados,
      varillas: varillas,
      superficieM2: superficieM2,
      superficieHa: superficieHa
    };
  }

  // 11. Costo estimado: solo cuenta lo que tenga precio cargado.
  function costoEstimado(res, precios) {
    if (!precios) return 0;
    const items = [
      ["poste", res.postesTotal],
      ["varilla", res.varillas],
      ["rolloAlambre", res.rollos],
      ["tranquera", res.tranqueras]
    ];
    let total = 0;
    items.forEach(function (item) {
      const precio = precios[item[0]];
      const cantidad = item[1];
      if (precio != null && !isNaN(precio) && cantidad > 0) {
        total += precio * cantidad;
      }
    });
    return total;
  }

  /* ---------------------------------------------------------
     testCalc(): caso de aceptación del plan.
     Corral rectangular de 400 m x 250 m, parámetros por defecto,
     0 tranqueras. Tolerancia ±1 % por redondeo de coordenadas.
     --------------------------------------------------------- */
  function testCalc() {
    const prm = AL.config.parametros;

    // Construimos el rectángulo a partir de metros reales, usando
    // la misma matemática que la haversine (R = 6371000).
    const lat0 = -28.35;
    const lng0 = -59.25;
    const metrosPorGradoLat = (RADIO_TIERRA * Math.PI) / 180;
    const metrosPorGradoLng = metrosPorGradoLat * Math.cos(aRadianes(lat0));

    const dLat = 250 / metrosPorGradoLat; // 250 m en latitud
    const dLng = 400 / metrosPorGradoLng; // 400 m en longitud

    const puntos = [
      [lat0, lng0],
      [lat0 + dLat, lng0],
      [lat0 + dLat, lng0 + dLng],
      [lat0, lng0 + dLng]
    ];

    const res = calcular({ puntos: puntos, tipo: "corral", tranqueras: 0, parametros: prm });

    const esperado = {
      largoTotal: 1300,
      superficieHa: 10,
      metrosAlambre: 6825,
      rollos: 7,
      postesTotal: 130,
      varillas: 390
    };

    const real = {
      largoTotal: res.largoTotal,
      superficieHa: res.superficieHa,
      metrosAlambre: res.metrosAlambre,
      rollos: res.rollos,
      postesTotal: res.postesTotal,
      varillas: res.varillas
    };

    const filas = [];
    let todoOk = true;
    Object.keys(esperado).forEach(function (clave) {
      const tol = Math.abs(esperado[clave]) * 0.01;
      const ok = Math.abs(real[clave] - esperado[clave]) <= Math.max(tol, 0.5);
      if (!ok) todoOk = false;
      filas.push({
        Métrica: clave,
        Esperado: esperado[clave],
        Obtenido: Math.round(real[clave] * 100) / 100,
        Resultado: ok ? "OK" : "FALLA"
      });
    });

    console.group("testCalc() - corral 400 m x 250 m");
    console.table(filas);
    console.log("Detalle:", res);
    console.log(todoOk ? "testCalc(): TODOS LOS VALORES OK" : "testCalc(): HAY VALORES FUERA DE TOLERANCIA");
    console.groupEnd();

    return todoOk;
  }

  return {
    distanciaMetros: distanciaMetros,
    largosTramos: largosTramos,
    largoTotal: largoTotal,
    calcularSuperficieM2: calcularSuperficieM2,
    calcular: calcular,
    costoEstimado: costoEstimado,
    testCalc: testCalc
  };
})();
