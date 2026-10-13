/* ============================================================
   dos.js — MS-DOS 6.22: консоль, командный процессор, окно
   ============================================================ */
'use strict';

function DosConsole(host, opts) {
  opts = opts || {};
  const out = el('pre', { cls: 'dos' });
  host.appendChild(out);
  const cur = el('b', { cls: 'cur' });
  let text = '', input = '', st = { cwd: 'C:\\', path: 'C:\\WINDOWS;C:\\WINDOWS\\COMMAND', prompt: 'C:\\>', echo: true };

  function prompt() { return st.cwd + '>'; }
  function print(s) {
    text += s.replace(/\n/g, '\r\n') + '\r\n';
    const lines = text.split('\n');
    if (lines.length > 400) { text = lines.slice(lines.length - 400).join('\n'); }
    render();
  }
  function render() {
    out.textContent = text + prompt() + input;
    out.appendChild(cur);
    host.scrollTop = host.scrollHeight;
  }
  function submit() {
    const line = input;
    text += prompt() + line + '\r\n';
    input = '';
    run(line.trim());
    render();
  }
  let history = [];
  /* дата в формате MS-DOS: 22-05-95 */
  function dosDate() {
    const d = new Date(Date.now() + (Sys.clockOffset || 0));
    return pad(d.getDate()) + '-' + pad(d.getMonth() + 1) + '-' + String(d.getFullYear()).slice(2);
  }

  /* ---------------- команды ---------------- */
  function run(line) {
    if (!line) return;
    history.unshift(line); if (history.length > 30) history.pop();
    const parts = line.match(/"[^"]+"|\S+/g).map(s => s.replace(/"/g, ''));
    const cmd = parts[0].toUpperCase();
    const args = parts.slice(1);
    const A = (i) => args[i] || '';
    const fsPath = p => {
      let q = p;
      if (!/^[A-Z]:/.test(q.toUpperCase())) q = st.cwd.replace(/\\$/, '') + '\\' + q;
      return normPath(q).full;
    };
    const err = m => { print(m); Speaker.error(); };

    switch (cmd) {
      case 'HELP':
        if (A(0)) {
          const topic = A(0).toUpperCase();
          const topics = {
            DIR: 'DIR [диск:][путь]  — список файлов и папок.\nИмена в кавычках, если есть пробелы:\n  DIR "C:\\Мои документы"',
            CD: 'CD [[диск:]путь]  — смена текущей папки.\n  CD ..          на уровень вверх\n  CD \\           на корень диска\n  CD             показать текущую папку',
            TYPE: 'TYPE файл  — вывод содержимого текстового файла на экран.',
            MD: 'MD папка  — создать папку.',
            RD: 'RD папка  — удалить пустую папку.',
            MEM: 'MEM  — сведения о свободной базовой и расширенной памяти.',
            WIN: 'WIN  — загрузить Microsoft Windows 9 (если установлена).',
            CHKDSK: 'CHKDSK [диск:]  — проверка диска.',
            EDIT: 'EDIT файл  — открыть файл в Блокноте Windows.'
          };
          if (topics[topic]) print(topics[topic] + '\n');
          else print('Справки по команде ' + A(0) + ' нет.\n');
          return;
        }
        print([
          'Доступные команды:',
          '  DIR          список файлов и папок',
          '  CD имя       смена текущей папки',
          '  MD имя       создать папку',
          '  RD имя       удалить папку',
          '  TYPE файл    вывести содержимое файла',
          '  COPY ист наз копирование файла',
          '  DEL файл     удаление файла',
          '  REN имя новое переименование',
          '  TREE         дерево папок',
          '  CHKDSK       проверка диска',
          '  VOL          метка тома',
          '  PATH         список путей поиска',
          '  MEM          сведения о памяти',
          '  VER          версия MS-DOS',
          '  DATE / TIME  дата и время',
          '  ECHO текст   вывод текста',
          '  CLS          очистка экрана',
          '  PRINT файл   печать',
          '  EDIT файл    вызов Блокнота',
          '  WIN          запуск Windows' + (Sys.installed ? '' : ' (не установлена)'),
          '  EXIT         выход в стартовое меню',
          '',
          'Справка по команде: HELP DIR'
        ].join('\n'));
        return;
      case 'VER': print('\nMS-DOS Version 6.22\n'); return;
      case 'VOL': print('\n Том в устройстве C имеет метку «WIN95_95»\n Серийный номер тома: 1A2B-3C4D\n'); return;
      case 'CHKDSK': print([
        '',
        'Volume WIN95_95   created 22-05-1995  15:04',
        'Volume Serial Number is 1A2B-3C4D',
        '',
        'Volume is a fixed disk',
        'Partition starting at sector 0',
        '',
        'Total disk space is 146 401 K bytes;',
        ' 83 217 K bytes in 312 hidden files',
        ' 59 104 K bytes in 41 user files',
        '   4 080 K bytes in 12 directories',
        '   0 bytes in bad sectors',
        '',
        '  662 496 bytes total disk space',
        '  646 144 bytes available on disk',
        '',
        '         8,192 bytes in each allocation unit',
        '       79 total allocation units on disk',
        '       79 available allocation units on disk',
        '',
        '     655,360 total bytes memory',
        '     649,264 bytes free',
        ''
      ].join('\n')); return;
      case 'MEM': print([
        '',
        '  640 KB основной памяти, из них 621 KB свободно',
        '  655 360 KB расширенной памяти (XMS)',
        '  15 728 KB свободно в расширенной памяти',
        '',
        '  Итого: 16 384 KB, свободно 16 349 KB',
        ''
      ].join('\n')); return;
      case 'PATH': print('PATH=' + st.path + '\n'); return;
      case 'CLS': text = ''; render(); return;
      case 'ECHO':
        if (!A(0)) print('');
        else if (A(0).toUpperCase() === 'OFF') { st.echo = false; return; }
        else if (A(0).toUpperCase() === 'ON') { st.echo = true; return; }
        else print(args.join(' '));
        return;
      case 'DATE': print('\nТекущая дата: ' + dosDate() + '\nВведите новую дату (дд-мм-гггг):\n'); return;
      case 'TIME': print('\nТекущее время: ' + ruTime(new Date(Date.now() + (Sys.clockOffset || 0))) + '\nВведите новое время: чч:мм:сс.сс\n'); return;
      case 'CD': case 'CHDIR': {
        if (!A(0)) { print(st.cwd); return; }
        if (A(0) === '\\' || A(0) === '/') { st.cwd = 'C:\\'; return; }
        if (A(0) === '..') { st.cwd = fsParent(st.cwd); return; }
        if (args.length > 1) return err('В имени пути есть пробелы — заключите его в кавычки:\r\n  ' + args.join(' '));
        const p = fsPath(A(0));
        const n = fsGet(p);
        if (!n) return err('Системе не удаётся найти указанный путь.');
        if (n.type !== 'dir') return err('Путь не является каталогом.');
        st.cwd = p;
        return;
      }
      case 'MD': case 'MKDIR':
        if (!A(0)) return err('Синтаксис: MKDIR [диск:]путь');
        if (!fsMkdir(fsPath(A(0)))) return err('Не удаётся создать каталог');
        return;
      case 'RD': case 'RMDIR': {
        const p = fsPath(A(0));
        const n = fsGet(p);
        if (!n) return err('Системе не удаётся найти указанный путь.');
        if (n.type !== 'dir') return err('Путь не является каталогом.');
        if (Object.keys(n.children).length) return err('Каталог не пуст.');
        fsDel(p); return;
      }
      case 'DIR': {
        const p = A(0) ? fsPath(A(0)) : st.cwd;
        const n = fsGet(p);
        if (!n) return err('Системе не удаётся найти указанный путь.');
        print('\n Том в устройстве ' + normPath(p).drive + ' имеет метку «WIN95_95»\n');
        if (n.type !== 'dir') return print('Содержимое файла: ' + n.body.length + ' байт\n');
        const keys = Object.keys(n.children);
        let files = 0, bytes = 0, dirs = 0;
        print(' Содержимое папки ' + p + '\n');
        print('.              <ПАПКА>        ' + dosDate() + '   15:04\n');
        print('..             <ПАПКА>        ' + dosDate() + '   15:04\n');
        keys.forEach(k => {
          const c = n.children[k];
          const nm = (k.length <= 12 ? k : k.slice(0, 9) + '...' + k.slice(-2)).padEnd(13);
          if (c.type === 'dir') { dirs++; print(nm + '<ПАПКА>        ' + dosDate() + '   15:04\n'); }
          else { files++; bytes += c.body.length; print(nm.padEnd(14) + String(Math.max(1, Math.round(c.body.length / 1024))).padStart(9) + ' ' + dosDate() + '   15:04\n'); }
        });
        print('       ' + files + ' файлов  ' + (bytes ? bytes + ' байт' : '') + '\n');
        print('       ' + dirs + ' папок   ' + (max(0, 4096 - files) * 2048) + ' байт свободно\n\n');
        return;
      }
      case 'TYPE': {
        if (!A(0)) return err('Синтаксис: TYPE имя файла');
        const n = fsGet(fsPath(A(0)));
        if (!n || n.type === 'dir') return err('Системе не удаётся найти указанный файл.');
        print(n.body);
        return;
      }
      case 'COPY': {
        const src = fsGet(fsPath(A(0)));
        if (!src || src.type === 'dir') return err('Системе не удаётся найти указанный файл.');
        if (!A(1)) return print('        1 файлов скопировано.\n');
        fsPut(fsPath(A(1)), file(src.body, src.kind));
        print('        1 файлов скопировано.\n');
        return;
      }
      case 'DEL': case 'ERASE': {
        if (!A(0)) return err('Синтаксис: DEL имя файла');
        const p = fsPath(A(0)), n = fsGet(p);
        if (!n || n.type === 'dir') return err('Системе не удаётся найти указанный файл.');
        fsDel(p); return;
      }
      case 'REN': case 'RENAME': {
        if (!A(0) || !A(1)) return err('Синтаксис: REN имя новое_имя');
        const p = fsPath(A(0)), n = fsGet(p);
        if (!n || n.type === 'dir') return err('Системе не удаётся найти указанный файл.');
        fsPut(fsPath(A(1)), n); fsDel(p); return;
      }
      case 'TREE': {
        const root = fsGet(st.cwd);
        print('\n' + st.cwd + '\n');
        (function walk(node, path, pre) {
          const ks = Object.keys(node.children);
          ks.forEach((k, i) => {
            const c = node.children[k];
            const last = i === ks.length - 1;
            print(pre + (last ? '└───' : '├───') + k + (c.type === 'dir' ? '\\' : '') + '\n');
            if (c.type === 'dir') walk(c, path + '\\' + k, pre + (last ? '    ' : '│   '));
          });
        })(root, st.cwd, '');
        print('\n');
        return;
      }
      case 'PRINT':
        if (!A(0)) return err('Синтаксис: PRINT имя файла');
        Wm.printJob(A(0)); print('Файл отправлен на принтер HP LaserJet 4L.\n');
        return;
      case 'EDIT':
        if (opts.onEdit) opts.onEdit(fsPath(A(0) || ''));
        return;
      case 'FORMAT':
        print('\nВНИМАНИЕ! Все данные на диске будут стёрты.\n(Демонстрация: FORMAT ничего не стирает)\n');
        return;
      case 'WIN':
        if (!Sys.installed) return err('Windows не установлена. Сначала выполните установку.');
        if (opts.onWin) opts.onWin();
        return;
      case 'EXIT':
        if (opts.onExit) opts.onExit();
        return;
      default:
        // попытка запустить файл
        const n = fsGet(fsPath(cmd));
        if (n && n.type === 'file') return err('Программа ' + cmd + ' требует загрузки Windows.');
        print('Неверная команда или имя файла');
        return;
    }
  }
  function max(a, b) { return a > b ? a : b; }

  /* ---------------- клавиатура ---------------- */
  function key(e) {
    if (e.ctrlKey && e.key === 'c') {
      text += prompt() + input + '^C\r\n'; input = ''; render(); return true;
    }
    if (e.ctrlKey && e.key === 'm') { input = ''; render(); return true; }
    if (e.key === 'Enter') { submit(); return true; }
    if (e.key === 'Backspace') { input = input.slice(0, -1); render(); return true; }
    if (e.key === 'Escape') { input = ''; render(); return true; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const i = history.indexOf(input);
      let j = e.key === 'ArrowUp' ? Math.max(0, (i < 0 ? 0 : i) - 1) : Math.min(history.length - 1, (i < 0 ? -1 : i) + 1);
      if (history[j] != null) input = history[j];
      render(); return true;
    }
    if (e.key.length === 1) { input += e.key; render(); Speaker.ticks(); return true; }
    return false;
  }

  return { print: print, key: key, render: render, state: st, clear: () => { text = ''; render(); } };
}

