/* ============================================================
   browser.js — обозреватель Интернета, поиск, виртуальный
   миллион вкладок. Все страницы локальные: внешние сайты
   нельзя встроить (запрет X-Frame-Options), поэтому здесь
   своя копия страниц в стиле эпохи.
   ============================================================ */
'use strict';

/* ============================================================
   1. Реестр сайтов
   ============================================================ */
const SITES = [];
function addSite(s) { s.idx = SITES.length; SITES.push(s); return s; }
function siteByHost(host) {
  const h = String(host || '').toLowerCase();
  return SITES.find(s => s.host === h) || null;
}
/* Домашняя страница — по имени, а не по индексу: служебный сайт «Настоящий
   сайт» встал в SITES первым и однажды уже сделал домашнюю страницу пустой. */
const HOME = () => {
  const s = SITES.find(x => x.host === 'home.msn.com') || SITES.filter(x => !x.external)[0];
  return s ? s.idx : 0;
};
/* имя сайта для заголовка окна и строки состояния */
function hostNameOf(url) {
  try { return new URL(url).hostname; } catch (e) { return String(url || ''); }
}
function link(label, target, api, style) {
  /* внешний адрес открывается тоже внутри окна, просто в «страницу настоящего сайта» */
  const a = el('a', {
    style: 'color:#000080;cursor:pointer;text-decoration:underline;' + (style || ''),
    text: label,
    attrs: /^https?:\/\//i.test(String(target)) ? { href: target } : {}
  });
  a.addEventListener('click', e => { e.preventDefault(); api.go(target); });
  return a;
}
function p(text, style) { return el('div', { style: style || 'margin:6px 0', text: text }); }
function hr() { return el('div', { style: 'height:2px;background:#808080;margin:8px 0' }); }
function h(t, size) { return el('div', { style: 'font-weight:bold;color:#000080;margin:10px 0 4px;font-size:' + (size || 17) + 'px', text: t }); }

/* ---------- 0. Настоящий сайт внутри окна ----------
   Переход по внешней ссылке остаётся в Windows: сайт грузится в окне обозревателя,
   без отдельной вкладки. Часть сайтов (OpenStreetMap, Bing) запрещает показ в
   рамке — тогда внутри окна появляется честное объяснение, а не пустое место. */
function realOpen(url) {
  const a = el('a', { attrs: { href: url, target: '_blank', rel: 'noopener' } });
  document.body.appendChild(a); a.click(); a.remove();
  Speaker.ding();
}
addSite({
  title: 'Настоящий сайт', host: 'внешний', url: 'about:external',
  kw: [], external: true,
  render(host, api) {
    const url = api.query || '';
    let hostName = '';
    try { hostName = new URL(url).hostname; } catch (e) { }
    host.appendChild(el('div', {
      style: 'background:#fff;border-bottom:1px solid #d0d0d0;padding:6px 12px;font-size:12px;display:flex;gap:10px;align-items:center'
    }, [
      el('span', { text: 'Открыт сайт: ', style: 'color:#5f6368' }),
      el('span', { style: 'font-weight:bold;color:#202124', text: hostName || url }),
      el('span', { style: 'margin-left:auto;color:#9aa0a6', text: 'в окне Windows 9' })
    ]));

    const area = el('div', { style: 'position:absolute;left:0;right:0;top:34px;bottom:0;background:#fff;overflow:auto' });
    host.appendChild(area);
    const frame = el('iframe', {
      style: 'width:100%;height:100%;border:0;background:#fff',
      attrs: { src: url, referrerpolicy: 'no-referrer' }
    });
    area.appendChild(frame);
    area.appendChild(el('div', {
      style: 'position:absolute;left:0;right:0;bottom:0;background:#fff8e1;border-top:1px solid #e0c060;padding:6px 12px;font-size:11px;color:#5a4a00'
    }, [
      el('span', { text: 'Если страница пустая, сайт запрещает открываться внутри окна. ' }),
      el('span', {
        style: 'color:#1a0dab;cursor:pointer;text-decoration:underline',
        text: 'Открыть в настоящем браузере', on: { click: () => realOpen(url) }
      })
    ]));
    api.onLeave(() => { try { frame.src = 'about:blank'; } catch (e) { } });
  }
});

/* ---------- 1. Домашняя страница ---------- */
addSite({
  title: 'Домашняя страница', host: 'home.msn.com', url: 'http://home.msn.com/',
  kw: ['домашняя', 'старт', 'MSN', 'начало', 'приветствие'],
  render(host, api) {
    host.appendChild(el('div', {
      style: 'background:#000080;color:#fff;padding:10px 14px;font-size:26px;letter-spacing:3px;font-family:Georgia,serif',
      text: 'The Microsoft Network'
    }));
    host.appendChild(el('div', {
      style: 'background:#c0c0c0;padding:4px 14px;font-size:11px;border-bottom:2px solid #000080',
      text: 'Понедельник, 22 мая 1995 · Поздравляем с наступлением! · Счётчик: ' + api.stats()
    }));
    const col = el('div', { style: 'display:flex;gap:14px;padding:12px 14px' });
    const left = el('div', { style: 'flex:1' });
    left.appendChild(h('Что нового', 16));
    left.appendChild(p('Microsoft Windows 9 вышла в продажу. Установка занимает около 30 минут, ' +
      'после чего компьютер можно настраивать под себя.'));
    left.appendChild(p('Открыт доступ к службе The Microsoft Network: позвоните по номеру 555-0135, ' +
      'скорость 33,6 кбит/с — это примерно 4 страницы в минуту.'));
    left.appendChild(p('Всемирная паутина растёт: появились первые сайты с картинками. ' +
      'Читать всё подряд, конечно, никто не успевает.'));
    const right = el('div', { style: 'width:190px;background:#fff;border:2px solid #808080;padding:8px' });
    right.appendChild(h('Разделы', 15));
    [
      ['home', 'Домашняя страница'], ['wiki', 'Википедия'], ['video', 'Видео (YouTube)'],
      ['web', 'Всемирная паутина'], ['weather', 'Погода'], ['shop', 'Магазин'],
      ['forum', 'Форум'], ['videolib', 'Видеотека'], ['radio', 'Радио'], ['mail', 'Почта'], ['counter', 'Счётчик']
    ].forEach(([id, label]) => right.appendChild(el('div', { style: 'margin:3px 0' }, [link(label, id, api)])));
    col.appendChild(left); col.appendChild(right);
    host.appendChild(col);
  }
});

