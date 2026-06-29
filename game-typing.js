/*
  game-typing.js — Memory #2 mini-game.

  MonkeyType-style: target sentence rendered as character spans with
  live correct/incorrect coloring as the user types into a real <input>.
  Enter checks an exact, trimmed match; mismatch shakes and blocks
  advance, match appends a chat bubble and loads the next sentence.
*/

(function () {

  var targetEl, input, thread;
  var sentences = [];
  var replies = [];
  var index = 0;
  var replyTimer = null;

  function renderTarget() {
    var sentence = sentences[index] || "";
    targetEl.innerHTML = "";
    var typed = input.value;
    for (var i = 0; i < sentence.length; i++) {
      var span = document.createElement("span");
      span.className = "char";
      span.textContent = sentence[i];
      if (i < typed.length) {
        span.classList.add(typed[i] === sentence[i] ? "correct" : "incorrect");
      }
      targetEl.appendChild(span);
    }
  }

  function addBubble(text, isReply) {
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble" + (isReply ? " reply" : "");

    var span = document.createElement("span");
    span.className = "bubble-text";
    span.textContent = text;
    bubble.appendChild(span);

    if (!isReply) {
      var icon = document.createElement("span");
      icon.className = "bubble-send-icon";
      icon.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2 21l21-9-21-9v7l15 2-15 2z"/></svg>';
      bubble.appendChild(icon);
    }

    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
    return bubble;
  }

  function showTypingIndicator() {
    var bubble = document.createElement("div");
    bubble.className = "chat-bubble reply typing-dots";
    bubble.innerHTML = "<span></span><span></span><span></span>";
    thread.appendChild(bubble);
    thread.scrollTop = thread.scrollHeight;
    return bubble;
  }

  function queueReply(replyIndex) {
    var indicator = showTypingIndicator();
    replyTimer = setTimeout(function () {
      indicator.remove();
      var text = replies.length ? replies[replyIndex % replies.length] : "";
      if (text) {
        addBubble(text, true);
        Effects.play("pop");
      }
      thread.scrollTop = thread.scrollHeight;
      replyTimer = null;
    }, 650 + Math.random() * 350);
  }

  function handleKeydown(e) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    var sentence = sentences[index] || "";
    var typed = input.value.trim();
    if (typed === sentence.trim()) {
      Effects.play("send");
      addBubble(typed, false);
      queueReply(index);
      input.value = "";
      index++;
      if (index >= sentences.length) {
        setTimeout(function () { window.App.showScreen("memory-note-2"); }, 1600);
        targetEl.textContent = "";
        input.disabled = true;
      } else {
        renderTarget();
      }
    } else {
      Effects.shake(input);
      Effects.play("wrong");
    }
  }

  function handleInput() {
    renderTarget();
  }

  function init() {
    targetEl = document.getElementById("typing-target");
    input = document.getElementById("typing-input");
    thread = document.getElementById("chat-thread");

    var C = (window.CONTENT && window.CONTENT.gameTyping) || {};
    sentences = C.sentences || [];
    replies = C.replies || [];
    index = 0;

    thread.innerHTML = "";
    input.value = "";
    input.disabled = false;
    renderTarget();

    input.addEventListener("keydown", handleKeydown);
    input.addEventListener("input", handleInput);
    input.focus();
  }

  function cleanup() {
    if (input) {
      input.removeEventListener("keydown", handleKeydown);
      input.removeEventListener("input", handleInput);
    }
    if (replyTimer) {
      clearTimeout(replyTimer);
      replyTimer = null;
    }
  }

  window.App.setEnterHandler("game-typing", init);
  window.App.setExitHandler("game-typing", cleanup);

})();
