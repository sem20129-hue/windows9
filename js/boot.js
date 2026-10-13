/* ============================================================
   boot.js — BIOS POST, стартовое меню, установка, OOBE, MS-DOS
   ============================================================ */
'use strict';

/* ---------- состояние системы (переживает перезагрузку страницы) ---------- */
const Sys = {
  installed: false,
  setupDone: false,
  user: 'Пользователь',
  computer: 'PENTIUM-133',
  serial: '1234-567890',
  winver: 'Microsoft Windows 9, версия 4.00.950',
  date: null,          // {dd,mm,yyyy}
  clockOffset: 0,
  screensaver: 'Starfield Simulation',
  idleMinutes: 5,
  load() {
    try {
      const raw = localStorage.getItem('w9.sys');
      if (raw) Object.assign(this, JSON.parse(raw));
    } catch (e) { }
  },
  save() {
    try {
      localStorage.setItem('w9.sys', JSON.stringify({
        installed: this.installed, setupDone: this.setupDone, user: this.user,
        computer: this.computer, serial: this.serial, date: this.date,
        screensaver: this.screensaver, idleMinutes: this.idleMinutes
      }));
    } catch (e) { }
  },
  reset() { try { localStorage.removeItem('w9.sys'); } catch (e) { } }
};
Sys.load();

/* ============================================================
   1. BIOS POST
   ============================================================ */
StageInit['bios'] = function (root) {
  const out = Q('#postText', root);
  out.textContent = '';
  const hint = Q('#postHint', root);
  /* DEL открывает CMOS Setup — как на настоящей плате */
  const keyHook = e => {
    if (CurrentStage !== 'bios') return;
    if (e.key === 'Delete' || e.key === 'F2') { e.preventDefault(); cmosSetup(); }
  };
  window.addEventListener('keydown', keyHook);
  const lines = [
    'Award Modular BIOS v4.51PG, An Energy Star Ally',
    'Copyright (C) 1984-95, Award Software, Inc.',
    '',
    'Pentium-S CPU at 133MHz',
    'Memory Test :  16384K OK'
  ];
  (async () => {
    /* Если загрузку отменили (например, выбрали запуск MS-DOS), стадия уже
       сменилась — тогда дочитывать BIOS и открывать меню нельзя. */
    let alive = true;
    const step = async (ms) => { await sleep(ms); return CurrentStage === 'bios'; };
    for (const l of lines) { out.textContent += l + '\n'; if (!(await step(FF.on ? 5 : 130))) return alive = false; }
    for (const l of ['', 'Detecting IDE Primary Master  ... WDC AC31600H', 'Detecting IDE Primary Slave   ... None',
      'Detecting IDE Secondary Master ... MITSUMI CD-ROM FX400', 'Detecting IDE Secondary Slave ... None']) {
      out.textContent += l + '\n'; if (!(await step(FF.on ? 5 : 230))) return alive = false;
    }
    out.textContent += '\n'; if (!(await step(200))) return alive = false;
    for (const l of ['Press DEL to enter SETUP, ESC to skip memory test', '']) { out.textContent += l + '\n'; if (!(await step(260))) return alive = false; }
    out.textContent += '05/22/95-i430VX-2A59GG39C-00\n\n';
    for (const l of ['Award Modular BIOS v4.51PG, An Energy Star Ally', 'Boot from ATAPI CD-ROM  : No boot, Try floppy A?',
      'Boot from SCSI Adapters : None', '', 'Verifying DMI Pool Data ...................']) {
      out.textContent += l + '\n'; if (!(await step(FF.on ? 4 : 240))) return alive = false;
    }
    Speaker.tone(1200, 0.05, 'square', 0.02);
    out.textContent += '\nStarting Windows 9...\n\n'; if (!(await step(300))) return alive = false;
    out.textContent += 'Memory count : 16384K OK\n';
    if (!(await step(500))) return alive = false;
    window.removeEventListener('keydown', keyHook);
    hint.style.display = 'none';
    openBootMenu();
    return alive;
  })();
};