/* ---------- 2. Поиск ---------- */
const SEARCH_ENGINE = { name: 'АльфаВиста', host: 'search.altavista.ru' };
function searchAll(q) {
  const s = String(q || '').trim().toLowerCase();
  if (!s) return [];
  const words = s.split(/\s+/);
  const out = [];
  SITES.forEach(site => {
    const hay = (site.title + ' ' + site.host + ' ' + (site.kw || []).join(' ') + ' ' + (site.text || '')).toLowerCase();
    let score = 0;
    words.forEach(w => { if (hay.indexOf(w) >= 0) score += 2; });
    if (hay.indexOf(s) >= 0) score += 6;
    if (site.title.toLowerCase().indexOf(s) === 0) score += 5;
    if (score > 0) out.push({ site: site, score: score, snippet: makeSnippet(site, words) });
  });
  WIKI_ARTICLES.forEach(a => {
    const hay = (a.title + ' ' + a.text).toLowerCase();
    let score = 0;
    words.forEach(w => { if (hay.indexOf(w) >= 0) score += 3; });
    if (score > 0) out.push({ wiki: a, score: score, snippet: makeSnippet({ title: a.title, text: a.text }, words) });
  });
  return out.sort((x, y) => y.score - x.score).slice(0, 25);
}
function makeSnippet(src, words) {
  const t = (src.text || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const low = t.toLowerCase();
  let pos = -1;
  for (const w of words) { const i = low.indexOf(w); if (i >= 0 && (pos < 0 || i < pos)) pos = i; }
  if (pos < 0) return t.slice(0, 110) + (t.length > 110 ? '…' : '');
  const from = Math.max(0, pos - 40);
  return (from ? '…' : '') + t.slice(from, from + 120) + '…';
}
addSite({
  title: 'Поиск', host: SEARCH_ENGINE.host, url: 'http://' + SEARCH_ENGINE.host + '/',
  kw: ['поиск', 'искать', 'найти', 'альфависта', 'запрос'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#fff;padding:14px 18px;font-family:Georgia,serif' }, [
      el('div', { style: 'font-size:30px;font-weight:bold;color:#000080', text: SEARCH_ENGINE.name }),
      el('div', { style: 'font-size:12px;color:#555;margin-bottom:10px', text: 'Поиск по Всемирной паутине · 1 284 517 документов' })
    ]));
    const inp = el('input', { cls: 'field', value: api.query || '', style: 'width:340px;font-family:Georgia,serif;font-size:15px' });
    const form = el('div', { style: 'display:flex;gap:6px;margin-bottom:12px' }, [
      inp, el('button', { cls: 'btn def', text: 'Найти', on: { click: () => api.go('search:' + inp.value) } })
    ]);
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') api.go('search:' + inp.value); });
    host.appendChild(form);

    const q = api.query;
    if (!q) {
      host.appendChild(p('Введите запрос. Например: «википедия», «погода», «windows 9», «видео».'));
      return;
    }
    const res = searchAll(q);
    host.appendChild(el('div', { style: 'font-size:12px;color:#555;margin:8px 0', text: 'Найдено примерно ' + (res.length * 1734) + ' результатов. Показаны лучшие ' + res.length + '.' }));
    if (!res.length) {
      host.appendChild(p('По вашему запросу ничего не найдено. Попробуйте другие слова.'));
      return;
    }
    res.forEach(r => {
      const row = el('div', { style: 'margin:10px 0' });
      const url = r.site ? 'http://' + r.site.host + '/' : 'http://ru.wikipedia.org/wiki/' + encodeURIComponent(r.wiki.title.replace(/ /g, '_'));
      row.appendChild(el('div', {}, [link(r.site ? r.site.title : r.wiki.title + ' — Википедия', r.site ? r.site.idx : ('wiki:' + r.wiki.slug), api, 'font-size:15px')]));
      row.appendChild(el('div', { style: 'font-size:12px;color:#008000', text: url }));
      row.appendChild(el('div', { style: 'font-size:12px;color:#444', text: r.snippet }));
      host.appendChild(row);
    });
  }
});

/* ---------- 3. Википедия ---------- */
const WIKI_ARTICLES = [
  {
    slug: 'Windows_9', title: 'Windows 9',
    text: 'Microsoft Windows 9 — операционная система семейства Windows, выпущенная 22 мая 1995 года. ' +
      'Поставлялась на компьютеры вместе с Internet Explorer 1.0. Главное отличие от предыдущей версии — ' +
      'поддержка 32-разрядной файловой системы и встроенная поддержка мультимедиа. ' +
      'Система требовала компьютера с процессором Pentium или 486DX2, 8 МБ оперативной памяти и 200 МБ на жёстком диске.',
    links: ['Интернет', 'Windows 95', 'Компьютер']
  },
  {
    slug: 'Интернет', title: 'Интернет',
    text: 'Интернет — глобальная сеть, соединяющая компьютеры по всему миру. В 1995 году доступ в сеть ' +
      'предоставлялся в основном через модемное соединение со скоростью 28,8–33,6 кбит/с. ' +
      'Основными службами были электронная почта,Usenet, FTP и Всемирная паутина. ' +
      'Плата за подключение к коммерческим провайдерам обычно составляла 10–20 долларов в месяц.',
    links: ['Всемирная паутина', 'Компьютер']
  },
  {
    slug: 'Всемирная_паутина', title: 'Всемирная паутина',
    text: 'Всемирная паутина (World Wide Web) — система гипертекстовых документов, предложенная Тимом ' +
      'Бернерсом-Ли в 1989 году. Первый сайт в сети появился в 1991 году. К 1995 году число страниц ' +
      'оценивалось в несколько десятков тысяч. Главным инструментом просмотра был браузер Mosaic, ' +
      'а затем Microsoft Internet Explorer.',
    links: ['Интернет', 'Компьютер']
  },
  {
    slug: 'Компьютер', title: 'Компьютер',
    text: 'Компьютер — электронное устройство для обработки информации. В 1995 году наиболее ' +
      'распространёнными были персональные компьютеры на базе процессоров Intel 486 и Pentium. ' +
      'Типичная конфигурация: 8–16 МБ оперативной памяти, жёсткий диск 500 МБ, монитор VGA, ' +
      'модем 28,8 кбит/с. Цена такой системы составляла от 1000 до 3000 долларов.',
    links: ['Windows 9', 'Интернет', 'Россия']
  },
  {
    slug: 'Windows_95', title: 'Windows 95',
    text: 'Windows 95 — версия операционной системы, готовившаяся к выходу в 1995 году. ' +
      'Она принесла Панель задач и кнопку Пуск, поддержку длинных имён файлов и ' +
      'много задачную работу. Установка была полностью переработана.',
    links: ['Windows 9', 'Компьютер']
  },
  {
    slug: 'Россия', title: 'Россия',
    text: 'Россия — страна на части Евразии. Население — около 148 миллионов человек. ' +
      'Столица — Москва. В 1995 году начиналось массовое подключение учебных заведений и ' +
      'исследовательских институтов к сети Интернет.',
    links: ['Компьютер', 'Интернет']
  }
];
addSite({
  title: 'Википедия', host: 'ru.wikipedia.org', url: 'http://ru.wikipedia.org/',
  kw: ['википедия', 'wiki', 'энциклопедия', 'статья', 'справочник'],
  render(host, api) {
    const slug = api.path || 'Windows_9';
    let a = WIKI_ARTICLES.find(x => x.slug === slug);
    if (!a) {
      host.appendChild(el('div', { style: 'font-family:Georgia,serif;padding:14px 18px' }, [
        p('В этой локальной копии Википедии нет статьи «' + slug + '».'),
        el('div', {}, [link('Вернуться к статье «Windows 9»', 'wiki:Windows_9', api)])
      ]));
      return;
    }
    host.appendChild(el('div', {
      style: 'border-bottom:1px solid #a2a9b1;padding:8px 18px;font-family:Georgia,serif;font-size:13px;color:#54595d',
      text: 'Википедия · Локальная копия от 22 мая 1995'
    }));
    host.appendChild(el('div', { style: 'padding:12px 18px;font-family:Georgia,serif' }, [
      el('div', { style: 'font-size:26px;font-family:Georgia,serif;font-weight:normal;border-bottom:1px solid #000;padding-bottom:4px;margin-bottom:10px', text: a.title }),
      p(a.text, 'font-size:15px;line-height:1.7;margin:10px 0'),
      h('См. также', 15),
      el('div', { style: 'display:flex;gap:14px;flex-wrap:wrap;margin-bottom:14px' },
        a.links.map(l => {
          const t = WIKI_ARTICLES.find(x => x.slug === l);
          return t ? link(t.title, 'wiki:' + t.slug, api) : link(l, 'wiki:' + l, api);
        })),
      h('Все статьи', 15),
      el('div', { style: 'display:flex;gap:10px;flex-wrap:wrap' },
        WIKI_ARTICLES.map(x => link(x.title, 'wiki:' + x.slug, api))),
      hr(),
      el('div', { style: 'font-size:11px;color:#666', text: 'Текст доступен по лицензии CC BY-SA. Копия страницы сделана для демонстрации обозревателя.' })
    ]));
  }
});