/* ---------- загрузка в MS-DOS ---------- */
let dosConsole = null;
function DosStart(fromShutdown) {
  const stage = Q('#st-dos');
  stage.innerHTML = '';
  stage.style.background = '#000';
  dosConsole = DosConsole(stage, {
    onExit: () => openBootMenu(),
    onWin: () => bootWindowsNow(),
    onEdit: p => { showStage('desktop'); startDesktop(); Apps.notepad(p && p.indexOf('.') > 2 ? p : null); }
  });
  const c = dosConsole;
  if (dosKeyHandler) window.removeEventListener('keydown', dosKeyHandler);
  dosKeyHandler = e => {
    if (CurrentStage !== 'dos') return false;
    if (c.key(e)) { e.preventDefault(); return true; }
    return false;
  };
  window.addEventListener('keydown', dosKeyHandler);

  c.print('');
  c.print('Microsoft(R) MS-DOS(R)\n   Версия 6.22\n');
  c.print('             (C)Корпорация Майкрософт, 1981-1995.\n');
  c.print('');
  if (Sys.installed) {
    c.print('HIMEM: DOS XMS Driver, версия 3.09 — память XMS 15 МБ\n');
    c.print('EMM386: Expanded Memory Emulator — 640 КБ расширенной памяти\n');
    c.print('MSCDEX: привод D: — MITSUMI FX400, 4 скорости\n');
    c.print('');
  }
  c.state.cwd = 'C:\\';
}