/* ============================================================
   CMOS Setup Utility (DEL при POST)
   ============================================================ */
function cmosSetup() {
  showStage('bios', true);
  const root = Q('#st-bios');
  root.innerHTML = '';
  const box = el('div', {
    style: 'position:absolute;inset:0;background:#000;color:#c9c9c9;font-family:"Lucida Console","Courier New",monospace;font-size:15px;line-height:20px;padding:16px 22px;color:#e0e0a0'
  });
  root.appendChild(box);
  box.appendChild(el('div', { style: 'color:#fff;text-align:center;font-family:Tahoma,sans-serif;font-size:18px;margin-bottom:14px', text: 'CMOS Setup Utility' }));
  box.appendChild(el('div', { style: 'color:#e0e0a0;margin-bottom:10px', text: 'Award Modular BIOS v4.51PG, An Energy Star Ally' }));
  const menuBox = el('div', { style: 'line-height:22px' });
  box.appendChild(menuBox);
  box.appendChild(el('div', { style: 'margin-top:16px;padding-top:10px;border-top:1px solid #555;color:#aaa', text: '↑↓: выбор   Enter: войти   Esc: выход' }));

  const pages = {
    'Standard CMOS Features': [
      'Дата                 : [ 22.05.1995 ]', 'Время                : [ 15:04:15 ]',
      'Drive A:             : [ 1.44M, 3.5 in. ]', 'Drive C:             : [ Auto ]',
      'Drive D:             : [ CD-ROM ]', 'Видео                : [ EGA/VGA ]',
      'Halt On              : [ All, But Keyboard ]'
    ],
    'Advanced BIOS Features': [
      'Virus Warning        : [ Disabled ]', 'CPU Internal Cache    : [ Enabled ]',
      'External Cache        : [ Enabled ]', 'Quick Power On Self Test: [ Enabled ]',
      'Boot Sequence         : [ C, A, CDROM ]', 'Security Option        : [ Setup ]'
    ],
    'Advanced Chipset Features': [
      'DRAM Timing           : [ 60-60-60 ]', 'Memory Hole           : [ Disabled ]',
      'USB Controller        : [ Disabled ]', 'On-Chip IDE           : [ Both ]'
    ],
    'Integrated Peripherals': [
      'On-Chip Floppy        : [ Enabled ]', 'On-Chip Serial Port 1 : [ 3F8/IRQ4 ]',
      'On-Chip Serial Port 2 : [ 2F8/IRQ3 ]', 'On-Chip Parallel Port : [ 378/IRQ7 ]',
      'Sound Blaster          : [ Enabled ]'
    ],
    'Load Fail-Safe Defaults': ['Загрузить заводские настройки по умолчанию?'],
    'Load Optimized Defaults': ['Загрузить оптимальные настройки по умолчанию?']
  };
  let keys = Object.keys(pages);
  let sel = 0;
  function render() {
    menu.innerHTML = '';
    keys.forEach((k, i) => menuBox.appendChild(el('div', {
      style: i === sel ? 'background:#e0e0a0;color:#000' : '', text: k
    })));
  }
  function showPage(name) {
    Speaker.ticks();
    root.innerHTML = '';
    const page = el('div', {
      style: 'position:absolute;inset:0;background:#000;color:#e0e0a0;font-family:"Lucida Console","Courier New",monospace;font-size:15px;line-height:21px;padding:16px 22px'
    });
    page.appendChild(el('div', { style: 'color:#fff;font-family:Tahoma,sans-serif;font-size:17px;margin-bottom:12px', text: name }));
    pages[name].forEach(l => page.appendChild(el('div', { text: l })));
    page.appendChild(el('div', { style: 'margin-top:16px;padding-top:10px;border-top:1px solid #555;color:#aaa', text: 'Esc: выход   F10: сохранить и выйти' }));
    root.appendChild(page);
    const hook = e => {
      if (CurrentStage !== 'bios') return;
      if (e.key === 'Escape' || e.key === 'Enter') {
        window.removeEventListener('keydown', hook);
        if (e.key === 'Enter' && (name === 'Load Fail-Safe Defaults' || name === 'Load Optimized Defaults')) {
          Speaker.error(); return;
        }
        menu();
      }
      if (e.key === 'F10') { window.removeEventListener('keydown', hook); Speaker.ding(); exitCmos(); }
    };
    window.addEventListener('keydown', hook);
  }
  function menu() {
    Speaker.ticks();
    root.innerHTML = '';
    root.appendChild(box);
    menuBox.innerHTML = '';
    render();
    const hook = e => {
      if (CurrentStage !== 'bios') return;
      if (e.key === 'ArrowDown') { sel = (sel + 1) % keys.length; render(); Speaker.ticks(); }
      else if (e.key === 'ArrowUp') { sel = (sel - 1 + keys.length) % keys.length; render(); Speaker.ticks(); }
      else if (e.key === 'Enter') { window.removeEventListener('keydown', hook); showPage(keys[sel]); }
      else if (e.key === 'Escape') { window.removeEventListener('keydown', hook); rebootToBios(); }
    };
    window.addEventListener('keydown', hook);
  }
  function exitCmos() {
    root.innerHTML = '<pre id="postText"></pre><div id="postHint" class="post-hint">Нажмите <b>DEL</b> для входа в SETUP</div>';
    StageInit['bios'](root);
  }
  menu();
}

