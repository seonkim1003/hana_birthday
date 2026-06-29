/*
  game-eating.js — Memory #1 mini-game.

  Player sprite moves via arrow keys + WASD (held-key state read every
  rAF tick, diagonal speed normalized, clamped to field bounds).
  Burgers spawn at randomized, non-overlapping positions; collecting one
  fades the next shuffled mosaic tile to reveal the photo underneath.
*/

(function () {

  var field, sprite, mosaicTiles, nextBtn, counterEl;
  var fieldW, fieldH;
  var spriteSize = 34;
  var spritePos = { x: 0, y: 0 };
  var keys = { up: false, down: false, left: false, right: false };
  var burgers = [];
  var collectedCount = 0;
  var totalBurgers = 0;
  var rafId = null;
  var lastTime = null;
  var speed = 360; // px/sec

  function loadsOk(src, cb) {
    var img = new Image();
    img.onload = function () { cb(true); };
    img.onerror = function () { cb(false); };
    img.src = src;
  }

  function keyDown(e) {
    setKeyFromEvent(e, true);
  }

  function keyUp(e) {
    setKeyFromEvent(e, false);
  }

  function setKeyFromEvent(e, value) {
    switch (e.key) {
      case "ArrowUp": case "w": case "W": keys.up = value; break;
      case "ArrowDown": case "s": case "S": keys.down = value; break;
      case "ArrowLeft": case "a": case "A": keys.left = value; break;
      case "ArrowRight": case "d": case "D": keys.right = value; break;
      default: return;
    }
    e.preventDefault();
  }

  function bindDpad() {
    var btns = document.querySelectorAll("#dpad .dpad-btn");
    btns.forEach(function (btn) {
      var dir = btn.dataset.dir;
      var press = function (e) { e.preventDefault(); keys[dir] = true; Effects.play("hover"); };
      var release = function (e) { e.preventDefault(); keys[dir] = false; };
      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("pointercancel", release);
    });
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function tick(timestamp) {
    if (lastTime == null) lastTime = timestamp;
    var dt = (timestamp - lastTime) / 1000;
    lastTime = timestamp;

    var dx = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    var dy = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (dx !== 0 && dy !== 0) {
      dx *= Math.SQRT1_2;
      dy *= Math.SQRT1_2;
    }

    spritePos.x = clamp(spritePos.x + dx * speed * dt, 0, fieldW - spriteSize);
    spritePos.y = clamp(spritePos.y + dy * speed * dt, 0, fieldH - spriteSize);

    sprite.style.transform = "translate(" + spritePos.x + "px, " + spritePos.y + "px)";

    checkCollisions();

    rafId = requestAnimationFrame(tick);
  }

  function checkCollisions() {
    var spriteCx = spritePos.x + spriteSize / 2;
    var spriteCy = spritePos.y + spriteSize / 2;
    burgers.forEach(function (b) {
      if (b.collected) return;
      var bCx = b.x + 14;
      var bCy = b.y + 14;
      var dist = Math.hypot(spriteCx - bCx, spriteCy - bCy);
      if (dist < (spriteSize / 2 + 14)) {
        collectBurger(b);
      }
    });
  }

  function showYumBubble() {
    var bubble = document.createElement("div");
    bubble.className = "yum-bubble";
    bubble.textContent = "yum";
    bubble.style.left = (spritePos.x + spriteSize / 2) + "px";
    bubble.style.top = spritePos.y + "px";
    field.appendChild(bubble);
    bubble.addEventListener("animationend", function () { bubble.remove(); });
  }

  function collectBurger(b) {
    b.collected = true;
    collectedCount++;
    if (counterEl) counterEl.textContent = collectedCount + " / " + totalBurgers;
    b.el.classList.add("collected");
    Effects.play("munch");
    showYumBubble();
    revealNextTile();
    setTimeout(function () { b.el.remove(); }, 320);

    if (collectedCount >= totalBurgers) {
      finishGame();
    }
  }

  var tileOrder = [];

  function gridDims(n, aspect) {
    var best = { rows: 1, cols: n };
    var bestDiff = Infinity;
    for (var rows = 1; rows <= n; rows++) {
      if (n % rows !== 0) continue;
      var cols = n / rows;
      var diff = Math.abs(cols / rows - aspect);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = { rows: rows, cols: cols };
      }
    }
    return best;
  }

  function buildMosaic(n) {
    mosaicTiles.innerHTML = "";
    var dims = gridDims(n, fieldW / fieldH);
    mosaicTiles.style.gridTemplateColumns = "repeat(" + dims.cols + ", 1fr)";
    mosaicTiles.style.gridTemplateRows = "repeat(" + dims.rows + ", 1fr)";
    var total = dims.rows * dims.cols;
    tileOrder = [];
    for (var i = 0; i < total; i++) {
      var tile = document.createElement("div");
      tile.className = "mosaic-tile";
      mosaicTiles.appendChild(tile);
      tileOrder.push(tile);
    }
    // shuffle reveal order
    for (var j = tileOrder.length - 1; j > 0; j--) {
      var k = Math.floor(Math.random() * (j + 1));
      var tmp = tileOrder[j];
      tileOrder[j] = tileOrder[k];
      tileOrder[k] = tmp;
    }
  }

  function revealNextTile() {
    var tile = tileOrder[collectedCount - 1];
    if (tile) tile.classList.add("revealed");
  }

  function spawnBurgers(n, burgerSrc, hasBurgerImg) {
    burgers = [];
    var placed = [];
    var minDist = 40;
    for (var i = 0; i < n; i++) {
      var pos = null;
      for (var attempt = 0; attempt < 200; attempt++) {
        var x = Math.random() * (fieldW - 28);
        var y = Math.random() * (fieldH - 28);
        var ok = placed.every(function (p) {
          return Math.hypot(p.x - x, p.y - y) >= minDist;
        });
        if (ok) { pos = { x: x, y: y }; break; }
      }
      if (!pos) pos = { x: Math.random() * (fieldW - 28), y: Math.random() * (fieldH - 28) };
      placed.push(pos);

      var el = document.createElement("div");
      el.className = "burger";
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      if (hasBurgerImg) {
        var img = document.createElement("img");
        img.src = burgerSrc;
        img.alt = "";
        el.appendChild(img);
      } else {
        el.textContent = "🍔";
      }
      field.appendChild(el);
      burgers.push({ x: pos.x, y: pos.y, el: el, collected: false });
    }
  }

  function finishGame() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    var rect = field.getBoundingClientRect();
    Effects.burst(null, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2, count: 28 });
    Effects.play("correct");
    nextBtn.hidden = false;
  }

  function cleanup() {
    document.removeEventListener("keydown", keyDown);
    document.removeEventListener("keyup", keyUp);
    if (rafId) cancelAnimationFrame(rafId);
    rafId = null;
    lastTime = null;
    keys = { up: false, down: false, left: false, right: false };
  }

  function init() {
    field = document.getElementById("eating-field");
    sprite = document.getElementById("player-sprite");
    mosaicTiles = document.getElementById("mosaic-tiles");
    nextBtn = document.getElementById("eating-next");
    counterEl = document.getElementById("burger-counter");

    var rect = field.getBoundingClientRect();
    fieldW = rect.width;
    fieldH = rect.height;

    spritePos = { x: fieldW / 2 - spriteSize / 2, y: fieldH / 2 - spriteSize / 2 };
    sprite.style.transform = "translate(" + spritePos.x + "px, " + spritePos.y + "px)";

    collectedCount = 0;
    nextBtn.hidden = true;
    field.querySelectorAll(".burger").forEach(function (b) { b.remove(); });

    var C = (window.CONTENT && window.CONTENT.gameEating) || {};
    totalBurgers = C.burgerCount || 12;
    if (counterEl) counterEl.textContent = "0 / " + totalBurgers;
    var images = (window.CONTENT && window.CONTENT.images) || {};
    var spriteSrc = images.sprite;
    var burgerSrc = images.burger;

    buildMosaic(totalBurgers);

    loadsOk(spriteSrc, function (ok) {
      if (ok) sprite.style.backgroundImage = "url(" + spriteSrc + ")";
    });

    loadsOk(burgerSrc, function (ok) {
      spawnBurgers(totalBurgers, burgerSrc, ok);
    });

    document.addEventListener("keydown", keyDown);
    document.addEventListener("keyup", keyUp);

    lastTime = null;
    rafId = requestAnimationFrame(tick);
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindDpad();
    document.getElementById("eating-next").addEventListener("click", function () {
      window.App.showScreen("memory-note-1");
    });
  });

  window.App.setEnterHandler("game-eating", init);
  window.App.setExitHandler("game-eating", cleanup);

})();
