/* ============================================================
   google.js — Google Search 1.0: поиск по системе и Интернету
   ============================================================ */
'use strict';

/* логотип из букв, как у настоящего Google */
function googleLogo(size) {
  const letters = [['G', '#4285F4'], ['o', '#EA4335'], ['o', '#FBBC05'], ['g', '#4285F4'], ['l', '#34A853'], ['e', '#EA4335']];
  const row = el('div', { style: 'display:inline-flex;align-items:baseline;font-family:Arial,Helvetica,sans-serif;font-size:' + (size || 40) + 'px;letter-spacing:-1px' });
  letters.forEach(([ch, color]) => row.appendChild(el('span', { text: ch, style: 'color:' + color })));
  return row;
}

/* ---------- настоящий Интернет через открытые API ---------- */
function fetchInternet(q) {
  const out = { web: [], wiki: [], abstract: null, errors: [] };
  const qe = encodeURIComponent(q);

  /* DuckDuckGo Instant Answers — отдаёт реальные ссылки с описаниями */
  const p1 = fetch('https://api.duckduckgo.com/?q=' + qe + '&format=json&no_html=1&no_redirect=1&t=' + Date.now())
    .then(r => r.json())
    .then(j => {
      if (j.AbstractText) out.abstract = { text: j.AbstractText, url: j.AbstractURL || '', source: j.AbstractSource || '' };
      const push = (t, url) => {
        if (!t || !url) return;
        const parts = String(t).split(' - ');
        out.web.push({ title: (parts[0] || t).slice(0, 90), text: parts.slice(1).join(' - ') || String(t), url: url });
      };
      (j.RelatedTopics || []).forEach(rt => {
        if (rt.Topics) rt.Topics.forEach(t => push(t.Text, t.FirstURL));
        else push(rt.Text, rt.FirstURL);
      });
      (j.Results || []).forEach(r => push(r.Text, r.Url));
    })
    .catch(() => { out.errors.push('поисковик недоступен'); });

  /* Википедия — поиск по статьям */
  const p2 = fetch('https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=' + qe +
    '&srlimit=10&format=json&origin=*')
    .then(r => r.json())
    .then(j => {
      ((j.query && j.query.search) || []).forEach(s => out.wiki.push({
        title: s.title,
        text: String(s.snippet).replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&amp;/g, '&')
      }));
    })
    .catch(() => { out.errors.push('Википедия недоступна'); });

  return Promise.all([p1, p2]).then(() => out);
}

