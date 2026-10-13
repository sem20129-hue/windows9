/* ============================================================
   games.js — Сапёр и FreeCell (под Windows 9)
   ============================================================ */
'use strict';

/* ============================================================
   Сапёр
   ============================================================ */
Apps.minesweeper = function () {
  const LEVELS = {
    'Новичок': { cols: 9, rows: 9, mines: 10 },
    'Любитель': { cols: 16, rows: 16, mines: 40 },
    'Профессионал': { cols: 30, rows: 16, mines: 99 }
  };
  let level = 'Новичок', grid = [], started = false, over = false, won = false;
  let flags = 0, time = 0, timer = null;
  let mc = null, fc = null, sm = null, board = null, winRef = null, winRefKey = null, levelSel = null;
  const NM = ['', '1', '2', '3', '4', '5', '6', '7', '8'];
  const COL = ['', '#0000ff', '#008000', '#ff0000', '#000080', '#800000', '#008080', '#000000', '#808080'];

  const win = Wm.open({
    title: 'Сапёр', icon: 'i-mine', w: Math.max(200, LEVELS['Новичок'].cols * 16 + 34), h: LEVELS['Новичок'].rows * 16 + 150,
    menus: [
      {
        label: 'Игра', items: [
          { label: 'Новая', accel: 'F2', action: () => reset() },
          { label: 'Заново', accel: 'F3', action: () => reset() },
          { label: 'Своя...', action: () => customField() },
          { sep: true },
          { label: 'Выход', accel: 'Alt+F4', action: () => win.close() }
        ]
      },
      {
        label: 'Уровень', items: Object.keys(LEVELS).map(k => ({
          label: k, radio: true, checked: k === level,
          action: () => { level = k; relayout(); }
        }))
      },
      { label: 'Справка', items: [{ label: 'О программе', action: () => Wm.msgBox('Сапёр', 'Сапёр\rMicrosoft Windows 9\r\rОткройте все клетки без мин.', [{ label: 'ОК', value: 'ok', def: true }], 'i-mine') }] }
    ],
    build(b) {
      mc = el('div', { cls: 'sunken', style: 'background:#000;color:#f00;font-size:20px;padding:1px 5px;font-family:"Lucida Console",monospace;min-width:44px;text-align:center', text: '010' });
      fc = el('div', { cls: 'sunken', style: 'background:#000;color:#f00;font-size:20px;padding:1px 5px;font-family:"Lucida Console",monospace;min-width:44px;text-align:center', text: '000' });
      sm = el('button', { cls: 'btn', style: 'width:30px;height:30px;padding:0;font-size:14px', text: '☺', on: { click: () => reset() } });
      const head = el('div', { cls: 'raised', style: 'padding:5px;display:flex;justify-content:space-between;align-items:center' }, [mc, sm, fc]);
      b.appendChild(el('div', { style: 'padding:6px' }, [head]));

      board = el('div', { cls: 'raised', style: 'padding:3px;display:block' });
      b.appendChild(el('div', { style: 'padding:0 6px;overflow:auto' }, [board]));

      b.appendChild(el('div', { style: 'padding:6px;display:flex;gap:6px;align-items:center;flex-wrap:wrap' }, [
        levelSel = mkSelect(Object.keys(LEVELS), level, v => { level = v; relayout(); }, '140px'),
        el('span', { style: 'color:#000080', id: 'mineBest', text: 'Лучшее время: ' + (localStorage.getItem('w9.mine') || '999') + ' с' })
      ]));

      winRefKey = e => { if (e.key === 'F2' || e.key === 'F3') { reset(); return true; } return false; };
      reset();
    }
  });
  winRef = win;
  win.onKey = e => (winRefKey ? winRefKey(e) : false);

  /* своё поле: ширина, высота, число мин */
  function customField() {
    Speaker.ticks();
    const wIn = el('input', { cls: 'field', value: 9, style: 'width:50px' });
    const hIn = el('input', { cls: 'field', value: 9, style: 'width:50px' });
    const mIn = el('input', { cls: 'field', value: 10, style: 'width:50px' });
    Wm.dialog({
      title: 'Своё поле', w: 300, h: 210, icon: 'i-mine',
      build(b, w) {
        const row = (label, input) => el('div', { style: 'display:flex;gap:10px;align-items:center;margin-bottom:10px' },
          [el('span', { text: label, style: 'width:120px' }), input]);
        b.appendChild(el('div', { style: 'padding:14px 14px 4px' }, [
          row('Ширина:', wIn), row('Высота:', hIn), row('Число мин:', mIn)
        ]));
        b.appendChild(el('div', { cls: 'btns' }, [
          el('button', { cls: 'btn', text: 'Отмена', on: { click: () => w.close() } }),
          el('button', {
            cls: 'btn def', text: 'ОК', on: {
              click: () => {
                const cw = clamp(parseInt(wIn.value, 10) || 9, 5, 40);
                const ch = clamp(parseInt(hIn.value, 10) || 9, 5, 24);
                const cm = clamp(parseInt(mIn.value, 10) || 10, 1, cw * ch - 1);
                LEVELS['Своё'] = { cols: cw, rows: ch, mines: cm };
                level = 'Своё';
                if (levelSel) {
                  levelSel.innerHTML = '';
                  Object.keys(LEVELS).forEach(k => levelSel.appendChild(el('option', { value: k, text: k })));
                  levelSel.value = level;
                }
                relayout();
                Speaker.ding();
                w.close();
              }
            }
          })
        ]));
      }
    });
  }

  function sync() {
    const L = LEVELS[level];
    if (mc) mc.textContent = String(Math.max(0, L.mines - flags)).padStart(3, '0');
    if (fc) fc.textContent = String(time).padStart(3, '0');
    if (sm) sm.textContent = over ? (won ? '😎' : '☹') : (started ? '😮' : '☺');
  }
  function relayout() {
    reset();
    if (winRef) {
      winRef.el.style.width = Math.max(200, LEVELS[level].cols * 16 + 34) + 'px';
      winRef.el.style.height = (LEVELS[level].rows * 16 + 150) + 'px';
      Wm.clampInto(winRef);
    }
  }
  function reset() {
    const L = LEVELS[level];
    started = false; over = false; won = false; flags = 0; time = 0;
    if (timer) clearInterval(timer);
    grid = [];
    for (let y = 0; y < L.rows; y++) {
      const row = [];
      for (let x = 0; x < L.cols; x++) row.push({ m: false, o: false, f: false, n: 0 });
      grid.push(row);
    }
    build();
    sync();
    if (winRef) {
      winRef.el.style.width = Math.max(200, L.cols * 16 + 34) + 'px';
      winRef.el.style.height = (L.rows * 16 + 150) + 'px';
      Wm.clampInto(winRef);
    }
  }
  function place(sx, sy) {
    const L = LEVELS[level];
    let placed = 0;
    while (placed < L.mines) {
      const x = Math.floor(Math.random() * L.cols), y = Math.floor(Math.random() * L.rows);
      if (grid[y][x].m) continue;
      if (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1) continue;
      grid[y][x].m = true; placed++;
    }
    for (let y = 0; y < L.rows; y++) {
      for (let x = 0; x < L.cols; x++) {
        let n = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy, nx = x + dx;
            if (ny < 0 || nx < 0 || ny >= L.rows || nx >= L.cols) continue;
            if (grid[ny][nx].m) n++;
          }
        }
        grid[y][x].n = n;
      }
    }
  }
  function build() {
    if (!board) return;
    const L = LEVELS[level];
    board.innerHTML = '';
    board.style.width = (L.cols * 16 + 8) + 'px';
    for (let y = 0; y < L.rows; y++) {
      for (let x = 0; x < L.cols; x++) {
        board.appendChild(cellEl(x, y));
      }
    }
  }
  function cellEl(x, y) {
    const g = grid[y][x];
    const c = el('div', { style: 'width:16px;height:16px;display:inline-block;box-sizing:border-box' });
    if (g.o) {
      c.style.border = '1px solid #808080';
      c.style.background = g.m ? '#ff0000' : '#c0c0c0';
      c.style.font = 'bold 10px Tahoma'; c.style.textAlign = 'center'; c.style.lineHeight = '14px';
      c.textContent = g.m ? '*' : (g.n ? NM[g.n] : '');
      if (g.n > 0) c.style.color = COL[g.n];
    } else if (g.f) {
      c.style.cssText = 'width:16px;height:16px;display:inline-block;box-sizing:border-box;border:1px solid;border-color:#fff #404040 #404040 #fff;background:#c0c0c0;font:bold 12px Tahoma;text-align:center;line-height:14px;color:#ff0000';
      c.textContent = '⚑';
    } else {
      c.style.cssText = 'width:16px;height:16px;display:inline-block;box-sizing:border-box;border:1px solid;border-color:#fff #404040 #404040 #fff;background:#c0c0c0';
    }
    if (!over) {
      c.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); Speaker.ticks(); click(x, y); });
      c.addEventListener('mousedown', e => {
        if (e.button === 1) { e.preventDefault(); e.stopPropagation(); if (sm) sm.textContent = '😱'; }   /* средняя кнопка — испуг */
      });
      c.addEventListener('dblclick', e => { e.preventDefault(); if (grid[y][x].o) chord(x, y); });
      c.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation(); Speaker.ticks();
        if (grid[y][x].o) return;
        if (!grid[y][x].f) flags++; else flags--;
        grid[y][x].f = !grid[y][x].f;
        build(); sync();
      });
    }
    return c;
  }
  function click(x, y) {
    const g = grid[y][x];
    if (g.f || over) return;
    if (!started) {
      place(x, y); started = true;
      timer = setInterval(() => { time++; sync(); }, 1000);
    }
    if (g.m) { boom(x, y); return; }
    flood(x, y);
    build(); sync(); checkWin();
  }
  function flood(x, y) {
    const q = [[x, y]];
    while (q.length) {
      const p = q.pop(), cx = p[0], cy = p[1];
      const g = grid[cy][cx];
      if (g.o || g.f || g.m) continue;
      g.o = true;
      if (g.n === 0) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = cy + dy, nx = cx + dx;
            if (ny < 0 || nx < 0 || ny >= grid.length || nx >= grid[0].length) continue;
            if (!grid[ny][nx].o && !grid[ny][nx].f && !grid[ny][nx].m) q.push([nx, ny]);
          }
        }
      }
    }
  }
  function chord(x, y) {
    const g = grid[y][x];
    let f = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || nx < 0 || ny >= grid.length || nx >= grid[0].length) continue;
        if (grid[ny][nx].f) f++;
      }
    }
    if (f !== g.n) return;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const ny = y + dy, nx = x + dx;
        if (ny < 0 || nx < 0 || ny >= grid.length || nx >= grid[0].length) continue;
        if (!grid[ny][nx].o && !grid[ny][nx].f) click(nx, ny);
      }
    }
  }
  function boom(x, y) {
    over = true;
    if (timer) clearInterval(timer);
    grid.forEach(r => r.forEach(g => { if (g.m) g.o = true; }));
    grid[y][x].n = -1;
    Speaker.error();
    build();
    sync();
    Wm.msgBox('Сапёр', 'Вы наступили на мину.\n\nОткройте все клетки без мин.', [{ label: 'ОК', value: 'ok', def: true }], 'i-mine');
  }
  function checkWin() {
    let closed = 0;
    grid.forEach(r => r.forEach(g => { if (!g.o) closed++; }));
    if (closed) return;
    over = true; won = true;
    if (timer) clearInterval(timer);
    const best = +(localStorage.getItem('w9.mine') || 999);
    if (time < best) localStorage.setItem('w9.mine', String(time));
    const bestEl = Q('#mineBest');
    if (bestEl) bestEl.textContent = 'Лучшее время: ' + Math.min(time, best) + ' с';
    build(); sync();
    Speaker.tada();
    Wm.msgBox('Сапёр', 'Поздравляем! Вы выиграли за ' + time + ' секунд.\n\nЛучшее время: ' + Math.min(time, best) + ' с.', [{ label: 'ОК', value: 'ok', def: true }], 'i-mine');
  }
  return win;
};

