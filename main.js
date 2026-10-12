/* Só Ótica · Identidade visual — navegação da apresentação */
(function () {
  'use strict';

  /* Palco fixo: escolhe deitado (1280×720) ou em pé (390×800) e escala para caber */
  var stage = document.getElementById('stage');
  var root = document.documentElement;
  var STAGES = { land: [1280, 720], port: [390, 800] };
  function fit() {
    var w = window.innerWidth, h = window.innerHeight;
    var mode = w / h >= 1 ? 'land' : 'port';
    if (!root.classList.contains(mode)) {
      root.classList.remove('land', 'port');
      root.classList.add(mode);
    }
    var size = STAGES[mode];
    stage.style.setProperty('--k', Math.min(w / size[0], h / size[1]));
  }
  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('orientationchange', fit);

  var deck = document.getElementById('deck');
  var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
  var total = slides.length;
  var current = -1;
  var busy = false;
  var TRANSITION = 1000;

  var countNow = document.getElementById('count-now');
  var countTotal = document.getElementById('count-total');
  var bar = document.getElementById('progress-bar');
  var btnPrev = document.getElementById('btn-prev');
  var btnNext = document.getElementById('btn-next');
  var btnIndex = document.getElementById('btn-index');
  var index = document.getElementById('index');
  var indexList = document.getElementById('index-list');

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) TRANSITION = 50;

  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function themeOf(slide) {
    if (slide.classList.contains('t-red')) return 'red';
    if (slide.classList.contains('t-dark')) return 'dark';
    return 'creme';
  }

  countTotal.textContent = pad(total);

  var hint = document.querySelector('.hint');
  if (hint && !window.matchMedia('(pointer: coarse)').matches) hint.textContent = 'Use as setas ou role';

  /* Duplica a faixa de mockups para o loop contínuo */
  var track = document.querySelector('.marquee-track');
  if (track) {
    Array.prototype.slice.call(track.children).forEach(function (fig) {
      var clone = fig.cloneNode(true);
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelector('img').alt = '';
      track.appendChild(clone);
    });
  }

  /* Índice */
  slides.forEach(function (s, i) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.style.setProperty('--i', i);
    b.innerHTML = '<span>' + pad(i + 1) + '</span>' + s.getAttribute('data-title');
    b.addEventListener('click', function () { closeIndex(); go(i); });
    li.appendChild(b);
    indexList.appendChild(li);
  });
  var indexButtons = indexList.querySelectorAll('button');

  function openIndex() {
    index.hidden = false;
    // força o reflow para a cortina animar
    void index.offsetWidth;
    index.classList.add('open');
    btnIndex.setAttribute('aria-expanded', 'true');
    btnIndex.textContent = 'Fechar';
    document.body.dataset.theme = 'dark';
    var cur = indexButtons[current];
    if (cur) cur.focus({ preventScroll: true });
  }
  function closeIndex() {
    index.classList.remove('open');
    btnIndex.setAttribute('aria-expanded', 'false');
    btnIndex.textContent = 'Índice';
    document.body.dataset.theme = themeOf(slides[current]);
    setTimeout(function () { if (!index.classList.contains('open')) index.hidden = true; }, 700);
  }
  function indexOpen() { return index.classList.contains('open'); }
  btnIndex.addEventListener('click', function () { indexOpen() ? closeIndex() : openIndex(); });

  /* Troca de slide */
  function go(n, opts) {
    n = Math.max(0, Math.min(total - 1, n));
    if (n === current || busy) return;
    var instant = opts && opts.instant;
    var dir = n > current ? 'next' : 'prev';
    var prev = slides[current];
    var next = slides[n];

    if (prev && !instant) {
      busy = true;
      prev.classList.remove('on', 'enter-next', 'enter-prev');
      prev.classList.add('leaving', 'leave-' + dir);
      setTimeout(function () {
        prev.classList.remove('leaving', 'leave-next', 'leave-prev');
        busy = false;
      }, TRANSITION);
    } else if (prev) {
      prev.classList.remove('on', 'enter-next', 'enter-prev');
    }

    next.classList.remove('leaving', 'leave-next', 'leave-prev', 'enter-next', 'enter-prev');
    // reinicia as animações internas
    void next.offsetWidth;
    if (!instant) next.classList.add('enter-' + dir);
    next.classList.add('on');

    slides.forEach(function (s, i) { s.setAttribute('aria-hidden', i === n ? 'false' : 'true'); s.inert = i !== n; });

    current = n;
    countNow.textContent = pad(n + 1);
    bar.style.transform = 'scaleX(' + ((n + 1) / total) + ')';
    btnPrev.disabled = n === 0;
    btnNext.disabled = n === total - 1;
    document.body.dataset.theme = themeOf(next);
    for (var i = 0; i < indexButtons.length; i++) indexButtons[i].setAttribute('aria-current', i === n ? 'true' : 'false');
    if (history.replaceState) history.replaceState(null, '', '#' + (n + 1));
  }
  function nextSlide() { go(current + 1); }
  function prevSlide() { go(current - 1); }

  btnNext.addEventListener('click', nextSlide);
  btnPrev.addEventListener('click', prevSlide);

  /* Teclado */
  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (indexOpen()) { if (e.key === 'Escape') closeIndex(); return; }
    var tag = (e.target.tagName || '').toLowerCase();
    var onControl = tag === 'button' || tag === 'a';
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown':
        e.preventDefault(); nextSlide(); break;
      case ' ':
        if (onControl) return;
        e.preventDefault(); e.shiftKey ? prevSlide() : nextSlide(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp':
        e.preventDefault(); prevSlide(); break;
      case 'Home': e.preventDefault(); go(0); break;
      case 'End': e.preventDefault(); go(total - 1); break;
      case 'Escape': break;
      default:
        if (/^[1-9]$/.test(e.key) && !onControl) go(parseInt(e.key, 10) - 1);
    }
  });

  /* Roda do mouse / trackpad: um gesto = um slide */
  var wheelLock = false;
  var wheelAcc = 0;
  var wheelTimer;
  window.addEventListener('wheel', function (e) {
    if (indexOpen()) return;
    e.preventDefault();
    var delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(function () { wheelLock = false; wheelAcc = 0; }, 180);
    if (wheelLock) return;
    wheelAcc += delta;
    if (Math.abs(wheelAcc) > 40) {
      wheelLock = true;
      wheelAcc > 0 ? nextSlide() : prevSlide();
      wheelAcc = 0;
    }
  }, { passive: false });

  /* Toque: deslizar para os lados ou para cima/baixo */
  var tx = 0, ty = 0, tt = 0, tracking = false;
  deck.addEventListener('touchstart', function (e) {
    if (e.touches.length !== 1) { tracking = false; return; }
    tracking = true;
    tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = Date.now();
  }, { passive: true });
  deck.addEventListener('touchmove', function (e) {
    // evita o "puxar para atualizar" e a rolagem elástica do navegador
    if (tracking) e.preventDefault();
  }, { passive: false });
  deck.addEventListener('touchend', function (e) {
    if (!tracking) return;
    tracking = false;
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    var adx = Math.abs(dx), ady = Math.abs(dy);
    var fast = Date.now() - tt < 600;
    var min = fast ? 40 : 80;
    if (Math.max(adx, ady) < min) return;
    if (adx > ady) { dx < 0 ? nextSlide() : prevSlide(); }
    else { dy < 0 ? nextSlide() : prevSlide(); }
  }, { passive: true });

  /* Copiar HEX */
  Array.prototype.forEach.call(document.querySelectorAll('.copy'), function (btn) {
    var label = btn.textContent;
    btn.setAttribute('aria-label', 'Copiar ' + label);
    btn.addEventListener('click', function () {
      var hex = btn.getAttribute('data-hex');
      var done = function () {
        btn.textContent = 'Copiado';
        btn.classList.add('done');
        setTimeout(function () { btn.textContent = label; btn.classList.remove('done'); }, 1400);
      };
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(hex).then(done, fallback);
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = hex; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (err) { /* sem cópia */ }
        document.body.removeChild(ta);
      }
    });
  });

  /* Link do Drive ainda pendente */
  var pending = document.querySelector('[data-pending="drive"]');
  if (pending) {
    pending.addEventListener('click', function (e) {
      if (pending.getAttribute('href').charAt(0) === '#') {
        e.preventDefault();
        var t = pending.textContent;
        pending.textContent = 'Link em breve';
        setTimeout(function () { pending.textContent = t; }, 1600);
      }
    });
  }

  /* Início: respeita #n na URL */
  var start = parseInt((location.hash || '').replace('#', ''), 10);
  go(isNaN(start) ? 0 : start - 1, { instant: true });

  window.addEventListener('hashchange', function () {
    var n = parseInt(location.hash.replace('#', ''), 10);
    if (!isNaN(n)) go(n - 1);
  });
})();