/* ---------- 4. Видео (YouTube) ---------- */
const VIDEOS = [
  { id: 'v1', title: 'Windows 95 — обзор системы', ch: 'ComputerTown', len: '14:02', views: '2 148 993', yt: 'YRxR4J6g9wA' },
  { id: 'v2', title: 'Как настроить модем и выйти в Интернет', ch: 'Связь-Услуги', len: '8:47', views: '884 210', yt: '' },
  { id: 'v3', title: 'Экскурсия по Всемирной паутине 1995 года', ch: 'OldWebArchive', len: '21:30', views: '4 902 776', yt: '' },
  { id: 'v4', title: 'Сапёр: рекорд за 30 секунд', ch: 'GameRecords', len: '3:12', views: '12 300 455', yt: '' },
  { id: 'v5', title: 'Спутник, «Буран» и начало интернета', ch: 'Наука-ТВ', len: '17:55', views: '667 890', yt: '' },
  { id: 'v6', title: 'Как звучал dial-up модем', ch: 'RetroSounds', len: '5:41', views: '9 120 004', yt: '' }
];
addSite({
  title: 'Видео (YouTube)', host: 'www.youtube.com', url: 'http://www.youtube.com/',
  kw: ['видео', 'youtube', 'ютуб', 'ролик', 'смотреть', 'клип'],
  render(host, api) {
    if (api.path) { renderVideoPage(host, api); return; }
    host.appendChild(el('div', { style: 'background:#c00;color:#fff;padding:10px 16px;font-size:24px;font-weight:bold', text: 'YouTube' }));
    host.appendChild(el('div', { style: 'background:#eee;padding:6px 16px;font-size:12px;border-bottom:1px solid #ccc', text: 'Локальная копия · «Видео, которого ещё нет»' }));
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:12px;padding:14px 16px' });
    VIDEOS.forEach(v => {
      const card = el('div', { style: 'cursor:default' });
      const thumb = el('div', {
        style: 'height:74px;background:#222;position:relative;display:flex;align-items:center;justify-content:center;color:#666;font-size:26px',
        text: '▶'
      });
      thumb.addEventListener('mouseenter', () => thumb.style.color = '#f00');
      thumb.addEventListener('mouseleave', () => thumb.style.color = '#666');
      thumb.addEventListener('click', () => api.go('video:' + v.id));
      card.appendChild(thumb);
      card.appendChild(el('div', { style: 'margin-top:4px;font-size:13px;line-height:1.3' }, [link(v.title, 'video:' + v.id, api)]));
      card.appendChild(el('div', { style: 'font-size:11px;color:#666', text: v.ch + ' · ' + v.len + ' · ' + v.views + ' просм.' }));
      grid.appendChild(card);
    });
    host.appendChild(grid);
  }
});

function renderVideoPage(host, api) {
  const v = VIDEOS.find(x => x.id === api.path) || VIDEOS[0];
  host.appendChild(el('div', { style: 'padding:12px 16px 6px' }, [
    el('div', { style: 'font-size:18px;margin-bottom:4px', text: v.title }),
    el('div', { style: 'font-size:11px;color:#666', text: v.ch + ' · ' + v.views + ' просмотров' })
  ]));

  /* настоящий плеер YouTube — если у ролика есть настоящий идентификатор */
  if (v.yt) {
    const box = el('div', { style: 'position:relative;width:560px;max-width:100%;height:315px;background:#000;margin:0 16px 8px' });
    const frame = el('iframe', {
      style: 'width:100%;height:100%;border:0',
      attrs: {
        src: 'https://www.youtube.com/embed/' + v.yt + '?rel=0&modestbranding=1',
        allow: 'accelerometer; autoplay; encrypted-media; picture-in-picture',
        allowfullscreen: 'true',
        referrerpolicy: 'no-referrer'
      }
    });
    box.appendChild(frame);
    const note = el('div', {
      style: 'position:absolute;left:0;right:0;bottom:0;padding:4px 8px;background:rgba(0,0,0,.65);color:#ddd;font-size:11px',
      text: 'Настоящий YouTube — нужен интернет. Если пусто, нажмите «Открыть в настоящем браузере».'
    });
    box.appendChild(note);
    setTimeout(() => note.remove(), 6000);
    host.appendChild(box);
    host.appendChild(el('div', { style: 'padding:0 16px 10px' }, [
      el('a', {
        cls: 'btn sm', text: 'Открыть в настоящем браузере',
        attrs: { href: 'https://www.youtube.com/watch?v=' + v.yt, target: '_blank', rel: 'noopener' }
      })
    ]));
  }

  host.appendChild(el('div', { style: 'padding:4px 16px 6px;font-size:13px;color:#666', text: 'Запасная копия ролика — работает без сети:' }));
  const wrap = el('div', { style: 'position:relative;height:200px;background:#000;overflow:hidden;margin:0 16px' });
  const cv = el('canvas', { attrs: { width: 560, height: 200 }, style: 'display:block;width:560px;height:200px' });
  wrap.appendChild(cv);
  const ctx = cv.getContext('2d');
  const bar = el('div', { style: 'height:26px;background:#333;display:flex;align-items:center;gap:8px;padding:0 8px;color:#ccc;font-size:11px' });
  const playBtn = el('div', { style: 'width:16px;height:16px;background:#fff;color:#000;text-align:center;line-height:16px;font-size:11px', text: '❚❚' });
  const time = el('span', { text: '0:00 / ' + v.len });
  const seek = el('div', { style: 'flex:1;height:8px;background:#555;border:1px solid #000' });
  const fill = el('div', { style: 'height:100%;width:0%;background:#c00' });
  seek.appendChild(fill);
  bar.appendChild(playBtn); bar.appendChild(time); bar.appendChild(seek);
  wrap.appendChild(bar);
  host.appendChild(wrap);

  let playing = true, t = 0, raf = null;
  const totalSec = 60 + parseInt(v.len, 10) * 2;
  function frame() {
    t += 1 / 30;
    ctx.fillStyle = '#101018'; ctx.fillRect(0, 0, 560, 200);
    /* «кадр» видео: плавающий логотип и полосы */
    const x = 280 + Math.cos(t / 2) * 180, y = 95 + Math.sin(t * 1.3) * 45;
    ctx.fillStyle = '#c00'; ctx.fillRect(x - 40, y - 26, 80, 52);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center';
    ctx.fillText('▶', x, y + 8);
    ctx.fillStyle = '#3a3a55';
    for (let i = 0; i < 5; i++) ctx.fillRect(0, i * 40 + (t * 20 % 40) - 40, 560, 18);
    ctx.fillStyle = '#ddd'; ctx.font = '12px Tahoma';
    ctx.fillText('Сигнал нестабилен — 33,6 кбит/с', 280, 190);
    const p = Math.min(1, t / totalSec);
    fill.style.width = (p * 100).toFixed(1) + '%';
    time.textContent = fmtSec(t) + ' / ' + v.len;
    if (p >= 1) { p = 0; t = 0; }
    raf = requestAnimationFrame(frame);
  }
  function fmtSec(s) {
    const m = Math.floor(s / 60);
    return m + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  }
  playBtn.addEventListener('click', () => {
    playing = !playing;
    playBtn.textContent = playing ? '❚❚' : '▶';
    if (playing) frame(); else if (raf) cancelAnimationFrame(raf);
  });
  frame();

  host.appendChild(el('div', { style: 'padding:12px 16px' }, [
    el('div', { style: 'font-size:11px;color:#666', text: v.ch + ' · ' + v.views + ' просмотров · 22 мая 1995' }),
    h('Похожие', 15),
    el('div', { style: 'display:flex;gap:14px;flex-wrap:wrap' }, VIDEOS.filter(x => x.id !== v.id).map(x => link('▶ ' + x.title, 'video:' + x.id, api)))
  ]));
  api.onLeave(() => { if (raf) cancelAnimationFrame(raf); });
}