/* ============================================================
   Экран загрузки Windows с логотипом и полосой прогресса
   ============================================================ */
function windowsLoadingScreen() {
  const st = Q('#st-bootmenu');
  showStage('bootmenu', true);
  st.innerHTML = '';
  const post = el('div', { cls: 'post' });
  const logo = el('div', { cls: 'w9-logo', html: 'Microsoft <span>Windows</span> 9' });
  const barWrap = el('div', { style: 'width:300px;height:18px;background:#c0c0c0;border:2px solid;border-color:#fff #000 #000 #fff;margin-top:20px;padding:2px;box-sizing:content-box' });
  const bar = el('div', { style: 'width:0%;height:100%;background:#000080;background-image:repeating-linear-gradient(90deg,#000080 0 8px,#1084d0 8px 16px)' });
  barWrap.appendChild(bar);
  post.appendChild(logo);
  post.appendChild(barWrap);
  st.appendChild(post);
  const t0 = Date.now();
  const dur = FF.on ? 500 : 2200;
  const iv = setInterval(() => {
    const p = Math.min(100, ((Date.now() - t0) / dur) * 100);
    bar.style.width = p.toFixed(0) + '%';
    if (Math.random() < 0.25) Speaker.ticks();
    if (p >= 100) clearInterval(iv);
  }, 40);
  return new Promise(res => setTimeout(res, dur + 120));
}

/* ============================================================
   2. Стартовое меню (клавиша F8)
   ============================================================ */
const BOOT_ITEMS = () => (Sys.installed
  ? [
    { t: 'Загрузить Microsoft Windows 9', f: () => startWindows() },
    { t: 'Загрузить MS-DOS', f: () => bootMSDOS() }
  ]
  : [
    { t: 'Установить Microsoft Windows 9', f: () => startSetup() },
    { t: 'Загрузить MS-DOS', f: () => bootMSDOS() }
  ]);

