/* MTC creator — modèle de projet, textures, import / export, exemple. */
(function () {
  const MTC = (window.MTC = window.MTC || {});
  const P = (MTC.project = {});
  const G = MTC.gen;

  P.TYPES = {
    block: { label: 'Bloc', plural: 'Blocs', glyph: 'BLOC' },
    item: { label: 'Item', plural: 'Items', glyph: 'ITEM' },
    tool: { label: 'Outil', plural: 'Outils', glyph: 'OUTIL' },
    craft: { label: 'Recette', plural: 'Recettes', glyph: 'RECETTE' },
    formspec: { label: 'Formspec', plural: 'Formspecs', glyph: 'GUI' },
  };

  P.STORAGE_KEY = 'mtc-creator:project';

  const DEFAULT_TEXTURES = [
    'default_stone.png',
    'default_cobble.png',
    'default_dirt.png',
    'default_grass.png',
    'default_sand.png',
    'default_wood.png',
    'default_tree.png',
    'default_glass.png',
    'default_steel_block.png',
    'default_mese_block.png',
    'default_obsidian.png',
    'default_ice.png',
    'default_stick.png',
    'default_coal_lump.png',
    'default_iron_lump.png',
    'default_steel_ingot.png',
    'default_gold_ingot.png',
    'default_diamond.png',
    'default_tool_steelsword.png',
    'default_book.png',
    'default_paper.png',
    'blank.png',
  ];
  P.DEFAULT_TEXTURES = DEFAULT_TEXTURES;

  P.ITEM_SUGGESTIONS = [
    'default:stone',
    'default:cobble',
    'default:dirt',
    'default:wood',
    'default:stick',
    'default:coal_lump',
    'default:iron_lump',
    'default:steel_ingot',
    'default:gold_ingot',
    'default:diamond',
    'default:paper',
    'default:book',
    'default:torch',
    'default:glass',
    'default:sand',
    'default:obsidian',
  ];

  P.defaults = function (type) {
    switch (type) {
      case 'block':
        return {
          tilesMode: 'all',
          texTop: '',
          texSide: '',
          texBottom: '',
          groups: 'cracky=3, stone=1',
          walkable: true,
          pointable: true,
          diggable: true,
          sunlight: false,
          ground: true,
          light: 0,
          dropSelf: true,
          drop: '',
          sounds: 'stone',
          formspecId: '',
        };
      case 'item':
        return { texture: '', stackMax: 99, groups: '', formspecId: '' };
      case 'tool':
        return { texture: '', kind: 'pickaxe', material: 'stone', uses: 60, damage: 3, maxlevel: 2, punch: 0.9, groups: 'tool' };
      case 'craft':
        return { kind: 'shaped', output: '', grid: ['', '', '', '', '', '', '', '', ''], shapeless: '', input: '', cooktime: 10 };
      case 'formspec':
        return { width: 8, height: 9, bgcolor: '#202020', components: [] };
      default:
        return {};
    }
  };

  P.empty = function (modName) {
    return {
      format: 'mtc-creator-project',
      formatVersion: 1,
      meta: {
        modName: modName || 'mymod',
        title: 'Mon mod',
        description: 'Un mod Luanti créé avec MTC creator.',
        author: '',
        license: 'MIT',
        version: '1.0',
        depends: ['default'],
        optionalDepends: [],
      },
      elements: [],
      textures: {},
    };
  };

  P.uid = function () {
    return 'el' + Math.random().toString(36).slice(2, 9);
  };

  P.uniqueName = function (project, base) {
    const used = new Set((project.elements || []).map((e) => e.name));
    let name = base;
    let i = 2;
    while (used.has(name)) name = base + '_' + i++;
    return name;
  };

  P.create = function (project, type) {
    const t = P.TYPES[type] ? type : 'block';
    const bases = { block: 'nouveau_bloc', item: 'nouvel_item', tool: 'nouvel_outil', craft: 'nouvelle_recette', formspec: 'nouvelle_gui' };
    const titles = {
      block: 'Nouveau bloc',
      item: 'Nouvel item',
      tool: 'Nouvel outil',
      craft: 'Nouvelle recette',
      formspec: 'Nouvelle interface',
    };
    const el = {
      id: P.uid(),
      type: t,
      name: P.uniqueName(project, bases[t]),
      props: P.defaults(t),
    };
    el.props.title = titles[t];
    if (t === 'formspec') {
      el.props.components = [
        P.makeComponent('label', { x: 0.5, y: 0.4, w: 3, h: 0.6, text: 'Mon interface' }),
        P.makeComponent('button', { x: 0.5, y: 1.4, w: 2.4, h: 0.7, name: 'fermer', text: 'Fermer' }),
      ];
      el.props.title = 'Nouvelle interface';
    }
    project.elements.push(el);
    return el;
  };

  P.find = function (project, id) {
    return (project.elements || []).find((e) => e.id === id) || null;
  };

  P.remove = function (project, id) {
    const el = P.find(project, id);
    project.elements = project.elements.filter((e) => e.id !== id);
    for (const other of project.elements) {
      if (other.props && other.props.formspecId === id) other.props.formspecId = '';
    }
    return el;
  };

  P.clone = function (project, id) {
    const src = P.find(project, id);
    if (!src) return null;
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = P.uid();
    copy.name = P.uniqueName(project, src.name + '_copie');
    copy.props.title = (src.props.title || src.name) + ' (copie)';
    if (copy.type === 'formspec') {
      copy.props.components = (copy.props.components || []).map((c) => ({ ...c, id: P.uid() }));
    }
    project.elements.push(copy);
    return copy;
  };

  /* ---------- composants de formspec ---------- */
  P.FS_COMPONENTS = {
    label: { label: 'Texte', size: [3, 0.6], title: 'Textes' },
    button: { label: 'Bouton', size: [2.4, 0.7], title: 'Boutons' },
    button_exit: { label: 'Bouton fermer', size: [2.4, 0.7], title: 'Boutons' },
    image: { label: 'Image', size: [2, 2], title: 'Images' },
    image_button: { label: 'Bouton image', size: [1.2, 1.2], title: 'Images' },
    item_image: { label: 'Image d\'item', size: [1, 1], title: 'Inventaire' },
    box: { label: 'Panneau', size: [3, 2], title: 'Décor' },
    list: { label: 'Inventaire', size: [4, 2], title: 'Inventaire' },
    field: { label: 'Champ texte', size: [3, 0.8], title: 'Champs' },
    textlist: { label: 'Liste', size: [3, 2], title: 'Listes' },
    checkbox: { label: 'Case à cocher', size: [2.4, 0.6], title: 'Cases' },
    dropdown: { label: 'Menu déroulant', size: [3, 0.6], title: 'Menus' },
  };

  P.makeComponent = function (type, props) {
    const def = P.FS_COMPONENTS[type] || P.FS_COMPONENTS.label;
    const base = {
      id: P.uid(),
      type,
      x: 0.5,
      y: 0.5,
      w: def.size[0],
      h: def.size[1],
      text: def.label,
      name: 'comp_' + type,
      tex: '',
      item: 'default:stone',
      color: '#000000',
      inv: 'current_player',
      list: 'main',
      count: 4,
      items: 'Option 1\nOption 2',
      value: '',
      selected: false,
    };
    return Object.assign(base, props || {});
  };

  /* ---------- textures ---------- */
  P.cleanFileName = function (name) {
    const base = String(name || '')
      .split('/')
      .pop()
      .replace(/[^A-Za-z0-9._-]+/g, '_')
      .replace(/^_+|_+$/g, '');
    return base || 'texture.png';
  };

  P.addTexture = function (project, name, dataUrl) {
    let file = P.cleanFileName(name);
    if (!/\.(png|jpe?g|webp|gif)$/i.test(file)) file += '.png';
    const stem = file.replace(/\.[^.]+$/, '');
    const ext = (file.match(/\.[^.]+$/) || ['.png'])[0];
    let candidate = file;
    let i = 2;
    const existing = new Set(Object.keys(project.textures || {}));
    while (existing.has(candidate)) candidate = `${stem}_${i++}${ext}`;
    project.textures[candidate] = dataUrl;
    return candidate;
  };

  P.modTextureName = function (project, baseName) {
    const mod = G.slug(project.meta.modName) || 'mod';
    let file = P.cleanFileName(baseName);
    if (!/\.(png|jpe?g|webp|gif)$/i.test(file)) file += '.png';
    const prefix = mod + '_';
    if (!file.startsWith(prefix)) file = prefix + file;
    return file;
  };

  P.textureUrl = function (project, name) {
    if (!name) return null;
    if (project.textures && project.textures[name]) return project.textures[name];
    const bare = String(name).replace(/^.*:/, '');
    if (project.textures && project.textures[bare]) return project.textures[bare];
    if (project.textures) {
      const mod = project.meta.modName + '_';
      if (project.textures[mod + bare]) return project.textures[mod + bare];
    }
    return null;
  };

  P.elementTexture = function (el, project) {
    const p = el.props || {};
    if (el.type === 'block') return P.textureUrl(project, p.texSide || p.texTop || p.texBottom);
    if (el.type === 'item' || el.type === 'tool') return P.textureUrl(project, p.texture);
    if (el.type === 'craft') {
      const out = String(p.output || '').trim();
      if (!out) return null;
      const target = (project.elements || []).find((e) => e.type !== 'craft' && `${project.meta.modName}:${e.name}` === out);
      if (target) return P.elementTexture(target, project);
      return P.textureUrl(project, out.replace(/^.*:/, '') + '.png');
    }
    return null;
  };

  P.missingTextures = function (project) {
    const missing = new Set();
    const known = (name) => {
      if (!name) return true;
      if (project.textures[name]) return true;
      if (DEFAULT_TEXTURES.includes(name)) return true;
      const mod = project.meta.modName + '_';
      return !!project.textures[mod + name.replace(/^.*:/, '')];
    };
    for (const el of project.elements || []) {
      const p = el.props || {};
      if (el.type === 'block') {
        for (const t of [p.texTop, p.texSide, p.texBottom]) if (!known(t)) missing.add(t);
      } else if (el.type === 'item' || el.type === 'tool') {
        if (!known(p.texture)) missing.add(p.texture);
      } else if (el.type === 'formspec') {
        for (const c of p.components || []) {
          if ((c.type === 'image' || c.type === 'image_button') && !known(c.tex)) missing.add(c.tex);
        }
      }
    }
    return [...missing];
  };

  /* ---------- dépendances ---------- */
  P.ensureDependencies = function (project) {
    const init = G.genInit(project);
    const conf = G.genModConf(project);
    const deps = project.meta.depends || [];
    const added = [];
    const needsDefault = /\bdefault[:_]/.test(init) || /\bdefault[:_]/.test(conf);
    if (needsDefault && !deps.includes('default')) {
      deps.push('default');
      added.push('default');
    }
    project.meta.depends = deps;
    return added;
  };

  /* ---------- sauvegarde locale ---------- */
  P.save = function (project) {
    try {
      localStorage.setItem(P.STORAGE_KEY, JSON.stringify(project));
      return true;
    } catch (e) {
      return false;
    }
  };

  P.load = function () {
    try {
      const raw = localStorage.getItem(P.STORAGE_KEY);
      if (!raw) return null;
      const data = JSON.parse(raw);
      if (!data || !data.meta) return null;
      data.meta.depends = Array.isArray(data.meta.depends) ? data.meta.depends : ['default'];
      data.meta.optionalDepends = Array.isArray(data.meta.optionalDepends) ? data.meta.optionalDepends : [];
      data.elements = Array.isArray(data.elements) ? data.elements : [];
      data.textures = data.textures || {};
      for (const el of data.elements) el.props = Object.assign(P.defaults(el.type), el.props || {});
      return data;
    } catch (e) {
      return null;
    }
  };

  /* ---------- export ---------- */
  P.buildModFiles = async function (project) {
    const G = MTC.gen;
    const files = [];
    const mod = G.slug(project.meta.modName) || 'mymod';
    files.push({ name: `${mod}/mod.conf`, data: MTC.zip.textToBytes(G.genModConf(project)) });
    files.push({ name: `${mod}/init.lua`, data: MTC.zip.textToBytes(G.genInit(project)) });
    for (const [name, dataUrl] of Object.entries(project.textures || {})) {
      try {
        files.push({ name: `${mod}/textures/${name}`, data: await MTC.zip.dataUrlToBytes(dataUrl) });
      } catch (e) {
        /* texture illisible : ignorée */
      }
    }
    return files;
  };

  /* ---------- import ---------- */
  function bytesToDataUrl(bytes, mime) {
    let binary = '';
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return `data:${mime || 'image/png'};base64,${btoa(binary)}`;
  }

  function mimeFor(name) {
    if (/\.jpe?g$/i.test(name)) return 'image/jpeg';
    if (/\.webp$/i.test(name)) return 'image/webp';
    if (/\.gif$/i.test(name)) return 'image/gif';
    return 'image/png';
  }

  function parseConf(text) {
    const conf = {};
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
      if (m) conf[m[1]] = m[2].trim();
    }
    return conf;
  }

  /* Extrait les appels f(args) avec parenthèses équilibrées. */
  function extractCalls(src, funcName) {
    const results = [];
    let i = 0;
    while ((i = src.indexOf(funcName + '(', i)) !== -1) {
      const before = src[i - 1] || '';
      if (/[\w.:]/.test(before)) {
        i += funcName.length;
        continue;
      }
      let depth = 0;
      let j = i + funcName.length + 1; // après la parenthèse ouvrante
      const start = j;
      let quote = null;
      for (; j < src.length; j++) {
        const ch = src[j];
        if (quote) {
          if (ch === '\\') {
            j++;
            continue;
          }
          if (ch === quote) quote = null;
          continue;
        }
        if (ch === '-' && src[j + 1] === '-') {
          while (j < src.length && src[j] !== '\n') j++;
          continue;
        }
        if (ch === '"' || ch === "'") {
          quote = ch;
          continue;
        }
        if (ch === '(') depth++;
        else if (ch === ')') {
          if (depth === 0) break;
          depth--;
        }
      }
      results.push(src.slice(start, j));
      i = j;
    }
    return results;
  }

  function firstString(args, key) {
    const re = key ? new RegExp(key + '\\s*=\\s*"([^"]*)"') : /^\s*"([^"]+)"/;
    const m = args.match(re);
    return m ? m[1] : '';
  }

  function stringList(args, key) {
    const m = args.match(new RegExp(key + '\\s*=\\s*\\{([^}]*)\\}', 's'));
    if (!m) return [];
    const out = [];
    const re = /"([^"]*)"/g;
    let hit;
    while ((hit = re.exec(m[1]))) out.push(hit[1]);
    return out;
  }

  function groupsFromLua(args) {
    const m = args.match(/groups\s*=\s*\{([^}]*)\}/s);
    if (!m) return '';
    const out = [];
    const re = /([A-Za-z0-9_]+)\s*=\s*(-?\d+)/g;
    let hit;
    while ((hit = re.exec(m[1]))) out.push(`${hit[1]}=${hit[2]}`);
    return out.join(', ');
  }

  P.importFromEntries = function (entries, fileName) {
    const texts = new Map();
    const textures = new Map();
    for (const entry of entries) {
      if (/\/textures\/[^/]+\.(png|jpe?g|webp|gif)$/i.test(entry.name)) textures.set(entry.name, entry.data);
      else texts.set(entry.name, MTC.zip.bytesToText(entry.data));
    }

    let initPath = null;
    let modConfPath = null;
    for (const path of texts.keys()) {
      if (/\/init\.lua$/i.test(path)) {
        if (!initPath || path.split('/').length < initPath.split('/').length) initPath = path;
      }
      if (/\/mod\.conf$/i.test(path)) modConfPath = path;
    }
    if (!initPath && modConfPath) initPath = modConfPath.replace(/mod\.conf$/, 'init.lua');
    if (!initPath) throw new Error('Aucun fichier init.lua trouvé : ce ZIP ne ressemble pas à un mod Luanti.');

    const parts = initPath.split('/');
    parts.pop();
    const prefix = parts.join('/') + '/';
    const folderName = parts.length ? parts[parts.length - 1] : String(fileName || 'mod').replace(/\.zip$/i, '');
    const src = texts.get(initPath) || '';
    const conf = modConfPath && texts.has(modConfPath) ? parseConf(texts.get(modConfPath)) : {};

    const project = P.empty(G.slug(folderName) || 'mymod');
    project.meta.modName = G.slug(folderName) || 'mymod';
    project.meta.title = conf.title || folderName;
    project.meta.description = conf.description || '';
    project.meta.author = conf.author || '';
    project.meta.license = conf.license || 'MIT';
    project.meta.version = conf.release || '1.0';
    const deps = (conf.depends || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    project.meta.depends = deps.length ? deps : ['default'];

    for (const [path, bytes] of textures) {
      const name = path.split('/').pop();
      project.textures[name] = bytesToDataUrl(bytes, mimeFor(name));
    }

    const usedNames = new Set();
    const add = (type, name, props) => {
      let finalName = G.slug(name.split(':').pop()) || type;
      let n = 2;
      while (usedNames.has(finalName)) finalName = G.slug(name.split(':').pop()) + '_' + n++;
      usedNames.add(finalName);
      project.elements.push({ id: P.uid(), type, name: finalName, props: Object.assign(P.defaults(type), props) });
    };

    for (const args of extractCalls(src, 'minetest.register_node')) {
      const name = firstString(args);
      const tiles = stringList(args, 'tiles');
      const single = (args.match(/tiles\s*=\s*\{([^}]*)\}/s) || [])[1];
      const flatTiles = single ? (single.match(/"([^"]*)"/g) || []).map((s) => s.replace(/"/g, '')) : [];
      const tex = flatTiles.length ? flatTiles[2] || flatTiles[0] : tiles[2] || tiles[0] || '';
      const sound = (args.match(/node_sound_(\w+)_defaults/) || [])[1] || '';
      add('block', name, {
        title: firstString(args, 'description') || name,
        tilesMode: 'all',
        texTop: tex,
        texSide: tex,
        texBottom: flatTiles[1] || tex,
        groups: groupsFromLua(args) || 'cracky=3',
        walkable: !/walkable\s*=\s*false/.test(args),
        pointable: !/pointable\s*=\s*false/.test(args),
        diggable: !/diggable\s*=\s*false/.test(args),
        sunlight: /sunlight_propagates\s*=\s*true/.test(args),
        ground: /is_ground_content\s*=\s*true/.test(args),
        light: parseInt((args.match(/light_source\s*=\s*(\d+)/) || [])[1] || '0', 10),
        dropSelf: !/\bdrop\s*=/.test(args),
        drop: firstString(args, 'drop'),
        sounds: sound,
      });
    }

    for (const args of extractCalls(src, 'minetest.register_craftitem')) {
      const name = firstString(args);
      add('item', name, {
        title: firstString(args, 'description') || name,
        texture: firstString(args, 'inventory_image'),
        stackMax: parseInt((args.match(/stack_max\s*=\s*(\d+)/) || [])[1] || '99', 10),
        groups: groupsFromLua(args),
      });
    }

    for (const args of extractCalls(src, 'minetest.register_tool')) {
      const name = firstString(args);
      const kind = /groupcaps\s*=\s*\{\s*choppy/.test(args) ? 'axe' : /groupcaps\s*=\s*\{\s*crumbly/.test(args) ? 'shovel' : 'pickaxe';
      add('tool', name, {
        title: firstString(args, 'description') || name,
        texture: firstString(args, 'inventory_image'),
        kind,
        uses: parseInt((args.match(/uses\s*=\s*(\d+)/) || [])[1] || '60', 10),
        maxlevel: parseInt((args.match(/maxlevel\s*=\s*(\d+)/) || [])[1] || '2', 10),
        damage: parseInt((args.match(/fleshy\s*=\s*(\d+)/) || [])[1] || '3', 10),
        groups: groupsFromLua(args) || 'tool',
      });
    }

    for (const args of extractCalls(src, 'minetest.register_craft')) {
      const output = firstString(args, 'output');
      if (!output) continue;
      const typeMatch = (args.match(/type\s*=\s*"(\w+)"/) || [])[1];
      if (typeMatch === 'cooking') {
        add('craft', 'recette_' + output.split(':').pop(), {
          kind: 'cooking',
          input: firstString(args, 'recipe'),
          output,
          cooktime: parseInt((args.match(/cooktime\s*=\s*(\d+)/) || [])[1] || '10', 10),
        });
      } else if (typeMatch === 'shapeless') {
        const m = args.match(/recipe\s*=\s*\{([\s\S]*?)\},?\s*\n\s*output/);
        const items = (m ? m[1].match(/"([^"]*)"/g) || [] : []).map((s) => s.replace(/"/g, ''));
        add('craft', 'recette_' + output.split(':').pop(), {
          kind: 'shapeless',
          shapeless: items.join('\n'),
          output,
        });
      } else {
        const rows = extractRecipeRows(args);
        const grid = ['', '', '', '', '', '', '', '', ''];
        rows.slice(0, 3).forEach((row, r) => row.slice(0, 3).forEach((cell, c) => (grid[r * 3 + c] = cell)));
        add('craft', 'recette_' + output.split(':').pop(), { kind: 'shaped', output, grid });
      }
    }

    return project;
  };

  function extractRecipeRows(args) {
    const m = args.match(/recipe\s*=\s*\{([\s\S]*?)\},\s*\n\s*output/);
    if (!m) return [];
    const rows = [];
    const rowRe = /\{([^{}]*)\}/g;
    let hit;
    while ((hit = rowRe.exec(m[1]))) {
      const cells = (hit[1].match(/"([^"]*)"/g) || []).map((s) => s.replace(/"/g, ''));
      if (cells.length) rows.push(cells);
    }
    return rows;
  }

  /* ---------- projet d'exemple ---------- */
  function sampleTexture(draw) {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    draw(ctx);
    return canvas.toDataURL('image/png');
  }

  function noisyFill(ctx, color, shade) {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = Math.random() < 0.5 ? `rgba(255,255,255,${shade})` : `rgba(0,0,0,${shade + 0.03})`;
      ctx.fillRect(Math.floor(Math.random() * 16), Math.floor(Math.random() * 16), 1, 1);
    }
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    ctx.fillStyle = 'rgba(0,0,0,.22)';
    ctx.fillRect(0, 15, 16, 1);
    ctx.fillRect(15, 0, 1, 16);
  }

  P.sample = function () {
    const project = P.empty('mymod');
    project.meta.title = 'Mon premier mod';
    project.meta.description = 'Dalles de pierre, cristaux et une interface de test.';
    project.meta.author = 'MTC creator';
    project.meta.depends = ['default'];

    const stone = sampleTexture((ctx) => noisyFill(ctx, '#8d9296', 0.09));
    const crystal = sampleTexture((ctx) => {
      ctx.fillStyle = '#5a2d82';
      ctx.clearRect(0, 0, 16, 16);
      const shape = [
        [7, 1], [8, 1], [6, 2], [7, 2], [8, 2], [9, 2], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3], [10, 3],
        [4, 4], [5, 4], [6, 4], [7, 4], [8, 4], [9, 4], [10, 4], [11, 4], [4, 5], [5, 5], [6, 5], [7, 5],
        [8, 5], [9, 5], [10, 5], [11, 5], [5, 6], [6, 6], [7, 6], [8, 6], [9, 6], [10, 6], [6, 7], [7, 7],
        [8, 7], [9, 7], [7, 8], [8, 8], [7, 9], [8, 9], [7, 10], [8, 10], [7, 11], [8, 11], [7, 12], [8, 12],
        [6, 13], [7, 13], [8, 13], [9, 13], [6, 14], [9, 14],
      ];
      for (const [x, y] of shape) {
        ctx.fillStyle = x < 7 ? '#8b5cc4' : x > 8 ? '#4a2170' : '#a26ee0';
        ctx.fillRect(x, y, 1, 1);
      }
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      ctx.fillRect(7, 3, 1, 4);
      ctx.fillRect(8, 6, 1, 2);
    });
    const pickaxe = sampleTexture((ctx) => {
      ctx.clearRect(0, 0, 16, 16);
      ctx.fillStyle = '#7a5230';
      for (let i = 0; i < 9; i++) ctx.fillRect(3 + i, 13 - i, 2, 2);
      ctx.fillStyle = '#8b5cc4';
      ctx.fillRect(4, 2, 9, 2);
      ctx.fillRect(3, 3, 2, 2);
      ctx.fillRect(12, 3, 2, 2);
      ctx.fillStyle = '#a26ee0';
      ctx.fillRect(4, 2, 9, 1);
      ctx.fillStyle = '#4a2170';
      ctx.fillRect(4, 3, 1, 1);
    });

    const stoneTex = P.addTexture(project, P.modTextureName(project, 'dalle_pierre.png'), stone);
    const crystalTex = P.addTexture(project, P.modTextureName(project, 'cristal.png'), crystal);
    const pickaxeTex = P.addTexture(project, P.modTextureName(project, 'pioche_cristal.png'), pickaxe);

    project.elements.push({
      id: P.uid(),
      type: 'block',
      name: 'dalle_pierre',
      props: Object.assign(P.defaults('block'), {
        title: 'Dalle de pierre',
        tilesMode: 'all',
        texTop: stoneTex,
        texSide: stoneTex,
        texBottom: stoneTex,
        groups: 'cracky=3, stone=1',
        sounds: 'stone',
        formspecId: '',
      }),
    });
    project.elements.push({
      id: P.uid(),
      type: 'item',
      name: 'cristal',
      props: Object.assign(P.defaults('item'), {
        title: 'Cristal de mese',
        texture: crystalTex,
        stackMax: 99,
        groups: 'craftitem=1',
      }),
    });
    project.elements.push({
      id: P.uid(),
      type: 'tool',
      name: 'pioche_cristal',
      props: Object.assign(P.defaults('tool'), {
        title: 'Pioche en cristal',
        texture: pickaxeTex,
        kind: 'pickaxe',
        material: 'mese',
        uses: 240,
        damage: 4,
        maxlevel: 3,
      }),
    });
    const craftEl = {
      id: P.uid(),
      type: 'craft',
      name: 'recette_pioche_cristal',
      props: Object.assign(P.defaults('craft'), {
        title: 'Pioche en cristal',
        output: 'mymod:pioche_cristal',
        grid: ['mymod:cristal', 'mymod:cristal', 'mymod:cristal', '', 'default:stick', '', '', 'default:stick', ''],
      }),
    };
    project.elements.push(craftEl);
    project.elements.push({
      id: P.uid(),
      type: 'formspec',
      name: 'livre_de_recettes',
      props: Object.assign(P.defaults('formspec'), {
        title: 'Livre de recettes',
        width: 9,
        height: 9,
        bgcolor: '#2b2b2b',
        components: [
          { id: P.uid(), type: 'label', x: 0.5, y: 0.35, w: 4, h: 0.5, text: 'Livre de recettes', name: 'titre' },
          { id: P.uid(), type: 'image', x: 7.4, y: 0.2, w: 1, h: 1, text: '', tex: crystalTex, name: 'img' },
          { id: P.uid(), type: 'box', x: 0.4, y: 1.1, w: 8.2, h: 3.1, color: '#1b1b1b', name: 'cadre', w2: 0 },
          { id: P.uid(), type: 'textlist', x: 0.6, y: 1.3, w: 3.6, h: 2.7, text: '', items: 'Pioche en cristal\nDalle de pierre', name: 'recettes' },
          { id: P.uid(), type: 'item_image', x: 4.6, y: 1.4, w: 1.4, h: 1.4, item: 'mymod:pioche_cristal', name: 'apercu' },
          { id: P.uid(), type: 'list', x: 4.6, y: 3.0, w: 3, h: 1, inv: 'current_player', list: 'main', count: 3, name: 'inv' },
          { id: P.uid(), type: 'button', x: 0.5, y: 4.5, w: 2.4, h: 0.7, name: 'valider', text: 'Fabriquer' },
          { id: P.uid(), type: 'button_exit', x: 3.1, y: 4.5, w: 2.4, h: 0.7, name: 'fermer', text: 'Fermer' },
          { id: P.uid(), type: 'field', x: 0.5, y: 5.4, w: 4, h: 0.8, name: 'filtre', text: 'Filtrer', value: '' },
          { id: P.uid(), type: 'checkbox', x: 0.5, y: 6.4, w: 3, h: 0.6, name: 'montrer', text: 'Afficher les détails', selected: true },
        ],
      }),
    });
    return project;
  };

  P.bytesToDataUrl = bytesToDataUrl;
})();
