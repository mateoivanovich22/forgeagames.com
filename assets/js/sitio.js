// Forgea Games: menu del celular, chispas de la forja, el bunker a la hora real y el visor de capturas.
(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------------------------------------------------------------- menu del celular
  var menuButton = document.querySelector('.menu-boton');
  var menu = document.getElementById('menu');
  if (menuButton && menu) {
    var setMenu = function (open) {
      menu.classList.toggle('abierto', open);
      menuButton.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    menuButton.addEventListener('click', function () {
      setMenu(menuButton.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('abierto')) {
        setMenu(false);
        menuButton.focus();
      }
    });
  }

  // ---------------------------------------------------------------- chispas de la forja (portada)
  var canvas = document.querySelector('.forja__chispas');
  var anvil = document.querySelector('.forja__yunque');
  if (canvas && anvil && canvas.getContext && !reduceMotion) {
    var ctx = canvas.getContext('2d');
    var SCALE = 4;                       // one spark pixel = 4 css px, like the art
    var COLORS = ['#fff7c2', '#ffe27a', '#ffd23f', '#ffb347', '#ff9a2e', '#f37a2b', '#e2531f', '#a8361a', '#5a1e0e'];
    var sparks = [];
    var visible = true;
    var source = { x: 0, y: 0, w: 0 };

    var resize = function () {
      var w = Math.ceil(canvas.clientWidth / SCALE);
      var h = Math.ceil(canvas.clientHeight / SCALE);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      var c = canvas.getBoundingClientRect();
      var a = anvil.getBoundingClientRect();
      // the hot bar of the 32x27 sprite: x 15 to 24, y 8 to 10
      source.x = (a.left - c.left + a.width * (15 / 32)) / SCALE;
      source.w = a.width * (10 / 32) / SCALE;
      source.y = (a.top - c.top + a.height * (8 / 27)) / SCALE;
    };

    var spawn = function (burst) {
      var fromBar = burst || Math.random() < 0.7;
      sparks.push(fromBar ? {
        x: source.x + Math.random() * source.w,
        y: source.y,
        vx: (Math.random() - 0.35) * 0.9,
        vy: -(0.35 + Math.random() * 0.9),
        life: 0,
        max: 40 + Math.random() * 70
      } : {
        x: Math.random() * canvas.width,
        y: canvas.height + 2,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -(0.12 + Math.random() * 0.3),
        life: 0,
        max: 160 + Math.random() * 200
      });
    };

    var step = function () {
      if (visible) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (sparks.length < 90 && Math.random() < 0.55) spawn(false);
        for (var i = sparks.length - 1; i >= 0; i--) {
          var s = sparks[i];
          s.life++;
          s.x += s.vx + Math.sin((s.life + i) * 0.08) * 0.08;
          s.y += s.vy;
          s.vy += 0.004;                  // they slow down as they cool
          var k = s.life / s.max;
          if (k >= 1 || s.y < -4) {
            sparks.splice(i, 1);
            continue;
          }
          ctx.fillStyle = COLORS[Math.min(COLORS.length - 1, Math.floor(k * COLORS.length))];
          ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
        }
      }
      window.requestAnimationFrame(step);
    };

    resize();
    window.addEventListener('resize', resize);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
    anvil.addEventListener('load', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
      }).observe(canvas);
    }
    // a strike now and then: a burst from the bar
    window.setInterval(function () {
      if (!visible || document.hidden) return;
      for (var n = 0; n < 14; n++) spawn(true);
    }, 2600);
    window.requestAnimationFrame(step);
  }

  // ---------------------------------------------------------------- el bunker a la hora real
  var scene = document.querySelector('.escena');
  if (scene) {
    var arts = scene.querySelectorAll('.escena__arte');
    var buttons = scene.querySelectorAll('.momento');
    var desc = scene.querySelector('.barra__desc');
    var picked = false;

    // same hours as the game (src/sim/day_phase.gd): morning 6, noon 10, afternoon 17, night 20
    var phaseNow = function () {
      var h = new Date().getHours();
      if (h >= 6 && h < 10) return 'manana';
      if (h >= 10 && h < 17) return 'mediodia';
      if (h >= 17 && h < 20) return 'tarde';
      return 'noche';
    };

    var show = function (name) {
      Array.prototype.forEach.call(arts, function (img) {
        img.classList.toggle('es-visible', img.getAttribute('data-momento') === name);
      });
      Array.prototype.forEach.call(buttons, function (b) {
        b.setAttribute('aria-pressed', b.getAttribute('data-momento') === name ? 'true' : 'false');
      });
      if (desc) desc.textContent = desc.getAttribute('data-' + name) || '';
    };

    var markNow = function () {
      var now = phaseNow();
      Array.prototype.forEach.call(buttons, function (b) {
        if (b.getAttribute('data-momento') === now) b.setAttribute('data-ahora', desc ? desc.getAttribute('data-ahora') : '');
        else b.removeAttribute('data-ahora');
      });
      return now;
    };

    Array.prototype.forEach.call(buttons, function (b) {
      b.addEventListener('click', function () {
        picked = true;
        show(b.getAttribute('data-momento'));
      });
    });

    if (reduceMotion) {
      Array.prototype.forEach.call(arts, function (img) { img.style.transition = 'none'; });
    }
    show(markNow());
    // the page follows the clock while it stays open, until someone picks a moment by hand
    window.setInterval(function () {
      var now = markNow();
      if (!picked) show(now);
    }, 60000);
  }

  // ---------------------------------------------------------------- visor de capturas
  var viewer = document.querySelector('.visor');
  var items = document.querySelectorAll('.galeria__item');
  if (viewer && items.length && typeof viewer.showModal === 'function') {
    var img = viewer.querySelector('.visor__img');
    var caption = viewer.querySelector('.visor__pie');
    var current = 0;

    var load = function (i) {
      current = (i + items.length) % items.length;
      var link = items[current];
      var thumb = link.querySelector('img');
      img.src = link.getAttribute('href');
      img.alt = thumb ? thumb.alt : '';
      caption.textContent = thumb ? thumb.alt : '';
    };

    Array.prototype.forEach.call(items, function (link, i) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        load(i);
        viewer.showModal();
      });
    });
    viewer.querySelectorAll('[data-paso]').forEach(function (b) {
      b.addEventListener('click', function () { load(current + Number(b.getAttribute('data-paso'))); });
    });
    viewer.querySelector('.visor__cerrar').addEventListener('click', function () { viewer.close(); });
    viewer.addEventListener('click', function (e) {
      if (e.target === viewer || e.target.classList.contains('visor__figura')) viewer.close();
    });
    viewer.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') load(current + 1);
      if (e.key === 'ArrowLeft') load(current - 1);
    });
    var touchX = null;
    viewer.addEventListener('touchstart', function (e) { touchX = e.touches[0].clientX; }, { passive: true });
    viewer.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      if (Math.abs(dx) > 50) load(current + (dx < 0 ? 1 : -1));
      touchX = null;
    });
  }
})();