/* ---------- 5. The Microsoft Network ---------- */
addSite({
  title: 'The Microsoft Network', host: 'www.msn.com', url: 'http://www.msn.com/',
  kw: ['MSN', 'сеть', 'Microsoft', 'портал', 'служба'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#000080;color:#fff;padding:12px 16px' }, [
      el('div', { style: 'font-size:28px;font-family:Georgia,serif;letter-spacing:2px', text: 'MSN' }),
      el('div', { style: 'font-size:11px;margin-top:4px', text: 'The Microsoft Network · скорость соединения 33,6 кбит/с' })
    ]));
    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:14px 16px' });
    [
      ['chat', 'Беседа', 'Поговорить с кем-нибудь прямо сейчас'],
      ['news', 'Новости', 'Главные новости дня'],
      ['weather', 'Погода', 'Прогноз на сегодня и завтра'],
      ['shop', 'Магазин', 'Программы и CD-ROM'],
      ['forum', 'Форум', 'Обсуждения пользователей'],
      ['mail', 'Почтовый ящик', 'Ваши сообщения']
    ].forEach(([id, t, d]) => {
      const c = el('div', { style: 'background:#fff;border:2px solid;border-color:#fff #808080 #808080 #fff;padding:8px' });
      c.appendChild(el('div', {}, [link(t, id, api, 'font-weight:bold')]));
      c.appendChild(el('div', { style: 'font-size:11px;color:#555;margin-top:3px', text: d }));
      grid.appendChild(c);
    });
    host.appendChild(grid);
  }
});

/* ---------- 6. Погода ---------- */
addSite({
  title: 'Погода в Москве', host: 'weather.msn.com', url: 'http://weather.msn.com/',
  kw: ['погода', 'градус', 'дождь', 'прогноз', 'холодно'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#0066cc;color:#fff;padding:10px 16px;font-size:20px', text: 'Погода' }));
    host.appendChild(el('div', { style: 'padding:14px 18px;font-family:Georgia,serif' }, [
      el('div', { style: 'font-size:16px', text: 'Москва, ВДНХ' }),
      el('div', { style: 'font-size:44px;margin:6px 0', text: '+18' }),
      p('Переменная облачность, ветер слабый, осадков не ожидается.')
    ]));
    const tbl = el('div', { style: 'margin:0 18px;border:1px solid #808080;background:#fff;width:340px' });
    const head = el('div', { style: 'display:flex;background:#c0c0c0;border-bottom:1px solid #808080' });
    ['День', 'Небо', 'Температура'].forEach((t, i) => head.appendChild(el('div', { style: 'width:' + [90, 100, 140][i] + 'px;padding:2px 6px;border-right:1px solid #808080', text: t })));
    tbl.appendChild(head);
    [['Сегодня', 'Облачно', '+15 … +21'], ['Завтра', 'Дождь', '+11 … +17'], ['Среда', 'Ясно', '+14 … +23'],
    ['Четверг', 'Гроза', '+16 … +24'], ['Пятница', 'Облачно', '+13 … +19']].forEach(r => {
      const row = el('div', { style: 'display:flex;border-bottom:1px solid #ddd' });
      r.forEach((c, i) => row.appendChild(el('div', { style: 'width:' + [90, 100, 140][i] + 'px;padding:2px 6px', text: c })));
      tbl.appendChild(row);
    });
    host.appendChild(tbl);
    host.appendChild(el('div', { style: 'margin:12px 18px;font-size:11px;color:#666', text: 'Данные обновлены 22 мая 1995 года в 15:04.' }));
  }
});

/* ---------- 7. Радио ---------- */
addSite({
  title: 'Радио «Волга»', host: 'radio.msn.com', url: 'http://radio.msn.com/',
  kw: ['радио', 'музыка', 'звук', 'станция'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#333;color:#fff;padding:12px 16px;font-size:22px', text: 'Радио «Волга»' }));
    const play = el('button', { cls: 'btn def', text: '▶ Слушать', style: 'margin:16px' });
    let on = false, timer = null;
    const status = el('div', { style: 'margin:0 16px;font-size:12px;color:#444', text: 'Передача не запущена.' });
    play.addEventListener('click', () => {
      on = !on;
      play.textContent = on ? '■ Остановить' : '▶ Слушать';
      if (on) {
        status.textContent = 'Идёт передача. Скорость 14,4 кбит/с (потоковое вещание).';
        const notes = [523, 587, 659, 523, 440, 523, 587, 392];
        let i = 0;
        timer = setInterval(() => { Speaker.tone(notes[i % notes.length], 0.22, 'square', 0.035); i++; }, 260);
      } else {
        status.textContent = 'Передача не запущена.';
        clearInterval(timer);
      }
    });
    host.appendChild(play);
    host.appendChild(status);
    api.onLeave(() => clearInterval(timer));
    host.appendChild(el('div', { style: 'margin:16px' }, [
      h('Программа передач', 15),
      p('12:00 Новости · 13:00 Музыкальные хиты мая · 15:00 «Компьютерные новости» · 19:00 Джаз')
    ]));
  }
});

