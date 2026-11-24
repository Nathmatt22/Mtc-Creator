/* MTC creator — interface (rendu, éditeurs, import / export). */
(function () {
  'use strict';

  const MTC = window.MTC;
  const G = MTC.gen;
  const P = MTC.project;
  const t = (text, vars) => MTC.i18n.t(text, vars);
  const locale = () => (MTC.i18n.getLang() === 'en' ? 'en-GB' : 'fr-FR');
  function plural(n, one, many, vars) {
    return t(n > 1 ? many : one, Object.assign({ n }, vars || {}));
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const els = {
    app: $('#app'),
    tabbar: $('#tabbar'),
    viewhost: $('#viewhost'),
    tree: $('#tree'),
    treeFilter: $('#tree-filter'),
    inspector: $('#inspector'),
    consoleLog: $('#console-log'),
    projectChip: $('#project-chip'),
    menubarTitle: $('#menubar-title'),
    modalRoot: $('#modal-root'),
    fileInput: $('#hidden-file'),
    saveState: $('#save-state'),
    consoleLevel: $('#console-level'),
  };

  const state = {
    project: P.load() || P.empty('mymod'),
    tabs: [],
    active: { kind: 'home' },
    typeFilter: 'all',
    search: '',
    treeFilter: '',
    fsSelection: null,
    pendingTexture: null,
    pendingScreenshot: '',
    drag: null,
    files: [],
    confirm: null,
  };

  const FS_UNIT = 40;

  /* ------------------------------------------------------------------ */
  /* utilitaires                                                         */
  /* ------------------------------------------------------------------ */

  const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, (m) => ESCAPES[m]);
  }

  function parseList(text) {
    return String(text || '')
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function setPath(obj, path, value) {
    const parts = String(path).split('.');
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const key = /^\d+$/.test(parts[i]) ? Number(parts[i]) : parts[i];
      if (cur[key] == null) cur[key] = {};
      cur = cur[key];
    }
    const last = parts[parts.length - 1];
    cur[/^\d+$/.test(last) ? Number(last) : last] = value;
  }

  function activeElement() {
    return state.active.kind === 'element' ? P.find(state.project, state.active.id) : null;
  }

  function registryName(el) {
    return `${state.project.meta.modName}:${el.name}`;
  }

  function download(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  function log(message, level = '') {
    const line = document.createElement('div');
    line.className = 'log-line ' + level;
    const time = new Date().toLocaleTimeString(locale(), { hour12: false });
    line.innerHTML = `<span class="t">${time}</span><span class="m">${esc(message)}</span>`;
    els.consoleLog.appendChild(line);
    els.consoleLog.scrollTop = els.consoleLog.scrollHeight;
    while (els.consoleLog.children.length > 500) els.consoleLog.removeChild(els.consoleLog.firstChild);
    if (level === 'err') els.consoleLevel.textContent = t('erreur');
    else if (level === 'warn') els.consoleLevel.textContent = t('avertissement');
    else els.consoleLevel.textContent = t('prêt');
  }

  function toast(message, kind = '') {
    let stack = $('.toast-stack');
    if (!stack) {
      stack = document.createElement('div');
      stack.className = 'toast-stack';
      document.body.appendChild(stack);
    }
    const node = document.createElement('div');
    node.className = 'toast ' + kind;
    node.textContent = message;
    stack.appendChild(node);
    setTimeout(() => {
      node.style.opacity = '0';
      node.style.transition = 'opacity .3s';
      setTimeout(() => node.remove(), 340);
    }, 2800);
  }

  function highlightLua(code) {
    const re =
      /(--\[\[[\s\S]*?\]\])|(--[^\n]*)|("(?:\\.|[^"\\])*")|\b(local|function|end|if|then|else|elseif|return|for|in|do|while|not|and|or|nil|true|false)\b|\b(\d+(?:\.\d+)?)\b/g;
    let out = '';
    let last = 0;
    let match;
    while ((match = re.exec(code))) {
      out += esc(code.slice(last, match.index));
      const token = esc(match[0]);
      if (match[1] || match[2]) out += `<span class="c">${token}</span>`;
      else if (match[3]) out += `<span class="s">${token}</span>`;
      else if (match[4]) out += `<span class="k">${token}</span>`;
      else out += `<span class="n">${token}</span>`;
      last = match.index + match[0].length;
    }
    return out + esc(code.slice(last));
  }

  let saveTimer = null;
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const ok = P.save(state.project);
      if (!ok) log(t('Sauvegarde locale impossible (stockage plein ?). Pensez à exporter votre projet.'), 'warn');
      stampSave(ok);
    }, 650);
  }

  function stampSave(ok = true) {
    if (!els.saveState) return;
    const time = new Date().toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit' });
    els.saveState.textContent = ok ? t('Enregistré à {time}', { time }) : t('Sauvegarde impossible');
  }

  function saveProject(silent) {
    const ok = P.save(state.project);
    stampSave(ok);
    if (!silent) {
      log(t(ok ? 'Projet enregistré dans le navigateur.' : 'Échec de la sauvegarde locale.'), ok ? 'ok' : 'err');
      toast(t(ok ? 'Projet enregistré' : 'Sauvegarde impossible'), ok ? '' : 'err');
    }
  }

  /* ------------------------------------------------------------------ */
  /* rendu général                                                       */
  /* ------------------------------------------------------------------ */

  function render() {
    const scroll = els.viewhost.scrollTop;
    const home = state.active.kind === 'home';
    els.app.classList.toggle('home-mode', home);
    renderChip();
    renderTabs();
    renderTree();
    renderView();
    renderInspector();
    renderRail();
    els.menubarTitle.textContent = home
      ? t('Mes projets — MTC creator')
      : `${state.project.meta.title || state.project.meta.modName} · ${state.project.meta.modName} — MTC creator`;
    els.viewhost.scrollTop = home ? 0 : scroll;
  }

  function renderChip() {
    const p = state.project;
    const total = p.elements.length;
    const textures = Object.keys(p.textures || {}).length;
    els.projectChip.innerHTML = `
      <div class="mod-name">${esc(p.meta.title || p.meta.modName)}</div>
      <div class="mod-sub">${esc(p.meta.modName)} · ${plural(total, '{n} élément', '{n} éléments')} · ${plural(
      textures,
      '{n} texture',
      '{n} textures'
    )}</div>
    `;
  }

  function renderTabs() {
    if (state.active.kind === 'home') {
      els.tabbar.innerHTML = '';
      return;
    }
    const parts = [];
    const isActive = (kind, id) => state.active.kind === kind && (id == null || state.active.id === id);
    parts.push(
      `<div class="tab ${isActive('workspace') ? 'active' : ''}" role="button" tabindex="0" data-action="goto-workspace">
        <span class="tab-kind">${t('Projet')}</span> ${t("Vue d'ensemble")}
      </div>`
    );
    for (const tab of state.tabs) {
      if (tab.kind === 'element') {
        const el = P.find(state.project, tab.id);
        if (!el) continue;
        parts.push(`<div class="tab ${isActive('element', tab.id) ? 'active' : ''}" role="button" tabindex="0" data-action="select-tab" data-kind="element" data-id="${el.id}">
          <span class="tab-kind">${esc(t(P.TYPES[el.type].label))}</span>
          <span>${esc(el.props.title || el.name)}</span>
          <button type="button" class="tab-close" data-action="close-tab" data-kind="element" data-id="${el.id}" title="${esc(t('Fermer'))}">×</button>
        </div>`);
      } else if (tab.kind === 'textures') {
        parts.push(`<div class="tab ${isActive('textures') ? 'active' : ''}" role="button" tabindex="0" data-action="select-tab" data-kind="textures">
          <span class="tab-kind">${t('Ressources')}</span><span>${t('Textures')}</span>
          <button type="button" class="tab-close" data-action="close-tab" data-kind="textures" title="${esc(t('Fermer'))}">×</button>
        </div>`);
      } else if (tab.kind === 'code') {
        parts.push(`<div class="tab ${isActive('code') ? 'active' : ''}" role="button" tabindex="0" data-action="select-tab" data-kind="code">
          <span class="tab-kind">${t('Sortie')}</span><span>${t('Code généré')}</span>
          <button type="button" class="tab-close" data-action="close-tab" data-kind="code" title="${esc(t('Fermer'))}">×</button>
        </div>`);
      }
    }
    els.tabbar.innerHTML = parts.join('');
  }

  function renderRail() {
    $$('.rail-btn[data-view]').forEach((btn) => {
      const kind = btn.dataset.view;
      btn.classList.toggle('active', state.active.kind === kind);
    });
  }

  function renderTree() {
    const filter = state.treeFilter.toLowerCase();
    if (!state.project.elements.length) {
      els.tree.innerHTML = `<div class="tree-empty">${t('Aucun élément pour le moment.')}<br>${t("Utilisez « ＋ Élément » ou la barre d'outils.")}</div>`;
      return;
    }
    const groups = [];
    for (const type of Object.keys(P.TYPES)) {
      const items = state.project.elements.filter(
        (el) => el.type === type && (!filter || (el.props.title || '').toLowerCase().includes(filter) || el.name.includes(filter))
      );
      if (!items.length && filter) continue;
      groups.push(`
        <div class="tree-group">
          <div class="tree-group-head">${esc(t(P.TYPES[type].plural))}<span class="count">${state.project.elements.filter((e) => e.type === type).length}</span></div>
          ${items
            .map(
              (el) => `<button type="button" class="tree-item ${state.active.kind === 'element' && state.active.id === el.id ? 'active' : ''}" data-type="${el.type}" data-action="open-element" data-id="${el.id}">
                <span class="dot"></span><span class="label">${esc(el.props.title || el.name)}</span>
              </button>`
            )
            .join('')}
        </div>`);
    }
    els.tree.innerHTML = groups.length
      ? groups.join('')
      : `<div class="tree-empty">${t('Aucun élément ne correspond au filtre.')}</div>`;
  }

  function renderView() {
    if (state.active.kind === 'home') {
      els.viewhost.innerHTML = homeHtml();
      return;
    }
    if (state.active.kind === 'workspace') {
      els.viewhost.innerHTML = workspaceHtml();
    } else if (state.active.kind === 'element') {
      const el = activeElement();
      if (!el) {
        state.active = { kind: 'workspace' };
        els.viewhost.innerHTML = workspaceHtml();
        return;
      }
      els.viewhost.innerHTML = el.type === 'formspec' ? formspecEditorHtml(el) : elementEditorHtml(el);
      if (el.type === 'formspec') {
        renderFsStage(el);
        renderFsCompList(el);
      }
    } else if (state.active.kind === 'textures') {
      els.viewhost.innerHTML = texturesHtml();
      bindTextureDrop();
    } else if (state.active.kind === 'code') {
      els.viewhost.innerHTML = codeHtml();
    }
    refreshCodePreview();
  }

  function renderInspector() {
    if (state.active.kind === 'home') {
      els.inspector.innerHTML = '';
      return;
    }
    if (state.active.kind === 'element') {
      const el = activeElement();
      if (el) {
        els.inspector.innerHTML = el.type === 'formspec' ? formspecInspectorHtml(el) : elementInspectorHtml(el);
        return;
      }
    }
    if (state.active.kind === 'textures') {
      els.inspector.innerHTML = texturesInspectorHtml();
      return;
    }
    if (state.active.kind === 'code') {
      els.inspector.innerHTML = codeInspectorHtml();
      return;
    }
    els.inspector.innerHTML = projectInspectorHtml();
  }

  /* ------------------------------------------------------------------ */
  /* espace de travail                                                   */
  /* ------------------------------------------------------------------ */

  function elementSummary(el) {
    const p = el.props;
    switch (el.type) {
      case 'block': {
        const light = p.light ? ' ' + t('Émet une lumière de {n}.', { n: p.light }) : '';
        return t('Bloc placé dans le monde. Groupes : {groups}.', { groups: p.groups || t('aucun') }) + light;
      }
      case 'item':
        return t("Objet d'inventaire empilable par {n}.{groups}", {
          n: p.stackMax || 99,
          groups: p.groups ? t(' Groupes : {groups}.', { groups: p.groups }) : '',
        });
      case 'tool': {
        const kind = t((G.TOOL_KINDS.find((k) => k[0] === p.kind) || [, 'Outil'])[1]);
        const material = t((G.TOOL_MATERIALS[p.material] || { label: 'Acier' }).label).toLowerCase();
        return t('{kind} en {material} · {n} utilisations · dégâts {damage}.', {
          kind,
          material,
          n: p.uses || 60,
          damage: p.damage || 3,
        });
      }
      case 'craft':
        return p.kind === 'cooking'
          ? t('Cuisson de {input} vers {output}.', { input: p.input || '?', output: p.output || '?' })
          : t(p.kind === 'shapeless' ? 'Recette sans forme → {output}.' : 'Recette avec forme → {output}.', {
              output: p.output || t('aucun résultat'),
            });
      case 'formspec':
        return t("Interface à {n} composants, {w}×{h} unités. S'ouvre avec une commande ou au clic droit.", {
          n: (p.components || []).length,
          w: p.width,
          h: p.height,
        });
      default:
        return '';
    }
  }

  function thumbHtml(el) {
    const url = P.elementTexture(el, state.project);
    if (url) return `<img src="${url}" alt="" />`;
    return `<span>${esc(t(P.TYPES[el.type].glyph))}</span>`;
  }

  function workspaceCardsHtml() {
    const q = state.search.toLowerCase();
    const list = state.project.elements.filter((el) => {
      if (state.typeFilter !== 'all' && el.type !== state.typeFilter) return false;
      if (!q) return true;
      return (el.props.title || '').toLowerCase().includes(q) || el.name.toLowerCase().includes(q);
    });
    if (!list.length) {
      return `<div class="empty"><h3>${t('Aucun élément')}</h3><p>${t(
        'Changez de filtre ou créez un bloc, un item, un outil, une recette ou une formspec.'
      )}</p>
        <div class="row">
          <button type="button" class="tbtn accent" data-action="new-element" data-type="block">${t('Créer un bloc')}</button>
          <button type="button" class="tbtn" data-action="new-element" data-type="formspec">${t('Créer une formspec')}</button>
        </div></div>`;
    }
    return list
      .map(
        (el) => `<div class="card" data-action="open-element" data-id="${el.id}" title="${esc(t("Ouvrir l'éditeur"))}">
          <div class="thumb">${thumbHtml(el)}</div>
          <div class="meta">
            <div class="name">${esc(el.props.title || el.name)}</div>
            <div class="desc">${esc(elementSummary(el))}</div>
            <div class="tags">
              <span class="tag tag-type">${esc(t(P.TYPES[el.type].label))}</span>
              <span class="tag">${esc(registryName(el))}</span>
            </div>
          </div>
          <button type="button" class="del" data-action="delete-element" data-id="${el.id}" title="${esc(t('Supprimer'))}">×</button>
        </div>`
      )
      .join('');
  }

  function workspaceHtml() {
    const p = state.project;
    const total = p.elements.length;
    const chips = [
      `<button type="button" class="chip ${state.typeFilter === 'all' ? 'active' : ''}" data-action="filter-type" data-type="all">${t('Tous')} <span class="n">${total}</span></button>`,
    ];
    for (const [type, meta] of Object.entries(P.TYPES)) {
      const n = p.elements.filter((e) => e.type === type).length;
      chips.push(
        `<button type="button" class="chip ${state.typeFilter === type ? 'active' : ''}" data-action="filter-type" data-type="${type}">${t(
          meta.plural
        )} <span class="n">${n}</span></button>`
      );
    }

    const body =
      total === 0
        ? `<div class="empty">
            <h3>${t('Votre mod commence ici')}</h3>
            <p>${t(
              "MTC creator génère un mod Luanti complet : blocs, items, outils, recettes de fabrication et interfaces (formspecs). À l'export, vous obtenez un ZIP prêt à déposer dans le dossier {path} de votre monde.",
              { path: '<code>mods/</code>' }
            )}</p>
            <ol class="steps">
              <li><span class="num">1</span><div><b>${t('Créez vos éléments')}</b><span class="txt">${t(
                'Blocs, items, outils et recettes : chaque élément devient du Lua dans {file}.',
                { file: '<code>init.lua</code>' }
              )}</span></div></li>
              <li><span class="num">2</span><div><b>${t('Ajoutez vos textures')}</b><span class="txt">${t(
                'Importez vos PNG ou choisissez celles du mod {default} ; elles partent dans {path}.',
                { default: '<code>default</code>', path: '<code>textures/</code>' }
              )}</span></div></li>
              <li><span class="num">3</span><div><b>${t('Exportez en ZIP')}</b><span class="txt">${t(
                'Déposez le dossier obtenu dans {path}, activez le mod dans un monde et jouez.',
                { path: '<code>mods/</code>' }
              )}</span></div></li>
            </ol>
            <div class="row">
              <button type="button" class="tbtn accent" data-action="new-element" data-type="block">${t('Créer un bloc')}</button>
              <button type="button" class="tbtn" data-action="new-element" data-type="item">${t('Créer un item')}</button>
              <button type="button" class="tbtn" data-action="import-mod">${t('Importer un mod')}</button>
              <button type="button" class="tbtn" data-action="load-sample">${t("Projet d'exemple")}</button>
            </div>
          </div>`
        : `<div class="card-grid" id="ws-cards">${workspaceCardsHtml()}</div>`;

    return `<div class="workspace-head">
        <div>
          <div class="ws-title">${t('Espace de travail')}</div>
          <div class="ws-sub">${esc(p.meta.modName)} · ${plural(total, '{n} élément', '{n} éléments')} · ${plural(
      Object.keys(p.textures || {}).length,
      '{n} texture',
      '{n} textures'
    )}</div>
        </div>
        <div class="ws-search"><input type="search" id="ws-search" placeholder="${esc(
          t('Rechercher un élément…')
        )}" value="${esc(state.search)}" autocomplete="off" /></div>
      </div>
      <div class="chips">${chips.join('')}</div>
      ${body}`;
  }

  /* ------------------------------------------------------------------ */
  /* menu principal (bibliothèque de projets)                            */
  /* ------------------------------------------------------------------ */

  function formatDate(iso) {
    const date = iso ? new Date(iso) : new Date();
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(locale(), { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function initials(text) {
    const letters = String(text || '')
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join('')
      .toUpperCase();
    return letters || '?';
  }

  function homeHtml() {
    const list = P.library();
    const cards = list
      .map((entry) => {
        const p = entry.project || {};
        const count = (p.elements || []).length;
        const shot = entry.screenshot
          ? `<img src="${esc(entry.screenshot)}" alt="" />`
          : `<span class="proj-initials">${esc(initials(entry.title))}</span>`;
        return `<button type="button" class="proj-card" data-action="open-library-project" data-id="${esc(
          entry.id
        )}" title="${esc(t('Ouvrir ce projet'))}">
          <div class="proj-shot">${shot}</div>
          <div class="proj-body">
            <div class="proj-title">${esc(entry.title)}</div>
            <div class="proj-desc">${esc(entry.description || t('Aucune description.'))}</div>
            <div class="proj-meta">${esc((p.meta || {}).modName || '')} · ${plural(
          count,
          '{n} élément',
          '{n} éléments'
        )} · ${t('modifié le {date}', { date: formatDate(entry.updatedAt) })}</div>
          </div>
        </button>`;
      })
      .join('');

    const empty = `<div class="empty">
        <h3>${t('Aucun projet pour le moment')}</h3>
        <p>${t(
          'Créez votre premier mod : donnez-lui un nom, une description et une capture d’écran pour le retrouver ici.'
        )}</p>
        <div class="row"><button type="button" class="tbtn accent" data-action="new-project">＋ ${t(
          'Nouveau projet'
        )}</button></div>
      </div>`;

    return `<div class="home">
        <div class="home-head">
          <div>
            <h2>${t('Mes projets')}</h2>
            <p class="home-sub">${t(
              'Ouvrez un projet existant ou créez-en un nouveau. Les projets sont enregistrés dans ce navigateur.'
            )}</p>
          </div>
          <button type="button" class="tbtn accent home-new" data-action="new-project">＋ ${t(
            'Nouveau projet'
          )}</button>
        </div>
        ${list.length ? `<div class="project-grid">${cards}</div>` : empty}
      </div>`;
  }

  /* ------------------------------------------------------------------ */
  /* champs de formulaire                                                */
  /* ------------------------------------------------------------------ */

  function fld(label, control, opts = {}) {
    return `<div class="field ${opts.full ? 'full' : ''}">
      <label>${label}</label>${control}
      ${opts.hint ? `<div class="hint">${opts.hint}</div>` : ''}
    </div>`;
  }

  function inp(scope, id, field, value, opts = {}) {
    const attrs = [
      `type="${opts.type || 'text'}"`,
      `data-scope="${scope}"`,
      id ? `data-id="${esc(id)}"` : '',
      `data-field="${field}"`,
      `value="${esc(value == null ? '' : value)}"`,
      opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : '',
      opts.min != null ? `min="${opts.min}"` : '',
      opts.max != null ? `max="${opts.max}"` : '',
      opts.step != null ? `step="${opts.step}"` : '',
      opts.list ? `list="${opts.list}"` : '',
    ];
    return `<input ${attrs.filter(Boolean).join(' ')} />`;
  }

  function ta(scope, id, field, value, opts = {}) {
    return `<textarea data-scope="${scope}" ${id ? `data-id="${esc(id)}"` : ''} data-field="${field}" placeholder="${esc(
      opts.placeholder || ''
    )}">${esc(value)}</textarea>`;
  }

  function sel(scope, id, field, value, options, opts = {}) {
    const current = String(value == null ? '' : value);
    const found = options.some(([v]) => String(v) === current);
    const list = found || !current ? options : [[current, current], ...options];
    return `<select data-scope="${scope}" ${id ? `data-id="${esc(id)}"` : ''} data-field="${field}">
      ${list.map(([v, label]) => `<option value="${esc(v)}" ${String(v) === current ? 'selected' : ''}>${esc(label)}</option>`).join('')}
    </select>`;
  }

  function chk(scope, id, field, checked, label) {
    return `<label class="check"><input type="checkbox" data-scope="${scope}" ${id ? `data-id="${esc(id)}"` : ''} data-field="${field}" ${
      checked ? 'checked' : ''
    } /><span>${esc(label)}</span></label>`;
  }

  function textureField(scope, id, field, value, label) {
    const url = P.textureUrl(state.project, value);
    const custom = Object.keys(state.project.textures || {});
    const options = [['', t('— aucune —')]];
    if (custom.length) options.push(['__group__', t('Textures du mod')]);
    for (const name of custom) options.push([name, name]);
    options.push(['__group__', t('Textures de default')]);
    for (const name of P.DEFAULT_TEXTURES) options.push([name, name]);
    const current = value || '';
    if (current && !options.some(([v]) => v === current)) options.push([current, current]);

    const selectHtml = `<select class="grow" data-scope="${scope}" ${id ? `data-id="${esc(id)}"` : ''} data-field="${field}">
      ${options
        .map(([v, l]) =>
          v === '__group__'
            ? `<option value="__group__" disabled>${esc(l)}</option>`
            : `<option value="${esc(v)}" ${v === current ? 'selected' : ''}>${esc(l)}</option>`
        )
        .join('')}
    </select>`;

    return `<div class="field full">
      <label>${esc(label)}</label>
      <div class="tex-select">
        <div class="tex-preview">${url ? `<img src="${url}" alt="" />` : '—'}</div>
        ${selectHtml}
        <button type="button" class="tbtn" data-action="upload-texture" data-scope="${scope}" data-id="${esc(id || '')}" data-field="${field}">${t('Importer')}</button>
      </div>
      <div class="hint">${t('Les images importées sont exportées dans {path} et référencées par leur nom complet.', {
        path: '<code>textures/</code>',
      })}</div>
    </div>`;
  }

  function section(title, body, wide) {
    return `<section class="section ${wide ? 'wide' : ''}"><h4>${esc(title)}</h4>${body}</section>`;
  }

  function formspecOptions() {
    return [['', t('Aucune interaction')]].concat(
      state.project.elements.filter((e) => e.type === 'formspec').map((e) => [e.id, e.props.title || e.name])
    );
  }

  function itemsDatalist() {
    const options = new Set(P.ITEM_SUGGESTIONS);
    for (const el of state.project.elements) {
      if (el.type === 'block' || el.type === 'item' || el.type === 'tool') options.add(registryName(el));
    }
    return `<datalist id="items-datalist">${[...options].map((v) => `<option value="${esc(v)}"></option>`).join('')}</datalist>`;
  }

  /* ------------------------------------------------------------------ */
  /* éditeurs d'éléments                                                 */
  /* ------------------------------------------------------------------ */

  function editorHead(el, kindLabel) {
    return `<div class="editor-head">
      <span class="badge-type">${esc(kindLabel)}</span>
      <div>
        <div style="font-size:15px;font-weight:600">${esc(el.props.title || el.name)}</div>
        <div class="registry">${esc(registryName(el))}</div>
        <div class="head-desc">${esc(elementSummary(el))}</div>
      </div>
      <div class="spacer"></div>
      <button type="button" class="tbtn" data-action="duplicate-element" data-id="${el.id}">${t('Dupliquer')}</button>
      <button type="button" class="tbtn" data-action="open-textures">${t('Textures')}</button>
      <button type="button" class="tbtn danger-btn" data-action="delete-element" data-id="${el.id}">${t('Supprimer')}</button>
    </div>`;
  }

  function codePanel() {
    return `<div class="code-panel">
      <div class="code-panel-head">
        <span>${t('Code généré pour cet élément')}</span>
        <span class="file">init.lua</span>
        <span class="spacer"></span>
        <button type="button" class="link-btn" data-action="copy-element-code">${t('Copier')}</button>
      </div>
      <pre class="code" id="elem-code"></pre>
    </div>`;
  }

  function elementEditorHtml(el) {
    let sections = '';
    if (el.type === 'block') sections = blockSections(el);
    else if (el.type === 'item') sections = itemSections(el);
    else if (el.type === 'tool') sections = toolSections(el);
    else if (el.type === 'craft') sections = craftSections(el);
    return `${editorHead(el, t(P.TYPES[el.type].label))}${itemsDatalist()}<div class="sections">${sections}</div>${codePanel()}`;
  }

  function blockSections(el) {
    const p = el.props;
    const id = el.id;
    const texFields =
      p.tilesMode === 'all'
        ? textureField('el', id, 'texTop', p.texTop, t('Texture du bloc'))
        : textureField('el', id, 'texTop', p.texTop, t('Dessus')) +
          textureField('el', id, 'texSide', p.texSide, t('Côtés')) +
          textureField('el', id, 'texBottom', p.texBottom, t('Dessous'));

    return (
      section(
        t('Identité'),
        `<div class="fields">
          ${fld(t('Identifiant'), inp('el', id, 'name', el.name), {
            hint: t('minuscules, chiffres et « _ » — utilisé dans {code}', { code: '<code>mod:identifiant</code>' }),
          })}
          ${fld(t('Nom affiché'), inp('el', id, 'title', p.title))}
          ${fld(t('Son de minage'), sel('el', id, 'sounds', p.sounds, G.SOUNDS.map(([v, l]) => [v, t(l)])))}
          ${fld(t('Lumière émise'), inp('el', id, 'light', p.light, { type: 'number', min: 0, max: 14 }), { hint: t('0 = aucune, 14 = comme une torche') })}
        </div>`
      ) +
      section(
        t('Apparence'),
        `<div class="fields">
          ${fld(
            t('Type de textures'),
            sel('el', id, 'tilesMode', p.tilesMode, [
              ['all', t('Une texture pour tout le bloc')],
              ['per-face', t('Textures différentes par face')],
            ]),
            { full: true }
          )}
          ${texFields}
        </div>`
      ) +
      section(
        t('Propriétés physiques'),
        `<div class="fields">
          <div class="full">${chk('el', id, 'walkable', p.walkable, t('Les joueurs marchent dessus (walkable)'))}</div>
          <div class="full">${chk('el', id, 'pointable', p.pointable, t('Peut être visé (pointable)'))}</div>
          <div class="full">${chk('el', id, 'diggable', p.diggable, t('Peut être miné (diggable)'))}</div>
          <div class="full">${chk('el', id, 'sunlight', p.sunlight, t('La lumière du soleil traverse (sunlight_propagates)'))}</div>
          <div class="full">${chk('el', id, 'ground', p.ground, t('Fait partie du sol du monde (is_ground_content)'))}</div>
        </div>`
      ) +
      section(
        t('Groupes & minage'),
        `<div class="fields">
          ${fld(t('Groupes'), inp('el', id, 'groups', p.groups), {
            full: true,
            hint: t("ex. {code} — détermine l'outil efficace et la résistance.", { code: '<code>cracky=3, stone=1</code>' }),
          })}
          <div class="full">${chk('el', id, 'dropSelf', p.dropSelf, t('Le bloc se récupère lui-même quand on le mine'))}</div>
          ${!p.dropSelf ? fld(t('Objet lâché'), inp('el', id, 'drop', p.drop, { placeholder: 'default:cobble', list: 'items-datalist' }), { full: true }) : ''}
        </div>`
      ) +
      section(
        t('Interaction'),
        `<div class="fields">
          ${fld(t('Clic droit : ouvrir une formspec'), sel('el', id, 'formspecId', p.formspecId, formspecOptions()), {
            full: true,
            hint: t("La fonction de la formspec est générée avant les blocs, l'appel est direct."),
          })}
        </div>`,
        true
      )
    );
  }

  function itemSections(el) {
    const p = el.props;
    const id = el.id;
    return (
      section(
        t('Identité'),
        `<div class="fields">
          ${fld(t('Identifiant'), inp('el', id, 'name', el.name), { hint: t('utilisé dans {code}', { code: '<code>mod:identifiant</code>' }) })}
          ${fld(t('Nom affiché'), inp('el', id, 'title', p.title))}
          ${fld(t('Taille de pile'), inp('el', id, 'stackMax', p.stackMax, { type: 'number', min: 1, max: 65535 }))}
          ${fld(t('Groupes'), inp('el', id, 'groups', p.groups, { placeholder: t('ex. craftitem=1') }))}
        </div>`
      ) +
      section(t('Apparence'), `<div class="fields">${textureField('el', id, 'texture', p.texture, t("Image d'inventaire"))}</div>`) +
      section(
        t('Interaction'),
        `<div class="fields">
          ${fld(t('Clic droit : ouvrir une formspec'), sel('el', id, 'formspecId', p.formspecId, formspecOptions()), { full: true })}
        </div>`
      )
    );
  }

  function toolSections(el) {
    const p = el.props;
    const id = el.id;
    return (
      section(
        t('Identité'),
        `<div class="fields">
          ${fld(t('Identifiant'), inp('el', id, 'name', el.name))}
          ${fld(t('Nom affiché'), inp('el', id, 'title', p.title))}
          ${textureField('el', id, 'texture', p.texture, t("Image d'inventaire"))}
        </div>`
      ) +
      section(
        t('Caractéristiques'),
        `<div class="fields">
          ${fld(t("Type d'outil"), sel('el', id, 'kind', p.kind, G.TOOL_KINDS.map(([v, l]) => [v, t(l)])))}
          ${fld(
            t('Matériau'),
            sel('el', id, 'material', p.material, Object.entries(G.TOOL_MATERIALS).map(([k, v]) => [k, t(v.label)])),
            { hint: t('Changer de matériau met à jour les valeurs ci-dessous.') }
          )}
          ${fld(t('Utilisations'), inp('el', id, 'uses', p.uses, { type: 'number', min: 1 }))}
          ${fld(t('Dégâts'), inp('el', id, 'damage', p.damage, { type: 'number', min: 0 }))}
          ${fld(t('Niveau max (maxlevel)'), inp('el', id, 'maxlevel', p.maxlevel, { type: 'number', min: 1, max: 3 }))}
          ${fld(t('Intervalle de frappe'), inp('el', id, 'punch', p.punch, { type: 'number', min: 0.1, step: 0.1 }))}
        </div>`
      ) +
      section(t('Groupes'), `<div class="fields">${fld(t('Groupes'), inp('el', id, 'groups', p.groups), { full: true })}</div>`)
    );
  }

  function craftSections(el) {
    const p = el.props;
    const id = el.id;
    let recipeBody = '';
    if (p.kind === 'cooking') {
      recipeBody = `<div class="fields">
        ${fld(t('Ingrédient'), inp('el', id, 'input', p.input, { placeholder: 'default:iron_lump', list: 'items-datalist' }))}
        ${fld(t('Temps de cuisson'), inp('el', id, 'cooktime', p.cooktime, { type: 'number', min: 1 }))}
      </div>`;
    } else if (p.kind === 'shapeless') {
      recipeBody = `<div class="fields">
        ${fld(t('Ingrédients (un par ligne)'), ta('el', id, 'shapeless', p.shapeless, { placeholder: 'default:stick\ndefault:coal_lump' }), { full: true })}
      </div>`;
    } else {
      const cells = (p.grid || []).map(
        (v, i) =>
          `<input data-scope="el" data-id="${id}" data-field="grid.${i}" value="${esc(v)}" placeholder="${esc(t('vide'))}" list="items-datalist" />`
      );
      recipeBody = `<div class="craft-side">
        <div class="craft-grid">${cells.join('')}</div>
        <div class="field" style="flex:1;min-width:180px">
          <label>${t('Disposition')}</label>
          <div class="hint">${t('Cases vides autorisées. Les lignes et colonnes vides sont retirées à la génération.<br><br>Utilisez des identifiants complets, ex. {code}.', {
            code: '<code>default:stick</code>',
          })}</div>
        </div>
      </div>`;
    }

    return (
      section(
        t('Recette'),
        `<div class="fields">
          ${fld(t('Identifiant'), inp('el', id, 'name', el.name))}
          ${fld(t('Nom'), inp('el', id, 'title', p.title))}
          ${fld(
            t('Type'),
            sel('el', id, 'kind', p.kind, [
              ['shaped', t('Avec forme (grille 3×3)')],
              ['shapeless', t('Sans forme')],
              ['cooking', t('Cuisson')],
            ]),
            { full: true }
          )}
        </div>
        <div style="height:12px"></div>
        ${recipeBody}`,
        true
      ) +
      section(
        t('Résultat'),
        `<div class="fields">
          ${fld(t('Objet produit'), inp('el', id, 'output', p.output, { placeholder: 'mymod:mon_item', list: 'items-datalist' }), {
            full: true,
            hint: t("Identifiant complet, éventuellement suivi d'une quantité : {code}.", { code: '<code>mymod:item 2</code>' }),
          })}
        </div>`,
        true
      )
    );
  }

  /* ------------------------------------------------------------------ */
  /* éditeur de formspec                                                 */
  /* ------------------------------------------------------------------ */

  function formspecEditorHtml(el) {
    const p = el.props;
    const id = el.id;
    const adds = Object.entries(P.FS_COMPONENTS)
      .map(
        ([type, def]) =>
          `<button type="button" data-action="add-fs-comp" data-type="${type}" title="${esc(t(def.title))}">${esc(t(def.label))}</button>`
      )
      .join('');

    return `${editorHead(el, 'Formspec')}
      <div class="section" style="margin-bottom:14px">
        <h4>${t('Interface')}</h4>
        <div class="fields">
          ${fld(t('Identifiant'), inp('el', id, 'name', el.name))}
          ${fld(t('Titre'), inp('el', id, 'title', p.title))}
          ${fld(t('Largeur (unités)'), inp('el', id, 'width', p.width, { type: 'number', min: 2, max: 30, step: 0.5 }))}
          ${fld(t('Hauteur (unités)'), inp('el', id, 'height', p.height, { type: 'number', min: 2, max: 30, step: 0.5 }))}
          ${fld(
            t('Couleur de fond'),
            `<div class="inline-row">
              <input type="color" data-scope="el" data-id="${id}" data-field="bgcolor" value="${esc(p.bgcolor || '#202020')}" style="width:42px;height:28px;padding:0;border:1px solid #35373d;background:#17181a;border-radius:4px" />
              <input type="text" class="grow" data-scope="el" data-id="${id}" data-field="bgcolor" value="${esc(p.bgcolor || '#202020')}" />
            </div>`,
            { full: true, hint: t('Équivalent de {code}.', { code: '<code>bgcolor[#couleur;false]</code>' }) }
          )}
        </div>
      </div>
      <div class="fs-layout">
        <div class="fs-stage-wrap">
          <div class="fs-stage-head">
            <span class="ws-sub">${t('Glissez pour placer · poignée en bas à droite pour redimensionner')}</span>
            <span class="spacer"></span>
            <span class="ws-sub">${t('1 unité = {n} px', { n: FS_UNIT })}</span>
          </div>
          <div class="fs-stage-scroll"><div class="fs-stage" id="fs-stage"></div></div>
        </div>
        <div>
          <div class="section" style="margin-bottom:12px">
            <h4>${t('Composants')}</h4>
            <div class="fs-comp-list" id="fs-comp-list"></div>
          </div>
          <div class="section">
            <h4>${t('Ajouter')}</h4>
            <div class="add-comp-grid">${adds}</div>
            <div class="hint" style="margin-top:4px">${t(
              "1. Ajoutez un composant · 2. Glissez-le sur la grille · 3. Réglez ses propriétés dans l'inspecteur."
            )}</div>
          </div>
        </div>
      </div>
      ${codePanel()}`;
  }

  function renderFsStage(el) {
    const stage = $('#fs-stage');
    if (!stage) return;
    const p = el.props;
    const width = Number(p.width) || 8;
    const height = Number(p.height) || 9;
    stage.style.setProperty('--unit', FS_UNIT + 'px');
    stage.style.width = Math.max(140, width * FS_UNIT) + 'px';
    stage.style.height = Math.max(140, height * FS_UNIT) + 'px';
    if (p.bgcolor) stage.style.background = p.bgcolor;
    const items = (p.components || []).map((c) => fsItemHtml(c, c.id === state.fsSelection)).join('');
    stage.innerHTML = `<div class="fs-grid"></div>${items}`;
  }

  function fsItemHtml(c, selected) {
    const unit = FS_UNIT;
    const w = Math.max(8, Number(c.w) * unit || 20);
    const h = Math.max(8, Number(c.h) * unit || 20);
    const style = `left:${(Number(c.x) || 0) * unit}px;top:${(Number(c.y) || 0) * unit}px;width:${w}px;height:${h}px`;
    const cls = ['fs-item'];
    let inner = '';
    let extra = '';

    switch (c.type) {
      case 'label':
        cls.push('fs-label');
        inner = esc(c.text);
        break;
      case 'vertlabel':
        cls.push('fs-label');
        extra = 'writing-mode:vertical-rl;';
        inner = esc(c.text);
        break;
      case 'button':
      case 'button_exit':
        cls.push('fs-btn');
        inner = esc(c.text);
        break;
      case 'image': {
        cls.push('fs-image');
        const url = P.textureUrl(state.project, c.tex);
        inner = url ? `<img src="${url}" alt="" />` : esc(c.tex || 'image');
        break;
      }
      case 'image_button': {
        cls.push('fs-btn');
        const url = P.textureUrl(state.project, c.tex);
        inner = `${url ? `<img src="${url}" alt="" style="max-width:60%;max-height:60%;image-rendering:pixelated;margin-right:4px" />` : ''}${esc(c.text)}`;
        break;
      }
      case 'item_image': {
        cls.push('fs-image');
        const url = itemTextureUrl(c.item);
        inner = url ? `<img src="${url}" alt="" />` : esc(c.item || 'item');
        break;
      }
      case 'box':
        cls.push('fs-box');
        extra = `background:${esc(c.color || '#000000')};`;
        inner = '';
        break;
      case 'list': {
        cls.push('fs-list');
        const cols = Math.max(1, Math.round(Number(c.w) || 1));
        extra = `grid-template-columns:repeat(${cols},1fr);border:1px solid rgba(0,0,0,.45);background:rgba(0,0,0,.25);`;
        inner = Array.from({ length: Math.max(1, Number(c.count) || cols) }, () => '<div class="fs-slot"></div>').join('');
        break;
      }
      case 'field':
        cls.push('fs-chrome', 'fs-wide');
        inner = `<span style="color:#4b4b4b">${esc(c.text || t('Champ'))}</span>`;
        break;
      case 'textlist':
        cls.push('fs-chrome', 'fs-wide');
        extra = 'align-items:flex-start;flex-direction:column;padding:3px 4px;';
        inner = String(c.items || '')
          .split('\n')
          .map((line) => `<span style="color:#4b4b4b;font-size:10px">${esc(line)}</span>`)
          .join('');
        break;
      case 'checkbox':
        inner = `<span style="display:flex;align-items:center;gap:5px;font-size:10px;color:#4b4b4b">
            <span style="width:11px;height:11px;border:1px solid #555;background:${c.selected ? '#8bc34a' : '#e6e6e6'};display:inline-block"></span>${esc(c.text)}</span>`;
        break;
      case 'dropdown':
        cls.push('fs-chrome', 'fs-wide');
        inner = `<span style="color:#4b4b4b">${esc(String(c.items || '').split('\n')[0] || t('Menu'))}</span><span style="margin-left:auto;color:#555">▾</span>`;
        extra = 'justify-content:flex-start;gap:4px;';
        break;
      default:
        inner = esc(c.type);
    }

    return `<div class="${cls.join(' ')} ${selected ? 'sel' : ''}" data-fs-comp="${c.id}" style="${style}${extra}">${inner}
      <span class="fs-handle" data-fs-resize="${c.id}" title="${esc(t('Redimensionner'))}"></span>
    </div>`;
  }

  function itemTextureUrl(itemstring) {
    const value = String(itemstring || '').trim();
    if (!value) return null;
    const el = state.project.elements.find(
      (e) => (e.type === 'block' || e.type === 'item' || e.type === 'tool') && registryName(e) === value
    );
    if (el) return P.elementTexture(el, state.project);
    return P.textureUrl(state.project, (value.split(':')[1] || value) + '.png');
  }

  function renderFsCompList(el) {
    const list = $('#fs-comp-list');
    if (!list) return;
    const comps = el.props.components || [];
    list.innerHTML = comps.length
      ? comps
          .map(
            (c) => `<div class="fs-comp ${c.id === state.fsSelection ? 'active' : ''}" data-action="select-fs-comp" data-id="${c.id}">
              <span class="kind">${esc(t((P.FS_COMPONENTS[c.type] || {}).label) || c.type)}</span>
              <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(c.text || c.name || '')}</span>
              <span class="nm">${c.x},${c.y}</span>
            </div>`
          )
          .join('')
      : `<div class="hint">${t('Aucun composant. Ajoutez-en avec les boutons ci-dessous.')}</div>`;
  }

  function formspecInspectorHtml(el) {
    const comp = (el.props.components || []).find((c) => c.id === state.fsSelection);
    if (!comp) {
      return `<div class="insp-section"><h5>${t('Formspec')}</h5>
        <div class="insp-note" style="padding:0">${t('Taille {w}×{h} unités, {n} composant(s).', {
          w: el.props.width,
          h: el.props.height,
          n: (el.props.components || []).length,
        })}<br><br>${t("Sélectionnez un composant dans l'aperçu ou dans la liste pour modifier ses propriétés.")}</div>
      </div>
      <div class="insp-section"><h5>${t('Ouverture en jeu')}</h5>
        <div class="insp-note" style="padding:0">${t(
          'Une commande {code} est générée. Vous pouvez aussi lier cette formspec à un bloc ou un item depuis son éditeur.',
          { code: `<code>/${esc(G.slug(state.project.meta.modName + '_' + el.name))}</code>` }
        )}</div>
      </div>`;
    }

    const id = comp.id;
    let fields = `<div class="fields">
      ${fld('X', inp('fs', id, 'x', comp.x, { type: 'number', step: 0.25 }))}
      ${fld('Y', inp('fs', id, 'y', comp.y, { type: 'number', step: 0.25 }))}
      ${fld(t('Largeur'), inp('fs', id, 'w', comp.w, { type: 'number', step: 0.25, min: 0.25 }))}
      ${fld(t('Hauteur'), inp('fs', id, 'h', comp.h, { type: 'number', step: 0.25, min: 0.25 }))}
    </div>`;

    if (['label', 'vertlabel', 'button', 'button_exit', 'image_button', 'field', 'textlist', 'checkbox', 'dropdown'].includes(comp.type)) {
      fields += `<div class="fields" style="margin-top:10px">
        ${fld(t('Texte'), inp('fs', id, 'text', comp.text), { full: true })}
      </div>`;
    }
    if (['button', 'button_exit', 'image_button', 'field', 'textlist', 'checkbox', 'dropdown'].includes(comp.type)) {
      fields += `<div class="fields" style="margin-top:10px">
        ${fld(t('Nom du champ'), inp('fs', id, 'name', comp.name), { full: true, hint: t('transmis à {code}', { code: '<code>on_player_receive_fields</code>' }) })}
      </div>`;
    }
    if (comp.type === 'image' || comp.type === 'image_button') {
      fields += `<div style="margin-top:10px">${textureField('fs', id, 'tex', comp.tex, t('Texture'))}</div>`;
    }
    if (comp.type === 'item_image') {
      fields += `<div class="fields" style="margin-top:10px">
        ${fld(t('Item'), inp('fs', id, 'item', comp.item, { list: 'items-datalist' }), { full: true })}
      </div>${itemsDatalist()}`;
    }
    if (comp.type === 'box') {
      fields += `<div class="fields" style="margin-top:10px">
        ${fld(t('Couleur'), `<div class="inline-row"><input type="color" data-scope="fs" data-id="${id}" data-field="color" value="${esc(comp.color || '#000000')}" style="width:42px;height:28px;padding:0;border:1px solid #35373d;background:#17181a;border-radius:4px" /><input class="grow" type="text" data-scope="fs" data-id="${id}" data-field="color" value="${esc(comp.color || '#000000')}" /></div>`, { full: true })}
      </div>`;
    }
    if (comp.type === 'list') {
      fields += `<div class="fields" style="margin-top:10px">
        ${fld(t('Inventaire'), sel('fs', id, 'inv', comp.inv, [['current_player', 'current_player'], ['context', 'context'], ['detached', 'detached']]))}
        ${fld(t('Nom de liste'), inp('fs', id, 'list', comp.list))}
        ${fld(t('Slots affichés'), inp('fs', id, 'count', comp.count, { type: 'number', min: 1 }))}
      </div>`;
    }
    if (comp.type === 'textlist' || comp.type === 'dropdown') {
      fields += `<div class="fields" style="margin-top:10px">
        ${fld(t('Entrées (une par ligne)'), ta('fs', id, 'items', comp.items), { full: true })}
      </div>`;
    }
    if (comp.type === 'field') {
      fields += `<div class="fields" style="margin-top:10px">
        ${fld(t('Valeur par défaut'), inp('fs', id, 'value', comp.value), { full: true })}
      </div>`;
    }
    if (comp.type === 'checkbox') {
      fields += `<div style="margin-top:10px">${chk('fs', id, 'selected', comp.selected, t('Cochée par défaut'))}</div>`;
    }

    return `<div class="insp-section">
        <h5>${t('Composant · {type}', { type: esc(t((P.FS_COMPONENTS[comp.type] || {}).label) || comp.type) })}</h5>
        ${fields}
      </div>
      <div class="insp-actions">
        <button type="button" data-action="duplicate-fs-comp" data-id="${id}">${t('Dupliquer ce composant')}</button>
        <button type="button" data-action="delete-fs-comp" data-id="${id}">${t('Supprimer ce composant')}</button>
      </div>
      <div class="insp-note">${t('Astuce : les coordonnées sont en unités formespec (comme {code}).', {
        code: '<code>label[0.5,0.6;…]</code>',
      })}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* inspecteur                                                          */
  /* ------------------------------------------------------------------ */

  function projectInspectorHtml() {
    const m = state.project.meta;
    return `<div class="insp-section">
        <h5>${t('Projet')}</h5>
        <div class="insp-note" style="padding:0 0 10px">${t(
          'Sélectionnez un élément dans la liste pour modifier ses propriétés ici.'
        )}</div>
        <div class="fields">
          ${fld(t('Identifiant du mod'), inp('meta', '', 'modName', m.modName), { full: true, hint: t('nom du dossier dans {path}', { path: '<code>mods/</code>' }) })}
          ${fld(t('Titre'), inp('meta', '', 'title', m.title), { full: true })}
          ${fld(t('Description'), ta('meta', '', 'description', m.description), { full: true })}
          ${fld(t('Auteur'), inp('meta', '', 'author', m.author), { full: true })}
          ${fld(t('Licence'), inp('meta', '', 'license', m.license), { full: true })}
          ${fld(t('Version'), inp('meta', '', 'version', m.version), { full: true })}
          ${fld(t('Dépendances'), ta('meta', '', 'depends', (m.depends || []).join(', ')), {
            full: true,
            hint: t('séparées par des virgules, ex. {code}', { code: '<code>default</code>' }),
          })}
          ${fld(t('Dépendances optionnelles'), ta('meta', '', 'optionalDepends', (m.optionalDepends || []).join(', ')), { full: true })}
        </div>
      </div>
      <div class="insp-section">
        <h5>${t('Contenu')}</h5>
        <dl class="kv">
          <dt>${t('Éléments')}</dt><dd>${state.project.elements.length}</dd>
          <dt>${t('Textures')}</dt><dd>${Object.keys(state.project.textures || {}).length}</dd>
          <dt>${t('Lignes de Lua')}</dt><dd>${G.genInit(state.project).split('\n').length}</dd>
        </dl>
      </div>
      <div class="insp-actions">
        <button type="button" data-action="export-zip">${t('Exporter le mod en ZIP')}</button>
        <button type="button" data-action="view-code">${t('Voir le code généré')}</button>
        <button type="button" data-action="load-sample">${t("Charger le projet d'exemple")}</button>
      </div>
      <div class="insp-note">${t(
        "Les modifications sont enregistrées automatiquement dans ce navigateur. L'export ZIP crée un dossier {folder} avec {conf}, {init} et les textures.",
        {
          folder: `<code>${esc(m.modName)}/</code>`,
          conf: '<code>mod.conf</code>',
          init: '<code>init.lua</code>',
        }
      )}</div>`;
  }

  function elementInspectorHtml(el) {
    const url = P.elementTexture(el, state.project);
    const p = el.props;
    let rows = '';
    if (el.type === 'block') {
      rows = `<dt>${t('Texture')}</dt><dd>${esc(p.texSide || p.texTop || '—')}</dd>
        <dt>${t('Groupes')}</dt><dd>${esc(p.groups || '—')}</dd>
        <dt>${t('Minage')}</dt><dd>${p.diggable ? t('oui') : t('non')}</dd>`;
    } else if (el.type === 'item') {
      rows = `<dt>${t('Texture')}</dt><dd>${esc(p.texture || '—')}</dd>
        <dt>${t('Pile')}</dt><dd>${esc(p.stackMax)}</dd>`;
    } else if (el.type === 'tool') {
      rows = `<dt>${t('Type')}</dt><dd>${esc(t((G.TOOL_KINDS.find((k) => k[0] === p.kind) || [, p.kind])[1]))}</dd>
        <dt>${t('Matériau')}</dt><dd>${esc(t((G.TOOL_MATERIALS[p.material] || {}).label || p.material))}</dd>
        <dt>${t('Dégâts')}</dt><dd>${esc(p.damage)}</dd>`;
    } else if (el.type === 'craft') {
      rows = `<dt>${t('Type')}</dt><dd>${esc(p.kind)}</dd>
        <dt>${t('Résultat')}</dt><dd>${esc(p.output || '—')}</dd>`;
    }
    return `<div class="insp-section">
        <h5>${t('Aperçu')}</h5>
        <div class="insp-preview">
          <div class="pic">${url ? `<img src="${url}" alt="" />` : esc(t(P.TYPES[el.type].glyph))}</div>
          <div class="who">
            <b>${esc(p.title || el.name)}</b>
            <span>${esc(t(P.TYPES[el.type].label))}</span>
          </div>
        </div>
        <dl class="kv">
          <dt>${t('Registre')}</dt><dd>${esc(registryName(el))}</dd>
          ${rows}
        </dl>
      </div>
      <div class="insp-section">
        <h5>${t('Résumé')}</h5>
        <div class="insp-note" style="padding:0">${esc(elementSummary(el))}</div>
      </div>
      <div class="insp-actions">
        <button type="button" data-action="duplicate-element" data-id="${el.id}">${t("Dupliquer l'élément")}</button>
        <button type="button" data-action="open-textures">${t('Gérer les textures')}</button>
        <button type="button" data-action="view-code">${t('Code du mod complet')}</button>
      </div>`;
  }

  function texturesInspectorHtml() {
    const textures = Object.entries(state.project.textures || {});
    const size = textures.reduce((sum, [, url]) => sum + url.length, 0);
    return `<div class="insp-section">
        <h5>${t('Textures')}</h5>
        <dl class="kv">
          <dt>${t('Fichiers')}</dt><dd>${textures.length}</dd>
          <dt>${t('Poids des données')}</dt><dd>${(size / 1024 / 1024).toFixed(2)} Mio</dd>
          <dt>${t("Dossier d'export")}</dt><dd>textures/</dd>
        </dl>
      </div>
      <div class="insp-actions">
        <button type="button" data-action="upload-texture">${t('Importer des images')}</button>
        <button type="button" data-action="texture-editor">${t('Éditeur de texture')}</button>
      </div>
      <div class="insp-note">${t('Formats acceptés : PNG, JPEG, WebP et GIF. Pour un rendu net dans Luanti, préférez des PNG de 16×16 ou 32×32 pixels.')}</div>`;
  }

  function codeInspectorHtml() {
    return `<div class="insp-section">
        <h5>${t('Fichiers générés')}</h5>
        <dl class="kv">
          ${state.files
            .map((f) => `<dt>${esc(f.path.split('/').pop())}</dt><dd>${plural(f.text.split('\n').length, '{n} ligne', '{n} lignes')}</dd>`)
            .join('')}
          <dt>${t('Textures')}</dt><dd>${Object.keys(state.project.textures || {}).length}</dd>
        </dl>
      </div>
      <div class="insp-actions">
        <button type="button" data-action="export-zip">${t('Exporter le mod en ZIP')}</button>
      </div>
      <div class="insp-note">${t(
        "Le fichier {init} regroupe formspecs, blocs, items, outils puis recettes, dans cet ordre : les fonctions de formspec sont définies avant les nœuds qui les appellent.",
        { init: '<code>init.lua</code>' }
      )}</div>`;
  }

  /* ------------------------------------------------------------------ */
  /* textures                                                            */
  /* ------------------------------------------------------------------ */

  function texturesHtml() {
    const textures = Object.entries(state.project.textures || {});
    const prefix = G.slug(state.project.meta.modName) + '_';
    return `<div class="workspace-head">
        <div>
          <div class="ws-title">${t('Textures')}</div>
          <div class="ws-sub">${t('{n} fichier(s) · exportés dans {prefix}', {
            n: textures.length,
            prefix: `<code>${esc(prefix)}…</code>`,
          })}</div>
        </div>
        <div class="spacer"></div>
        <button type="button" class="tbtn accent" data-action="upload-texture">${t('Importer des images')}</button>
      </div>
      <div class="dropzone" id="tex-dropzone">
        <strong>${t('Glissez des images ici')}</strong>
        <p>${t('ou utilisez « Importer des images » · PNG, JPEG, WebP, GIF')}</p>
      </div>
      ${
        textures.length
          ? `<div class="tex-grid">${textures
              .map(
                ([name, url]) => `<div class="tex-card">
                  <div class="thumb"><img src="${url}" alt="" /></div>
                  <div class="info">
                    <div class="tname" title="${esc(name)}">${esc(name)}</div>
                    <div class="tsize">${textureSizeLabel(url)}</div>
                  </div>
                  <div class="tacts">
                    <button type="button" data-action="copy-texture-name" data-name="${esc(name)}">${t('Copier')}</button>
                    <button type="button" data-action="delete-texture" data-name="${esc(name)}">${t('Supprimer')}</button>
                  </div>
                </div>`
              )
              .join('')}</div>`
          : `<div class="empty"><h3>${t('Aucune texture importée')}</h3><p>${t(
              'Ajoutez vos images : elles seront copiées dans le dossier {path} du ZIP exporté. Vous pouvez aussi référencer les textures du mod {default}.',
              { path: '<code>textures/</code>', default: '<code>default</code>' }
            )}</p></div>`
      }
      <div class="empty" style="margin-top:18px">
        <h3>${t('Éditeur de texture')}</h3>
        <p>${t(
          'Le dessin de textures directement dans MTC creator (pinceau, calques, motifs) est prévu pour une prochaine version. En attendant, importez vos PNG ou utilisez les textures de {default}.',
          { default: '<code>default</code>' }
        )}</p>
        <div class="row"><button type="button" class="tbtn" data-action="texture-editor">${t('En savoir plus')}</button></div>
      </div>`;
  }

  function textureSizeLabel(url) {
    return `${Math.max(1, Math.round((url.length * 0.75) / 1024))} ${t('Ko')}`;
  }

  function bindTextureDrop() {
    const zone = $('#tex-dropzone');
    if (!zone) return;
    ['dragenter', 'dragover'].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add('drag');
      })
    );
    ['dragleave', 'drop'].forEach((evt) =>
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.remove('drag');
      })
    );
    zone.addEventListener('drop', (e) => {
      const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
      if (files.length) uploadTextures(files);
    });
  }

  async function uploadTextures(files) {
    let count = 0;
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await readFileAsDataUrl(file);
        P.addTexture(state.project, P.modTextureName(state.project, file.name), dataUrl);
        count++;
      } catch (err) {
        log(t('Impossible de lire {name}.', { name: file.name }), 'err');
      }
    }
    if (count) {
      log(t('{n} texture(s) importée(s).', { n: count }), 'ok');
      toast(t('{n} texture(s) importée(s).', { n: count }));
      scheduleSave();
      render();
    }
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /* ------------------------------------------------------------------ */
  /* vue code                                                            */
  /* ------------------------------------------------------------------ */

  function codeHtml() {
    state.files = G.files(state.project);
    const textures = Object.keys(state.project.textures || {});
    return `<div class="workspace-head">
        <div>
          <div class="ws-title">${t('Code généré')}</div>
          <div class="ws-sub">${t('Aperçu de ce que contiendra le ZIP exporté')}</div>
        </div>
        <div class="spacer"></div>
        <button type="button" class="tbtn accent" data-action="export-zip">${t('Exporter le ZIP')}</button>
      </div>
      <div class="code-view">
        ${state.files
          .map(
            (f) => `<div class="file-block">
              <div class="file-head">
                <span class="fname">${esc(f.path)}</span>
                <span class="spacer"></span>
                <button type="button" data-action="copy-code" data-path="${esc(f.path)}">${t('Copier')}</button>
                <button type="button" data-action="download-code" data-path="${esc(f.path)}">${t('Télécharger')}</button>
              </div>
              <pre class="code">${highlightLua(f.text)}</pre>
            </div>`
          )
          .join('')}
        <div class="file-block">
          <div class="file-head"><span class="fname">textures/</span><span class="spacer"></span><span class="ws-sub">${plural(
            textures.length,
            '{n} fichier',
            '{n} fichiers'
          )}</span></div>
          <pre class="code">${textures.length ? textures.map((name) => esc(prefixPath(name))).join('\n') : t('Aucune texture pour le moment.')}</pre>
        </div>
      </div>`;
  }

  function prefixPath(name) {
    return `${state.project.meta.modName}/textures/${name}`;
  }

  /* ------------------------------------------------------------------ */
  /* aperçu du code d'un élément                                         */
  /* ------------------------------------------------------------------ */

  function refreshCodePreview() {
    const pre = document.getElementById('elem-code');
    if (!pre) return;
    const el = activeElement();
    if (!el) return;
    pre.innerHTML = highlightLua(G.genElement(el, state.project));
  }

  /* ------------------------------------------------------------------ */
  /* navigation                                                          */
  /* ------------------------------------------------------------------ */

  function openElement(id) {
    const el = P.find(state.project, id);
    if (!el) return;
    state.active = { kind: 'element', id };
    if (!state.tabs.some((t) => t.kind === 'element' && t.id === id)) state.tabs.push({ kind: 'element', id });
    if (el.type === 'formspec') {
      state.fsSelection = (el.props.components || [])[0]?.id || null;
    } else {
      state.fsSelection = null;
    }
    render();
  }

  function openSpecial(kind) {
    state.active = { kind };
    if (!state.tabs.some((t) => t.kind === kind)) state.tabs.push({ kind });
    if (kind !== 'textures') state.fsSelection = null;
    render();
  }

  function closeTab(kind, id) {
    state.tabs = state.tabs.filter((t) => !(t.kind === kind && t.id === id));
    if (state.active.kind === kind && (id == null || state.active.id === id)) {
      const last = state.tabs[state.tabs.length - 1];
      state.active = last ? (last.kind === 'element' ? { kind: 'element', id: last.id } : { kind: last.kind }) : { kind: 'workspace' };
    }
    render();
  }

  function gotoTab(kind, id) {
    if (kind === 'element') {
      if (!P.find(state.project, id)) return;
      state.active = { kind: 'element', id };
      state.fsSelection = null;
    } else {
      state.active = { kind };
    }
    render();
  }

  /* ------------------------------------------------------------------ */
  /* modales                                                             */
  /* ------------------------------------------------------------------ */

  function openModal(opts) {
    els.modalRoot.innerHTML = `<div class="modal-back" data-action="close-modal"></div>
      <div class="modal ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">
        <div class="modal-head">${esc(opts.title)}<button type="button" class="x" data-action="close-modal" title="${esc(t('Fermer'))}">×</button></div>
        <div class="modal-body">${opts.body || ''}</div>
        ${opts.footer ? `<div class="modal-foot">${opts.footer}</div>` : ''}
      </div>`;
    els.modalRoot.classList.add('open');
  }

  function closeModal() {
    els.modalRoot.classList.remove('open');
    els.modalRoot.innerHTML = '';
    state.confirm = null;
  }

  function askConfirm(title, message, confirmLabel, onConfirm) {
    state.confirm = onConfirm;
    openModal({
      title,
      body: `<p>${message}</p>`,
      footer: `<button type="button" data-action="close-modal">${t('Annuler')}</button>
        <button type="button" class="primary" data-action="confirm-dialog">${esc(confirmLabel)}</button>`,
    });
  }

  function shotPreviewHtml() {
    return state.pendingScreenshot ? `<img src="${state.pendingScreenshot}" alt="" />` : `<span>${t('Aucune image')}</span>`;
  }

  function uniqueModName(base) {
    const used = new Set(
      P.library()
        .map((entry) => (((entry.project || {}).meta) || {}).modName)
        .filter(Boolean)
    );
    let name = base;
    let i = 2;
    while (used.has(name)) name = `${base}_${i++}`;
    return name;
  }

  function imageToScreenshot(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error || new Error('read'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('decode'));
        img.onload = () => {
          const W = 640;
          const H = 360;
          const canvas = document.createElement('canvas');
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#1f2023';
          ctx.fillRect(0, 0, W, H);
          const scale = Math.max(W / (img.width || W), H / (img.height || H));
          const w = (img.width || W) * scale;
          const h = (img.height || H) * scale;
          ctx.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
          try {
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch (e) {
            resolve(reader.result);
          }
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function newProjectDialog() {
    P.save(state.project);
    state.pendingScreenshot = '';
    openModal({
      title: t('Nouveau projet'),
      body: `<p>${t(
        'Choisissez un nom, une description et une capture d’écran. Le dossier du mod est déduit du nom.'
      )}</p>
        <div class="fields">
          ${fld(
            t('Nom du projet'),
            `<input type="text" id="np-title" value="${esc(t('Mon mod'))}" placeholder="${esc(t('Mon premier mod'))}" />`,
            { full: true }
          )}
          ${fld(
            t('Description'),
            `<textarea id="np-desc" placeholder="${esc(t('Décrivez votre mod en une phrase.'))}"></textarea>`,
            { full: true }
          )}
          ${fld(
            t('Capture d’écran'),
            `<div class="shot-picker">
              <div class="shot-preview" id="np-shot-preview">${shotPreviewHtml()}</div>
              <div class="shot-actions">
                <button type="button" class="tbtn" data-action="pick-screenshot">${t('Choisir une image…')}</button>
                <button type="button" class="link-btn" data-action="clear-screenshot">${t('Retirer')}</button>
                <div class="hint">${t('PNG, JPG ou WebP. L’image est recadrée en 16:9 (640 px de large).')}</div>
              </div>
            </div>`,
            { full: true }
          )}
        </div>
        <div class="hint" id="np-slug" style="margin-top:10px">${t('Dossier du mod : {path}', {
          path: '<code>mymod</code>',
        })}</div>`,
      footer: `<button type="button" data-action="close-modal">${t('Annuler')}</button>
        <button type="button" class="primary" data-action="create-project">${t('Créer le projet')}</button>`,
    });
    setTimeout(() => {
      const titleInput = document.getElementById('np-title');
      const hint = document.getElementById('np-slug');
      const updateSlug = () => {
        if (!hint || !titleInput) return;
        hint.innerHTML = t('Dossier du mod : {path}', {
          path: `<code>${esc(G.slug(titleInput.value) || 'mymod')}</code>`,
        });
      };
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
        titleInput.addEventListener('input', updateSlug);
      }
      updateSlug();
    }, 30);
  }

  function helpDialog() {
    openModal({
      title: t('Fonctionnement & export'),
      wide: true,
      body: `<h3>${t('Construire un mod')}</h3>
        <ul>
          ${t("<li><b>Blocs</b> : texture(s), sons, groupes de minage, lumière, drop, et ouverture d'une formspec au clic droit.</li>")}
          ${t("<li><b>Items</b> : image d'inventaire, taille de pile, groupes, ouverture d'une formspec à l'utilisation.</li>")}
          ${t("<li><b>Outils</b> : type, matériau, utilisations, dégâts — les <code>tool_capabilities</code> sont générées comme dans <code>default</code>.</li>")}
          ${t('<li><b>Recettes</b> : avec forme (grille 3×3), sans forme, ou cuisson.</li>')}
          ${t("<li><b>Formspecs</b> : éditeur visuel par glisser-déposer, génération d'une fonction et d'une commande de test.</li>")}
        </ul>
        <h3>${t('Textures')}</h3>
        <p>${t('Importez vos PNG : chaque fichier est exporté dans <code>textures/</code> et référencé par son nom exact (préfixe du mod compris). Les textures du mod <code>default</code> restent utilisables telles quelles.')}</p>
        <h3>${t('Export ZIP')}</h3>
        ${t(
          '<p>Le ZIP contient un dossier <code>&lt;mod&amp;gt;/</code> avec <code>mod.conf</code>, <code>init.lua</code> et <code>textures/</code>. Copiez ce dossier (ou le ZIP) dans <code>mods/</code>, activez le mod dans un monde, puis testez la commande indiquée par chaque formspec.</p>'
        )}
        <h3>${t('Import')}</h3>
        ${t(
          '<p>« Importer un mod existant » lit un ZIP ou un dossier de mod : <code>mod.conf</code>, textures et définitions <code>register_node</code>, <code>register_craftitem</code>, <code>register_tool</code>, <code>register_craft</code> sont convertis en éléments éditables. L\'analyse du Lua est volontairement simple : les définitions très dynamiques peuvent être partiellement reprises.</p>'
        )}
        <h3>${t('Raccourcis')}</h3>
        ${t("<p><code>Ctrl+S</code> enregistre le projet dans le navigateur. L'export ZIP reste le moyen d'obtenir un mod jouable.</p>")}`,
      footer: `<button type="button" class="primary" data-action="close-modal">${t('Fermer')}</button>`,
    });
  }

  function textureEditorDialog() {
    openModal({
      title: t('Éditeur de texture'),
      body: `<p>${t(
        "L'éditeur de texture (pinceau, calques, motifs, export PNG) sera ajouté dans une prochaine version de MTC creator."
      )}</p>
        <p>${t(
          'En attendant, vous pouvez importer vos images avec « Importer des images » : elles sont stockées dans le projet et incluses dans le ZIP.'
        )}</p>`,
      footer: `<button type="button" data-action="close-modal">${t('Compris')}</button>`,
    });
  }

  /* ------------------------------------------------------------------ */
  /* import / export                                                     */
  /* ------------------------------------------------------------------ */

  function chooseFile({ accept, directory, onFiles }) {
    const input = els.fileInput;
    input.value = '';
    input.accept = accept || '';
    if (directory) input.setAttribute('webkitdirectory', 'true');
    else input.removeAttribute('webkitdirectory');
    input.onchange = async () => {
      const files = Array.from(input.files || []);
      const picked = files[0]?.webkitRelativePath || files[0]?.name || 'le fichier';
      if (!files.length) return;
      await onFiles(files, picked);
    };
    input.click();
  }

  async function importZip(files) {
    const file = files[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const entries = await MTC.zip.read(buffer);
      const project = P.importFromEntries(entries, file.name);
      confirmImport(project, file.name);
    } catch (err) {
      log(t('Import ZIP impossible : {msg}', { msg: err.message }), 'err');
      toast(t('Import impossible : {msg}', { msg: err.message }), 'err');
    }
  }

  async function importFolder(files) {
    try {
      const entries = [];
      for (const file of files) {
        entries.push({
          name: file.webkitRelativePath || file.name,
          data: new Uint8Array(await file.arrayBuffer()),
        });
      }
      const project = P.importFromEntries(entries, files[0]?.webkitRelativePath?.split('/')[0] || 'mod');
      confirmImport(project, files[0]?.webkitRelativePath?.split('/')[0] || t('dossier importé'));
    } catch (err) {
      log(t('Import du dossier impossible : {msg}', { msg: err.message }), 'err');
      toast(t('Import impossible : {msg}', { msg: err.message }), 'err');
    }
  }

  function confirmImport(project, source) {
    const counts = Object.keys(P.TYPES)
      .map((type) => [type, project.elements.filter((e) => e.type === type).length])
      .filter(([, n]) => n > 0)
      .map(([type, n]) => `${n} ${t(P.TYPES[type].plural).toLowerCase()}`)
      .join(', ');
    askConfirm(
      t('Importer ce mod ?'),
      t('« {name} » contient {counts} et {n} texture(s).<br><br>Le projet actuel sera remplacé.', {
        name: esc(source),
        counts: counts || t('aucun élément reconnu'),
        n: Object.keys(project.textures).length,
      }),
      t('Remplacer le projet'),
      () => {
        P.save(state.project);
        state.project = project;
        state.tabs = [];
        state.active = { kind: 'workspace' };
        state.fsSelection = null;
        P.adopt(state.project, {
          title: state.project.meta.title,
          description: state.project.meta.description,
        });
        stampSave(true);
        render();
        log(
          t('Mod importé depuis {source} : {n} élément(s), {m} texture(s).', {
            source,
            n: project.elements.length,
            m: Object.keys(project.textures).length,
          }),
          'ok'
        );
        toast(t('Mod importé'));
      }
    );
  }

  /* Construit le ZIP du mod sans le télécharger. */
  async function buildModZip(project) {
    const added = P.ensureDependencies(project);
    if (added.length) {
      log(t('Dépendance(s) ajoutée(s) automatiquement : {list}.', { list: added.join(', ') }), 'warn');
    }
    const files = await P.buildModFiles(project);
    return { files, blob: await MTC.zip.write(files) };
  }

  async function exportModZip(project) {
    return (await buildModZip(project)).blob;
  }

  async function exportZip() {
    const project = state.project;
    try {
      if (!project.elements.length) log(t('Le projet ne contient aucun élément : le ZIP sera presque vide.'), 'warn');
      const missing = P.missingTextures(project);
      if (missing.length) log(t('Textures référencées mais absentes du projet : {list}.', { list: missing.join(', ') }), 'warn');
      const { blob, files } = await buildModZip(project);
      download(blob, `${G.slug(project.meta.modName) || 'mymod'}.zip`);
      log(t('ZIP exporté : {n} fichier(s), {size} Ko.', { n: files.length, size: (blob.size / 1024).toFixed(1) }), 'ok');
      toast(t('Mod exporté en ZIP'));
      render();
    } catch (err) {
      log(t('Export impossible : {msg}', { msg: err.message }), 'err');
      toast(t('Export impossible : {msg}', { msg: err.message }), 'err');
    }
  }

  function exportProjectJson() {
    const payload = {
      format: 'mtc-creator-project',
      formatVersion: 1,
      savedAt: new Date().toISOString(),
      project: state.project,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    download(blob, `${G.slug(state.project.meta.modName) || 'mymod'}.mtc.json`);
    log(t('Projet exporté en .mtc.json.'), 'ok');
    toast(t('Projet exporté'));
  }

  async function openProjectJson(files) {
    const file = files[0];
    if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      const project = data.project || data;
      if (!project.meta || !Array.isArray(project.elements)) throw new Error(t('Format de projet non reconnu.'));
      P.save(state.project);
      state.project = project;
      state.project.meta.depends = state.project.meta.depends || ['default'];
      state.project.meta.optionalDepends = state.project.meta.optionalDepends || [];
      state.tabs = [];
      state.active = { kind: 'workspace' };
      P.adopt(state.project, {
        title: state.project.meta.title,
        description: state.project.meta.description,
      });
      render();
      log(t('Projet ouvert : {name}.', { name: file.name }), 'ok');
      toast(t('Projet ouvert'));
    } catch (err) {
      log(t('Ouverture impossible : {msg}', { msg: err.message }), 'err');
      toast(t('Fichier de projet invalide'), 'err');
    }
  }

  /* ------------------------------------------------------------------ */
  /* formulaire : lecture des champs                                     */
  /* ------------------------------------------------------------------ */

  function applyField(target) {
    const { scope, field, id } = target.dataset;
    let value = target.type === 'checkbox' ? target.checked : target.value;
    if (target.type === 'number') value = value === '' ? '' : Number(value);

    if (scope === 'meta') {
      if (field === 'depends' || field === 'optionalDepends') state.project.meta[field] = parseList(value);
      else if (field === 'modName') state.project.meta.modName = G.slug(value) || 'mymod';
      else state.project.meta[field] = value;
    } else if (scope === 'el') {
      const el = P.find(state.project, id);
      if (!el) return;
      if (field === 'name') {
        el.name = G.slug(value) || 'element';
      } else {
        setPath(el.props, field, value);
      }
      if (field === 'material' && el.type === 'tool') {
        const preset = G.TOOL_MATERIALS[value];
        if (preset) {
          el.props.uses = preset.uses;
          el.props.damage = preset.damage;
          el.props.maxlevel = preset.maxlevel;
          el.props.punch = 0.9;
        }
      }
      if (field === 'tilesMode') {
        if (value === 'all' && !el.props.texTop) el.props.texTop = el.props.texSide || '';
        if (value === 'per-face' && el.props.texTop) {
          el.props.texSide = el.props.texSide || el.props.texTop;
          el.props.texBottom = el.props.texBottom || el.props.texTop;
        }
      }
    } else if (scope === 'fs') {
      const el = activeElement();
      if (!el || el.type !== 'formspec') return;
      const comp = (el.props.components || []).find((c) => c.id === id);
      if (!comp) return;
      setPath(comp, field, value);
    }

    scheduleSave();
    if (scope === 'fs') {
      const el = activeElement();
      if (el) {
        renderFsStage(el);
        renderFsCompList(el);
      }
    } else {
      refreshCodePreview();
    }
  }

  /* ------------------------------------------------------------------ */
  /* glisser-déposer dans l'éditeur de formspec                          */
  /* ------------------------------------------------------------------ */

  function onStagePointerDown(e) {
    if (state.active.kind !== 'element') return;
    const el = activeElement();
    if (!el || el.type !== 'formspec') return;
    const handle = e.target.closest('[data-fs-resize]');
    const item = e.target.closest('[data-fs-comp]');
    if (!item) return;
    const comp = (el.props.components || []).find((c) => c.id === item.dataset.fsComp);
    if (!comp) return;

    state.fsSelection = comp.id;
    state.drag = {
      mode: handle ? 'resize' : 'move',
      id: comp.id,
      startX: e.clientX,
      startY: e.clientY,
      x: Number(comp.x) || 0,
      y: Number(comp.y) || 0,
      w: Number(comp.w) || 1,
      h: Number(comp.h) || 1,
    };
    $$('.fs-item', els.viewhost).forEach((node) => node.classList.toggle('sel', node.dataset.fsComp === comp.id));
    $$('.fs-comp', els.viewhost).forEach((node) => node.classList.toggle('active', node.dataset.id === comp.id));
    renderInspector();
    e.preventDefault();
  }

  function onPointerMove(e) {
    const drag = state.drag;
    if (!drag) return;
    const el = activeElement();
    if (!el) return;
    const comp = (el.props.components || []).find((c) => c.id === drag.id);
    if (!comp) return;
    const snap = (v) => Math.round(v * 4) / 4;
    const dx = (e.clientX - drag.startX) / FS_UNIT;
    const dy = (e.clientY - drag.startY) / FS_UNIT;
    const maxW = Number(el.props.width) || 8;
    const maxH = Number(el.props.height) || 9;

    if (drag.mode === 'move') {
      comp.x = Math.min(Math.max(0, snap(drag.x + dx)), Math.max(0, maxW - comp.w));
      comp.y = Math.min(Math.max(0, snap(drag.y + dy)), Math.max(0, maxH - comp.h));
    } else {
      comp.w = Math.min(Math.max(0.25, snap(drag.w + dx)), maxW - comp.x);
      comp.h = Math.min(Math.max(0.25, snap(drag.h + dy)), maxH - comp.y);
    }

    const node = els.viewhost.querySelector(`.fs-item[data-fs-comp="${comp.id}"]`);
    if (node) {
      node.style.left = comp.x * FS_UNIT + 'px';
      node.style.top = comp.y * FS_UNIT + 'px';
      node.style.width = Math.max(8, comp.w * FS_UNIT) + 'px';
      node.style.height = Math.max(8, comp.h * FS_UNIT) + 'px';
    }
    const resizer = node && node.querySelector('.fs-handle');
    if (resizer) resizer.setAttribute('data-fs-resize', comp.id);
    scheduleSave();
  }

  function onPointerUp() {
    if (!state.drag) return;
    state.drag = null;
    const el = activeElement();
    if (el) {
      renderFsCompList(el);
      renderInspector();
      refreshCodePreview();
    }
  }

  /* ------------------------------------------------------------------ */
  /* lancer le jeu (iframe Luanti hébergée)                              */
  /* ------------------------------------------------------------------ */

  const LUANTI_URL = 'https://aml-s9xx-box.taildd440a.ts.net/luanti/';
  const game = { ready: false, pending: null, sent: false };

  /* Nom du dossier du mod dans mods/ : [a-z0-9_], sans « _ » initial, 1 à 64 caractères.
     G.slug donne le même nom que le dossier du ZIP exporté. */
  function modDir(name) {
    const clean = G.slug(name)
      .slice(0, 64)
      .replace(/_+$/, '');
    return clean || 'mymod';
  }

  /* Nom du monde : tirets conservés, ni « / » ni « \ », sans point initial, 1 à 200 caractères. */
  function worldName(name) {
    const clean = String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]+/g, '_')
      .replace(/^[._-]+/, '')
      .replace(/_+/g, '_')
      .slice(0, 200)
      .replace(/[_-]+$/, '');
    return clean || 'monde';
  }

  function gameFrame() {
    return document.getElementById('luanti-game');
  }

  function gameStatus(message, kind) {
    const node = document.getElementById('luanti-status');
    if (node) {
      node.textContent = message;
      node.className = 'game-status' + (kind ? ' ' + kind : '');
    }
    const retry = document.getElementById('luanti-retry');
    if (retry) retry.hidden = kind !== 'err';
  }

  /* Le moteur (WASM multi-thread) ne démarre que dans une page cross-origin isolated :
     COOP: same-origin + COEP: require-corp sur cette page, et l'iframe doit déléguer
     la fonctionnalité « cross-origin-isolated » (attribut allow ci-dessous). */
  function gameIsolation() {
    if (window.crossOriginIsolated) return true;
    gameStatus(
      t("Page non cross-origin isolated : le serveur doit envoyer « Cross-Origin-Opener-Policy: same-origin » et « Cross-Origin-Embedder-Policy: require-corp » (voir vercel.json, ou python3 serve.py en local)."),
      'err'
    );
    log(t('Jeu : page non cross-origin isolated, lancement impossible.'), 'err');
    return false;
  }

  /* Envoie le ZIP en attente au jeu, une seule fois par lancement. */
  function sendGame() {
    const frame = gameFrame();
    if (!frame || !frame.contentWindow || !game.pending || !game.ready || game.sent) return;
    const project = state.project;
    const mod = modDir(project.meta.modName);
    frame.contentWindow.postMessage(
      {
        type: 'luanti:mod',
        version: 1,
        mods: [{ name: mod, zip: game.pending }],
        game: 'minetest_game',
        world: worldName(project.meta.modName),
        player: 'invité',
        play: true,
      },
      '*'
    );
    game.pending = null;
    game.sent = true;
    log(t('Lancement du jeu : mod « {mod} » envoyé au monde « {world} ».', {
      mod,
      world: worldName(project.meta.modName),
    }), 'ok');
  }

  async function openGame() {
    if (gameFrame()) return;
    const panel = document.createElement('div');
    panel.className = 'game-panel';
    panel.id = 'luanti-panel';
    panel.innerHTML = `
      <div class="game-head">
        <span class="game-title">${t('Lancer le jeu')}</span>
        <span class="game-status" id="luanti-status">${t('Chargement du moteur…')}</span>
        <span class="spacer"></span>
        <button type="button" class="tbtn" id="luanti-retry" data-action="retry-game" hidden>${t('Réessayer')}</button>
        <button type="button" class="tbtn" data-action="close-game">${t('Fermer')}</button>
      </div>
      <iframe id="luanti-game" class="game-frame" src="${LUANTI_URL}"
        allow="cross-origin-isolated; fullscreen; gamepad; clipboard-write" title="Luanti"></iframe>`;
    document.body.appendChild(panel);
    game.ready = false;
    game.sent = false;
    game.pending = null;
    if (!gameIsolation()) return;
    await prepareGame();
  }

  async function prepareGame() {
    try {
      game.pending = await exportModZip(state.project);
      if (game.ready) sendGame();
    } catch (err) {
      gameStatus(t("Le jeu n'a pas pu être lancé : {msg}", { msg: err.message }), 'err');
      log(t('Jeu : {msg}', { msg: err.message }), 'err');
    }
  }

  async function retryGame() {
    if (!gameFrame()) {
      await openGame();
      return;
    }
    game.sent = false;
    game.pending = null;
    gameStatus(t('Chargement du moteur…'));
    if (!gameIsolation()) return;
    await prepareGame();
  }

  function closeGame() {
    const panel = document.getElementById('luanti-panel');
    if (panel) panel.remove();
    game.ready = false;
    game.pending = null;
    game.sent = false;
  }

  function onGameMessage(e) {
    const frame = gameFrame();
    if (!frame || e.source !== frame.contentWindow) return;
    const data = e.data || {};
    if (data.type === 'luanti:ready') {
      game.ready = true;
      if (game.pending) sendGame();
      return;
    }
    if (data.type !== 'luanti:status') return;
    switch (data.phase) {
      case 'installing':
        gameStatus(t('Installation du mod…'));
        break;
      case 'preparing':
        gameStatus(t('Préparation du monde…'));
        break;
      case 'installed':
        gameStatus(t('Lancement…'));
        break;
      case 'playing':
        gameStatus(t('Partie en cours'), 'ok');
        break;
      case 'error':
        gameStatus(data.message || t('Le jeu a signalé une erreur.'), 'err');
        log(t('Jeu : {msg}', { msg: data.message || t('erreur inconnue') }), 'err');
        break;
      default:
        break;
    }
  }

  /* ------------------------------------------------------------------ */
  /* événements                                                          */
  /* ------------------------------------------------------------------ */

  function toggleMenu(menu) {
    const open = menu.classList.contains('open');
    $$('.menu.open').forEach((m) => m.classList.remove('open'));
    if (!open) menu.classList.add('open');
  }

  async function startTextureUpload(target) {
    const scope = target.dataset.scope || 'el';
    const id = target.dataset.id || '';
    const field = target.dataset.field || '';
    state.pendingTexture = field ? { scope, id, field } : null;
    chooseFile({
      accept: 'image/*',
      onFiles: async (files) => {
        const before = new Set(Object.keys(state.project.textures));
        await uploadTextures(files);
        const pending = state.pendingTexture;
        state.pendingTexture = null;
        if (!pending) return;
        const added = Object.keys(state.project.textures).filter((name) => !before.has(name));
        const first = added[0];
        if (!first) return;
        if (pending.scope === 'el') {
          const el = P.find(state.project, id);
          if (el) {
            el.props[pending.field] = first;
            if (el.type === 'block' && pending.field === 'texTop' && el.props.tilesMode === 'all') {
              el.props.texSide = first;
              el.props.texBottom = first;
            }
          }
        } else if (pending.scope === 'fs') {
          const el = activeElement();
          const comp = el && (el.props.components || []).find((c) => c.id === id);
          if (comp) comp.tex = first;
        }
        scheduleSave();
        render();
      },
    });
  }

  async function handleAction(action, node) {
    switch (action) {
      case 'new-project':
        newProjectDialog();
        break;
      case 'go-home':
        if (state.active.kind !== 'home') P.save(state.project);
        if (
          !P.getActiveId() &&
          (state.project.elements.length || Object.keys(state.project.textures || {}).length)
        ) {
          P.adopt(state.project, {
            title: state.project.meta.title,
            description: state.project.meta.description,
          });
        }
        state.active = { kind: 'home' };
        render();
        break;
      case 'open-library-project': {
        P.save(state.project);
        const project = P.activate(node.dataset.id);
        if (!project) {
          toast(t('Projet introuvable.'), 'err');
          break;
        }
        state.project = project;
        state.tabs = [];
        state.fsSelection = null;
        state.active = { kind: 'workspace' };
        render();
        log(t('Projet « {name} » ouvert.', { name: project.meta.title || project.meta.modName }), 'ok');
        break;
      }
      case 'pick-screenshot':
        chooseFile({
          accept: 'image/*',
          onFiles: async (files) => {
            const file = files[0];
            if (!file) return;
            try {
              state.pendingScreenshot = await imageToScreenshot(file);
              const preview = document.getElementById('np-shot-preview');
              if (preview) preview.innerHTML = shotPreviewHtml();
            } catch (err) {
              toast(t('Image illisible.'), 'err');
            }
          },
        });
        break;
      case 'clear-screenshot': {
        state.pendingScreenshot = '';
        const preview = document.getElementById('np-shot-preview');
        if (preview) preview.innerHTML = shotPreviewHtml();
        break;
      }
      case 'create-project': {
        const title = (document.getElementById('np-title')?.value || '').trim() || t('Mon mod');
        const description = (document.getElementById('np-desc')?.value || '').trim();
        const modName = uniqueModName(G.slug(title) || 'mymod');
        const project = P.empty(modName);
        project.meta.title = title;
        if (description) project.meta.description = description;
        P.adopt(project, { title, description, screenshot: state.pendingScreenshot });
        state.pendingScreenshot = '';
        state.project = project;
        state.tabs = [];
        state.fsSelection = null;
        state.active = { kind: 'workspace' };
        closeModal();
        render();
        log(t('Nouveau projet « {title} » ({mod}).', { title, mod: modName }), 'ok');
        toast(t('Projet créé'));
        break;
      }
      case 'open-project':
        chooseFile({ accept: '.json,.mtc.json,application/json', onFiles: openProjectJson });
        break;
      case 'import-mod':
        openModal({
          title: t('Importer un mod existant'),
          body: `${t(
            '<p>Importez un mod Luanti existant pour le modifier dans MTC creator. Le fichier <code>mod.conf</code>, les textures et les définitions Lua reconnues seront convertis en éléments éditables.</p>'
          )}
            ${t(
              '<p style="color:#8f9199;font-size:11.5px">Formats : ZIP du mod, ou dossier contenant <code>init.lua</code>. Les formspecs existantes ne sont pas importées.</p>'
            )}`,
          footer: `<button type="button" data-action="close-modal">${t('Annuler')}</button>
            <button type="button" data-action="import-zip">${t('Fichier ZIP…')}</button>
            <button type="button" class="primary" data-action="import-folder">${t('Dossier du mod…')}</button>`,
        });
        break;
      case 'import-zip':
        closeModal();
        chooseFile({ accept: '.zip,application/zip', onFiles: importZip });
        break;
      case 'import-folder':
        closeModal();
        chooseFile({ directory: true, onFiles: importFolder });
        break;
      case 'save-project':
        saveProject(false);
        break;
      case 'export-project':
        exportProjectJson();
        break;
      case 'export-zip':
        await exportZip();
        break;
      case 'launch-game':
        await openGame();
        break;
      case 'close-game':
        closeGame();
        break;
      case 'retry-game':
        await retryGame();
        break;
      case 'new-element': {
        const el = P.create(state.project, node.dataset.type || 'block');
        scheduleSave();
        openElement(el.id);
        log(t('{type} « {name} » créé.', { type: t(P.TYPES[el.type].label), name: el.props.title }), 'ok');
        break;
      }
      case 'open-element':
        openElement(node.dataset.id);
        break;
      case 'delete-element': {
        const el = P.find(state.project, node.dataset.id);
        if (!el) break;
        askConfirm(
          t('Supprimer cet élément ?'),
          t('« {name} » sera retiré du projet. Cette action est immédiate (le projet reste enregistré dans le navigateur).', {
            name: esc(el.props.title || el.name),
          }),
          t('Supprimer'),
          () => {
            P.remove(state.project, el.id);
            state.tabs = state.tabs.filter((tab) => !(tab.kind === 'element' && tab.id === el.id));
            if (state.active.kind === 'element' && state.active.id === el.id) state.active = { kind: 'workspace' };
            scheduleSave();
            render();
            log(t('Élément supprimé : {name}.', { name: el.props.title || el.name }), 'warn');
          }
        );
        break;
      }
      case 'duplicate-element': {
        const copy = P.clone(state.project, node.dataset.id);
        if (copy) {
          scheduleSave();
          openElement(copy.id);
          log(t('Élément dupliqué : {name}.', { name: copy.name }), 'ok');
        }
        break;
      }
      case 'goto-workspace':
        state.active = { kind: 'workspace' };
        render();
        break;
      case 'select-tab':
        gotoTab(node.dataset.kind, node.dataset.id);
        break;
      case 'close-tab':
        closeTab(node.dataset.kind, node.dataset.id);
        break;
      case 'filter-type':
        state.typeFilter = node.dataset.type;
        render();
        break;
      case 'open-textures':
        openSpecial('textures');
        break;
      case 'upload-texture':
        startTextureUpload(node);
        break;
      case 'texture-editor':
        textureEditorDialog();
        break;
      case 'view-code':
        openSpecial('code');
        break;
      case 'delete-texture': {
        const name = node.dataset.name;
        askConfirm(
          t('Supprimer cette texture ?'),
          t("« {name} » sera retirée du projet et du ZIP exporté. Les éléments qui l'utilisent afficheront un avertissement.", {
            name: esc(name),
          }),
          t('Supprimer'),
          () => {
            delete state.project.textures[name];
            scheduleSave();
            render();
            log(t('Texture supprimée : {name}.', { name }), 'warn');
          }
        );
        break;
      }
      case 'copy-texture-name':
        copyText(node.dataset.name);
        break;
      case 'add-fs-comp': {
        const el = activeElement();
        if (!el || el.type !== 'formspec') break;
        const type = node.dataset.type;
        const comps = el.props.components || (el.props.components = []);
        const bottom = comps.reduce((max, c) => Math.max(max, (Number(c.y) || 0) + (Number(c.h) || 0)), 0.5);
        const def = P.FS_COMPONENTS[type] || P.FS_COMPONENTS.label;
        const comp = P.makeComponent(type, {
          x: 0.5,
          y: Math.min(bottom + 0.25, Math.max(0.5, (Number(el.props.height) || 9) - def.size[1] - 0.25)),
          name: G.slug(type + '_' + (comps.length + 1)),
        });
        if (type === 'list') comp.count = Math.max(1, Math.round(comp.w * comp.h));
        if (type === 'textlist' || type === 'dropdown') comp.text = '';
        comps.push(comp);
        state.fsSelection = comp.id;
        scheduleSave();
        render();
        break;
      }
      case 'select-fs-comp': {
        state.fsSelection = node.dataset.id;
        const el = activeElement();
        if (el) {
          $$('.fs-item', els.viewhost).forEach((n) => n.classList.toggle('sel', n.dataset.fsComp === state.fsSelection));
          $$('.fs-comp', els.viewhost).forEach((n) => n.classList.toggle('active', n.dataset.id === state.fsSelection));
          renderFsCompList(el);
        }
        renderInspector();
        break;
      }
      case 'delete-fs-comp': {
        const el = activeElement();
        if (!el) break;
        el.props.components = (el.props.components || []).filter((c) => c.id !== node.dataset.id);
        state.fsSelection = null;
        scheduleSave();
        render();
        break;
      }
      case 'duplicate-fs-comp': {
        const el = activeElement();
        if (!el) break;
        const src = (el.props.components || []).find((c) => c.id === node.dataset.id);
        if (!src) break;
        const copy = Object.assign({}, src, { id: P.uid(), x: Math.min((Number(src.x) || 0) + 0.5, (Number(el.props.width) || 8) - 1), y: (Number(src.y) || 0) + 0.5 });
        el.props.components.push(copy);
        state.fsSelection = copy.id;
        scheduleSave();
        render();
        break;
      }
      case 'copy-element-code': {
        const el = activeElement();
        if (el) copyText(G.genElement(el, state.project));
        break;
      }
      case 'copy-code': {
        const file = state.files.find((f) => f.path === node.dataset.path);
        if (file) copyText(file.text);
        break;
      }
      case 'download-code': {
        const file = state.files.find((f) => f.path === node.dataset.path);
        if (file) {
          download(new Blob([file.text], { type: 'text/plain' }), file.path.split('/').pop());
          log(t('Fichier téléchargé : {name}.', { name: file.path.split('/').pop() }), 'ok');
        }
        break;
      }
      case 'toggle-console':
        els.app.classList.toggle('console-collapsed');
        break;
      case 'clear-console':
        els.consoleLog.innerHTML = '';
        break;
      case 'help':
        helpDialog();
        break;
      case 'load-sample':
        askConfirm(
          t("Charger le projet d'exemple ?"),
          t("Un mod de démonstration (bloc, item, outil, recette et formspec avec textures générées) remplacera le projet actuel."),
          t("Charger l'exemple"),
          () => {
            P.save(state.project);
            state.project = P.sample();
            state.tabs = [];
            state.active = { kind: 'workspace' };
            state.fsSelection = null;
            P.adopt(state.project, {
              title: state.project.meta.title,
              description: state.project.meta.description,
            });
            stampSave(true);
            render();
            log(t("Projet d'exemple chargé : dalles, cristal, pioche et livre de recettes."), 'ok');
            toast(t("Projet d'exemple chargé"));
          }
        );
        break;
      case 'confirm-dialog': {
        const cb = state.confirm;
        closeModal();
        if (cb) cb();
        break;
      }
      case 'close-modal':
        closeModal();
        break;
      default:
        break;
    }
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      toast(t('Copié dans le presse-papiers'));
    } catch (err) {
      log(t("Copie impossible : le navigateur a refusé l'accès au presse-papiers."), 'warn');
    }
  }

  function wireEvents() {
    document.addEventListener('click', async (e) => {
      const menuBtn = e.target.closest('.menu-btn');
      if (menuBtn) {
        e.stopPropagation();
        toggleMenu(menuBtn.closest('.menu'));
        return;
      }

      const node = e.target.closest('[data-action]');
      if (!node) {
        if (!e.target.closest('.menu')) $$('.menu.open').forEach((m) => m.classList.remove('open'));
        const stage = e.target.closest('#fs-stage');
        if (stage && !e.target.closest('[data-fs-comp]')) {
          state.fsSelection = null;
          const el = activeElement();
          if (el) {
            renderFsStage(el);
            renderFsCompList(el);
            renderInspector();
          }
        }
        return;
      }

      const insideMenu = !!e.target.closest('.menu-panel');
      try {
        await handleAction(node.dataset.action, node);
      } finally {
        if (insideMenu) closeMenus();
      }
    });

    document.addEventListener('click', (e) => {
      if (!e.target.closest('.menu')) closeMenus();
    });

    function closeMenus() {
      $$('.menu.open').forEach((m) => m.classList.remove('open'));
    }

    document.addEventListener('input', (e) => {
      const target = e.target.closest('[data-field]');
      if (!target) return;
      if (target.type === 'checkbox' || target.tagName === 'SELECT') return;
      applyField(target);
    });

    document.addEventListener('change', (e) => {
      const target = e.target.closest('[data-field]');
      if (!target) return;
      applyField(target);
      render();
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProject(false);
      }
      if (e.key === 'Escape') {
        closeModal();
        $$('.menu.open').forEach((m) => m.classList.remove('open'));
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        exportZip();
      }
    });

    window.addEventListener('message', onGameMessage);

    els.treeFilter.addEventListener('input', () => {
      state.treeFilter = els.treeFilter.value;
      renderTree();
    });

    els.viewhost.addEventListener('input', (e) => {
      const search = e.target.closest('#ws-search');
      if (!search) return;
      state.search = search.value;
      const cards = document.getElementById('ws-cards');
      if (cards) cards.innerHTML = workspaceCardsHtml();
      else if (state.search === '') {
        /* rien à faire */
      }
    });

    els.viewhost.addEventListener('pointerdown', onStagePointerDown);
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    document.addEventListener('pointercancel', onPointerUp);

    $$('.rail-btn[data-view]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const kind = btn.dataset.view;
        if (kind === 'workspace') {
          state.active = { kind: 'workspace' };
          render();
        } else {
          openSpecial(kind);
        }
      });
    });

    const langSelect = document.getElementById('lang-select');
    if (langSelect) {
      langSelect.value = MTC.i18n.getLang();
      langSelect.addEventListener('change', () => {
        MTC.i18n.setLang(langSelect.value);
        closeModal();
        render();
        stampSave(true);
        toast(t("Langue de l'interface : {lang}.", { lang: langSelect.value.toUpperCase() }));
      });
    }
  }

  /* ------------------------------------------------------------------ */
  /* démarrage                                                           */
  /* ------------------------------------------------------------------ */

  function boot() {
    MTC.i18n.init();
    state.project = P.initLibrary(state.project);
    state.active = { kind: 'home' };
    wireEvents();
    render();
    const count = P.library().length;
    if (count) {
      log(plural(count, 'Menu principal : {n} projet enregistré.', 'Menu principal : {n} projets enregistrés.'));
    } else {
      log(t('Bienvenue dans MTC creator. Créez votre premier projet pour commencer.'));
    }
    log(t('Export : un ZIP contenant mod.conf, init.lua et textures/, prêt pour le dossier mods/.'));
    stampSave(true);
  }

  boot();
})();