/* ---------- MS-DOS Prompt в окне Windows ---------- */
function openMSDOSWindow() {
  const winRef = {};
  const win = Wm.open({
    title: 'MS-DOS Prompt', icon: 'i-dos', w: 560, h: 380,
    menus: [
      {
        label: 'Параметры', items: [
          { label: 'Синхронный вывод', checked: true, disabled: true },
          { label: 'Запустить в отдельном окне', action: () => { win.close(); rebootToBios(); /* смена стадии отменяет анимацию POST, иначе меню откроется поверх DOS */ setTimeout(() => { showStage('dos'); DosStart(); }, 300); } },
          { sep: true },
          { label: 'Выход', action: () => win.close() }
        ]
      }
    ],
    build(b) {
      const screen = el('div', { style: 'position:absolute;inset:2px;background:#000;overflow:auto;padding:4px' });
      b.appendChild(screen);
      const c = DosConsole(screen, {
        onExit: () => win.close(),
        onWin: () => { win.close(); bootWindowsNow(); },
        onEdit: p => { win.close(); Apps.notepad(p && p.indexOf('.') > 0 ? p : null); }
      });
      c.print('Microsoft(R) MS-DOS(R)\n   Версия 6.22\n');
      c.print('\n(C)Корпорация Майкрософт, 1981-1995.\n');
      c.print('Введите WIN, чтобы загрузить Windows.\n\n');
      c.state.cwd = 'C:\\WINDOWS';
      winRef._dos = c;
      setTimeout(() => screen.focus(), 40);
    }
  });
  win.onKey = e => (win._dos ? win._dos.key(e) : false);
  win._dos = winRef._dos;
  return win;
}
let dosKeyHandler = null;