/* ---------- 8. Форум ---------- */
const THREADS = [
  ['Помогите настроить модем SoundLink 28.8', 'Сергей', 14],
  ['Какая видеокарта лучше для 1995 года?', 'Андрей', 27],
  ['Windows 9: установка зависла на копировании', 'Марина', 9],
  ['Где скачать драйвер для S3 Trio64V?', 'Игорь', 31],
  ['Лучшие игры для ПК, посоветуйте', 'Ольга', 52],
  ['Сколько стоит час в сети у вас?', 'Павел', 18]
];
addSite({
  title: 'Форум пользователей', host: 'forum.compuserve.ru', url: 'http://forum.compuserve.ru/',
  kw: ['форум', 'обсуждение', 'вопрос', 'помощь', 'тема'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#800080;color:#fff;padding:10px 16px;font-size:20px', text: 'Форум · Доска объявлений' }));
    host.appendChild(el('div', { style: 'padding:10px 16px;font-size:12px;color:#555', text: 'Раздел: Компьютеры и связь · 6 тем · последнее обновление 14:52' }));
    const list = el('div', { style: 'margin:0 16px;background:#fff;border:1px solid #808080' });
    THREADS.forEach((t, i) => {
      const row = el('div', { style: 'display:flex;gap:10px;padding:5px 8px;border-bottom:1px solid #e0e0e0;cursor:default' });
      row.addEventListener('mouseenter', () => row.style.background = '#000080');
      row.addEventListener('mouseleave', () => row.style.background = '');
      row.appendChild(el('span', { text: (i + 1) + '.', style: 'width:22px;color:#666' }));
      row.appendChild(el('span', { text: t[0], style: 'flex:1' }));
      row.appendChild(el('span', { text: t[1], style: 'width:80px;color:#000080' }));
      row.appendChild(el('span', { text: t[2] + ' отв.', style: 'width:60px;text-align:right;color:#666' }));
      row.addEventListener('click', () => {
        Speaker.ticks();
        host.innerHTML = '';
        host.appendChild(el('div', { style: 'padding:12px 16px' }, [
          el('div', {}, [link('← К списку тем', 'forum', api)]),
          h(t[0], 17),
          p('Автор: ' + t[1] + ' · ответов: ' + t[2]),
          hr(),
          p('Отправлено через The Microsoft Network. Соединение 33,6 кбит/с, загрузка страницы заняла 4 секунды.'),
          el('div', { style: 'display:flex;gap:8px;margin-top:12px' }, [
            el('input', { cls: 'field', placeholder: 'Ваш ответ', style: 'flex:1' }),
            el('button', { cls: 'btn', text: 'Отправить' })
          ])
        ]));
      });
      list.appendChild(row);
    });
    host.appendChild(list);
  }
});

/* ---------- 9. Магазин ---------- */
addSite({
  title: 'Магазин программ', host: 'shop.msn.com', url: 'http://shop.msn.com/',
  kw: ['магазин', 'купить', 'цена', 'cd', 'программа', 'софт'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#006600;color:#fff;padding:10px 16px;font-size:20px', text: 'Магазин программных средств' }));
    const tbl = el('div', { style: 'margin:14px 16px;background:#fff;border:1px solid #808080;width:520px' });
    const head = el('div', { style: 'display:flex;background:#c0c0c0;border-bottom:1px solid #808080' });
    ['Программа', 'Цена', 'В наличии'].forEach((t, i) => head.appendChild(el('div', { style: 'width:' + [280, 110, 110][i] + 'px;padding:2px 6px;border-right:1px solid #808080', text: t })));
    tbl.appendChild(head);
    [['Microsoft Windows 9', '12 900', 'да'], ['Microsoft Plus! 95', '6 500', 'да'], ['Сапёр (FreeCell в подарок)', '1 200', 'да'],
    ['Энциклопедия «Компьютер» (1 CD)', '900', 'нет'], ['Пакет драйверов 1995', '450', 'да'],
    ['Игра «Сапёр» — доп. уровни', '300', 'да']].forEach(r => {
      const row = el('div', { style: 'display:flex;border-bottom:1px solid #eee' });
      r.forEach((c, i) => row.appendChild(el('div', { style: 'width:' + [280, 110, 110][i] + 'px;padding:3px 6px', text: c })));
      tbl.appendChild(row);
    });
    host.appendChild(tbl);
    host.appendChild(el('div', { style: 'margin:0 16px;font-size:11px;color:#666', text: 'Доставка по России — 2–4 недели. Оплата наличными или переводом.' }));
  }
});

/* ---------- 10. Всемирная паутина ---------- */
addSite({
  title: 'Всемирная паутина', host: 'www.webinfo.ru', url: 'http://www.webinfo.ru/',
  kw: ['паутина', 'web', 'интернет', 'история', 'браузер'],
  render(host, api) {
    host.appendChild(el('div', { style: 'padding:16px 20px;font-family:Georgia,serif;max-width:640px' }, [
      el('div', { style: 'font-size:24px;margin-bottom:10px', text: 'Всемирная паутина: что это и зачем' }),
      p('Всемирная паутина — гипертекстовая система документов, работающих поверх сети Интернет. ' +
        'Идея принадлежит Тиму Бернерсу-Ли, реализация появилась в 1991 году в CERN.'),
      h('Что нужно, чтобы начать', 16),
      el('ul', { style: 'margin:0 0 10px 18px;font-size:13px;line-height:1.7' }, [
        el('li', { text: 'Компьютер с модемом (28,8 кбит/с и выше)' }),
        el('li', { text: 'Подключение к провайдеру — от 10 долларов в месяц' }),
        el('li', { text: 'Программа-обозреватель: Netscape Navigator или Microsoft Internet Explorer' }),
        el('li', { text: 'Адрес электронной почты, чтобы получать письма' })
      ]),
      h('Сколько это стоит по времени', 16),
      p('При скорости 28,8 кбит/с одна страница с текстом загружается за 10–20 секунд. ' +
        'Страница с фотографией — около минуты. Считайте это при заказе билетов за 25 долларов.'),
      h('Полезные ссылки', 16),
      el('div', { style: 'display:flex;gap:12px;flex-wrap:wrap' }, [
        link('Домашняя страница', 'home', api), link('Википедия', 'wiki:Windows_9', api),
        link('Погода', 'weather', api), link('Поиск', 'search', api)
      ])
    ]));
  }
});

/* ---------- 11. Почта ---------- */
addSite({
  title: 'Почтовый ящик', host: 'mail.msn.com', url: 'http://mail.msn.com/',
  kw: ['почта', 'письма', 'почтовый ящик', 'email', 'сообщения'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#000060;color:#fff;padding:10px 16px;font-size:20px', text: 'Почтовый ящик' }));
    const list = el('div', { style: 'margin:14px 16px;background:#fff;border:1px solid #808080;width:520px' });
    const mails = [
      ['Анна Петрова', 'Привет! Ты уже установил Windows 9?', 'сегодня, 14:20', false],
      ['Служба поддержки', 'Ваш пакет установки зарегистрирован', 'сегодня, 09:05', false],
      ['Сергей', 'Re: модем не дозванивается', 'вчера, 21:40', true],
      ['Новости MSN', 'Добро пожаловать в The Microsoft Network', '20 мая, 12:00', true]
    ];
    mails.forEach(m => {
      const row = el('div', { style: 'display:flex;gap:10px;padding:6px 8px;border-bottom:1px solid #e0e0e0' });
      row.appendChild(el('span', { text: m[3] ? '✉' : '✉', style: 'width:16px;color:' + (m[3] ? '#888' : '#c00') }));
      row.appendChild(el('span', { text: m[0], style: 'width:130px;font-weight:' + (m[3] ? 'normal' : 'bold') }));
      row.appendChild(el('span', { text: m[1], style: 'flex:1;color:#000080' }));
      row.appendChild(el('span', { text: m[2], style: 'width:120px;text-align:right;color:#666;font-size:11px' }));
      list.appendChild(row);
    });
    host.appendChild(list);
    host.appendChild(el('div', { style: 'margin:0 16px;font-size:11px;color:#666', text: 'Непрочитанных: 2 · Всего писем: 4 · Ящик: ' + Sys.user + '@msn.com' }));
  }
});

