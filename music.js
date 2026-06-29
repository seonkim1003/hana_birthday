/*
  music.js — procedural background music box.

  No audio files: a small 4-chord progression (C - Am - F - G) with a
  sustained pad, a plucked music-box arpeggio running through a soft
  feedback delay, a warm sub-bass anchor, and a faint shaker for groove.
  Loops forever, on by default.
*/

window.Music = (function () {

  var ctx = null;
  var master = null;
  var delay = null;
  var enabled = false;
  var started = false;
  var stepTimer = null;
  var gestureBound = false;

  var STEP = 0.25; // seconds per eighth-note step
  var STEPS_PER_CHORD = 8;
  var step = 0;

  // C - Am - F - G, each as [bass, root, third, fifth] in Hz
  var CHORDS = [
    { bass: 65.41, notes: [261.63, 329.63, 392.00] },   // C
    { bass: 55.00, notes: [220.00, 261.63, 329.63] },   // Am
    { bass: 87.31, notes: [174.61, 220.00, 261.63] },   // F
    { bass: 98.00, notes: [196.00, 246.94, 293.66] },   // G
  ];

  // arpeggio pattern indexes into the chord's notes array (octave-up flag)
  var ARP_PATTERN = [
    { i: 0, oct: 1 }, { i: 1, oct: 1 }, { i: 2, oct: 1 }, { i: 1, oct: 1 },
    { i: 0, oct: 1 }, { i: 1, oct: 1 }, { i: 2, oct: 1 }, { i: 1, oct: 1 },
  ];

  function ensureContext() {
    if (ctx) return ctx;
    var AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();

    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);

    delay = ctx.createDelay();
    delay.delayTime.value = 0.3;
    var feedback = ctx.createGain();
    feedback.gain.value = 0.22;
    var delayFilter = ctx.createBiquadFilter();
    delayFilter.type = "lowpass";
    delayFilter.frequency.value = 2200;
    delay.connect(delayFilter);
    delayFilter.connect(feedback);
    feedback.connect(delay);
    delay.connect(master);

    return ctx;
  }

  function playPad(chord, time, dur) {
    chord.notes.forEach(function (freq, i) {
      var osc = ctx.createOscillator();
      var gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.05, time + 0.8);
      gain.gain.linearRampToValueAtTime(0.0001, time + dur);
      osc.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + dur + 0.05);
    });

    var bass = ctx.createOscillator();
    var bassGain = ctx.createGain();
    bass.type = "sine";
    bass.frequency.value = chord.bass;
    bassGain.gain.setValueAtTime(0.0001, time);
    bassGain.gain.linearRampToValueAtTime(0.09, time + 0.6);
    bassGain.gain.linearRampToValueAtTime(0.0001, time + dur);
    bass.connect(bassGain);
    bassGain.connect(master);
    bass.start(time);
    bass.stop(time + dur + 0.05);
  }

  function pluckArp(freq, time) {
    var osc = ctx.createOscillator();
    var osc2 = ctx.createOscillator();
    var gain = ctx.createGain();
    var filter = ctx.createBiquadFilter();

    osc.type = "triangle";
    osc.frequency.value = freq;
    osc2.type = "sine";
    osc2.frequency.value = freq * 2;

    filter.type = "lowpass";
    filter.frequency.value = 2600;

    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(0.22, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.4);

    osc.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    gain.connect(delay);

    osc.start(time);
    osc2.start(time);
    osc.stop(time + 0.4);
    osc2.stop(time + 0.4);
  }

  function shaker(time) {
    var bufferSize = ctx.sampleRate * 0.05;
    var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);

    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 6000;
    var gain = ctx.createGain();
    gain.gain.value = 0.035;

    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(time);
  }

  function scheduleStep() {
    if (!enabled || !ctx) return;
    var now = ctx.currentTime + 0.05;
    var chordIndex = Math.floor(step / STEPS_PER_CHORD) % CHORDS.length;
    var posInChord = step % STEPS_PER_CHORD;
    var chord = CHORDS[chordIndex];

    if (posInChord === 0) {
      playPad(chord, now, STEP * STEPS_PER_CHORD);
    }

    var arp = ARP_PATTERN[posInChord];
    var freq = chord.notes[arp.i] * arp.oct;
    pluckArp(freq, now);

    if (posInChord % 2 === 1) shaker(now);

    step++;
    stepTimer = setTimeout(scheduleStep, STEP * 1000);
  }

  function start() {
    if (!ensureContext()) return;
    enabled = true;
    if (ctx.state === "suspended") {
      ctx.resume().then(function () {
        if (!started) { started = true; scheduleStep(); }
      }).catch(function () { bindGestureRetry(); });
    } else if (!started) {
      started = true;
      scheduleStep();
    }
  }

  function stop() {
    enabled = false;
    if (stepTimer) { clearTimeout(stepTimer); stepTimer = null; }
    started = false;
    step = 0;
  }

  function bindGestureRetry() {
    if (gestureBound) return;
    gestureBound = true;
    function retry() {
      document.removeEventListener("pointerdown", retry);
      document.removeEventListener("keydown", retry);
      document.removeEventListener("touchstart", retry);
      gestureBound = false;
      if (enabled) start();
    }
    document.addEventListener("pointerdown", retry, { once: true });
    document.addEventListener("keydown", retry, { once: true });
    document.addEventListener("touchstart", retry, { once: true });
  }

  function setEnabled(value) {
    if (value) {
      start();
      if (ctx && ctx.state === "suspended") bindGestureRetry();
    } else {
      stop();
    }
  }

  return {
    start: start,
    stop: stop,
    setEnabled: setEnabled,
  };

})();
