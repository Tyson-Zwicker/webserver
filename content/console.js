"use strict";

const FONT_FAMILY = 'monospace';
const FONT_SIZE = 16;
const LINE_HEIGHT = Math.floor(FONT_SIZE * 1.4);
const TEXT_COLOR = '#00ff6f';
const BACKGROUND_COLOR = '#000000';
const CURSOR_BLINK_MS = 200;
const DEFAULT_CPS = 100;
const canvasEl = document.getElementById('terminal');
if (!(canvasEl instanceof HTMLCanvasElement)) {
  throw new Error('Canvas element with id "terminal" not found');
}
const canvas = canvasEl;
const context = canvas.getContext('2d');
if (!context) {
  throw new Error('Could not acquire 2D context');
}
const ctx = context;
canvas.tabIndex = 0;
let charWidth = 8;
let textHeight = FONT_SIZE;
let cursorHeight = FONT_SIZE;
let maxCols = 80;
let maxRows = 24;
let lastBlink = performance.now();
let cursorVisible = true;
let isTyping = false;

let loginStep = 0;
let username = '';
const state = {
  lines: [''],
  cursorLine: 0,
  cursorCol: 0
};
function setCanvasSize() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * dpr);
  canvas.height = Math.floor(window.innerHeight * dpr);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'top';
  const metrics = ctx.measureText('M');
  charWidth = metrics.width || 8;
  const measuredHeight = (metrics.actualBoundingBoxAscent || 0) + (metrics.actualBoundingBoxDescent || 0);
  textHeight = measuredHeight > 0 ? measuredHeight : FONT_SIZE;
  cursorHeight = Math.min(LINE_HEIGHT, Math.ceil(textHeight + 2));
  maxCols = Math.max(1, Math.floor(canvas.width / dpr / charWidth));
  maxRows = Math.max(1, Math.floor(canvas.height / dpr / LINE_HEIGHT));
}
function wrapLine(line) {
  if (maxCols <= 0)
    return [''];
  if (line.length === 0)
    return [''];
  const segments = [];
  for (let i = 0; i < line.length; i += maxCols) {
    segments.push(line.slice(i, i + maxCols));
  }
  return segments;
}
function computeWrappedLines() {
  const wrapped = [];
  for (const line of state.lines) {
    wrapped.push(...wrapLine(line));
  }
  return wrapped;
}
function getCursorScreenPosition() {
  const cols = Math.max(1, maxCols);
  let row = 0;
  for (let i = 0; i < state.lines.length; i++) {
    const line = state.lines[i];
    const wrapCount = Math.max(1, Math.ceil(Math.max(line.length, 1) / cols));
    if (i < state.cursorLine) {
      row += wrapCount;
      continue;
    }
    const offsetRows = Math.floor(state.cursorCol / cols);
    const col = state.cursorCol % cols;
    row += offsetRows;
    return { row, col };
  }
  return { row: 0, col: 0 };
}
function render() {
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = `${FONT_SIZE}px ${FONT_FAMILY}`;
  ctx.textBaseline = 'top';
  const wrapped = computeWrappedLines();
  const start = Math.max(0, wrapped.length - maxRows);
  const visible = wrapped.slice(start);
  for (let i = 0; i < visible.length; i++) {
    ctx.fillText(visible[i], 0, i * LINE_HEIGHT);
  }
  const cursorPos = getCursorScreenPosition();
  const cursorRow = cursorPos.row - start;
  if (cursorRow >= 0 && cursorRow < maxRows && cursorVisible) {
    const x = cursorPos.col * charWidth;
    const y = cursorRow * LINE_HEIGHT;
    ctx.fillRect(x, y, Math.ceil(charWidth), cursorHeight);
  }
}
function animate(time) {
  if (time - lastBlink >= CURSOR_BLINK_MS) {
    cursorVisible = !cursorVisible;
    lastBlink = time;
  }
  render();
  requestAnimationFrame(animate);
}
function insertChar(char) {
  const line = state.lines[state.cursorLine];
  state.lines[state.cursorLine] = line.slice(0, state.cursorCol) + char + line.slice(state.cursorCol);
  state.cursorCol += char.length;
}
function handleBackspace() {
  if (state.cursorCol > 0) {
    const line = state.lines[state.cursorLine];
    state.lines[state.cursorLine] = line.slice(0, state.cursorCol - 1) + line.slice(state.cursorCol);
    state.cursorCol -= 1;
    return;
  }
  if (state.cursorLine === 0)
    return;
  const current = state.lines[state.cursorLine];
  const prev = state.lines[state.cursorLine - 1];
  const merged = prev + current;
  state.lines[state.cursorLine - 1] = merged;
  state.lines.splice(state.cursorLine, 1);
  state.cursorLine -= 1;
  state.cursorCol = prev.length;
}
function handleEnter() {
  const currentLine = state.lines[state.cursorLine];
  const submitted = currentLine.slice(0, state.cursorCol);
  const remainder = currentLine.slice(state.cursorCol);
  const handled = onEnter(submitted);
  if (handled) {
    return;
  }
  state.lines[state.cursorLine] = submitted;
  state.lines.splice(state.cursorLine + 1, 0, remainder);
  state.cursorLine += 1;
  state.cursorCol = 0;
}
function onEnter(line) {
  const trimmed = line.trim().toLowerCase();
  if (trimmed === 'clear') {
    clearScreen();
    return true;
  } else {
    let xhttp = new XMLHttpRequest();
    if (loginStep === 1) {
      username = line;
      xhttp.open('GET', `:console?usr=${line}`);
    }
    else if (loginStep === 2) {
      xhttp.open('GET', `:console?usr=${username}&pwd=${line}`);
    }
    else if (loginStep === 3) {
      clearScreen();
      typeText('User Name:');
    }
    else {
      xhttp.open('GET', `:console?data=${line}`);
    }
    if (xhttp.readyState === XMLHttpRequest.OPENED) {
      xhttp.send('');
      xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
          //Handle server response...          
          typeText(xhttp.responseText);
         
        }
      };
    }
    console.log('loginstep old' + loginStep);
    if (loginStep === 1) {
      loginStep = 2;
    } else if (loginStep === 2) {
      loginStep = 3;
    } else if (loginStep === 3) {
      loginStep = 1;
    }
    console.log('loginstep new' + loginStep);
  }
  return false;
}
function init() {

  setCanvasSize();
  bindEvents();
  canvas.focus();
  requestAnimationFrame(animate);

  const script = document.querySelector('script[src*="console.js"]');
  const scriptParams = new URLSearchParams(new URL(script.src).search);
  console.log('params = ' + scriptParams);
  if (scriptParams.has('login') && scriptParams.get('login') === 'true') {
    loginStep = 1;
    typeText('User Name:');
  }
}
function handleKeyDown(event) {
  if (isTyping)
    return;
  if (event.key === 'Backspace') {
    event.preventDefault();
    handleBackspace();
    return;
  }
  if (event.key === 'Enter') {
    event.preventDefault();
    handleEnter();
    return;
  }
  if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
    event.preventDefault();
    insertChar(event.key);
  }
}
function clearScreen() {
  state.lines = [''];
  state.cursorLine = 0;
  state.cursorCol = 0;
}
function typeText(text, cps = DEFAULT_CPS) {
  const rate = cps > 0 ? cps : DEFAULT_CPS;
  const delay = 1000 / rate;
  isTyping = true;
  return new Promise((resolve) => {
    let index = 0;
    const timer = setInterval(() => {
      const char = text[index];
      insertChar(char);
      index += 1;
      if (index >= text.length) {
        clearInterval(timer);
        state.cursorLine += 1;
        state.lines.splice(state.cursorLine, 0, '');
        state.cursorCol = 0;
        isTyping = false;
        resolve();
      }
    }, delay);
  });
}
function bindEvents() {
  window.addEventListener('resize', () => {
    setCanvasSize();
  });
  window.addEventListener('keydown', handleKeyDown);
  canvas.addEventListener('click', () => canvas.focus());
}

init();
// Expose simple API for scripted output and clearing
window.terminal = {
  typeText,
  clear: clearScreen
};