/* ---------- 12. Видеотека 1995 ---------- */
addSite({
  title: 'Видеотека', host: 'video.msn.com', url: 'http://video.msn.com/',
  kw: ['видео', 'видеотека', 'фильм', 'передача', 'запись'],
  render(host, api) {
    host.appendChild(el('div', { style: 'background:#404060;color:#fff;padding:10px 16px;font-size:20px', text: 'Видеотека · видео по запросу' }));
    host.appendChild(el('div', { style: 'padding:12px 18px;font-size:12px;color:#555', text: 'Передачи записаны на цифровых лентах и хранятся в нашем архиве.' }));
    const list = el('div', { style: 'margin:0 18px;background:#fff;border:1px solid #808080;width:480px' });
    [['Документальный фильм «Полёт на Марс»', '92 мин', '25'], ['Концерт симфонического оркестра', '58 мин', '45'],
    ['Курс: «Компьютер для начинающих»', '6 частей', '30'], ['Новости CNN за 20 мая', '24 мин', '10']].forEach(r => {
      const row = el('div', { style: 'display:flex;gap:10px;padding:6px 8px;border-bottom:1px solid #eee' });
      row.appendChild(el('span', { text: r[0], style: 'flex:1' }));
      row.appendChild(el('span', { text: r[1], style: 'width:80px;color:#666' }));
      row.appendChild(el('button', { cls: 'btn sm', text: r[2] + ' р.', on: { click: () => Wm.msgBox('Видеотека', 'Передача будет поставлена в очередь.\n\nСкорость передачи: 14,4 кбит/с.\nПримерное время ожидания: 42 минуты.', [{ label: 'ОК', value: 'ok', def: true }], 'i-media') } }));
      list.appendChild(row);
    });
    host.appendChild(list);
    host.appendChild(el('div', { style: 'margin:12px 18px' }, [link('Смотреть видео в современном формате →', 'video', api)]));
  }
});

/* ---------- 13. Счётчик (служебная страница) ---------- */
addSite({
  title: 'Счётчик', host: 'stats.local', url: 'http://stats.local/',
  kw: ['счётчик', 'статистика', 'вкладки'],
  render(host, api) {
    host.appendChild(el('div', { style: 'padding:16px 20px;font-family:Georgia,serif' }, [
      h('Состояние обозревателя', 18),
      el('div', { cls: 'sbox', style: 'padding:12px;background:#fff;border:1px solid #808080;max-width:420px;line-height:1.9' },
        api.statsLines().map(line => el('div', { text: line })))
    ]));
  }
});

/* ============================================================
   2. Окно обозревателя
   ============================================================ */