let bootSel = 0;
function openBootMenu() {
  FF.on = false;
  const st = Q('#st-bootmenu');
  showStage('bootmenu', true);
  st.innerHTML = '';
  const wrap = el('div', { cls: 'post' });
  wrap.appendChild(el('div', { cls: 'w9-logo', html: 'Microsoft <span>Windows</span> 9' }));
  wrap.appendChild(el('div', { cls: 'bootmenu-title', text: 'Стартовое меню Microsoft Windows 9' }));
  const list = el('ul', { cls: 'bootmenu', id: 'bootmenuList' });
  wrap.appendChild(list);
  wrap.appendChild(el('div', { cls: 'post-hint', html: 'Используйте <b>↑</b> <b>↓</b> и <b>Enter</b>' }));
  st.appendChild(wrap);
  const items = BOOT_ITEMS();
  bootSel = 0;
  items.forEach((it, i) => {
    list.appendChild(el('li', { cls: i === 0 ? 'sel' : '', text: (i + 1) + '   ' + it.t,
      on: { click: () => { bootSel = i; render(); run(); } } }));
  });
  function render() { QQ('li', list).forEach((li, i) => li.classList.toggle('sel', i === bootSel)); }
  function run() { const it = items[bootSel]; Speaker.ding(); it.f(); }
  bootMenuKey = e => {
    if (CurrentStage !== 'bootmenu') { window.removeEventListener('keydown', bootMenuKey); bootMenuKey = null; return; }
    if (e.key === 'ArrowDown') { bootSel = (bootSel + 1) % items.length; render(); Speaker.ticks(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { bootSel = (bootSel - 1 + items.length) % items.length; render(); Speaker.ticks(); e.preventDefault(); }
    else if (e.key === 'Enter') { run(); e.preventDefault(); }
  };
  window.addEventListener('keydown', bootMenuKey);
}
let bootMenuKey = null;

function startWindows() {
  Speaker.tone(500, 0.1);
  windowsLoadingScreen().then(() => {
    if (!Sys.setupDone) runOOBE();
    else startDesktop();
  });
}

/* ============================================================
   3. Установка Windows 9
   ============================================================ */
function setupFrame(wrap, title, bodyNodes, boxMsg, boxSub, boxIcon) {
  wrap.innerHTML = '';
  wrap.appendChild(el('h1', { text: title }));
  (Array.isArray(bodyNodes) ? bodyNodes : [bodyNodes]).forEach(n => n && wrap.appendChild(n));
  const box = el('div', { cls: 'blue-box' });
  if (boxMsg) {
    box.appendChild(el('div', { cls: 'ico ico-lg', style: 'width:32px;height:32px;flex:0 0 32px' }, [el('div', { cls: boxIcon || 'i-cd' })]));
    box.appendChild(el('div', { cls: 'txt' }, [
      el('div', { cls: 'msg', text: boxMsg }),
      el('div', { cls: 'sub', text: boxSub || '' })
    ]));
  }
  wrap.appendChild(box);
  return box;
}

function startSetup() {
  showStage('setup');
  const wrap = Q('#setupWrap');
  const KEY = 'WG9F-95BK-QW2M-XP7T-VD4L';

  /* --- 1. приветствие --- */
  const b1 = () => {
    setupFrame(wrap, 'Вас приветствует программа установки Microsoft Windows 9',
      [el('p', { text: 'Эта программа установит Microsoft Windows 9 на ваш компьютер.' }),
      el('p', { text: 'Чтобы начать установку, нажмите кнопку Далее.' })],
      '', '');
    const box = Q('.blue-box', wrap);
    const nb = el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
      el('button', { cls: 'btn def', text: 'Отмена' }),
      el('button', { cls: 'btn def', text: 'Далее', on: { click: () => { Speaker.ding(); keyPage(); } } })
    ]);
    box.appendChild(nb); wrap.appendChild(box);
  };

  /* --- 2. код продукта + лицензия --- */
  const keyPage = () => {
    const inp = el('input', { cls: 'field', value: KEY, style: 'width:280px' });
    const agree = mkRadio('eula', 'Я принимаю условия лицензионного соглашения', true);
    const refuse = mkRadio('eula', 'Я не принимаю условия лицензионного соглашения', false);
    setupFrame(wrap, 'Введите код программы продукта', [
      el('p', { text: 'Код программы продукта напечатан на наклейке на коробке Microsoft Windows 9.' }),
      el('div', { cls: 'row' }, [el('label', { text: 'Код программы:' }), inp]),
      el('div', { style: 'height:8px' }),
      el('div', { style: 'font-weight:bold;margin-bottom:6px', text: 'Лицензионное соглашение:' }),
      agree, el('div'), refuse,
      el('p', { style: 'font-size:13px;color:#d0d0d0;margin-top:12px;max-width:560px',
        text: 'Настоящее программное обеспечение предоставляется «как есть», без гарантий. Microsoft не несёт ответственности за убытки, возникшие в результате использования или невозможности использования программы.' })
    ], 'Установка Microsoft Windows 9', 'Вставьте компакт-диск в устройство чтения и нажмите Далее.', 'i-cd');
    Q('.blue-box', wrap).appendChild(el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
      el('button', { cls: 'btn', text: 'Отмена' }),
      el('button', { cls: 'btn def', text: 'Далее', on: { click: () => { Speaker.ding(); folderPage(); } } })
    ]));
  };

  /* --- 3. папка установки --- */
  const folderPage = () => {
    const inp = el('input', { cls: 'field', value: 'C:\\WINDOWS', style: 'width:260px' });
    setupFrame(wrap, 'Выберите папку для файлов Microsoft Windows 9', [
      el('p', { text: 'Программа установки скопирует файлы в указанную папку. Рекомендуется оставить путь по умолчанию.' }),
      el('div', { cls: 'row' }, [el('label', { text: 'Папка назначения:' }), inp])
    ], 'Копирование файлов Microsoft Windows 9', 'Программа скопирует файлы в C:\\WINDOWS', 'i-folder');
    Q('.blue-box', wrap).appendChild(el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
      el('button', { cls: 'btn', text: 'Назад' }),
      el('button', { cls: 'btn def', text: 'Далее', on: { click: () => { Speaker.ding(); hwPage(); } } })
    ]));
  };

  /* --- 4. проверка сведений о компьютере --- */
  const hwPage = () => {
    const listEl = el('div', { cls: 'stage-list' });
    const bar = el('i');
    const prog = el('div', { cls: 'progress' }, [bar]);
    setupFrame(wrap, 'Проверка сведений о компьютере',
      [listEl, el('div', { style: 'margin-top:14px' }, [prog])],
      'Проверка сведений о компьютере', 'Идёт определение оборудования...', 'i-computer');
    const checks = [
      'Тип компьютера : IBM PC/AT (Pentium-S, 133 МГц)',
      'Видеоадаптер  : Trio64V+ (2 МБ)',
      'Сетевой адаптер : NE2000 Compatible (IRQ 10, 0x0260)',
      'Контроллер дисков : Enhanced IDE (Pri 0, Sec 1)',
      'Мышь          : Microsoft, или совместимая, с 2 кнопками',
      'Клавиатура    : 101/102-клавишная',
      'Звуковая карта : Sound Blaster 16 (0x220, DMA 1, IRQ 5)',
      'Порты         : COM1, COM2, LPT1'
    ];
    (async () => {
      for (let i = 0; i < checks.length; i++) {
        listEl.appendChild(el('div', { text: checks[i] }));
        prog.firstChild.style.width = Math.round((i + 1) / checks.length * 100) + '%';
        Speaker.ticks();
        await sleep(FF.on ? 6 : 190);
      }
      await sleep(250);
      copyPage();
    })();
  };

  /* --- 5. копирование файлов --- */
  const copyPage = () => {
    const bar = el('i'); const prog = el('div', { cls: 'progress' }, [bar]);
    const status = el('div', { style: 'margin-top:12px;font-size:14px' });
    const barBox = setupFrame(wrap, 'Копирование файлов Microsoft Windows 9',
      [el('p', { text: 'Подождите, пока программа скопирует файлы на ваш компьютер.' }),
      el('div', { style: 'display:flex;gap:20px;align-items:center;margin-top:10px' }, [
        el('div', { style: 'font-size:15px;width:200px' }, [status]),
        prog
      ])],
      'Копирование файлов с компакт-диска...', 'Нажмите Далее, когда индикатор покажет 100 %.', 'i-cd');
    Q('.blue-box', wrap).appendChild(el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
      el('button', { cls: 'btn', text: 'Отмена' })
    ]));
    const steps = [
      ['Настройка папки...', 6],
      ['Копирование файлов...', 41],
      ['Копирование системных утилит...', 12],
      ['Копирование пакетов поддержки...', 17],
      ['Копирование файлов справки...', 9],
      ['Регистрация компонентов...', 8],
      ['Обновление списка файлов...', 7]
    ];
    (async () => {
      for (const [name, share] of steps) {
        status.textContent = name;
        for (let p = 0; p <= share; p++) {
          bar.style.width = Math.min(100, parseFloat(bar.style.width || 0) + 100 / 160 * (share / 7)) + '%';
          if (p % 3 === 0) Speaker.ticks();
          await sleep(FF.on ? 2 : 22);
        }
        await sleep(FF.on ? 4 : 130);
      }
      bar.style.width = '100%';
      await sleep(350);
      regPage();
    })();
  };

  /* --- 6. регистрация --- */
  const regPage = () => {
    setupFrame(wrap, 'Регистрация', [
      el('p', { text: 'Регистрация Microsoft Windows 9 на этом компьютере.' })
    ], 'Регистрация вашей личной копии Microsoft Windows 9', 'Подождите...', 'i-cd');
    Q('.blue-box', wrap).appendChild(el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
      el('button', { cls: 'btn', text: 'Далее' })
    ]));
    (async () => {
      await sleep(FF.on ? 30 : 900);
      Sys.installed = true; Sys.save();
      restartPage();
    })();
  };

  /* --- 7. перезагрузка --- */
  const restartPage = () => {
    const box = setupFrame(wrap, 'Перезагрузка компьютера', [
      el('p', { text: 'Программа установки завершила работу. Для завершения установки перезагрузите компьютер.' })
    ], 'Завершение установки Microsoft Windows 9', 'Нажмите кнопку ниже, чтобы перезагрузить компьютер.', 'i-computer');
    box.appendChild(el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
      el('button', { cls: 'btn', text: 'Нет' }),
      el('button', { cls: 'btn def', text: 'Да', on: { click: () => { Speaker.ding(); rebootToBios(); } } })
    ]));
  };

  b1();
}

