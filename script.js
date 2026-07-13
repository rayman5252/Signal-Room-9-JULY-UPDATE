/* ===========================================================
   SIGNAL ROOM 9 — station script
   Handles: boot static, waveform readout, live clock/coords,
   transmission log typewriter, and the (deliberately useless) keypad.
   =========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  runBootSequence();
  startWaveform();
  startClockAndCoords();
  runTerminalLog();
  buildKeypad();
});

/* ---------------------------------------------------------
   1. Boot sequence — a short burst of static before reveal
   --------------------------------------------------------- */
function runBootSequence() {
  const overlay = document.getElementById('boot-overlay');
  const canvas = document.getElementById('static-canvas');
  const bootText = document.getElementById('boot-text');
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  let frame = 0;
  const totalFrames = 45; // ~0.75s at 60fps before we start fading

  const messages = [
    'ESTABLISHING SECURE LINK…',
    'SCANNING FREQUENCY BAND…',
    'LOCK ACQUIRED — SR-9'
  ];

  function drawStatic() {
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < imgData.data.length; i += 4) {
      const v = Math.random() * 255;
      imgData.data[i] = v;
      imgData.data[i + 1] = v;
      imgData.data[i + 2] = v;
      imgData.data[i + 3] = 40; // faint, so text stays legible
    }
    ctx.putImageData(imgData, 0, 0);
  }

  function tick() {
    drawStatic();
    frame++;

    if (frame === 15) bootText.textContent = messages[1];
    if (frame === 32) bootText.textContent = messages[2];

    if (frame < totalFrames) {
      requestAnimationFrame(tick);
    } else {
      overlay.classList.add('hide');
      setTimeout(() => overlay.remove(), 700);
    }
  }
  tick();
}

/* ---------------------------------------------------------
   2. Waveform — an idle "listening" oscilloscope trace
   --------------------------------------------------------- */