/* ============================================================
   FreeCell
   ============================================================ */
Apps.freecell = function () {
  const SUITS = ['♠', '♥', '♦', '♣'];
  const RED = c => c === '♥' || c === '♦';
  let deck = [], cas = [], found = [[], [], [], []], free = [[], [], [], []], selected = null, moves = 0, score = 0;
  let board = null, winRef = null, hintMarks = null, history = [];
  const STEP = 54, SLOT = 50;

  function newGame() {
    deck = [];
    for (let s = 0; s < 4; s++) for (let r = 1; r <= 13; r++) deck.push({ r: r, s: SUITS[s], id: s + '-' + r, up: false });
    for (let i = deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
    /* классическая раздача FreeCell: 7,7,7,7,6,6,6,6 — 52 карты */
    cas = [[], [], [], [], [], [], [], []];
    const counts = [7, 7, 7, 7, 6, 6, 6, 6];
    let k = 0;
    for (let c = 0; c < 8; c++) for (let n = 0; n < counts[c]; n++) cas[c].push(deck[k++]);
    cas.forEach(col => { col[col.length - 1].up = true; });
    found = [[], [], [], []]; free = [[], [], [], []];
    selected = null; moves = 0; score = 0;
    history = []; hintMarks = null;
    checkWin.done = false;          /* иначе вторая победа молчит */
    if (winRef) winRef.setStatus(0, 'Ходы: 0 · Очки: 0');
    render();
  }

  const win = Wm.open({
    title: 'FreeCell', icon: 'i-card', w: 664, h: 400,
    menus: [
      {
        label: 'Игра', items: [
          { label: 'Новая', accel: 'F2', action: () => newGame() },
          { label: 'Отменить ход', accel: 'Ctrl+Z', action: () => undo() },
          { label: 'Подсказка', action: () => hint() },
          { sep: true },
          { label: 'Выход', accel: 'Alt+F4', action: () => win.close() }
        ]
      },
      {
        label: 'Справка', items: [
          {
            label: 'Как играть', action: () => Wm.msgBox('FreeCell',
              'Свободные ячейки: 4 (слева вверху).\nДомашние ячейки: 4 (справа вверху).\n\nЩёлкните карту, потом щёлкните по колоде, свободной или домашней ячейке.\nВ свободную ячейку кладётся одна карта; щёлкните по ней ещё раз, чтобы вернуть карту.\nМожно класть только в порядке убывания либо чередуя цвета.\nДвойной щелчок отправляет карту в домашнюю ячейку.',
              [{ label: 'ОК', value: 'ok', def: true }], 'i-card')
          },
          { label: 'О программе', action: () => Wm.msgBox('FreeCell', 'FreeCell\rMicrosoft Windows 9\r\rПасьянс на 52 карты.', [{ label: 'ОК', value: 'ok', def: true }], 'i-card') }
        ]
      }
    ],
    status: ['Ходы: 0', 'Очки: 0', 'Время: 0', ''],
    build(b) {
      board = el('div', { style: 'position:absolute;left:6px;right:6px;top:6px;bottom:6px' });
      b.appendChild(board);
      newGame();
    }
  });
  winRef = win;
  win.onKey = e => { if (e.key === 'F2') { newGame(); return true; } return false; };

  function cardEl(c, top) {
    const n = el('div', {
      style: 'position:absolute;width:52px;height:74px;box-sizing:border-box;border:1px solid #000;border-radius:3px;background:#fff;text-align:center;line-height:1;padding-top:4px;cursor:default;font-size:' + (top ? 13 : 10) + 'px',
      text: c.r + ' ' + c.s
    });
    if (RED(c.s)) n.style.color = '#c00';
    if (selected && selected.idx != null && selected.c >= 0 && c === cas[selected.c][selected.idx]) n.style.boxShadow = '0 0 0 2px #00c inset';
    return n;
  }
  function backEl() {
    return el('div', { style: 'position:absolute;width:52px;height:74px;box-sizing:border-box;border:1px solid #000;border-radius:3px;background:repeating-linear-gradient(45deg,#0050a0 0 3px,#0a6fd0 3px 6px)' });
  }
  function placeholder(label) {
    return el('div', {
      style: 'position:absolute;width:52px;height:74px;box-sizing:border-box;border:1px solid #0a4a0a;border-radius:3px;background:#1c5c2c' + (label ? ';color:#0a3a0a;font-size:26px;line-height:74px;text-align:center' : ''),
      text: label || ''
    });
  }

  function render() {
    if (!board) return;
    board.innerHTML = '';
    for (let i = 0; i < 4; i++) {
      const cell = el('div', { style: 'position:absolute;left:' + (i * STEP) + 'px;top:0;width:50px;height:74px' + (hintMarks && hintMarks.free === i ? ';outline:3px solid #ff0' : '') });
      cell.appendChild(free[i].length ? cardEl(free[i][free[i].length - 1], true) : placeholder('☐'));
      cell.addEventListener('click', () => tryFree(i));
      board.appendChild(cell);
    }
    for (let i = 0; i < 4; i++) {
      const cell = el('div', { style: 'position:absolute;left:' + (432 + i * STEP) + 'px;top:0;width:52px;height:74px' });
      cell.appendChild(found[i].length ? cardEl(found[i][found[i].length - 1], true) : placeholder(''));
      cell.addEventListener('click', () => tryFoundation(i));
      board.appendChild(cell);
    }
    for (let c = 0; c < 8; c++) {
      const col = el('div', { style: 'position:absolute;left:' + (c * STEP) + 'px;top:80px;width:52px;height:250px' });
      const cards = cas[c];
      let y = 0;
      if (!cards.length) col.appendChild(placeholder(''));
      if (hintMarks && hintMarks.col === c) col.style.outline = '3px solid #ff0';
      cards.forEach((cd, idx) => {
        const isTop = idx === cards.length - 1;
        const node = cd.up ? cardEl(cd, isTop) : backEl();
        node.style.left = '0px';
        node.style.top = y + 'px';
        if (cd.up) {
          node.addEventListener('click', e => { e.stopPropagation(); pick(c, idx); });
          node.addEventListener('dblclick', e => { e.stopPropagation(); if (isTop) autoFoundation(c); });
        }
        col.appendChild(node);
        y += isTop ? 8 : 20;
      });
      col.addEventListener('click', () => tryCascade(c));
      board.appendChild(col);
    }
    if (winRef) {
      winRef.setStatus(0, 'Ходы: ' + moves);
      winRef.setStatus(1, 'Очки: ' + score);
    }
    checkWin();
  }

  function pick(c, idx) {
    Speaker.ticks();
    const cards = cas[c];
    const card = cards[idx];
    if (!card || !card.up) return;
    let start = idx;
    for (let i = idx - 1; i >= 0; i--) {
      const a = cards[i], b2 = cards[i + 1];
      if (!a.up) break;
      if (b2.r === a.r + 1 && (b2.s === a.s || RED(a.s) !== RED(b2.s))) start = i; else break;
    }
    if (selected && selected.c === c && selected.idx === start) { selected = null; render(); return; }
    selected = { c: c, idx: start, n: cards.length - start };
    if (cards.length - start === 1) {
      for (let i = 0; i < 4; i++) {
        if (canFound(card, i)) { sendToFoundation(c, i); return; }
      }
    }
    render();
  }
  function canFound(card, i) {
    const f = found[i];
    if (!f.length) return card.r === 1;
    const top = f[f.length - 1];
    return top.r === card.r - 1 && RED(top.s) !== RED(card.s);
  }
  function canStack(card, pile) {
    if (!pile.length) return true;
    const top = pile[pile.length - 1];
    if (!top.up) return false;
    return top.r === card.r + 1 && (top.s === card.s || RED(top.s) !== RED(card.s));
  }
  function expose(c) {
    const col = cas[c];
    if (col.length && !col[col.length - 1].up) col[col.length - 1].up = true;
  }
  function sendToFoundation(from, i) {
    const card = cas[from][cas[from].length - 1];
    pushHistory();
    cas[from].pop();
    found[i].push(card);
    expose(from); moves++; score += 5; selected = null; render();
  }
  function autoFoundation(c) {
    const card = cas[c][cas[c].length - 1];
    if (!card || !card.up) return;
    for (let i = 0; i < 4; i++) if (canFound(card, i)) { sendToFoundation(c, i); return; }
    Speaker.error();
  }
  function tryFoundation(i) {
    const sel = selected;
    if (!sel) return;
    if (sel.n !== 1) { Speaker.error(); return; }
    const card = cas[sel.c][sel.idx];
    if (!canFound(card, i)) { Speaker.error(); return; }
    pushHistory();
    cas[sel.c].splice(sel.idx, 1);
    found[i].push(card);
    expose(sel.c); moves++; score += 5; selected = null; render();
  }
  /* свободная ячейка: кладём одну карту и забираем одну обратно */
  function tryFree(i) {
    const sel = selected;
    if (!sel) {
      /* пусто — забрать карту из этой ячейки обратно в столбец, откуда она пришла */
      if (free[i].length && free[i][free[i].length - 1].from != null) {
        pushHistory();
        const card = free[i].pop();
        cas[card.from].push(card);
        expose(card.from); moves++; selected = null; render();
      } else Speaker.error();
      return;
    }
    if (free[i].length) { Speaker.error(); return; }
    if (sel.n !== 1) { Speaker.error(); return; }
    pushHistory();
    const card = cas[sel.c].splice(sel.idx, 1)[0];
    card.from = sel.c;
    free[i].push(card);
    expose(sel.c); moves++; score += 1; selected = null; render();
  }
  function tryCascade(c) {
    const sel = selected;
    if (!sel || sel.c === c) return;
    const from = sel.c, idx = sel.idx;
    const card = cas[from][idx];
    if (!canStack(card, cas[c])) { Speaker.error(); return; }
    pushHistory();
    const moved = cas[from].splice(idx, sel.n);
    for (const m of moved) cas[c].push(m);
    expose(from); moves++; score += 1; selected = null; render();
  }
  /* история ходов для отмены */
  function snapshot() {
    return {
      cas: cas.map(col => col.map(c => ({ r: c.r, s: c.s, up: c.up, from: c.from }))),
      found: found.map(f => f.map(c => ({ r: c.r, s: c.s, up: c.up, from: c.from }))),
      free: free.map(f => f.map(c => ({ r: c.r, s: c.s, up: c.up, from: c.from }))),
      moves: moves, score: score
    };
  }
  function pushHistory() {
    history.push(snapshot());
    if (history.length > 60) history.shift();
  }
  function undo() {
    const s = history.pop();
    if (!s) { Speaker.error(); Wm.msgBox('FreeCell', 'Отменять нечего.', [{ label: 'ОК', value: 'ok', def: true }], 'i-card'); return; }
    cas = s.cas.map(col => col.map(c => Object.assign({}, c)));
    found = s.found.map(f => f.map(c => Object.assign({}, c)));
    free = (s.free || [[], [], [], []]).map(f => f.map(c => Object.assign({}, c)));
    moves = s.moves; score = s.score; selected = null;
    Speaker.ticks();
    render();
  }
  /* подсказка: подсветить свободную ячейку и карту, которую можно положить */
  function hint() {
    const emptyCols = cas.map((col, i) => ({ col: col, i: i })).filter(o => !o.col.length);
    hintMarks = { col: emptyCols[0] ? emptyCols[0].i : null, free: free.findIndex(f => !f.length) };
    const c = emptyCols[1] || emptyCols[0];
    if (c) {
      const top = c.col[c.col.length - 1];
      if (top) {
        for (let f = 0; f < 4; f++) if (canFound(top, f)) hintMarks.found = f;
        cas.forEach((col, i) => { if (col.indexOf(top) >= 0) hintMarks.from = i; });
      }
    }
    Speaker.ding();
    render();
    setTimeout(() => { hintMarks = null; render(); }, 2600);
  }
  function checkWin() {
    const total = found.reduce((a, f) => a + f.length, 0);
    if (total === 52 && !checkWin.done) {
      checkWin.done = true;
      Speaker.tada();
      Wm.msgBox('FreeCell', 'Поздравляем! Вы выиграли.\n\nХодов: ' + moves + '\nОчки: ' + score, [{ label: 'ОК', value: 'ok', def: true }], 'i-card');
    }
  }
  checkWin.done = false;
  return win;
};