Apps.google = function () {
  let query = '', mode = 'local', winRef = null, busy = false;
  const input = el('input', { cls: 'field', style: 'width:440px;height:26px;font-family:Arial,sans-serif;font-size:13px;padding:2px 8px' });
  const realLink = el('a', { cls: 'btn sm', text: 'Открыть в настоящем браузере', attrs: { href: 'https://www.google.com/search?q=', target: '_blank', rel: 'noopener' } });
  const out = el('div', { cls: 'gout' });
  const statusLine = el('div', { cls: 'gstatus' });

  const head = el('div', { cls: 'ghead' });
  head.appendChild(el('div', { style: 'text-align:center;padding:12px 0 10px' }, [googleLogo(38)]));
  const searchRow = el('div', { style: 'display:flex;gap:6px;justify-content:center;align-items:center' });
  searchRow.appendChild(input);
  searchRow.appendChild(el('button', { cls: 'btn def', text: 'Найти', style: 'height:26px', on: { click: () => run() } }));
  head.appendChild(searchRow);
  head.appendChild(el('div', { style: 'text-align:center;margin-top:9px;font-size:11px;color:#70757a' }, [
    'Ищет в: ',
    mkRadio('gmode', 'локальном архиве системы', true, () => { mode = 'local'; run(); }),
    el('span', { text: '   ' }),
    mkRadio('gmode', 'настоящем Интернете', false, () => { mode = 'net'; run(); }),
    el('span', { text: '   ' }),
    mkCheckbox('Мне повезло', false, v => { if (v) { input.value = 'википедия'; run(); } })
  ]));
  head.appendChild(el('div', { style: 'text-align:center;margin-top:8px;display:flex;gap:6px;justify-content:center' }, [
    realLink,

    el('button', { cls: 'btn sm', text: 'Мои страницы', on: { click: () => { Apps.browser(SITES.find(s => s.host === SEARCH_ENGINE.host).idx); } } })
  ]));

  const win = Wm.open({
    title: 'Google Search 1.0', icon: 'i-ie', w: 700, h: 500,
    menus: [
      {
        label: 'Файл', items: [
          { label: 'Новая закладка', accel: 'Ctrl+T', action: () => { input.value = ''; run(); } },
          { label: 'Открыть в настоящем браузере', action: () => { const a = el('a', { attrs: { href: 'https://www.google.com/search?q=' + encodeURIComponent(query), target: '_blank' } }); document.body.appendChild(a); a.click(); a.remove(); } },
          { sep: true },
          { label: 'Выход', accel: 'Alt+F4', action: () => win.close() }
        ]
      },
      {
        label: 'Правка', items: [
          { label: 'Копировать запрос', accel: 'Ctrl+C', action: () => { try { navigator.clipboard.writeText(query); } catch (e) { } } },
          { label: 'Выделить всё', action: () => { input.focus(); input.select(); } }
        ]
      },
      {
        label: 'Вид', items: [
          { label: 'Локальный архив', radio: true, checked: true, action: () => { mode = 'local'; run(); } },
          { label: 'Настоящий Интернет', action: () => { mode = 'net'; run(); } },
          { sep: true },
          { label: 'Открыть в обозревателе системы', action: () => Apps.browser() }
        ]
      },
      {
        label: 'Избранное', items: [
          { label: 'Википедия', action: () => { mode = 'net'; input.value = 'Википедия'; run(); } },
          { label: 'Видео', action: () => { input.value = 'видео'; run(); } },
          { label: 'Погода', action: () => { input.value = 'погода'; run(); } },
          { label: 'Магазин', action: () => { input.value = 'магазин'; run(); } }
        ]
      },
      {
        label: 'Справка', items: [{
          label: 'О программе', action: () => Wm.msgBox('Google Search 1.0',
            'Поисковая программа для Microsoft Windows 9.\n\nЛокальный архив: 13 страниц и 6 статей, ищет без сети.\nНастоящий Интернет: запросы к поисковику и Википедии, ответ приходит из сети.\n\nВыдача рисуется самой программой, поэтому она всегда светлая и в стиле системы.',
            [{ label: 'ОК', value: 'ok', def: true }], 'i-ie')
        }]
      }
    ],
    status: ['Готово', 'Режим: локальный архив', '28,8 кбит/с'],
    build(body, w) {
      body.className = 'winbody col';
      body.appendChild(head);
      body.appendChild(out);
      body.appendChild(statusLine);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') { run(); e.preventDefault(); } });
      w.onKey = e => {
        if (e.ctrlKey && e.key === 'l') { input.focus(); input.select(); return true; }
        if (e.key === 'F5') { run(); return true; }
        return false;
      };
      setTimeout(() => input.focus(), 60);
      run();
    }
  });
  winRef = win;

  function openReal() {
    if (!query) return;
    const a = el('a', { attrs: { href: 'https://www.google.com/search?q=' + encodeURIComponent(query), target: '_blank' } });
    document.body.appendChild(a);
    a.click();
    a.remove();
    Speaker.ding();
  }
  function run() {
    query = input.value.trim();
    /* Ссылка раньше собиралась один раз при создании окна, когда запрос был
       пуст, и больше не обновлялась — открывался google.com/search?q= без
       запроса. Обновляем адрес на каждый поиск. */
    if (realLink) {
      realLink.setAttribute('href', 'https://www.google.com/search?q=' + encodeURIComponent(query));
      realLink.style.opacity = query ? '1' : '0.45';
    }
    if (winRef) winRef.setStatus(1, 'Режим: ' + (mode === 'net' ? 'настоящий Интернет' : 'локальный архив'));
    out.innerHTML = '';
    if (!query) {
      statusLine.textContent = 'Введите запрос. Например: википедия, погода, видео, магазин, windows 9.';
      return;
    }
    if (mode === 'net') runNet(); else runLocal();
  }
  function setBusy(t) {
    busy = t;
    if (winRef) winRef.setStatus(0, t ? 'Идёт запрос…' : 'Готово');
  }
  function block(title, count) {
    const b = el('div', { style: 'margin:14px 0 8px;padding-bottom:3px;border-bottom:2px solid #e8eaed' }, [
      el('span', { style: 'font-size:11px;color:#5f6368;text-transform:uppercase;letter-spacing:.5px', text: title }),
      el('span', { style: 'font-size:11px;color:#9aa0a6;margin-left:8px', text: count != null ? ('(' + count + ')') : '' })
    ]);
    out.appendChild(b);
  }
  /* переход остаётся внутри Windows: страница открывается в окне обозревателя.
     Настоящий <a href> оставлен, чтобы Ctrl+клик вёл на сайт как обычно. */
  function link(text, href, onOpen, size) {
    const a = el('a', {
      style: 'color:#1a0dab;cursor:pointer;text-decoration:underline;font-size:' + (size || 15) + 'px',
      text: text,
      attrs: { href: href, target: '_blank', rel: 'noopener noreferrer' }
    });
    a.addEventListener('click', e => {
      e.preventDefault();
      if (onOpen) onOpen();
      else if (/^https?:/i.test(href)) Apps.browser(href);   /* сайт — внутри обозревателя */
    });
    return a;
  }
  /* адрес для показа: без процентов, по-человечески */
  function humanUrl(url) {
    let s = String(url).replace(/^https?:\/\//, '');
    try { s = decodeURIComponent(s); } catch (e) { }
    return s;
  }

  function hit(title, url, text, onOpen) {
    const row = el('div', { style: 'margin:0 0 14px;max-width:620px' });
    const shown = humanUrl(url);
    row.appendChild(el('div', { style: 'font-size:11px;color:#5f6368;overflow:hidden;text-overflow:ellipsis;white-space:nowrap', text: shown }));
    row.appendChild(el('div', { style: 'line-height:1.35;margin:1px 0' }, [
      link(title, /^https?:/i.test(url) ? url : 'https://' + url, onOpen, 15)
    ]));
    row.appendChild(el('div', { style: 'font-size:12px;color:#4d5156;line-height:1.45', text: text }));
    out.appendChild(row);
  }

  /* ---------- локальный архив ---------- */
  function runLocal() {
    const res = searchAll(query);
    if (!res.length) {
      statusLine.textContent = 'В локальном архиве ничего не найдено. Переключитесь на настоящий Интернет.';
      return;
    }
    statusLine.textContent = 'Найдено в локальном архиве: ' + res.length + '. Интернет отключён — работает мгновенно.';
    res.forEach(r => {
      const url = r.site ? r.site.host + '/' : 'ru.wikipedia.org/wiki/' + r.wiki.title.replace(/ /g, '_');
      const target = r.site ? r.site.idx : ('wiki:' + r.wiki.slug);
      hit(r.site ? r.site.title : r.wiki.title + ' — Википедия', url, r.snippet, () => Apps.browser(target));
    });
  }

  /* ---------- настоящий Интернет ---------- */
  function runNet() {
    setBusy(true);
    out.appendChild(el('div', { style: 'margin:16px 0;color:#5f6368;font-size:13px', text: 'Соединение с поисковиком…' }));
    fetchInternet(query).then(res => {
      out.innerHTML = '';
      setBusy(false);

      if (res.errors.length && !res.web.length && !res.wiki.length) {
        statusLine.textContent = 'Сеть недоступна: ' + res.errors.join(', ') + '. Показать локальный архив.';
        out.appendChild(el('div', { style: 'padding:18px 0' }, [
          el('div', { style: 'font-size:14px;margin-bottom:8px', text: 'Интернет недоступен' }),
          el('div', { style: 'font-size:12px;color:#5f6368;margin-bottom:12px', text: res.errors.join(' · ') }),
          el('button', { cls: 'btn', text: 'Искать в локальном архиве', on: { click: () => { mode = 'local'; run(); } } })
        ]));
        return;
      }

      const local = searchAll(query);
      let total = (res.web.length ? res.web.length : 0) + res.wiki.length + local.length;
      statusLine.textContent = 'Найдено: ' + total + (res.errors.length ? (' · часть источников недоступна (' + res.errors.join(', ') + ')') : '');

      if (res.abstract) {
        block('Краткий ответ');
        const row = el('div', { style: 'margin:0 0 14px;max-width:620px;font-size:13px;line-height:1.55' });
        row.appendChild(el('div', { style: 'font-size:14px;font-weight:bold;margin-bottom:4px', text: res.abstract.source || 'Краткий ответ' }));
        row.appendChild(el('div', { text: res.abstract.text }));
        if (res.abstract.url) row.appendChild(el('div', { style: 'margin-top:6px;font-size:11px' }, [
          link(humanUrl(res.abstract.url), res.abstract.url, null, 11)
        ]));
        out.appendChild(row);
      }
      if (res.wiki.length) {
        block('Википедия', res.wiki.length);
        /* статья открывается в окне обозревателя системы; копия из архива — рядом */
        res.wiki.forEach(a => {
          hit(a.title, 'ru.wikipedia.org/wiki/' + a.title.replace(/ /g, '_'), a.text, () => {
            Apps.browser('https://ru.wikipedia.org/wiki/' + encodeURIComponent(a.title.replace(/ /g, '_')));
          });
          const row = out.lastChild;
          row.appendChild(el('div', { style: 'margin-top:3px;font-size:11px' }, [
            el('span', { style: 'color:#5f6368', text: 'копия в архиве системы: ' }),
            el('span', {
              style: 'color:#1a0dab;cursor:pointer;text-decoration:underline',
              text: 'открыть',
              on: { click: () => { Apps.browser('wiki:' + a.title.replace(/ /g, '_')); } }
            })
          ]));
        });
      }
      if (res.web.length) {
        block('Ссылки из Интернета', res.web.length);
        res.web.forEach(r => hit(r.title, r.url, r.text, null));
      }
      if (local.length) {
        block('Из архива системы', local.length);
        local.forEach(r => {
          const url = r.site ? r.site.host + '/' : 'ru.wikipedia.org/wiki/' + r.wiki.title.replace(/ /g, '_');
          const target = r.site ? r.site.idx : ('wiki:' + r.wiki.slug);
          hit(r.site ? r.site.title : r.wiki.title + ' — Википедия', url, r.snippet, () => Apps.browser(target));
        });
      }
    });
  }

  return win;
};