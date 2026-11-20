/* MTC creator — génération du code Lua Luanti à partir du projet. */
(function () {
  const MTC = (window.MTC = window.MTC || {});
  const G = (MTC.gen = {});

  G.SOUNDS = [
    ['', 'Aucun'],
    ['stone', 'Pierre'],
    ['wood', 'Bois'],
    ['dirt', 'Terre'],
    ['sand', 'Sable'],
    ['gravel', 'Gravier'],
    ['metal', 'Métal'],
    ['glass', 'Verre'],
    ['cloth', 'Tissu'],
    ['snow', 'Neige'],
    ['ice', 'Glace'],
    ['water', 'Eau'],
    ['leaves', 'Feuillage'],
  ];

  G.TOOL_KINDS = [
    ['pickaxe', 'Pioche'],
    ['axe', 'Hache'],
    ['shovel', 'Pelle'],
    ['sword', 'Épée'],
  ];

  G.TOOL_MATERIALS = {
    wood: { label: 'Bois', uses: 30, times: [2.6, 1.6, 1.2], maxlevel: 1, damage: 2 },
    stone: { label: 'Pierre', uses: 60, times: [2.0, 1.2, 0.8], maxlevel: 2, damage: 3 },
    steel: { label: 'Acier', uses: 120, times: [1.4, 0.9, 0.6], maxlevel: 2, damage: 4 },
    bronze: { label: 'Bronze', uses: 180, times: [1.2, 0.8, 0.5], maxlevel: 2, damage: 4 },
    mese: { label: 'Mese', uses: 300, times: [1.0, 0.6, 0.4], maxlevel: 3, damage: 5 },
    diamond: { label: 'Diamant', uses: 500, times: [0.8, 0.5, 0.3], maxlevel: 3, damage: 5 },
    obsidian: { label: 'Obsidienne', uses: 400, times: [1.2, 0.7, 0.5], maxlevel: 3, damage: 5 },
  };

  G.CAP_GROUP = { pickaxe: 'cracky', axe: 'choppy', shovel: 'crumbly' };

  function q(value) {
    return '"' + String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n') + '"';
  }
  G.q = q;

  function num(value, fallback) {
    const n = Number(value);
    return Number.isFinite(n) ? String(Math.round(n * 1000) / 1000) : String(fallback == null ? 0 : fallback);
  }
  G.num = num;

  function slug(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .replace(/^([0-9])/, 'x$1');
  }
  G.slug = slug;

  function registry(el, project) {
    return `${project.meta.modName}:${el.name}`;
  }
  G.registry = registry;

  function groupsToLua(text) {
    const parts = String(text || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return '{}';
    const entries = parts.map((part) => {
      const m = part.split('=');
      const key = slug(m[0]);
      const value = m.length > 1 ? Number(m[1]) : 1;
      return `${key} = ${Number.isFinite(value) ? value : 1}`;
    });
    return `{${entries.join(', ')}}`;
  }
  G.groupsToLua = groupsToLua;

  function soundLua(name) {
    if (!name) return '';
    return `\tsounds = default.node_sound_${name}_defaults(),\n`;
  }

  function fsFnName(el) {
    return 'mtc_show_' + (slug(el.name) || 'form');
  }
  G.fsFnName = fsFnName;

  function hasUnsafe(text) {
    return /[\]\\]/.test(String(text || ''));
  }

  /* Construit un argument de formspec sûr pour du texte libre. */
  function fsText(prefix, text, suffix) {
    const value = String(text == null ? '' : text);
    if (hasUnsafe(value)) return `${q(prefix)} .. minetest.formspec_escape(${q(value)}) .. ${q(suffix)}`;
    return q(prefix + value + suffix);
  }

  function texLua(value, fallback) {
    const t = String(value || fallback || '').trim();
    return t;
  }

  /* ---------- formspec ---------- */
  function formspecLines(el) {
    const lines = [];
    lines.push(`\t"formspec_version[4]",`);
    lines.push(`\t"size[${num(el.props.width, 8)},${num(el.props.height, 9)}]",`);
    if (el.props.bgcolor) lines.push(`\t"bgcolor[${el.props.bgcolor};false]",`);
    for (const c of el.props.components || []) {
      const x = num(c.x), y = num(c.y), w = num(c.w), h = num(c.h);
      switch (c.type) {
        case 'label':
          lines.push(`\t${fsText(`label[${x},${y};`, c.text, ']')},`);
          break;
        case 'vertlabel':
          lines.push(`\t${fsText(`vertlabel[${x},${y};`, c.text, ']')},`);
          break;
        case 'button':
        case 'button_exit': {
          const name = slug(c.name) || 'btn';
          lines.push(`\t${fsText(`${c.type}[${x},${y};${w},${h};${name};`, c.text, ']')},`);
          break;
        }
        case 'image':
          lines.push(`\t${q(`image[${x},${y};${w},${h};${texLua(c.tex, 'blank.png')}]`)},`);
          break;
        case 'image_button': {
          const name = slug(c.name) || 'btn';
          lines.push(`\t${fsText(`image_button[${x},${y};${w},${h};${texLua(c.tex, 'blank.png')};${name};`, c.text, ']')},`);
          break;
        }
        case 'item_image':
          lines.push(`\t${q(`item_image[${x},${y};${w || 1},${h || 1};${c.item || 'default:stone'}]`)},`);
          break;
        case 'box':
          lines.push(`\t${q(`box[${x},${y};${w},${h};${c.color || '#000000'}]`)},`);
          break;
        case 'list': {
          const inv = c.inv || 'current_player';
          const list = c.list || 'main';
          const count = Math.max(0, parseInt(c.count, 10) || 0);
          lines.push(`\t${q(`list[${x},${y};${w},${h};${inv};${list};0;${count}]`)},`);
          break;
        }
        case 'field': {
          const name = slug(c.name) || 'field';
          lines.push(`\t${fsText(`field[${x},${y};${w},${h};${name};`, c.text || '', `;${c.value || ''}]`)},`);
          break;
        }
        case 'textlist': {
          const name = slug(c.name) || 'list';
          lines.push(`\t${fsText(`textlist[${x},${y};${w},${h};${name};`, (c.items || '').replace(/\n/g, ','), `;0]`)},`);
          break;
        }
        case 'checkbox': {
          const name = slug(c.name) || 'check';
          lines.push(`\t${fsText(`checkbox[${x},${y};${name};`, c.text || '', `;${c.selected ? 'true' : 'false'}]`)},`);
          break;
        }
        case 'dropdown': {
          const name = slug(c.name) || 'dropdown';
          lines.push(`\t${fsText(`dropdown[${x},${y};${w};${name};`, (c.items || '').replace(/\n/g, ','), `;1]`)},`);
          break;
        }
        default:
          break;
      }
    }
    return lines;
  }

  function genFormspec(el, project, ctx) {
    const fn = fsFnName(el);
    const out = [];
    const needsEsc = (el.props.components || []).some(
      (c) => hasUnsafe(c.text) || hasUnsafe(c.items) || hasUnsafe(c.value)
    );
    out.push(`-- Formspec : ${el.props.title || el.name}`);
    out.push(`local function ${fn}(player)`);
    out.push(`\tif not player or not player:is_player() then return end`);
    if (needsEsc) out.push(`\tlocal E = minetest.formspec_escape`);
    out.push(`\tlocal formspec = table.concat({`);
    for (const line of formspecLines(el)) {
      out.push(needsEsc ? line.replace(/minetest\.formspec_escape/, 'E') : line);
    }
    out.push(`\t}, "\\n")`);
    out.push(`\tminetest.show_formspec(player:get_player_name(), ${q(registry(el, project))}, formspec)`);
    out.push(`end`);
    out.push('');
    const cmd = slug(`${project.meta.modName}_${el.name}`) || 'mtc_form';
    out.push(`minetest.register_chatcommand(${q(cmd)}, {`);
    out.push(`\tdescription = ${q('Ouvre : ' + (el.props.title || el.name))},`);
    out.push(`\tfunc = function(name)`);
    out.push(`\t\tlocal player = minetest.get_player_by_name(name)`);
    out.push(`\t\tif player then ${fn}(player) end`);
    out.push(`\tend,`);
    out.push(`})`);
    out.push('');
    return out.join('\n');
  }

  /* ---------- bloc ---------- */
  function genBlock(el, project) {
    const p = el.props;
    const out = [];
    out.push(`minetest.register_node(${q(registry(el, project))}, {`);
    out.push(`\tdescription = ${q(p.title || el.name)},`);

    const top = texLua(p.texTop, 'default_stone.png');
    const side = texLua(p.texSide, top);
    const bottom = texLua(p.texBottom, top);
    if (p.tilesMode === 'all') {
      out.push(`\ttiles = {${q(top)}},`);
    } else {
      out.push(`\ttiles = {`);
      out.push(`\t\t${q(top)}, -- dessus`);
      out.push(`\t\t${q(bottom)}, -- dessous`);
      out.push(`\t\t${q(side)}, -- droite`);
      out.push(`\t\t${q(side)}, -- gauche`);
      out.push(`\t\t${q(side)}, -- arrière`);
      out.push(`\t\t${q(side)}, -- avant`);
      out.push(`\t},`);
    }

    out.push(`\tgroups = ${groupsToLua(p.groups)},`);
    if (p.walkable === false) out.push(`\twalkable = false,`);
    if (p.pointable === false) out.push(`\tpointable = false,`);
    if (p.diggable === false) out.push(`\tdiggable = false,`);
    if (p.sunlight) out.push(`\tsunlight_propagates = true,`);
    if (p.ground) out.push(`\tis_ground_content = true,`);
    const light = parseInt(p.light, 10);
    if (light > 0) out.push(`\tlight_source = ${Math.min(14, light)},`);
    if (!p.dropSelf && p.drop) out.push(`\tdrop = ${q(p.drop)},`);
    if (p.sounds) out.push(soundLua(p.sounds).trimEnd());

    if (p.formspecId) {
      const fs = (project.elements || []).find((e) => e.id === p.formspecId && e.type === 'formspec');
      if (fs) {
        out.push(`\ton_rightclick = function(pos, node, clicker)`);
        out.push(`\t\tif clicker and clicker:is_player() then ${fsFnName(fs)}(clicker) end`);
        out.push(`\tend,`);
      }
    }
    out.push(`})`);
    out.push('');
    return out.join('\n');
  }

  /* ---------- item ---------- */
  function genItem(el, project) {
    const p = el.props;
    const out = [];
    out.push(`minetest.register_craftitem(${q(registry(el, project))}, {`);
    out.push(`\tdescription = ${q(p.title || el.name)},`);
    out.push(`\tinventory_image = ${q(texLua(p.texture, 'default_tool_steelsword.png'))},`);
    const stack = parseInt(p.stackMax, 10);
    out.push(`\tstack_max = ${Number.isFinite(stack) ? stack : 99},`);
    out.push(`\tgroups = ${groupsToLua(p.groups)},`);
    if (p.formspecId) {
      const fs = (project.elements || []).find((e) => e.id === p.formspecId && e.type === 'formspec');
      if (fs) {
        out.push(`\ton_use = function(itemstack, user, pointed_thing)`);
        out.push(`\t\tif user and user:is_player() then ${fsFnName(fs)}(user) end`);
        out.push(`\t\treturn itemstack`);
        out.push(`\tend,`);
      }
    }
    out.push(`})`);
    out.push('');
    return out.join('\n');
  }

  /* ---------- outil ---------- */
  function genTool(el, project) {
    const p = el.props;
    const preset = G.TOOL_MATERIALS[p.material] || G.TOOL_MATERIALS.steel;
    const uses = parseInt(p.uses, 10);
    const maxlevel = parseInt(p.maxlevel, 10) || preset.maxlevel;
    const damage = parseInt(p.damage, 10);
    const interval = Number(p.punch) || 0.9;
    const out = [];
    out.push(`minetest.register_tool(${q(registry(el, project))}, {`);
    out.push(`\tdescription = ${q(p.title || el.name)},`);
    out.push(`\tinventory_image = ${q(texLua(p.texture, 'default_tool_steelsword.png'))},`);
    out.push(`\ttool_capabilities = {`);
    out.push(`\t\tfull_punch_interval = ${num(interval, 0.9)},`);
    out.push(`\t\tmax_drop_level = ${maxlevel},`);
    const cap = G.CAP_GROUP[p.kind];
    if (cap) {
      const times = preset.times;
      out.push(`\t\tgroupcaps = {`);
      out.push(
        `\t\t\t${cap} = {times = {[1] = ${num(times[0])}, [2] = ${num(times[1])}, [3] = ${num(times[2])}}, uses = ${
          Number.isFinite(uses) ? uses : preset.uses
        }, maxlevel = ${maxlevel}},`
      );
      out.push(`\t\t},`);
    }
    out.push(`\t\tdamage_groups = {fleshy = ${Number.isFinite(damage) ? damage : preset.damage}},`);
    out.push(`\t},`);
    out.push(`\tgroups = ${groupsToLua(p.groups || 'tool')},`);
    out.push(`})`);
    out.push('');
    return out.join('\n');
  }

  /* ---------- recette ---------- */
  function trimGrid(grid) {
    const rows = [0, 1, 2].map((r) => [0, 1, 2].map((c) => String(grid[r * 3 + c] || '').trim()));
    const used = rows.map((r) => r.some(Boolean));
    const colsUsed = [0, 1, 2].map((c) => rows.some((r) => r[c]));
    const keepRows = rows.filter((_, i) => used[i]);
    if (!keepRows.length) return [['', '', '']];
    const firstCol = colsUsed.indexOf(true);
    const lastCol = colsUsed.lastIndexOf(true);
    return keepRows.map((r) => r.slice(firstCol, lastCol + 1));
  }

  function genCraft(el, project) {
    const p = el.props;
    const out = [];
    out.push(`-- Recette : ${p.title || el.name}`);
    out.push(`minetest.register_craft({`);
    if (p.kind === 'cooking') {
      const time = parseInt(p.cooktime, 10) || 10;
      out.push(`\ttype = "cooking",`);
      out.push(`\trecipe = ${q(p.input || 'default:stone')},`);
      out.push(`\toutput = ${q(p.output || 'default:stone')},`);
      out.push(`\tcooktime = ${time},`);
    } else if (p.kind === 'shapeless') {
      const items = String(p.shapeless || '')
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      out.push(`\ttype = "shapeless",`);
      out.push(`\trecipe = {${items.map(q).join(', ')}},`);
      out.push(`\toutput = ${q(p.output || 'default:stone')},`);
    } else {
      const grid = trimGrid(p.grid || []);
      out.push(`\trecipe = {`);
      for (const row of grid) out.push(`\t\t{${row.map(q).join(', ')}},`);
      out.push(`\t},`);
      out.push(`\toutput = ${q(p.output || 'default:stone')},`);
    }
    out.push(`})`);
    out.push('');
    return out.join('\n');
  }

  G.genBlock = genBlock;
  G.genItem = genItem;
  G.genTool = genTool;
  G.genCraft = genCraft;
  G.genFormspec = genFormspec;

  G.genElement = function (el, project) {
    switch (el.type) {
      case 'block': return genBlock(el, project);
      case 'item': return genItem(el, project);
      case 'tool': return genTool(el, project);
      case 'craft': return genCraft(el, project);
      case 'formspec': return genFormspec(el, project);
      default: return '';
    }
  };

  G.genInit = function (project) {
    const els = project.elements || [];
    const head = [];
    head.push('-- ' + (project.meta.title || project.meta.modName) + ' — mod Luanti');
    head.push('-- Généré avec MTC creator' + (project.meta.author ? ' · ' + project.meta.author : ''));
    head.push('-- Fichier : init.lua');
    head.push('');
    const parts = [];
    const headings = { formspec: 'FORMSPECS', block: 'BLOCS', item: 'ITEMS', tool: 'OUTILS', craft: 'RECETTES' };
    for (const type of ['formspec', 'block', 'item', 'tool', 'craft']) {
      const group = els.filter((e) => e.type === type);
      if (!group.length) continue;
      parts.push(`-- ===== ${headings[type]} =====`);
      parts.push('');
      for (const el of group) parts.push(G.genElement(el, project));
    }
    if (!parts.length) parts.push('-- Aucun élément pour le moment : ajoutez un bloc, un item ou une formspec dans MTC creator.');
    return head.join('\n') + '\n' + parts.join('\n');
  };

  G.genModConf = function (project) {
    const m = project.meta;
    const lines = [
      `title = ${m.title || m.modName}`,
      `description = ${m.description || 'Mod créé avec MTC creator'}`,
      `author = ${m.author || 'inconnu'}`,
      `release = ${m.version || '1.0'}`,
      `license = ${m.license || 'MIT'}`,
      `depends = ${(m.depends || []).join(', ')}`,
    ];
    if ((m.optionalDepends || []).length) lines.push(`optional_depends = ${m.optionalDepends.join(', ')}`);
    return lines.join('\n') + '\n';
  };

  G.files = function (project) {
    const files = [
      { path: `${project.meta.modName}/mod.conf`, text: G.genModConf(project) },
      { path: `${project.meta.modName}/init.lua`, text: G.genInit(project) },
    ];
    return files;
  };
})();