Apps.browser = function (startSite) {
  const TAB_CAPACITY = 1000000;
  let winRef = null;   /* окно ещё не создано, пока идёт build */

  /* --- вкладки: индексы в Uint32Array, DOM рисуется только для видимых --- */
  const tabs = {
    urls: new Uint32Array(64),
    n: 0,
    cur: 0,
    first: 0,
    vis: 12,
    loaded: 0
  };
  function ensure(n) {
    if (tabs.n + n <= tabs.urls.length) return;
    const bigger = new Uint32Array(Math.max(n + 64, tabs.urls.length * 4));
    bigger.set(tabs.urls);
    tabs.urls = bigger;
  }
  function addTab(siteIdx) {
    ensure(1);
    tabs.urls[tabs.n++] = siteIdx;
    tabs.cur = tabs.n - 1;
    return tabs.n - 1;
  }
  function fillTabs(count) {
    const t0 = performance.now();
    ensure(count);
    const pool = SITES.length;
    for (let i = 0; i < count; i++) tabs.urls[tabs.n + i] = (Math.random() * pool) | 0;
    tabs.n += count;
    const dt = performance.now() - t0;
    tabs.first = Math.max(0, tabs.n - tabs.vis);
    return { count: count, ms: Math.round(dt) };
  }
  function tabInfo(i) { return SITES[tabs.urls[i]] || SITES[HOME()]; }
  /* единая точка переключения: вкладка, адрес, заголовок, содержимое */
  function activate(i) {
    tabs.cur = clamp(i, 0, Math.max(0, tabs.n - 1));
    const s = tabInfo(tabs.cur);
    pagePath = storeFor(s).pagePath || '';
    query = storeFor(s).query || '';
    addr.value = s.external ? query : s.url;
    currentUrl = s.url;
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    if (winRef) winRef.setTitle((s.external ? hostNameOf(query) : s.title) + ' — Microsoft Internet Explorer');
    render();
  }

  /* --- история только у активной вкладки (миллион историй не поместится) --- */
  let hist = [], histIdx = -1, query = '', pagePath = '', currentUrl = '';
  let cleanup = null;

  const host = el('div', { cls: 'webhost' });
  const strip = el('div', { cls: 'tabstrip' });
  const addr = el('input', { cls: 'field', style: 'flex:1;font-family:"Lucida Console",monospace' });
  const statusLeft = el('div', { cls: 'cell', text: 'Готово' });
  const statusRight = el('div', { cls: 'cell', text: '' });
  const statusTabs = el('div', { cls: 'cell', text: '' });

  function api() {
    return {
      query: query,
      path: pagePath,
      go: navigate,
      onLeave: fn => { cleanup = fn; },
      stats: () => '1 000 000 вкладок · ' + SITES.length + ' страниц в архиве',
      statsLines: () => [
        'Открыто вкладок: ' + tabs.n.toLocaleString('ru-RU'),
        'Показано на ленте: ' + tabs.vis,
        'Разрешено максимум: ' + TAB_CAPACITY.toLocaleString('ru-RU'),
        'Страниц в локальном архиве: ' + SITES.length,
        'Текущая: ' + tabInfo(tabs.cur).title,
        'Занято памяти вкладками: ' + Math.round(tabs.urls.byteLength / 1024) + ' КБ'
      ]
    };
  }
  function navigate(target, noHistory) {
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    let site = null;
    if (typeof target === 'number') { site = SITES[target]; query = ''; pagePath = ''; }
    else {
      const s = String(target);
      if (s.indexOf('search:') === 0) { site = SITES.find(x => x.host === SEARCH_ENGINE.host); query = s.slice(7); pagePath = ''; }
      else if (s.indexOf('wiki:') === 0) { site = SITES.find(x => x.title === 'Википедия'); query = ''; pagePath = s.slice(5); }
      else if (s.indexOf('video:') === 0) { site = SITES.find(x => x.title === 'Видео (YouTube)'); query = ''; pagePath = s.slice(6); }
      else if (s.indexOf('chat') === 0 || s === 'news') { site = SITES.find(x => x.title === 'The Microsoft Network'); query = ''; pagePath = ''; }
      else if (/^https?:\/\//i.test(s)) {
        const bare = s.replace(/^https?:\/\//i, '');
        const host2 = bare.split('/')[0].toLowerCase();
        const path2 = bare.indexOf('/') < 0 ? '' : bare.slice(bare.indexOf('/')).split(/[?#]/)[0];
        const found = siteByHost(host2);
        /* адрес без пути («http://www.msn.com/») — это корень локальной копии;
           адрес с путём («http://ru.wikipedia.org/wiki/Windows») — настоящий сайт,
           потому что архива с такой страницей у нас нет */
        if (found && (path2 === '' || path2 === '/')) { site = found; query = ''; pagePath = ''; }
        else { site = SITES.find(x => x.external); query = s; pagePath = ''; }
      }
      else { site = SITES.find(x => x.host === SEARCH_ENGINE.host); query = s; pagePath = ''; }
    }
    if (!site) site = SITES[HOME()];
    /* переход относится к активной вкладке — её адрес и есть то, что показываем */
    tabs.urls[tabs.cur] = site.idx;
    const stored = storeFor(site);
    stored.pagePath = pagePath; stored.query = query;
    if (!noHistory) { hist = hist.slice(0, histIdx + 1); hist.push(site.idx); histIdx = hist.length - 1; if (hist.length > 50) { hist.shift(); histIdx--; } }
    currentUrl = site.url;
    addr.value = site.external ? query : site.url;
    if (winRef) winRef.setTitle(site.external ? (hostNameOf(query) + ' — Microsoft Internet Explorer') : (site.title + ' — Microsoft Internet Explorer'));
    render();
  }
  /* состояние страницы (путь/запрос) хранится рядом с объектом сайта */
  const store = new Map();
  function siteStore() { return storeFor(SITES[HOME()]); }
  function storeFor(site) {
    if (!store.has(site.idx)) store.set(site.idx, { pagePath: '', query: '' });
    return store.get(site.idx);
  }
  function render() {
    host.innerHTML = '';
    const site = tabInfo(tabs.cur);
    host.style.background = '#fff';
    try { site.render(host, api()); }
    catch (e) {
      host.appendChild(el('div', { style: 'padding:16px;font-family:Georgia,serif' }, [
        p('Не удаётся отобразить страницу: ' + site.url), p(String(e.message))
      ]));
    }
    statusLeft.textContent = 'Готово';
    statusRight.textContent = site.external
      ? hostNameOf(query) + ' · настоящий сайт, открыт в окне'
      : site.host + ' · локальная копия';
    renderStrip();
  }
  function renderStrip() {
    strip.innerHTML = '';
    const width = strip.clientWidth || 600;
    const fit = Math.max(3, Math.floor(width / 112));
    tabs.vis = Math.min(fit, tabs.n);
    tabs.first = clamp(tabs.first, 0, Math.max(0, tabs.n - tabs.vis));
    for (let i = 0; i < tabs.vis; i++) {
      const idx = tabs.first + i;
      const site = tabInfo(idx);
      const t = el('div', {
        cls: 'webtab' + (idx === tabs.cur ? ' act' : ''),
        style: 'width:108px',
        attrs: { title: '#' + (idx + 1) + ' ' + site.url }
      }, [
        el('span', { text: (idx + 1) + '.', style: 'flex:0 0 auto;color:#444' }),
        el('span', { cls: 'tt', text: site.title })
      ]);
      t.addEventListener('click', () => { activate(idx); });
      t.addEventListener('auxclick', e => {
        if (e.button === 1) { e.preventDefault(); tabs.n--; render(); }
      });
      t.addEventListener('contextmenu', e => {
        e.preventDefault(); e.stopPropagation();
        popMenu([
          { label: 'Закрыть', action: () => { if (tabs.n > 1) { tabs.n--; tabs.cur = Math.min(tabs.cur, tabs.n - 1); render(); } } },
          { label: 'Закрыть остальные', disabled: tabs.n < 2, action: () => { tabs.n = 1; tabs.cur = 0; tabs.first = 0; render(); } },
          { label: 'Обновить', action: () => render() }
        ], (e.clientX - Q('#screen').getBoundingClientRect().left) / (Q('#screen').getBoundingClientRect().width / 800), (e.clientY - Q('#screen').getBoundingClientRect().top) / (Q('#screen').getBoundingClientRect().width / 800));
      });
      strip.appendChild(t);
    }
    statusTabs.textContent = 'Вкладки: ' + tabs.n.toLocaleString('ru-RU') + ' · на ленте ' + tabs.vis;
  }
  strip.addEventListener('wheel', e => {
    e.preventDefault();
    tabs.first = clamp(tabs.first + (e.deltaY > 0 || e.deltaX > 0 ? 1 : -1) * (e.shiftKey ? 5 : 1), 0, Math.max(0, tabs.n - 1));
    renderStrip();
  }, { passive: false });

  /* --- окно --- */
  const w = Wm.open({
    title: 'Microsoft Internet Explorer', icon: 'i-ie', w: 720, h: 500,
    menus: [
      {
        label: 'Файл', items: [
          { label: 'Новая вкладка', accel: 'Ctrl+T', action: () => { addTab(HOME()); activate(tabs.cur); } },
          { label: 'Открыть 10 000 вкладок', action: () => bulk(10000) },
          { label: 'Открыть 1 000 000 вкладок', action: () => bulk(TAB_CAPACITY) },
          { sep: true },
          { label: 'Закрыть вкладку', accel: 'Ctrl+W', action: () => { if (tabs.n > 1) { tabs.n--; tabs.cur = Math.min(tabs.cur, tabs.n - 1); render(); } } },
          { sep: true },
          { label: 'Выход', accel: 'Alt+F4', action: () => w.close() }
        ]
      },
      {
        label: 'Правка', items: [
          { label: 'Найти на странице...', accel: 'Ctrl+F', action: () => Wm.msgBox('Найти', 'Поиск по текущей странице.\n\nВ этой демонстрации страницы хранятся локально.', [{ label: 'ОК', value: 'ok', def: true }], 'i-ie') },
          { label: 'Копировать', accel: 'Ctrl+C', disabled: true }
        ]
      },
      {
        label: 'Вид', items: [
          { label: 'Строка состояния', checked: true, action: () => { } },
          { label: 'Обновить', accel: 'F5', action: () => render() },
          { label: 'Остановить', disabled: true }
        ]
      },
      {
        label: 'Переход', items: [
          { label: 'Домашняя страница', action: () => navigate(HOME()) },
          { label: 'Поиск в паутине', action: () => navigate('search:') },
          { label: 'Назад', accel: 'Alt+←', disabled: histIdx <= 0, action: () => back() },
          { label: 'Вперёд', accel: 'Alt+→', disabled: histIdx < 0 || histIdx >= hist.length - 1, action: () => fwd() },
          { sep: true },
          /* служебный сайт «Настоящий сайт» в меню не нужен — это заглушка перехода */
          SITES.filter(s => !s.external).slice(0, 12).map(s => ({ label: s.title, action: () => navigate(s.idx) }))
        ]
      },
      { label: 'Избранное', items: SITES.filter(s => !s.external).slice(0, 8).map(s => ({ label: s.title, action: () => navigate(s.idx) })) },
      { label: 'Справка', items: [{ label: 'О программе', action: () => Wm.msgBox('Microsoft Internet Explorer', 'Microsoft Internet Explorer 1.0\r\r\rОбозреватель Всемирной паутины.\r\rАдрес без пути открывает локальную копию из архива системы.\rАдрес с путём открывает настоящий сайт прямо в этом окне.\rЧасть сайтов запрещает показ внутри окна — тогда внизу\rпоявляется пояснение и кнопка открытия в настоящем браузере.', [{ label: 'ОК', value: 'ok', def: true }], 'i-ie') }] }
    ],
    status: [statusLeft, statusRight, statusTabs],
    build(body, w2) {
      /* панель инструментов */
      const tool = el('div', { cls: 'webtool' });
      const mkTool = (label, title, fn, dis) => {
        const b = el('div', { cls: 'wtbtn' + (dis ? ' dis' : ''), attrs: { title: title } }, [el('span', { text: label })]);
        b.addEventListener('click', () => { Speaker.ticks(); fn(); });
        return b;
      };
      tool.appendChild(mkTool('◀', 'Назад', () => back()));
      tool.appendChild(mkTool('▶', 'Вперёд', () => fwd()));
      tool.appendChild(mkTool('✖', 'Стоп', () => statusLeft.textContent = 'Остановлено'));
      tool.appendChild(mkTool('⟳', 'Обновить', () => render()));
      tool.appendChild(mkTool('⌂', 'Домашняя страница', () => navigate(HOME())));
      tool.appendChild(el('div', { cls: 'wtsep' }));
      tool.appendChild(el('div', { style: 'display:flex;gap:4px;align-items:center;flex:1;margin-left:4px' }, [
        el('span', { text: 'Адрес', style: 'flex:0 0 auto' }), addr,
        el('button', { cls: 'btn sm', text: 'Переход', on: { click: () => navigate(addr.value) } })
      ]));
      body.appendChild(tool);
      addr.addEventListener('keydown', e => { if (e.key === 'Enter') navigate(addr.value); });

      /* строка вкладок */
      const tabbar = el('div', { cls: 'webtabbar' });
      const jump = el('input', { cls: 'field', style: 'width:74px;height:18px' });
      tabbar.appendChild(strip);
      tabbar.appendChild(el('div', { style: 'display:flex;gap:3px;align-items:center;padding:0 3px' }, [
        el('button', { cls: 'btn sm', text: '◀', attrs: { title: 'Назад по ленте' }, on: { click: () => { tabs.first = clamp(tabs.first - tabs.vis, 0, Math.max(0, tabs.n - 1)); renderStrip(); } } }),
        jump,
        el('button', { cls: 'btn sm', text: '▶', attrs: { title: 'Вперёд по ленте' }, on: { click: () => { tabs.first = clamp(tabs.first + tabs.vis, 0, Math.max(0, tabs.n - 1)); renderStrip(); } } }),
        el('button', { cls: 'btn sm', text: 'Перейти', on: { click: () => goJump() } })
      ]));
      body.appendChild(tabbar);
      function goJump() {
        const n = parseInt(jump.value, 10);
        if (!n || n < 1 || n > tabs.n) { Speaker.error(); Wm.msgBox('Вкладки', 'Номер вкладки должен быть от 1 до ' + tabs.n + '.', [{ label: 'ОК', value: 'ok', def: true }], 'i-help'); return; }
        tabs.cur = n - 1;
        tabs.first = clamp(tabs.cur - 2, 0, Math.max(0, tabs.n - 1));
        activate(tabs.cur);
      }
      jump.addEventListener('keydown', e => { if (e.key === 'Enter') goJump(); });

      /* страница */
      host.className = 'webhost';
      body.appendChild(host);

      /* стартовые вкладки */
      addTab(HOME());
      addTab(SITES.find(s => s.title === 'Википедия').idx);
      addTab(SITES.find(s => s.title === 'Видео (YouTube)').idx);
      addTab(SITES.find(s => s.title === 'Погода в Москве').idx);
      tabs.cur = startSite != null ? tabs.n - 1 : 0;
      navigate(startSite != null ? startSite : HOME(), true);
      /* стартовая страница — первая запись истории, иначе «Назад» на
         пустой истории сразу упирается в histIdx <= 0 */
      hist = [tabInfo(tabs.cur).idx];
      histIdx = 0;

      w2.onKey = e => {
        if (e.ctrlKey && e.key === 't') { addTab(HOME()); activate(tabs.cur); return true; }
        if (e.ctrlKey && e.key === 'w') { if (tabs.n > 1) { tabs.n--; tabs.cur = Math.min(tabs.cur, tabs.n - 1); render(); } return true; }
        if (e.key === 'F5') { render(); return true; }
        if (e.altKey && e.key === 'ArrowLeft') { back(); return true; }
        if (e.altKey && e.key === 'ArrowRight') { fwd(); return true; }
        if (e.ctrlKey && e.key === 'l') { addr.focus(); addr.select(); return true; }
        return false;
      };
    },
    onClose() { if (cleanup) { try { cleanup(); } catch (e) { } } }
  });

  /* вернуть страницу из истории: navigate по индексу стирает запрос и путь,
   поэтому после перехода состояние берём из хранилища сайта */
  function goHist(i) {
    const site = SITES[hist[i]] || SITES[HOME()];
    tabs.urls[tabs.cur] = site.idx;
    const st = storeFor(site);
    query = st.query || '';
    pagePath = st.pagePath || '';
    currentUrl = site.url;
    addr.value = site.external ? query : site.url;
    if (cleanup) { try { cleanup(); } catch (e) { } cleanup = null; }
    if (winRef) winRef.setTitle((site.external ? hostNameOf(query) : site.title) + ' — Microsoft Internet Explorer');
    render();
  }
  function back() {
    if (histIdx <= 0) { Speaker.error(); return; }
    histIdx--; goHist(histIdx);
  }
  function fwd() {
    if (histIdx >= hist.length - 1) { Speaker.error(); return; }
    histIdx++; goHist(histIdx);
  }
  function bulk(count) {
    Speaker.chatter();
    const r = fillTabs(count);
    render();
    Wm.msgBox('Вкладки',
      'Открыто вкладок: ' + r.count.toLocaleString('ru-RU') + '\n' +
      'Всего вкладок: ' + tabs.n.toLocaleString('ru-RU') + '\n' +
      'Время: ' + r.ms + ' мс\n' +
      'Память под вкладки: ' + Math.round(tabs.urls.byteLength / 1024) + ' КБ\n' +
      'На ленте рисуется только ' + tabs.vis + ' — остальные хранятся в массиве и подгружаются при переходе.',
      [{ label: 'ОК', value: 'ok', def: true }], 'i-ie');
  }
  window.addEventListener('resize', () => renderStrip());
  winRef = w;
  /* стартовая вкладка могла задать адрес ещё до появления winRef — заголовок
     обновляем после сборки окна, иначе остаётся дежурный */
  const s0 = tabInfo(tabs.cur);
  winRef.setTitle((s0.external ? hostNameOf(query) : s0.title) + ' — Microsoft Internet Explorer');
  return w;
};