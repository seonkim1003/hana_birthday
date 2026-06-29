/*
  app.js — screen manager.

  All 7 screens are permanent DOM siblings inside #app, toggled via the
  data-active attribute. showScreen() runs the outgoing screen's
  registered cleanup (if any) before activating the next screen, so the
  eating game's keydown/keyup listeners and the typing game's Enter
  listener are never simultaneously attached.
*/

window.App = (function () {

  var SCREENS = [
    "start",
    "choose",
    "game-eating",
    "memory-note-1",
    "game-typing",
    "memory-note-2",
    "final",
  ];

  var current = "start";
  var enterHandlers = {};
  var exitHandlers = {};
  var changeListeners = [];

  function setEnterHandler(id, fn) {
    enterHandlers[id] = fn;
  }

  function setExitHandler(id, fn) {
    exitHandlers[id] = fn;
  }

  function onScreenChange(fn) {
    changeListeners.push(fn);
  }

  function getScreenEl(id) {
    return document.querySelector('[data-screen="' + id + '"]');
  }

  function showScreen(id) {
    if (SCREENS.indexOf(id) === -1) return;
    var outgoingEl = getScreenEl(current);
    var incomingEl = getScreenEl(id);

    if (exitHandlers[current]) {
      try { exitHandlers[current](); } catch (e) { /* noop */ }
    }

    if (outgoingEl) outgoingEl.removeAttribute("data-active");

    current = id;

    if (incomingEl) {
      incomingEl.setAttribute("data-active", "true");
    }

    if (enterHandlers[id]) {
      try { enterHandlers[id](); } catch (e) { /* noop */ }
    }

    if (window.Effects) Effects.play("transition");

    changeListeners.forEach(function (fn) {
      try { fn(id); } catch (e) { /* noop */ }
    });
  }

  function getCurrent() {
    return current;
  }

  // ---------- placeholder image fallback ----------

  function applyImageFallback(img) {
    img.addEventListener("error", function () {
      var fallback = document.createElement("div");
      fallback.id = img.id;
      fallback.className = img.className + " img-fallback";
      img.replaceWith(fallback);
    }, { once: true });
  }

  function setImage(id, src) {
    var img = document.getElementById(id);
    if (!img) return;
    applyImageFallback(img);
    img.src = src;
  }

  // ---------- populate static content ----------

  function populateContent() {
    var C = window.CONTENT || {};

    if (C.start) {
      document.getElementById("start-title").textContent = C.start.title || "";
      document.getElementById("start-subtitle").textContent = C.start.subtitle || "";
      document.getElementById("start-button").textContent = C.start.button || "Press Start";
    }

    if (C.choose) {
      document.getElementById("choose-prompt").textContent = C.choose.prompt || "";
      document.getElementById("name-celine").textContent = C.choose.celineName || "Celine";
      document.getElementById("name-seonho").textContent = C.choose.seonhoName || "Seonho";
    }
    if (C.images) {
      setImage("img-celine", C.images.celine);
      setImage("img-seonho", C.images.seonho);
      setImage("eating-photo", C.images.eatingFull);
      setImage("note1-photo", C.images.eatingFull);
      setImage("note2-photo", C.images.texting);
      setImage("final-photo", C.images.final);
      setImage("chat-avatar", C.images.seonho);
    }

    if (C.gameEating) {
      document.getElementById("eating-intro").textContent = C.gameEating.intro || "";
    }

    if (C.memoryNote1) {
      document.getElementById("note1-title").textContent = C.memoryNote1.title || "";
      document.getElementById("note1-text").textContent = C.memoryNote1.text || "";
    }

    if (C.gameTyping) {
      document.getElementById("typing-intro").textContent = C.gameTyping.intro || "";
    }

    if (C.memoryNote2) {
      document.getElementById("note2-title").textContent = C.memoryNote2.title || "";
      document.getElementById("note2-text").textContent = C.memoryNote2.text || "";
    }

    if (C.final) {
      var msgEl = document.getElementById("final-message");
      msgEl.innerHTML = "";
      (C.final.message || "").split(/\n\s*\n/).forEach(function (para) {
        var p = document.createElement("p");
        p.textContent = para.trim();
        msgEl.appendChild(p);
      });
      document.getElementById("final-signoff").textContent = C.final.signoff || "";
    }
  }

  // ---------- choose screen wiring ----------

  function initChoose() {
    var C = (window.CONTENT && window.CONTENT.choose) || {};
    var wrongMessages = C.wrongMessages || [];
    var wrongIndex = 0;
    var feedback = document.getElementById("choose-feedback");
    var celineCard = document.getElementById("card-celine");
    var seonhoCard = document.getElementById("card-seonho");

    celineCard.addEventListener("click", function () {
      Effects.shake(celineCard);
      Effects.play("wrong");
      if (wrongMessages.length) {
        feedback.textContent = wrongMessages[wrongIndex % wrongMessages.length];
        wrongIndex++;
      }
    });

    seonhoCard.addEventListener("click", function () {
      seonhoCard.classList.add("correct");
      Effects.play("correct");
      var rect = seonhoCard.getBoundingClientRect();
      Effects.burst(null, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      feedback.textContent = C.correctMessage || "";
      setTimeout(function () {
        seonhoCard.classList.remove("correct");
        showScreen("game-eating");
      }, 900);
    });
  }

  function resetChoose() {
    document.getElementById("choose-feedback").textContent = "";
  }

  // ---------- note screens wiring ----------

  function initNotes() {
    document.getElementById("note1-continue").addEventListener("click", function () {
      Effects.play("click");
      showScreen("game-typing");
    });
    document.getElementById("note2-continue").addEventListener("click", function () {
      Effects.play("click");
      showScreen("final");
    });
    document.getElementById("play-again").addEventListener("click", function () {
      Effects.play("click");
      showScreen("start");
    });
  }

  // ---------- start screen wiring ----------

  function initStart() {
    var btn = document.getElementById("start-button");
    btn.addEventListener("click", function () {
      var rect = btn.getBoundingClientRect();
      Effects.burst(null, { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      Effects.play("click");
      setTimeout(function () { showScreen("choose"); }, 250);
    });
  }

  // ---------- final ambient flourish ----------

  var finalFlourishTimer = null;

  function startFinalFlourish() {
    stopFinalFlourish();
    finalFlourishTimer = setInterval(function () {
      var el = getScreenEl("final");
      if (!el) return;
      var rect = el.getBoundingClientRect();
      Effects.burst(null, {
        x: rect.left + Math.random() * rect.width,
        y: rect.top + rect.height + 20,
        count: 6,
      });
    }, 1800);
  }

  function stopFinalFlourish() {
    if (finalFlourishTimer) {
      clearInterval(finalFlourishTimer);
      finalFlourishTimer = null;
    }
  }

  function init() {
    populateContent();
    initStart();
    initChoose();
    initNotes();
    Effects.initSoundToggle();
    Effects.initInteractionSfx();
    setEnterHandler("final", startFinalFlourish);
    setExitHandler("final", stopFinalFlourish);
    setEnterHandler("choose", resetChoose);
    document.querySelector('[data-screen="start"]').setAttribute("data-active", "true");
  }

  document.addEventListener("DOMContentLoaded", init);

  return {
    showScreen: showScreen,
    getCurrent: getCurrent,
    setEnterHandler: setEnterHandler,
    setExitHandler: setExitHandler,
    setImage: setImage,
    onScreenChange: onScreenChange,
  };

})();