function startWaveform() {
  const canvas = document.getElementById('waveform');
  const ctx = canvas.getContext('2d');
  const sigStrengthEl = document.getElementById('sig-strength');
  const voiceEl = document.getElementById('voice-fragment');

  function resize() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
  }
  resize();
  window.addEventListener('resize', resize);

  let t = 0;

  // --- sporadic static burst state ---
  let burstFrames = 0;                          // frames remaining in the current burst
  let burstCooldown = 140 + Math.random() * 300; // frames until the next burst may fire

  // --- intercepted, unintelligible voice fragments ---
  // Deliberately garbled — never full sentences. It should read like
  // partial audio that cut out, not dialogue.
  const VOICE_FRAGMENTS = [
    '...w— don\u2019t answ—',
    '[UNINTELLIGIBLE]',
    '—no relay, repeat, no rel—',
    '...count of three, then—',
    '...still there? ...still—',
    '...the room, the room, the ro—',
    '[VOICE OVERLAP DETECTED]',
    '...19 minutes, same as bef—',
    '—h-hello? hello? hel—',
    '...static ...hear that ...static—'
  ];

  function scheduleVoice() {
    const delay = 9000 + Math.random() * 15000; // 9–24s between fragments
    setTimeout(() => {
      showVoiceFragment();
      scheduleVoice();
    }, delay);
  }

  function showVoiceFragment() {
    const phrase = VOICE_FRAGMENTS[Math.floor(Math.random() * VOICE_FRAGMENTS.length)];
    voiceEl.textContent = phrase;
    voiceEl.classList.remove('show');
    // force reflow so the animation restarts on repeat fragments
    void voiceEl.offsetWidth;
    voiceEl.classList.add('show');
    // pair the voice with a short static burst for cohesion
    burstFrames = Math.max(burstFrames, 16 + Math.random() * 14);
    setTimeout(() => voiceEl.classList.remove('show'), 900);
  }

  scheduleVoice();

  // sparse speckle static — cheaper than full-frame snow, and reads
  // as an interference "burst" rather than a constant TV-static look
  function drawStaticOverlay(w, h, intensity) {
    const speckCount = Math.floor((w * h) / 1400 * intensity);
    for (let i = 0; i < speckCount; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const size = Math.random() * 2.2 * devicePixelRatio;
      const v = Math.random() * 255;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.35})`;
      ctx.fillRect(x, y, size, size);
    }
  }

  function draw() {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const inBurst = burstFrames > 0;

    if (!inBurst) {
      burstCooldown--;
      if (burstCooldown <= 0) {
        burstFrames = 8 + Math.random() * 22;
        burstCooldown = 220 + Math.random() * 500;
      }
    }

    const mid = h / 2;
    const points = 220;

    function tracePath(offsetX, ampMul, jitter) {
      ctx.beginPath();
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * w + offsetX;
        const base =
          Math.sin(i * 0.15 + t) * 10 * ampMul +
          Math.sin(i * 0.045 + t * 1.7) * 18 * ampMul;
        const noise = (Math.random() - 0.5) * jitter;
        const spike =
          Math.random() > (inBurst ? 0.93 : 0.985)
            ? (Math.random() - 0.5) * (inBurst ? 90 : 60)
            : 0;
        const y = mid + base + noise + spike;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    if (inBurst) {
      // chromatic-aberration style RGB split while interference is high
      ctx.lineWidth = 1.3 * devicePixelRatio;
      ctx.strokeStyle = 'rgba(64,220,255,0.35)';
      tracePath(-1.5 * devicePixelRatio, 1.15, 14);
      ctx.strokeStyle = 'rgba(209,56,44,0.55)';
      tracePath(1.5 * devicePixelRatio, 1.15, 14);
      ctx.strokeStyle = 'rgba(217,211,191,0.9)';
      ctx.lineWidth = 1.5 * devicePixelRatio;
      tracePath(0, 1.15, 14);

      drawStaticOverlay(w, h, 1.4);
      burstFrames--;
    } else {
      ctx.strokeStyle = 'rgba(209,56,44,0.85)';
      ctx.lineWidth = 1.5 * devicePixelRatio;
      tracePath(0, 1, 4);

      // rare, faint speckle even at rest — the signal is never perfectly clean
      if (Math.random() > 0.92) drawStaticOverlay(w, h, 0.15);
    }

    t += 0.05;

    // fake but stable-feeling signal strength readout, which dips and
    // flags during a burst
    const strength = inBurst
      ? Math.max(4, Math.round(18 + Math.random() * 22))
      : 60 + Math.round(Math.sin(t * 0.7) * 15 + Math.random() * 6);
    sigStrengthEl.textContent = inBurst ? `${strength}% \u26a0` : `${strength}%`;
    sigStrengthEl.style.color = inBurst ? 'var(--signal-red)' : '';

    requestAnimationFrame(draw);
  }
  draw();
}

/* ---------------------------------------------------------
   3. Clock + fabricated coordinates that drift slowly
   --------------------------------------------------------- */
function startClockAndCoords() {
  const clockEl = document.getElementById('clock-readout');
  const coordEl = document.getElementById('coord-readout');

  // a base coordinate that drifts a tiny, deliberate amount over time
  let lat = 37.2350;
  let lon = -115.8111;

  function tick() {
    const now = new Date();
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const ss = String(now.getUTCSeconds()).padStart(2, '0');
    clockEl.textContent = `${hh}:${mm}:${ss} Z`;

    lat += (Math.random() - 0.5) * 0.0006;
    lon += (Math.random() - 0.5) * 0.0006;
    coordEl.textContent = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;

    setTimeout(tick, 1000);
  }
  tick();
}

/* ---------------------------------------------------------
   4. Transmission log — typewriter reveal, line by line
   --------------------------------------------------------- */
function runTerminalLog() {
  const terminal = document.getElementById('terminal');

  const entries = [
    { tag: '[04:12:07Z]', text: 'Carrier detected on unassigned band. No source on file.' },
    { tag: '[04:12:41Z]', text: 'Signal repeats every 19 minutes. Pattern does not match any known relay.' },
    { tag: '[04:15:02Z]', text: 'Requesting cross-reference with AK Wing archive. Denied — insufficient clearance.' },
    { tag: '[04:19:00Z]', text: 'Repeat cycle confirmed. Logging and moving to passive monitor.' },
    { tag: '[04:41:53Z]', text: 'Whoever is listening: the room hears you too.' }
  ];

  let entryIndex = 0;

  function typeLine(entry, done) {
    const line = document.createElement('div');
    line.className = 'line';
    line.style.opacity = '1';
    const tagSpan = document.createElement('span');
    tagSpan.className = 'tag';
    tagSpan.textContent = entry.tag + ' ';
    line.appendChild(tagSpan);

    const textSpan = document.createElement('span');
    line.appendChild(textSpan);

    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    line.appendChild(cursor);

    terminal.appendChild(line);

    let charIndex = 0;
    function typeChar() {
      if (charIndex < entry.text.length) {
        textSpan.textContent += entry.text.charAt(charIndex);
        charIndex++;
        setTimeout(typeChar, 18 + Math.random() * 30);
      } else {
        cursor.remove();
        done();
      }
    }
    typeChar();
  }

  function next() {
    if (entryIndex >= entries.length) return;
    typeLine(entries[entryIndex], () => {
      entryIndex++;
      setTimeout(next, 500);
    });
  }
  next();
}

/* ---------------------------------------------------------
   5. Monthly quote cipher — derives this month's clearance code
   --------------------------------------------------------- */
const QUOTES = [
  { text: "That which does not kill us makes us stronger.", author: "Friedrich Nietzsche" },       // January
  { text: "Who looks outside, dreams; who looks inside, awakes.", author: "Carl Jung" },            // February
  { text: "Wonder is the beginning of wisdom.", author: "Plato" },                                  // March
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },     // April
  { text: "Until you make the unconscious conscious, it will direct your life.", author: "Carl Jung" }, // May
  { text: "The measure of a man is what he does with power.", author: "Plato" },                    // June
  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },                // July
  { text: "Everything that irritates us about others can lead us to understand ourselves.", author: "Carl Jung" }, // August
  { text: "The beginning is the most important part of the work.", author: "Plato" },                // September
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates" },              // October
  { text: "You have power over your mind, not outside events.", author: "Marcus Aurelius" },         // November
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" }                  // December
];

function wordCipherCode(text) {
  const words = text
    .replace(/[.,!?;:"']/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 4);
  return words.map(w => (w.length % 10)).join('');
}

function getTodaysQuote() {
  const monthIndex = new Date().getMonth(); // 0 = January ... 11 = December
  return QUOTES[monthIndex];
}

/* ---------------------------------------------------------
   6. Keypad — enter today's cipher-derived code to unlock content
   --------------------------------------------------------- */
function buildKeypad() {
  const keypad = document.getElementById('keypad');
  const msg = document.getElementById('access-msg');
  const bufferReadout = document.getElementById('buffer-readout');
  const reveal = document.getElementById('hidden-reveal');
  const quoteTextEl = document.getElementById('quote-text');
  const quoteAuthorEl = document.getElementById('quote-author');
  const videoEl = document.getElementById('secret-video');
  const videoFallback = document.getElementById('video-fallback');
  const keys = ['1','2','3','4','5','6','7','8','9','*','0','#'];

  const todaysQuote = getTodaysQuote();
  const CODE = wordCipherCode(todaysQuote.text);
  quoteTextEl.textContent = `"${todaysQuote.text}"`;
  quoteAuthorEl.textContent = `— ${todaysQuote.author}`;

  let buffer = '';
  let unlocked = false;

  const deniedMessages = [
    'ACCESS DENIED',
    'NICE TRY',
    'STILL DENIED',
    'NO SUCH CLEARANCE EXISTS',
    'ATTEMPT LOGGED'
  ];

  function updateReadout() {
    bufferReadout.textContent = buffer.padEnd(4, '_').split('').join(' ');
  }

  function clearBuffer() {
    buffer = '';
    updateReadout();
  }

  function loadMonthlyVideo() {
    // Video files live at assets/videos/01.mp4 ... 12.mp4 (month number).
    // To rotate the video each month, just replace the file matching
    // that month's number — no code changes needed.
    const monthNum = String(new Date().getMonth() + 1).padStart(2, '0');
    const src = `assets/videos/${monthNum}.mp4`;

    videoEl.style.display = 'block';
    videoFallback.style.display = 'none';

    videoEl.onerror = () => {
      videoEl.style.display = 'none';
      videoFallback.style.display = 'block';
      videoFallback.textContent = `No transmission on file for this month (missing ${src}).`;
    };

    videoEl.src = src;
  }

  function checkCode() {
    if (buffer === CODE) {
      unlocked = true;
      msg.textContent = 'CLEARANCE ACCEPTED';
      msg.style.color = 'var(--amber)';
      reveal.classList.add('open');
      loadMonthlyVideo();
      reveal.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
      msg.style.color = 'var(--signal-red)';
      msg.textContent = deniedMessages[Math.floor(Math.random() * deniedMessages.length)];
      setTimeout(clearBuffer, 500);
    }
  }

  updateReadout();

  keys.forEach((k) => {
    const btn = document.createElement('button');
    btn.textContent = k;
    btn.addEventListener('click', () => {
      if (unlocked) return;

      if (k === '*') {
        clearBuffer();
        msg.textContent = '';
        return;
      }
      if (k === '#') {
        checkCode();
        return;
      }
      if (buffer.length < 4) {
        buffer += k;
        updateReadout();
      }
    });
    keypad.appendChild(btn);
  });
}
