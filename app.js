/* ============================================================================
   CAPA WEB-APP (Actividad 2) — Gloria Palace Amadores
   Módulos:  A1 Service worker   A2 Instalación   A3 Barra de pestañas
             A4 GPS ("Cómo llegar")   A5 Voz en el asistente   A6 Medición
   Todo es mejora progresiva: si el navegador no soporta una API, esa función
   simplemente no aparece y el resto de la web sigue funcionando.
   ============================================================================ */
(function () {
  'use strict';

  var HOTEL = { lat: 27.7853, lng: -15.7187 };               // coordenadas del mapa de la web
  var standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  /* ---- A6 · Medición (variables de interacción) ---------------------------
     Solo se guarda si el usuario aceptó la categoría "Medición" (S4 de la web).
     Los datos se quedan en el navegador; para analizarlos habría que enviarlos a
     un backend o a una herramienta de analítica (ver documento, apartado variables). */
  function track(evento, datos) {
    try {
      if (!window.Consentimiento || !window.Consentimiento.permite('medicion')) return;
      var lista = JSON.parse(localStorage.getItem('gpa_app_eventos') || '[]');
      lista.push({ t: Date.now(), e: evento, d: datos || null, app: standalone });
      localStorage.setItem('gpa_app_eventos', JSON.stringify(lista.slice(-100)));
    } catch (err) { /* sin almacenamiento: no pasa nada */ }
  }
  window.gpaApp = { eventos: function () { try { return JSON.parse(localStorage.getItem('gpa_app_eventos') || '[]'); } catch (e) { return []; } } };
  if (/[?&]origen=app/.test(location.search) || standalone) track('sesion_app');

  /* ---- A1 · Service worker ---- */
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  /* ---- A2 · Instalación ---- */
  var pedido = null;
  var banner = document.createElement('div');
  banner.className = 'appinstalar'; banner.hidden = true;
  banner.setAttribute('role', 'region'); banner.setAttribute('aria-label', 'Instalar la app');
  document.body.appendChild(banner);

  function mostrarBanner(texto, conBoton) {
    if (standalone || sessionStorage.getItem('gpa_app_oculto')) return;
    banner.innerHTML = '<p>' + texto + '</p>' + (conBoton ? '<button class="si" type="button">Instalar</button>' : '') +
      '<button class="no" type="button" aria-label="Cerrar">Ahora no</button>';
    banner.hidden = false;
    track('instalar_mostrado');
    banner.querySelector('.no').onclick = function () { banner.hidden = true; sessionStorage.setItem('gpa_app_oculto', '1'); };
    var si = banner.querySelector('.si');
    if (si) si.onclick = function () {
      banner.hidden = true;
      pedido.prompt();
      pedido.userChoice.then(function (r) { track('instalar_' + r.outcome); pedido = null; });
    };
  }

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); pedido = e;
    setTimeout(function () { if (pedido) mostrarBanner('Instala la app del hotel: acceso directo, modo sin conexión y pantalla completa.', true); }, 8000);
  });
  window.addEventListener('appinstalled', function () { banner.hidden = true; track('app_instalada'); });

  var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (esIOS && !standalone) {
    setTimeout(function () {
      mostrarBanner('Para instalar la app: toca <strong>Compartir</strong> y después <strong>Añadir a pantalla de inicio</strong>.', false);
    }, 8000);
  }

  /* ---- A3 · Barra de pestañas ---- */
  var ICON = {
    inicio: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    hab: '<path d="M3 18V8M3 14h18v4M21 14v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="1.5"/>',
    spa: '<path d="M2 15c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 20c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M12 3c3 3 3 6 0 8-3-2-3-5 0-8z"/>',
    res: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/>',
    gps: '<path d="M12 21s7-6.2 7-11a7 7 0 0 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>'
  };
  var tabs = [['#top', 'Inicio', 'inicio'], ['#habitaciones', 'Habitaciones', 'hab'], ['#thalasso', 'Thalasso', 'spa'], ['#reserva', 'Reservar', 'res']];
  var nav = document.createElement('nav');
  nav.className = 'appbar'; nav.setAttribute('aria-label', 'Navegación de la app');
  nav.innerHTML = tabs.map(function (t) {
    return '<a href="' + t[0] + '"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON[t[2]] + '</svg>' + t[1] + '</a>';
  }).join('') + '<button type="button" id="app-llegar"><svg viewBox="0 0 24 24" aria-hidden="true">' + ICON.gps + '</svg>Llegar</button>';
  document.body.appendChild(nav);
  nav.addEventListener('click', function (e) { var a = e.target.closest('a'); if (a) track('pestana', a.getAttribute('href')); });

  if ('IntersectionObserver' in window) {
    var enlaces = {};
    [].forEach.call(nav.querySelectorAll('a'), function (a) { enlaces[a.getAttribute('href').slice(1)] = a; });
    var io = new IntersectionObserver(function (items) {
      items.forEach(function (it) {
        if (!it.isIntersecting) return;
        [].forEach.call(nav.querySelectorAll('a'), function (a) { a.classList.remove('activo'); });
        var a = enlaces[it.target.id]; if (a) a.classList.add('activo');
      });
    }, { rootMargin: '-45% 0px -45% 0px' });
    ['habitaciones', 'thalasso', 'reserva'].forEach(function (id) { var s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* ---- A4 · GPS: "Cómo llegar" ---- */
  var hoja = document.createElement('div');
  hoja.className = 'appsheet'; hoja.hidden = true;
  hoja.innerHTML = '<div class="appsheet__caja" role="dialog" aria-modal="true" aria-labelledby="app-llegar-t">' +
    '<h2 id="app-llegar-t">Cómo llegar</h2><p>Calle La Palma, 2 · 35139 Mogán. Si quieres, calculamos la distancia desde donde estás. ' +
    'Tu ubicación se usa solo en tu dispositivo y no se guarda ni se envía.</p>' +
    '<div class="appsheet__resultado" id="app-llegar-r" aria-live="polite">Pulsa «Usar mi ubicación».</div>' +
    '<div class="appsheet__acciones"><button type="button" id="app-gps">Usar mi ubicación</button>' +
    '<a class="sec" id="app-ruta" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + HOTEL.lat + ',' + HOTEL.lng + '">Abrir en Google Maps</a>' +
    '<button class="sec" type="button" id="app-compartir" hidden>Compartir hotel</button>' +
    '<button class="sec" type="button" id="app-cerrar">Cerrar</button></div></div>';
  document.body.appendChild(hoja);

  function km(a, b, c, d) {                                  // fórmula de Haversine
    var R = 6371, r = Math.PI / 180, dLat = (c - a) * r, dLng = (d - b) * r;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(x));
  }
  var res = hoja.querySelector('#app-llegar-r');
  function abrir() { hoja.hidden = false; track('llegar_abierto'); hoja.querySelector('#app-gps').focus(); }
  function cerrar() { hoja.hidden = true; }
  document.getElementById('app-llegar').addEventListener('click', abrir);
  hoja.querySelector('#app-cerrar').addEventListener('click', cerrar);
  hoja.addEventListener('click', function (e) { if (e.target === hoja) cerrar(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !hoja.hidden) cerrar(); });

  var botonGps = hoja.querySelector('#app-gps');
  if (!('geolocation' in navigator)) { botonGps.hidden = true; res.textContent = 'Tu dispositivo no permite la geolocalización. Usa el botón de Google Maps.'; }
  botonGps.addEventListener('click', function () {
    res.textContent = 'Buscando tu ubicación…';
    navigator.geolocation.getCurrentPosition(function (p) {
      var d = km(p.coords.latitude, p.coords.longitude, HOTEL.lat, HOTEL.lng);
      res.textContent = d < 0.5 ? 'Ya estás junto al hotel.' : 'Estás a unos ' + d.toFixed(1).replace('.', ',') + ' km del hotel en línea recta.';
      hoja.querySelector('#app-ruta').href = 'https://www.google.com/maps/dir/?api=1&origin=' + p.coords.latitude + ',' + p.coords.longitude + '&destination=' + HOTEL.lat + ',' + HOTEL.lng;
      hoja.querySelector('#app-ruta').textContent = 'Ruta desde mi posición';
      track('gps_ok', { km: Math.round(d) });                // solo la distancia redondeada, nunca las coordenadas
    }, function (err) {
      res.textContent = err.code === 1 ? 'No tenemos permiso para ver tu ubicación. Puedes activarlo en los ajustes del navegador o abrir Google Maps.' : 'No hemos podido obtener tu ubicación. Inténtalo de nuevo.';
      track('gps_error', { codigo: err.code });
    }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 });
  });

  if (navigator.share) {
    var bc = hoja.querySelector('#app-compartir'); bc.hidden = false;
    bc.addEventListener('click', function () {
      navigator.share({ title: document.title, text: 'Gloria Palace Amadores Thalasso & Hotel', url: location.href.split('#')[0] })
        .then(function () { track('compartir'); }).catch(function () {});
    });
  }

  /* ---- A5 · Reconocimiento de voz en el asistente ---- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var form = document.getElementById('formulario-asistente');
  var campo = document.getElementById('pregunta');
  if (SR && form && campo) {
    var mic = document.createElement('button');
    mic.type = 'button'; mic.className = 'asistente__voz'; mic.setAttribute('aria-label', 'Dictar la pregunta por voz');
    mic.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>';
    form.insertBefore(mic, form.querySelector('.asistente__enviar'));
    var rec = null;
    mic.addEventListener('click', function () {
      if (rec) { rec.stop(); return; }
      rec = new SR(); rec.lang = 'es-ES'; rec.interimResults = false; rec.maxAlternatives = 1;
      rec.onstart = function () { mic.classList.add('escuchando'); mic.setAttribute('aria-label', 'Escuchando… pulsa para parar'); };
      rec.onresult = function (e) {
        campo.value = e.results[0][0].transcript; track('voz_usada');
        if (form.requestSubmit) form.requestSubmit(); else form.dispatchEvent(new Event('submit', { cancelable: true }));
      };
      rec.onend = rec.onerror = function () { mic.classList.remove('escuchando'); mic.setAttribute('aria-label', 'Dictar la pregunta por voz'); rec = null; };
      try { rec.start(); } catch (err) { rec = null; }
    });
  }
})();