/* ============================================================
   4. Первая настройка (OOBE)
   ============================================================ */
function runOOBE() {
  showStage('oobe');
  const wrap = Q('#oobeWrap');

  const welcome = () => {
    setupFrame(wrap, 'Вас приветствует Microsoft Windows 9', [
      el('p', { text: 'Это первая настройка Microsoft Windows 9. Ответьте на несколько вопросов о себе и своем компьютере.' }),
      el('p', { style: 'margin-top:16px', text: 'Что вы хотите узнать о Microsoft Windows 9?' }),
      el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:560px' }, [
        optCard('Меню Пуск', 'Быстрый запуск программ и поиск файлов'),
        optCard('Панель задач', 'Кнопки всех открытых окон в одном месте'),
        optCard('Рабочий стол', 'Значки всего, что есть на компьютере'),
        optCard('Проводник', 'Просмотр дисков и папок в окне')
      ])
    ], 'Подготовка к первой настройке', 'Понадобится около 5 минут.', 'i-set');
    Q('.blue-box', wrap).appendChild(el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
      el('button', { cls: 'btn', text: 'Пропустить' }),
      el('button', { cls: 'btn def', text: 'Далее', on: { click: () => { Speaker.ding(); langPage(); } } })
    ]));
  };
  const optCard = (t, d) => el('div', { style: 'background:#d4d0c8;color:#000;padding:8px;border:2px solid;border-color:#fff #404040 #404040 #fff' }, [
    el('div', { style: 'font-weight:bold', text: t }), el('div', { style: 'font-size:12px;color:#404040', text: d })
  ]);

  const langPage = () => {
    const country = mkSelect(['Россия', 'Украина', 'Белась', 'Казахстан', 'Германия', 'США'], 'Россия', null, '180px');
    const layout = mkSelect(['Русский (США)', 'Русский', 'Английский (США)'], 'Русский', null, '180px');
    setupFrame(wrap, 'Параметры языка', [
      el('div', { cls: 'row' }, [el('label', { text: 'Страна:' }), country]),
      el('div', { cls: 'row' }, [el('label', { text: 'Раскладка клавиатуры:' }), layout])
    ], 'Параметры языка', 'Укажите страну и раскладку клавиатуры.', 'i-set');
    Q('.blue-box', wrap).appendChild(btnRow(() => langPage(), () => { Speaker.ding(); namePage(); }, 'Готово'));
  };

  const namePage = () => {
    const user = el('input', { cls: 'field', value: 'Пользователь', style: 'width:220px' });
    const comp = el('input', { cls: 'field', value: Sys.computer, style: 'width:220px' });
    setupFrame(wrap, 'Имя для вашего компьютера', [
      el('div', { cls: 'row' }, [el('label', { text: 'Имя:' }), user]),
      el('div', { cls: 'row' }, [el('label', { text: 'Имя компьютера:' }), comp])
    ], 'Имя для вашего компьютера', 'Введите имя, под которым вас будут узнавать другие пользователи.', 'i-computer');
    Q('.blue-box', wrap).appendChild(btnRow(() => namePage(), () => {
      Sys.user = user.value.trim() || 'Пользователь';
      Sys.computer = (comp.value.trim() || 'PENTIUM-133').toUpperCase().replace(/\s+/g, '-');
      Sys.save(); Speaker.ding(); datePage();
    }, 'Далее'));
  };

  const datePage = () => {
    const dd = el('input', { cls: 'field', value: '22', style: 'width:50px' });
    const mm = el('input', { cls: 'field', value: '05', style: 'width:50px' });
    const yy = el('input', { cls: 'field', value: '1995', style: 'width:70px' });
    const hh = el('input', { cls: 'field', value: '15', style: 'width:50px' });
    const mi = el('input', { cls: 'field', value: '04', style: 'width:50px' });
    setupFrame(wrap, 'Дата и время', [
      el('div', { style: 'display:flex;gap:20px' }, [
        el('div', {}, [
          el('div', { style: 'margin-bottom:6px' }, [el('b', { text: 'Дата' })]),
          el('div', { style: 'display:flex;gap:6px;align-items:center' }, [
            dd, el('span', { text: '.' }), mm, el('span', { text: '.' }), yy
          ])
        ]),
        el('div', {}, [
          el('div', { style: 'margin-bottom:6px' }, [el('b', { text: 'Время' })]),
          el('div', { style: 'display:flex;gap:6px;align-items:center' }, [hh, el('span', { text: ':' }), mi])
        ])
      ])
    ], 'Дата и время', 'Проверьте дату и время на компьютере.', 'i-msn');
    Q('.blue-box', wrap).appendChild(btnRow(() => datePage(), () => {
      Sys.date = { dd: +dd.value || 22, mm: +mm.value || 5, yy: +yy.value || 1995 };
      const d = new Date();
      Sys.clockOffset = new Date(Sys.date.yy, Sys.date.mm - 1, Sys.date.dd, +hh.value || 15, +mi.value || 4)
        .getTime() - d.getTime();
      Sys.save(); Speaker.ding(); regPage();
    }, 'Далее'));
  };

  const regPage = () => {
    const g = el('div', { style: 'display:flex;flex-direction:column;gap:6px' }, [
      mkRadio('r', 'Я хочу зарегистрироваться сейчас (Microsoft Network)', false, () => finishReg()),
      mkRadio('r', 'Я зарегистрируюсь позже', true, () => finishReg()),
      mkRadio('r', 'Я не хочу регистрироваться', false, () => finishReg())
    ]);
    /* второй вариант отмечен по умолчанию — значит «Далее» имеет право идти дальше,
       иначе страница пищит, хотя выбор уже сделан */
    let chosen = true;
    function finishReg() { chosen = true; Speaker.ding(); saverPage(); }
    setupFrame(wrap, 'Регистрация Microsoft Windows 9', [
      el('p', { text: 'Регистрация даёт доступ к обновлениям и службе поддержки Microsoft Network.' }), g
    ], 'Регистрация', 'Выберите вариант регистрации.', 'i-msn');
    Q('.blue-box', wrap).appendChild(btnRow(() => regPage(), () => {
      if (!chosen) { Speaker.error(); return; }
      saverPage();
    }, 'Далее'));
  };

  const saverPage = () => {
    const sel = mkSelect(['(нет)', 'Blank Screen', 'Starfield Simulation', '3D Pipes', 'Flying Toasters', 'Mystify Your Mind', 'Marquee', 'Wavy', 'Bezeled Text'],
      Sys.screensaver === 'Blank Screen' ? '(нет)' : Sys.screensaver, null, '200px');
    const prev = el('div', { cls: 'tabs-msg', style: 'width:220px;height:150px;display:flex;align-items:center;justify-content:center;color:#000',
      text: 'Предпросмотр' });
    setupFrame(wrap, 'Экранная заставка', [
      el('p', { text: 'Экранная заставка запускается при простое. Выберите заставку и нажмите Просмотр, чтобы увидеть её.' }),
      el('div', { style: 'display:flex;gap:16px' }, [
        el('div', {}, [sel, el('div', { style: 'display:flex;gap:8px;margin-top:10px' }, [
          el('button', { cls: 'btn sm', text: 'Просмотр', on: { click: () => { Speaker.ding(); runSaver(sel.value === '(нет)' ? 'Blank Screen' : sel.value, 6); } } }),
          el('button', { cls: 'btn sm', text: 'Параметры...' })
        ])]),
        el('div', { style: 'border:2px solid;border-color:#fff #404040 #404040 #fff;padding:3px' }, [prev])
      ])
    ], 'Защита экрана', 'Выберите экранную заставку.', 'i-set');
    Q('.blue-box', wrap).appendChild(btnRow(() => saverPage(), () => {
      Sys.screensaver = sel.value === '(нет)' ? 'Blank Screen' : sel.value;
      Sys.setupDone = true; Sys.save();
      Speaker.ding();
      bootWindowsNow();
    }, 'Готово'));
  };

  const btnRow = (back, next, nextLabel) => el('div', { style: 'display:flex;gap:8px;margin-left:auto' }, [
    el('button', { cls: 'btn', text: 'Назад', on: { click: back } }),
    el('button', { cls: 'btn def', text: nextLabel, on: { click: next } })
  ]);

  welcome();
}

/* ============================================================
   5. Перезагрузка и запуск Windows
   ============================================================ */
function rebootToBios() {
  Speaker.tone(1200, 0.06);
  showStage('bios');
  StageInit['bios'](Q('#st-bios'));
}
function bootWindowsNow() {
  windowsLoadingScreen().then(() => startDesktop());
}

/* ============================================================
   6. MS-DOS
   ============================================================ */
function bootMSDOS() {
  showStage('dos');
  DosStart();
}

/* ---------- ESC ускоряет загрузку ---------- */
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (CurrentStage === 'bios' || CurrentStage === 'setup' || CurrentStage === 'bootmenu') {
      FF.on = !FF.on;
      if (CurrentStage === 'bootmenu') FF.on = false;
    }
  }
});

/* ---------- F5 обновляет рабочий стол ---------- */
window.addEventListener('keydown', e => {
  if (e.key === 'F5' && CurrentStage === 'desktop') { Speaker.ticks(); renderDesktopIcons(); }
});

/* ---------- старт системы ---------- */
fitScreen();
StageInit['bios'](Q('#st-bios'));