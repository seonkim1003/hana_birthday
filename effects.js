/*
  effects.js — shared visual/audio helpers used across screens.
  Sound is on by default; the mute preference persists in localStorage.
  All SFX are synthesized with Web Audio (no files to source or go missing).
*/

window.Effects = (function () {

  // ---------- particle burst ----------

  function burst(target, opts) {
    opts = opts || {};
    var count = opts.count || 18;
    var colors = opts.colors || ["var(--blush)", "var(--terracotta)", "var(--tape)"];
    var originX = opts.x;
    var originY = opts.y;
    var container = target || document.body;
    var rect = container.getBoundingClientRect();
    var cx = originX != null ? originX : rect.left + rect.width / 2;
    var cy = originY != null ? originY : rect.top + rect.height / 2;

    for (var i = 0; i < count; i++) {
      var p = document.createElement("span");
      p.className = "particle";
      var angle = Math.random() * Math.PI * 2;
      var distance = 60 + Math.random() * 90;
      var dx = Math.cos(angle) * distance;
      var dy = Math.sin(angle) * distance;
      var size = 6 + Math.random() * 8;
      p.style.setProperty("--dx", dx + "px");
      p.style.setProperty("--dy", dy + "px");
      p.style.setProperty("--size", size + "px");
      p.style.setProperty("--color", colors[Math.floor(Math.random() * colors.length)]);
      p.style.left = cx + "px";
      p.style.top = cy + "px";
      document.body.appendChild(p);
      p.addEventListener("animationend", function () {
        this.remove();
      });
    }
  }

  // ---------- shake ----------

  function shake(el) {
    el.classList.remove("shake");
    // restart animation even if already shaking
    void el.offsetWidth;
    el.classList.add("shake");
    el.addEventListener("animationend", function handler() {
      el.classList.remove("shake");
      el.removeEventListener("animationend", handler);
    });
  }

  // ---------- sound: synthesized SFX bank ----------

  var MUTE_KEY = "hana-birthday-muted";
  var muted = localStorage.getItem(MUTE_KEY) === "true"; // default false (music + sound on)

  var sfxCtx = null;
  var sfxMaster = null;
  var noiseBuffer = null;
  var sfxGestureBound = false;

  function ensureSfxContext() {
    if (sfxCtx) return sfxCtx;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    sfxCtx = new AudioCtx();
    sfxMaster = sfxCtx.createGain();
    sfxMaster.gain.value = 0.5;
    sfxMaster.connect(sfxCtx.destination);
    return sfxCtx;
  }

  function bindSfxGestureRetry() {
    if (sfxGestureBound) return;
    sfxGestureBound = true;
    function retry() {
      document.removeEventListener("pointerdown", retry);
      document.removeEventListener("keydown", retry);
      if (sfxCtx && sfxCtx.state === "suspended") sfxCtx.resume();
      sfxGestureBound = false;
    }
    document.addEventListener("pointerdown", retry, { once: true });
    document.addEventListener("keydown", retry, { once: true });
  }

  function tone(time, freq, dur, opts) {
    opts = opts || {};
    var osc = sfxCtx.createOscillator();
    var gain = sfxCtx.createGain();
    var filter = sfxCtx.createBiquadFilter();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(freq, time);
    if (opts.toFreq) osc.frequency.linearRampToValueAtTime(opts.toFreq, time + dur);
    filter.type = "lowpass";
    filter.frequency.value = opts.filterFreq || 4000;
    var peak = opts.gain || 0.3;
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + (opts.attack || 0.015));
    gain.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(sfxMaster);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  function getNoiseBuffer() {
    if (noiseBuffer) return noiseBuffer;
    var len = sfxCtx.sampleRate * 1;
    noiseBuffer = sfxCtx.createBuffer(1, len, sfxCtx.sampleRate);
    var data = noiseBuffer.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }

  function noiseSweep(time, dur, fromFreq, toFreq, peak) {
    var src = sfxCtx.createBufferSource();
    src.buffer = getNoiseBuffer();
    var filter = sfxCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 0.7;
    filter.frequency.setValueAtTime(fromFreq, time);
    filter.frequency.linearRampToValueAtTime(toFreq, time + dur);
    var gain = sfxCtx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(peak, time + dur * 0.3);
    gain.gain.linearRampToValueAtTime(0.0001, time + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(sfxMaster);
    src.start(time);
    src.stop(time + dur + 0.02);
  }

  var SFX = {
    click: function (t) { tone(t, 720, 0.09, { type: "triangle", gain: 0.32, filterFreq: 3000 }); },
    hover: function (t) { tone(t, 1300, 0.045, { type: "sine", gain: 0.1, filterFreq: 5000 }); },
    toggle: function (t) { tone(t, 520, 0.12, { type: "triangle", toFreq: 760, gain: 0.3 }); },
    correct: function (t) {
      tone(t, 523.25, 0.18, { type: "sine", gain: 0.35 });
      tone(t + 0.09, 659.25, 0.18, { type: "sine", gain: 0.35 });
      tone(t + 0.18, 783.99, 0.26, { type: "sine", gain: 0.35 });
    },
    wrong: function (t) {
      tone(t, 330, 0.14, { type: "triangle", toFreq: 260, gain: 0.28 });
      tone(t + 0.1, 247, 0.16, { type: "triangle", toFreq: 200, gain: 0.24 });
    },
    collect: function (t) { tone(t, 380, 0.12, { type: "sine", toFreq: 780, gain: 0.32, attack: 0.005 }); },
    munch: function (t) {
      noiseSweep(t, 0.09, 220, 90, 0.22);
      noiseSweep(t + 0.08, 0.08, 260, 100, 0.18);
      tone(t + 0.02, 180, 0.08, { type: "triangle", gain: 0.12 });
    },
    pop: function (t) { tone(t, 300, 0.1, { type: "sine", toFreq: 480, gain: 0.22, attack: 0.005 }); },
    send: function (t) {
      noiseSweep(t, 0.16, 700, 2600, 0.12);
      tone(t + 0.04, 880, 0.14, { type: "sine", gain: 0.22 });
    },
    step: function (t) {
      tone(t, 880, 0.5, { type: "sine", gain: 0.22, attack: 0.01 });
      tone(t + 0.02, 1318.5, 0.4, { type: "sine", gain: 0.08, attack: 0.01 });
    },
    transition: function (t) { noiseSweep(t, 0.26, 350, 1500, 0.07); },
  };

  function play(name) {
    if (muted) return;
    if (!ensureSfxContext()) return;
    if (sfxCtx.state === "suspended") {
      sfxCtx.resume().catch(function () {});
      bindSfxGestureRetry();
    }
    var fn = SFX[name];
    if (!fn) return;
    try { fn(sfxCtx.currentTime + 0.01); } catch (e) { /* noop */ }
  }

  function isMuted() {
    return muted;
  }

  function setMuted(value) {
    muted = value;
    localStorage.setItem(MUTE_KEY, String(muted));
    if (window.Music) window.Music.setEnabled(!muted);
    document.dispatchEvent(new CustomEvent("hana:mute-changed", { detail: { muted: muted } }));
  }

  function toggleMute() {
    setMuted(!muted);
    return muted;
  }

  function initSoundToggle() {
    var btn = document.getElementById("sound-toggle");
    if (!btn) return;
    function render() {
      btn.classList.toggle("is-on", !muted);
      btn.classList.toggle("is-off", muted);
      btn.setAttribute("aria-label", muted ? "Turn music on" : "Turn music off");
    }
    render();
    btn.addEventListener("click", function () {
      toggleMute();
      render();
      play("toggle");
    });
    if (window.Music) window.Music.setEnabled(!muted);
  }

  // ---------- ambient hover sfx on every button-like control ----------

  function initInteractionSfx() {
    var selector = ".btn, .choice-card, .dpad-btn, .sound-toggle";
    document.querySelectorAll(selector).forEach(function (el) {
      el.addEventListener("pointerenter", function () { play("hover"); });
    });
  }

  return {
    burst: burst,
    shake: shake,
    play: play,
    isMuted: isMuted,
    setMuted: setMuted,
    toggleMute: toggleMute,
    initSoundToggle: initSoundToggle,
    initInteractionSfx: initInteractionSfx,
  };

})();
