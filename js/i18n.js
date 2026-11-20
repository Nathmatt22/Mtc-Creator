/* MTC creator — internationalisation (français par défaut, anglais disponible).
   t() prend le texte français comme clé et renvoie la traduction de la langue active.
   Les valeurs `{nom}` sont remplacées par les variables passées en second argument. */
(function () {
  const MTC = (window.MTC = window.MTC || {});
  const STORAGE_KEY = 'mtc-creator:lang';
  const SUPPORTED = ['fr', 'en'];

  const EN = {
    /* --- interface statique --- */
    'MTC creator — éditeur de mods pour Luanti': 'MTC creator — mod editor for Luanti',
    'Fichier': 'File',
    'Français': 'French',
    'Nouveau projet': 'New project',
    'Ouvrir un projet (.mtc.json)': 'Open project (.mtc.json)',
    'Importer un mod existant…': 'Import existing mod…',
    'Enregistrer le projet': 'Save project',
    'Exporter le projet (.mtc.json)': 'Export project (.mtc.json)',
    'Exporter le mod en ZIP': 'Export mod as ZIP',
    'Éléments': 'Elements',
    'Nouveau bloc': 'New block',
    'Nouvel item': 'New item',
    'Nouvel outil': 'New tool',
    'Nouvelle recette': 'New recipe',
    'Nouvelle formspec': 'New formspec',
    'Ressources': 'Resources',
    'Textures du mod': 'Mod textures',
    'Importer une image…': 'Import an image…',
    'Éditeur de texture': 'Texture editor',
    'Affichage': 'View',
    'Code généré': 'Generated code',
    'Console': 'Console',
    "Charger le projet d'exemple": 'Load sample project',
    'Aide': 'Help',
    'Fonctionnement & export': 'How it works & export',
    "Documentation de l'API Luanti": 'Luanti API documentation',
    'Sauvegarde locale': 'Local save',
    'Nouveau': 'New',
    'Importer': 'Import',
    'Enregistrer': 'Save',
    'Enregistrer (Ctrl+S)': 'Save (Ctrl+S)',
    '＋ Bloc': '＋ Block',
    '＋ Item': '＋ Item',
    '＋ Outil': '＋ Tool',
    '＋ Recette': '＋ Recipe',
    '＋ Formspec': '＋ Formspec',
    'Code': 'Code',
    'Textures': 'Textures',
    'Éléments du mod': 'Mod elements',
    'Filtrer les éléments': 'Filter elements',
    '＋ Élément': '＋ Element',
    'Sortie': 'Output',
    'prêt': 'ready',
    'Effacer': 'Clear',
    'Réduire': 'Collapse',
    'Rechercher un élément…': 'Search for an element…',

    /* --- types d'éléments --- */
    'Bloc': 'Block',
    'Blocs': 'Blocks',
    'Item': 'Item',
    'Items': 'Items',
    'Outil': 'Tool',
    'Outils': 'Tools',
    'Recette': 'Recipe',
    'Recettes': 'Recipes',
    'Formspec': 'Formspec',
    'Formspecs': 'Formspecs',
    'Élément': 'Element',
    'Éléments': 'Elements',

    /* --- compteurs --- */
    '{n} élément(s)': '{n} element(s)',
    '{n} texture(s)': '{n} texture(s)',
    '{n} fichier(s)': '{n} file(s)',
    '{n} composant(s)': '{n} component(s)',
    '{n} ligne(s)': '{n} line(s)',
    '{n} utilisation(s)': '{n} use(s)',

    /* --- onglets / arbre / espace de travail --- */
    'Espace': 'Space',
    'Fermer': 'Close',
    'Espace de travail': 'Workspace',
    'Tous': 'All',
    'Aucun élément': 'No elements',
    'Changez de filtre ou créez un bloc, un item, un outil, une recette ou une formspec.':
      'Change the filter or create a block, item, tool, recipe or formspec.',
    'Créer un bloc': 'Create a block',
    'Créer une formspec': 'Create a formspec',
    'Créer un item': 'Create an item',
    'Importer un mod': 'Import a mod',
    "Projet d'exemple": 'Sample project',
    'Votre mod commence ici': 'Your mod starts here',
    "MTC creator génère un mod Luanti complet : blocs, items, outils, recettes de fabrication et interfaces (formspecs). À l'export, vous obtenez un ZIP prêt à déposer dans le dossier {path} de votre monde.":
      "MTC creator generates a complete Luanti mod: blocks, items, tools, crafting recipes and interfaces (formspecs). On export you get a ZIP ready to drop into your world's {path} folder.",
    'Aucun élément pour le moment.': 'No elements yet.',
    "Utilisez « ＋ Élément » ou la barre d'outils.": 'Use “＋ Element” or the toolbar.',
    'Aucun élément ne correspond au filtre.': 'No element matches the filter.',
    'Supprimer': 'Delete',
    'Dupliquer': 'Duplicate',

    /* --- résumés de cartes --- */
    'Bloc placé dans le monde. Groupes : {groups}.': 'Block placed in the world. Groups: {groups}.',
    'aucun': 'none',
    'Émet une lumière de {n}.': 'Emits light level {n}.',
    "Objet d'inventaire empilable par {n}.{groups}": 'Inventory item stacking up to {n}.{groups}',
    ' Groupes : {groups}.': ' Groups: {groups}.',
    '{kind} en {material} · {n} utilisation(s) · dégâts {damage}.':
      '{kind} made of {material} · {n} use(s) · {damage} damage.',
    'Cuisson de {input} vers {output}.': 'Smelting {input} into {output}.',
    'Recette avec forme → {output}.': 'Shaped recipe → {output}.',
    'Recette sans forme → {output}.': 'Shapeless recipe → {output}.',
    'aucun résultat': 'no output',
    "Interface à {n} composants, {w}×{h} unités. S'ouvre avec une commande ou au clic droit.":
      'Interface with {n} components, {w}×{h} units. Opens with a command or on right-click.',

    /* --- outils, sons, matériaux --- */
    'Pioche': 'Pickaxe',
    'Hache': 'Axe',
    'Pelle': 'Shovel',
    'Épée': 'Sword',
    'Bois': 'Wood',
    'Pierre': 'Stone',
    'Acier': 'Steel',
    'Bronze': 'Bronze',
    'Mese': 'Mese',
    'Diamant': 'Diamond',
    'Obsidienne': 'Obsidian',
    'Aucun': 'None',
    'Terre': 'Dirt',
    'Sable': 'Sand',
    'Gravier': 'Gravel',
    'Métal': 'Metal',
    'Verre': 'Glass',
    'Tissu': 'Cloth',
    'Neige': 'Snow',
    'Glace': 'Ice',
    'Eau': 'Water',
    'Feuillage': 'Leaves',

    /* --- champs / sections --- */
    '— aucune —': '— none —',
    'Textures de default': 'default textures',
    'Copier': 'Copy',
    'Aucune interaction': 'No interaction',
    'Code généré pour cet élément': 'Generated code for this element',
    'Identité': 'Identity',
    'Apparence': 'Appearance',
    'Propriétés physiques': 'Physical properties',
    'Groupes & minage': 'Groups & mining',
    'Interaction': 'Interaction',
    'Caractéristiques': 'Properties',
    'Résultat': 'Result',
    'Groupes': 'Groups',
    'Identifiant': 'Identifier',
    'Nom affiché': 'Display name',
    'Son de minage': 'Mining sound',
    'Lumière émise': 'Light emitted',
    'Type de textures': 'Texture mode',
    'Une texture pour tout le bloc': 'One texture for the whole block',
    'Textures différentes par face': 'Different textures per face',
    'Texture du bloc': 'Block texture',
    'Dessus': 'Top',
    'Côtés': 'Sides',
    'Dessous': 'Bottom',
    'Les joueurs marchent dessus (walkable)': 'Players can walk on it (walkable)',
    'Peut être visé (pointable)': 'Can be pointed at (pointable)',
    'Peut être miné (diggable)': 'Can be dug (diggable)',
    'La lumière du soleil traverse (sunlight_propagates)': 'Sunlight passes through (sunlight_propagates)',
    'Fait partie du sol du monde (is_ground_content)': 'Part of the world ground (is_ground_content)',
    'Le bloc se récupère lui-même quand on le mine': 'The block drops itself when mined',
    'Objet lâché': 'Dropped item',
    'Clic droit : ouvrir une formspec': 'Right-click: open a formspec',
    'Taille de pile': 'Stack size',
    "Image d'inventaire": 'Inventory image',
    "Type d'outil": 'Tool type',
    'Matériau': 'Material',
    'Utilisations': 'Uses',
    'Dégâts': 'Damage',
    'Niveau max (maxlevel)': 'Max level (maxlevel)',
    'Intervalle de frappe': 'Punch interval',
    'Ingrédient': 'Ingredient',
    'Temps de cuisson': 'Cooking time',
    'Ingrédients (un par ligne)': 'Ingredients (one per line)',
    'vide': 'empty',
    'Disposition': 'Layout',
    'Nom': 'Name',
    'Type': 'Type',
    'Avec forme (grille 3×3)': 'Shaped (3×3 grid)',
    'Sans forme': 'Shapeless',
    'Cuisson': 'Cooking',
    'Objet produit': 'Output item',

    /* --- aides de champs --- */
    'minuscules, chiffres et « _ » — utilisé dans {code}': 'lowercase letters, digits and “_” — used in {code}',
    '0 = aucune, 14 = comme une torche': '0 = none, 14 = like a torch',
    "ex. {code} — détermine l'outil efficace et la résistance.":
      'e.g. {code} — sets the effective tool and hardness.',
    "La fonction de la formspec est générée avant les blocs, l'appel est direct.":
      'The formspec function is generated before blocks, so it can be called directly.',
    'utilisé dans {code}': 'used in {code}',
    'ex. craftitem=1': 'e.g. craftitem=1',
    'Changer de matériau met à jour les valeurs ci-dessous.': 'Changing material updates the values below.',
    'Cases vides autorisées. Les lignes et colonnes vides sont retirées à la génération.<br><br>Utilisez des identifiants complets, ex. {code}.':
      'Empty slots allowed. Empty rows and columns are removed on generation.<br><br>Use full item strings, e.g. {code}.',
    "Identifiant complet, éventuellement suivi d'une quantité : {code}.":
      'Full item string, optionally followed by a count: {code}.',
    'Les images importées sont exportées dans {path} et référencées par leur nom complet.':
      'Imported images are exported to {path} and referenced by their full name.',

    /* --- éditeur de formspec --- */
    'Interface': 'Interface',
    'Titre': 'Title',
    'Largeur (unités)': 'Width (units)',
    'Hauteur (unités)': 'Height (units)',
    'Couleur de fond': 'Background color',
    'Équivalent de {code}.': 'Equivalent to {code}.',
    'Glissez pour placer · poignée en bas à droite pour redimensionner':
      'Drag to place · bottom-right handle to resize',
    '1 unité = {n} px': '1 unit = {n} px',
    'Composants': 'Components',
    'Ajouter': 'Add',
    "Les propriétés du composant sélectionné s'affichent dans le panneau de droite.":
      "The selected component's properties appear in the right panel.",
    'Aucun composant. Ajoutez-en avec les boutons ci-dessous.': 'No components. Add some with the buttons below.',
    'Redimensionner': 'Resize',
    'Champ': 'Field',
    'Menu': 'Menu',
    'Composant · {type}': 'Component · {type}',
    'Largeur': 'Width',
    'Hauteur': 'Height',
    'Texte': 'Text',
    'Nom du champ': 'Field name',
    'transmis à {code}': 'passed to {code}',
    'Couleur': 'Color',
    'Inventaire': 'Inventory',
    'Nom de liste': 'List name',
    'Slots affichés': 'Visible slots',
    'Entrées (une par ligne)': 'Entries (one per line)',
    'Valeur par défaut': 'Default value',
    'Cochée par défaut': 'Checked by default',
    'Dupliquer ce composant': 'Duplicate this component',
    'Supprimer ce composant': 'Delete this component',
    'Astuce : les coordonnées sont en unités formespec (comme {code}).':
      'Tip: coordinates are in formspec units (like {code}).',
    'Taille {w}×{h} unités, {n} composant(s).': 'Size {w}×{h} units, {n} component(s).',
    "Sélectionnez un composant dans l'aperçu ou dans la liste pour modifier ses propriétés.":
      'Select a component in the preview or the list to edit its properties.',
    'Ouverture en jeu': 'Opening in game',
    'Une commande {code} est générée. Vous pouvez aussi lier cette formspec à un bloc ou un item depuis son éditeur.':
      'A {code} command is generated. You can also bind this formspec to a block or item from its editor.',

    /* --- composants de formspec --- */
    'Bouton': 'Button',
    'Bouton fermer': 'Close button',
    'Image': 'Image',
    'Bouton image': 'Image button',
    "Image d'item": 'Item image',
    'Panneau': 'Panel',
    'Champ texte': 'Text field',
    'Liste': 'List',
    'Case à cocher': 'Checkbox',
    'Menu déroulant': 'Dropdown',
    'Textes': 'Texts',
    'Boutons': 'Buttons',
    'Décor': 'Decor',
    'Cases': 'Checkboxes',
    'Menus': 'Menus',
    'Champs': 'Fields',

    /* --- inspecteur --- */
    'Projet': 'Project',
    'Identifiant du mod': 'Mod identifier',
    'nom du dossier dans {path}': 'folder name in {path}',
    'Description': 'Description',
    'Auteur': 'Author',
    'Licence': 'License',
    'Version': 'Version',
    'Dépendances': 'Dependencies',
    'séparées par des virgules, ex. {code}': 'comma-separated, e.g. {code}',
    'Dépendances optionnelles': 'Optional dependencies',
    'Contenu': 'Content',
    'Lignes de Lua': 'Lua lines',
    'Voir le code généré': 'View generated code',
    "Les modifications sont enregistrées automatiquement dans ce navigateur. L'export ZIP crée un dossier {folder} avec {conf}, {init} et les textures.":
      'Changes are saved automatically in this browser. The ZIP export creates a {folder} folder with {conf}, {init} and the textures.',
    'Aperçu': 'Preview',
    'Registre': 'Registry',
    'Minage': 'Mining',
    'oui': 'yes',
    'non': 'no',
    'Pile': 'Stack',
    'Résumé': 'Summary',
    "Dupliquer l'élément": 'Duplicate element',
    'Gérer les textures': 'Manage textures',
    'Code du mod complet': 'Full mod code',
    'Fichiers': 'Files',
    'Poids des données': 'Data size',
    "Dossier d'export": 'Export folder',
    'Importer des images': 'Import images',
    'Formats acceptés : PNG, JPEG, WebP et GIF. Pour un rendu net dans Luanti, préférez des PNG de 16×16 ou 32×32 pixels.':
      'Accepted formats: PNG, JPEG, WebP and GIF. For crisp rendering in Luanti, prefer 16×16 or 32×32 PNGs.',
    'Fichiers générés': 'Generated files',
    "Le fichier {init} regroupe formspecs, blocs, items, outils puis recettes, dans cet ordre : les fonctions de formspec sont définies avant les nœuds qui les appellent.":
      'The {init} file groups formspecs, blocks, items, tools then recipes, in that order: formspec functions are defined before the nodes that call them.',

    /* --- textures --- */
    '{n} fichier(s) · exportés dans {prefix}…': '{n} file(s) · exported as {prefix}…',
    'Glissez des images ici': 'Drop images here',
    'ou utilisez « Importer des images » · PNG, JPEG, WebP, GIF':
      'or use “Import images” · PNG, JPEG, WebP, GIF',
    'Aucune texture importée': 'No textures imported',
    'Ajoutez vos images : elles seront copiées dans le dossier {path} du ZIP exporté. Vous pouvez aussi référencer les textures du mod {default}.':
      'Add your images: they will be copied to the {path} folder of the exported ZIP. You can also reference textures from the {default} mod.',
    'Le dessin de textures directement dans MTC creator (pinceau, calques, motifs) est prévu pour une prochaine version. En attendant, importez vos PNG ou utilisez les textures de {default}.':
      'Drawing textures directly in MTC creator (brush, layers, patterns) is planned for a future version. Meanwhile, import your PNGs or use the {default} textures.',
    'En savoir plus': 'Learn more',
    'Ko': 'KB',

    /* --- vue code --- */
    'Aperçu de ce que contiendra le ZIP exporté': 'Preview of what the exported ZIP will contain',
    'Exporter le ZIP': 'Export ZIP',
    'Télécharger': 'Download',
    'Aucune texture pour le moment.': 'No textures yet.',

    /* --- dialogues --- */
    'Annuler': 'Cancel',
    'Créer le projet': 'Create project',
    'Mon mod': 'My mod',
    'Votre pseudo': 'Your nickname',
    'Choisissez les informations du mod. Elles deviendront le fichier {file}.':
      'Choose the mod information. It becomes the {file} file.',
    "Le projet actuel sera remplacé. Pensez à l'exporter si nécessaire.":
      'The current project will be replaced. Export it first if needed.',
    'Importer un mod existant': 'Import an existing mod',
    '<p>Importez un mod Luanti existant pour le modifier dans MTC creator. Le fichier <code>mod.conf</code>, les textures et les définitions Lua reconnues seront convertis en éléments éditables.</p>':
      '<p>Import an existing Luanti mod to edit it in MTC creator. Its <code>mod.conf</code>, textures and recognized Lua definitions are converted into editable elements.</p>',
    '<p style="color:#8f9199;font-size:11.5px">Formats : ZIP du mod, ou dossier contenant <code>init.lua</code>. Les formspecs existantes ne sont pas importées.</p>':
      '<p style="color:#8f9199;font-size:11.5px">Formats: mod ZIP, or a folder containing <code>init.lua</code>. Existing formspecs are not imported.</p>',
    'Fichier ZIP…': 'ZIP file…',
    'Dossier du mod…': 'Mod folder…',
    'Importer ce mod ?': 'Import this mod?',
    'Remplacer le projet': 'Replace project',
    'Supprimer cet élément ?': 'Delete this element?',
    'Supprimer cette texture ?': 'Delete this texture?',
    "Charger le projet d'exemple ?": 'Load the sample project?',
    "Charger l'exemple": 'Load sample',
    "Un mod de démonstration (bloc, item, outil, recette et formspec avec textures générées) remplacera le projet actuel.":
      'A demo mod (block, item, tool, recipe and formspec with generated textures) will replace the current project.',
    'Compris': 'Got it',
    "L'éditeur de texture (pinceau, calques, motifs, export PNG) sera ajouté dans une prochaine version de MTC creator.":
      'The texture editor (brush, layers, patterns, PNG export) will be added in a future version of MTC creator.',
    'En attendant, vous pouvez importer vos images avec « Importer des images » : elles sont stockées dans le projet et incluses dans le ZIP.':
      'Meanwhile, you can import your images with “Import images”: they are stored in the project and included in the ZIP.',

    /* --- aide --- */
    'Construire un mod': 'Building a mod',
    '<li><b>Blocs</b> : texture(s), sons, groupes de minage, lumière, drop, et ouverture d\'une formspec au clic droit.</li>':
      '<li><b>Blocks</b>: texture(s), sounds, mining groups, light, drops, and opening a formspec on right-click.</li>',
    "<li><b>Items</b> : image d'inventaire, taille de pile, groupes, ouverture d'une formspec à l'utilisation.</li>":
      '<li><b>Items</b>: inventory image, stack size, groups, opening a formspec on use.</li>',
    "<li><b>Outils</b> : type, matériau, utilisations, dégâts — les <code>tool_capabilities</code> sont générées comme dans <code>default</code>.</li>":
      '<li><b>Tools</b>: type, material, uses, damage — <code>tool_capabilities</code> are generated like in <code>default</code>.</li>',
    '<li><b>Recettes</b> : avec forme (grille 3×3), sans forme, ou cuisson.</li>':
      '<li><b>Recipes</b>: shaped (3×3 grid), shapeless, or cooking.</li>',
    "<li><b>Formspecs</b> : éditeur visuel par glisser-déposer, génération d'une fonction et d'une commande de test.</li>":
      '<li><b>Formspecs</b>: visual drag-and-drop editor, plus a generated function and test command.</li>',
    'Importez vos PNG : chaque fichier est exporté dans <code>textures/</code> et référencé par son nom exact (préfixe du mod compris). Les textures du mod <code>default</code> restent utilisables telles quelles.':
      'Import your PNGs: each file is exported to <code>textures/</code> and referenced by its exact name (mod prefix included). Textures from the <code>default</code> mod remain usable as-is.',
    '<p>Le ZIP contient un dossier <code>&lt;mod&amp;gt;/</code> avec <code>mod.conf</code>, <code>init.lua</code> et <code>textures/</code>. Copiez ce dossier (ou le ZIP) dans <code>mods/</code>, activez le mod dans un monde, puis testez la commande indiquée par chaque formspec.</p>':
      '<p>The ZIP contains a <code>&lt;mod&amp;gt;/</code> folder with <code>mod.conf</code>, <code>init.lua</code> and <code>textures/</code>. Copy that folder (or the ZIP) into <code>mods/</code>, enable the mod in a world, then try the command shown for each formspec.</p>',
    '<p>« Importer un mod existant » lit un ZIP ou un dossier de mod : <code>mod.conf</code>, textures et définitions <code>register_node</code>, <code>register_craftitem</code>, <code>register_tool</code>, <code>register_craft</code> sont convertis en éléments éditables. L\'analyse du Lua est volontairement simple : les définitions très dynamiques peuvent être partiellement reprises.</p>':
      '<p>“Import an existing mod” reads a mod ZIP or folder: <code>mod.conf</code>, textures and <code>register_node</code>, <code>register_craftitem</code>, <code>register_tool</code>, <code>register_craft</code> definitions are converted into editable elements. The Lua analysis is deliberately simple: highly dynamic definitions may be only partially captured.</p>',
    '<p><code>Ctrl+S</code> enregistre le projet dans le navigateur. L\'export ZIP reste le moyen d\'obtenir un mod jouable.</p>':
      '<p><code>Ctrl+S</code> saves the project in the browser. The ZIP export remains the way to get a playable mod.</p>',

    /* --- confirmations et messages --- */
    '« {name} » contient {counts} et {n} texture(s).<br><br>Le projet actuel sera remplacé.':
      '“{name}” contains {counts} and {n} texture(s).<br><br>The current project will be replaced.',
    '« {name} » sera retiré du projet. Cette action est immédiate (le projet reste enregistré dans le navigateur).':
      '“{name}” will be removed from the project. This is immediate (the project stays saved in the browser).',
    "« {name} » sera retirée du projet et du ZIP exporté. Les éléments qui l'utilisent afficheront un avertissement.":
      '“{name}” will be removed from the project and the exported ZIP. Elements using it will show a warning.',
    'Sauvegarde locale impossible (stockage plein ?). Pensez à exporter votre projet.':
      'Local save failed (storage full?). Consider exporting your project.',
    'Enregistré à {time}': 'Saved at {time}',
    'Sauvegarde impossible': 'Save failed',
    'Projet enregistré dans le navigateur.': 'Project saved in the browser.',
    'Échec de la sauvegarde locale.': 'Local save failed.',
    'Projet enregistré': 'Project saved',
    'Bienvenue dans MTC creator. Créez un élément, importez un mod existant ou chargez le projet d\'exemple.':
      'Welcome to MTC creator. Create an element, import an existing mod, or load the sample project.',
    'Export : un ZIP contenant mod.conf, init.lua et textures/, prêt pour le dossier mods/.':
      'Export: a ZIP containing mod.conf, init.lua and textures/, ready for the mods/ folder.',
    'Projet « {name} » restauré depuis ce navigateur.': 'Project “{name}” restored from this browser.',
    'Impossible de lire {name}.': 'Could not read {name}.',
    '{n} texture(s) importée(s).': '{n} texture(s) imported.',
    'Import ZIP impossible : {msg}': 'ZIP import failed: {msg}',
    'Import impossible : {msg}': 'Import failed: {msg}',
    'Import du dossier impossible : {msg}': 'Folder import failed: {msg}',
    'Mod importé depuis {source} : {n} élément(s), {m} texture(s).':
      'Mod imported from {source}: {n} element(s), {m} texture(s).',
    'Mod importé': 'Mod imported',
    'Dépendance(s) ajoutée(s) automatiquement : {list}.': 'Dependencies added automatically: {list}.',
    'Le projet ne contient aucun élément : le ZIP sera presque vide.':
      'The project has no elements: the ZIP will be almost empty.',
    'Textures référencées mais absentes du projet : {list}.': 'Textures referenced but missing from the project: {list}.',
    'ZIP exporté : {n} fichier(s), {size} Ko.': 'ZIP exported: {n} file(s), {size} KB.',
    'Mod exporté en ZIP': 'Mod exported as ZIP',
    'Export impossible : {msg}': 'Export failed: {msg}',
    'Projet exporté en .mtc.json.': 'Project exported as .mtc.json.',
    'Projet exporté': 'Project exported',
    'Format de projet non reconnu.': 'Unrecognized project format.',
    'Projet ouvert : {name}.': 'Project opened: {name}.',
    'Projet ouvert': 'Project opened',
    'Ouverture impossible : {msg}': 'Could not open: {msg}',
    'Fichier de projet invalide': 'Invalid project file',
    'erreur': 'error',
    'avertissement': 'warning',
    'Copié dans le presse-papiers': 'Copied to clipboard',
    "Copie impossible : le navigateur a refusé l'accès au presse-papiers.":
      'Copy failed: the browser denied clipboard access.',
    'Fichier téléchargé : {name}.': 'File downloaded: {name}.',
    'Nouveau projet « {title} » ({mod}).': 'New project “{title}” ({mod}).',
    'Élément supprimé : {name}.': 'Element deleted: {name}.',
    'Élément dupliqué : {name}.': 'Element duplicated: {name}.',
    '{type} « {name} » créé.': '{type} “{name}” created.',
    'Texture supprimée : {name}.': 'Texture deleted: {name}.',
    "Projet d'exemple chargé : dalles, cristal, pioche et livre de recettes.":
      'Sample project loaded: tiles, crystal, pickaxe and recipe book.',
    "Projet d'exemple chargé": 'Sample project loaded',
    'dossier importé': 'imported folder',
    'Le projet actuel sera remplacé.': 'The current project will be replaced.',

    /* --- contenu d'exemple --- */
    'Mon premier mod': 'My first mod',
    'Dalles de pierre, cristaux et une interface de test.': 'Stone tiles, crystals and a test interface.',
    'Dalle de pierre': 'Stone tile',
    'Cristal de mese': 'Mese crystal',
    'Pioche en cristal': 'Crystal pickaxe',
    'Livre de recettes': 'Recipe book',
    'Fabriquer': 'Craft',
    'Filtrer': 'Filter',
    'Afficher les détails': 'Show details',
    'Nouvelle interface': 'New interface',
    'Mon interface': 'My interface',
    'Texture': 'Texture',
    'Export ZIP': 'Export ZIP',
    'Raccourcis': 'Shortcuts',
    'aucun élément reconnu': 'no recognized element',
    'Un mod Luanti créé avec MTC creator.': 'A Luanti mod created with MTC creator.',
    "Langue de l'interface : {lang}.": 'Interface language: {lang}.',
    'minuscules, chiffres et « _ ». Ce sera le nom du dossier dans {path}.':
      'lowercase letters, digits and “_”. This will be the folder name in {path}.',
    '{n} fichier(s) · exportés dans {prefix}': '{n} file(s) · exported as {prefix}',
    '{kind} en {material} · {n} utilisations · dégâts {damage}.':
      '{kind} made of {material} · {n} uses · {damage} damage.',
    '{n} élément': '{n} element',
    '{n} éléments': '{n} elements',
    '{n} texture': '{n} texture',
    '{n} textures': '{n} textures',
    '{n} fichier': '{n} file',
    '{n} fichiers': '{n} files',
    '{n} ligne': '{n} line',
    '{n} lignes': '{n} lines',
    'Aucun fichier init.lua trouvé : ce ZIP ne ressemble pas à un mod Luanti.':
      'No init.lua found: this ZIP does not look like a Luanti mod.',
    'Archive ZIP invalide (fin de répertoire introuvable).': 'Invalid ZIP archive (end of central directory not found).',
    'Ce navigateur ne peut pas décompresser les fichiers ZIP.': 'This browser cannot decompress ZIP files.',
    'Compression ZIP non prise en charge (méthode {method}) pour {name}.':
      'Unsupported ZIP compression (method {method}) for {name}.',
    'BLOC': 'BLOCK',
    'OUTIL': 'TOOL',
    'RECETTE': 'RECIPE',
  };

  const DICTS = { en: EN };
  let lang = 'fr';

  function detect() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && SUPPORTED.includes(saved)) return saved;
    } catch (e) {
      /* stockage indisponible */
    }
    return 'fr';
  }

  function t(text, vars) {
    const key = String(text == null ? '' : text);
    const dict = DICTS[lang];
    let out = dict && Object.prototype.hasOwnProperty.call(dict, key) ? dict[key] : key;
    if (vars) {
      out = out.replace(/\{(\w+)\}/g, (match, name) =>
        vars[name] == null ? match : String(vars[name])
      );
    }
    return out;
  }

  function applyStatic(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-i18n]').forEach((el) => {
      el.textContent = t(el.dataset.i18n);
    });
    scope.querySelectorAll('[data-i18n-title]').forEach((el) => {
      el.title = t(el.dataset.i18nTitle);
    });
    scope.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    if (!root) document.documentElement.lang = lang;
  }

  function setLang(next) {
    lang = SUPPORTED.includes(next) ? next : 'fr';
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (e) {
      /* stockage indisponible */
    }
    document.documentElement.lang = lang;
    applyStatic();
    window.dispatchEvent(new CustomEvent('mtc:langchange', { detail: { lang } }));
    return lang;
  }

  function getLang() {
    return lang;
  }

  lang = detect();

  MTC.i18n = { t, setLang, getLang, applyStatic, init: applyStatic, SUPPORTED };
})();
