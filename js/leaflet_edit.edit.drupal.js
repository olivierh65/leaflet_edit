/////////////////////////
// Barre "metier" (cascadeButtons, position topcenter)
//
// Layout cible :
//   - Geoman (dessin/edition Leaflet) : topleft, gere dans init.drupal.js
//   - panelLayers (fonds + traces)    : topright, gere dans init.drupal.js
//   - Barre metier (fichier/edition)  : topcenter, construite ici via
//     L.cascadeButtons : 1 tap = deplie le sous-menu, 2e tap = action.
//   - Fullscreen : integre comme item "Plein ecran" du groupe "Vue".
////////////////////////

// -- Contexte de trace "courante" pour les actions globales (sans
// -- relatedTarget) : derniere trace tapee / cliquee.
function setCurrentTrace(layer) {
  if (map && map.lMap) {
    map.lMap.leafletEdit = map.lMap.leafletEdit || {};
    map.lMap.leafletEdit.currentTrace = layer;
  }
}

function getCurrentTrace() {
  try {
    var cur = map.lMap.leafletEdit && map.lMap.leafletEdit.currentTrace;
    if (cur && map.lMap.hasLayer(cur)) {
      return cur;
    }
    // Fallback : premiere trace selectionnee, sinon premiere trace modifiee.
    // (anySelected/anyUpdated retournent désormais des layers individuels,
    // plus des groupes : 1 trace = 1 layer.)
    var sel = anySelected();
    if (sel && sel.length) {
      return sel[0];
    }
    var upd = anyUpdated();
    if (upd && upd.length) {
      return upd[0];
    }
  } catch (err) {
    console.warn("[leaflet_edit] getCurrentTrace:", err);
  }
  return null;
}

// -- Icones SVG inline (pas de dependance externe, net sur mobile) ---------
var LE_ICONS = {
  file: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
  edit: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>',
  view: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
  tools: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
  locate: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/><circle cx="12" cy="12" r="8"/></svg>',
  import: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="12" x2="12" y2="15"/></svg>',
  save: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
  saveAll: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/><path d="M2 2l20 20" stroke-width="1.5"/></svg>',
  export: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>',
  simplify: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 9 11 13 15 20 5"/><circle cx="4" cy="17" r="1.5" fill="currentColor"/><circle cx="20" cy="5" r="1.5" fill="currentColor"/></svg>',
  delete: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  fullscreen: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>',
  fit: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/><circle cx="12" cy="12" r="3"/></svg>',
  validate: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  cancel: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
  info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
  km: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19 L9 12 L13 15 L20 5"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="13" cy="15" r="1.5" fill="currentColor"/><circle cx="4" cy="19" r="1.5" fill="currentColor"/></svg>',
  arrows: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="18" y2="12"/><polyline points="12 6 18 12 12 18"/></svg>',
  newTrace: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
  style: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>'
};

// -- Actions "Fichier" globales -------------------------------------------
function importFileGlobal(fileType) {
  return function () {
    // readLocalFile(e, button_name, file_type) : button_name optionnel.
    readLocalFile(null, null, fileType);
  };
}

function saveCurrentTrace() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Save",
      "Aucune trace a sauvegarder. Touchez d'abord une trace."
    );
    return;
  }
  saveEntity({ relatedTarget: cur, latlng: null });
}

function saveAllTraces() {
  // Sauvegarde toutes les traces modifiées (1 appel par trace).
  var updated = [];
  try {
    updated = anyUpdated();
  } catch (err) {}
  if (!updated.length) {
    map.lMap.notification.info("Save", "Aucune modification a sauvegarder.");
    return;
  }
  updated.forEach(function (layer) {
    if (layer) {
      saveEntity({ relatedTarget: layer, latlng: null });
    }
  });
}

function exportCurrentTrace() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Export GPX",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  exportGPX({ relatedTarget: cur, latlng: null });
}

function exportAllTraces() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Export GPX",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  exportGPXAll({ relatedTarget: cur, latlng: null });
}

function exportAllMergeTraces() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Export GPX",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  exportGPXAllMerge({ relatedTarget: cur, latlng: null });
}

// -- Actions "Edition" globales --------------------------------------------
function editCurrentTrace() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Edit",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  editLayer({ relatedTarget: cur, latlng: null });
}

function simplifyCurrentTrace() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Simplify",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  simplify({ relatedTarget: cur, latlng: null });
}

function deleteCurrentTrace() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Delete",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  deleteLay({ relatedTarget: cur, latlng: null });
}

// -- Création d'une nouvelle trace ------------------------------------------
// Délai (ms) avant d'activer le dessin Geoman après validation du
// dialogue "Nouvelle trace". Voir commentaire dans openNewTraceDialog().
var LE_NEWTRACE_DRAW_DELAY = 250;

// Dialogue "Nouvelle trace" : choisir le fichier de rattachement (fichier
// existant de la carte OU nouveau fichier à créer côté serveur), le nom
// de la trace et la forme à dessiner. Au OK, le contexte est mémorisé
// (pendingNewTrace) et le dessin Geoman démarre : à la fin du dessin
// (pm:create), evtMapCreate() bascule vers createTraceFromDraw().
function openNewTraceDialog() {
  if (!map || !map.lMap || typeof L.control.window !== "function") {
    return;
  }
  if (!map.lMap.pm || typeof map.lMap.pm.enableDraw !== "function") {
    map.lMap.notification.warning(
      "Nouvelle trace",
      "Dessin Geoman indisponible (outil désactivé dans la configuration)."
    );
    return;
  }
  // Fichiers déjà rattachés à la carte : {fid: {fid, filename, tids}}.
  var files = (map && map.leafletEditFiles) || {};
  var fids = Object.keys(files).sort(function (a, b) {
    var fa = ((files[a] && files[a].filename) || "").toLowerCase();
    var fb = ((files[b] && files[b].filename) || "").toLowerCase();
    return fa < fb ? -1 : fa > fb ? 1 : 0;
  });

  var contentHtml =
    '<div class="leaflet-edit-newtrace">' +
    '<div class="leaflet-edit-newtrace-group">' +
    "<label><b>Fichier de la trace</b></label><br>" +
    '<label><input type="radio" name="le-newtrace-mode" value="existing" checked> Fichier existant</label> ' +
    '<label><input type="radio" name="le-newtrace-mode" value="new"> Nouveau fichier</label>' +
    "</div>" +
    '<div class="leaflet-edit-newtrace-group le-newtrace-existing">' +
    "<label><b>Choisir le fichier</b></label>" +
    '<select class="le-newtrace-file" style="width:100%"></select>' +
    "</div>" +
    '<div class="leaflet-edit-newtrace-group le-newtrace-new" style="display:none">' +
    "<label><b>Nom du nouveau fichier (.geojson)</b></label>" +
    '<input type="text" class="le-newtrace-filename" style="width:100%" placeholder="ex. sortie-matinale.geojson">' +
    "</div>" +
    '<div class="leaflet-edit-newtrace-group">' +
    "<label><b>Nom de la trace</b></label>" +
    '<input type="text" class="le-newtrace-label" style="width:100%" value="Nouvelle trace">' +
    "</div>" +
    '<div class="leaflet-edit-newtrace-group">' +
    "<label><b>Forme à dessiner</b></label>" +
    '<select class="le-newtrace-shape" style="width:100%">' +
    '<option value="Line">Polyligne</option>' +
    '<option value="Marker">Marqueur</option>' +
    "</select>" +
    "</div>" +
    '<div class="leaflet-edit-newtrace-group" style="font-size:0.9em;opacity:0.85">' +
    "Astuce : pendant le dessin, re-cliquez sur le bouton de dessin actif" +
    " pour Terminer, Retirer le dernier sommet ou Annuler." +
    "</div>" +
    "</div>";

  var confirmed = false;
  var win = L.control.window(map.lMap, {
    title: "Nouvelle trace",
    content: contentHtml,
    modal: true,
    visible: false,
    position: "top",
    prompt: {
      buttonOK: "Dessiner",
      buttonCancel: "Annuler",
      callback: function () {
        var box = win.getContainer();
        var modeEl = box.querySelector('input[name="le-newtrace-mode"]:checked');
        var mode = modeEl ? modeEl.value : "existing";
        var fileSel = box.querySelector(".le-newtrace-file");
        var nameEl = box.querySelector(".le-newtrace-filename");
        var labelEl = box.querySelector(".le-newtrace-label");
        var shapeEl = box.querySelector(".le-newtrace-shape");
        var label = labelEl && labelEl.value.trim() !== "" ? labelEl.value.trim() : "Nouvelle trace";
        var shape = shapeEl && shapeEl.value === "Marker" ? "Marker" : "Line";
        var pending = { mode: mode, fid: 0, filename: "", label: label, shape: shape };
        if (mode === "existing") {
          pending.fid = fileSel ? parseInt(fileSel.value, 10) || 0 : 0;
        } else {
          pending.filename = nameEl ? nameEl.value.trim() : "";
          if (pending.filename === "") {
            map.lMap.notification.warning("Nouvelle trace", "Indiquez le nom du nouveau fichier.");
            return;
          }
        }
        confirmed = true;
        map.lMap.leafletEdit = map.lMap.leafletEdit || {};
        map.lMap.leafletEdit.pendingNewTrace = pending;
        try {
          map.lMap.pm.disableDraw();
        } catch (err) {}
        // Active le dessin APRES la fin de la propagation du clic OK : la
        // fenêtre vit dans le conteneur de la carte, donc un enableDraw
        // synchrone capterait ce même clic (remontée/bubbling) comme
        // premier sommet de l'entité. Le délai absorbe aussi un éventuel
        // second clic involontaire (double-clic sur "Dessiner") : seul le
        // prochain clic délibéré sur la carte devient le premier point.
        var drawShape = shape;
        setTimeout(function () {
          try {
            if (map && map.lMap && map.lMap.pm && typeof map.lMap.pm.enableDraw === "function") {
              map.lMap.pm.enableDraw(drawShape);
            }
          } catch (err2) {}
        }, LE_NEWTRACE_DRAW_DELAY);
        map.lMap.notification.info(
          "Nouvelle trace",
          "Dessinez la trace sur la carte (double-clic pour terminer)."
        );
      },
    },
  });
  // Fermeture par la croix (sans OK) : oublie tout choix en cours.
  win.on("close hide", function () {
    try {
      if (!confirmed && map && map.lMap && map.lMap.leafletEdit) {
        map.lMap.leafletEdit.pendingNewTrace = null;
      }
    } catch (err) {}
  });
  win.show();

  var box = win.getContainer();
  var fileSel = box.querySelector(".le-newtrace-file");
  var existingDiv = box.querySelector(".le-newtrace-existing");
  var newDiv = box.querySelector(".le-newtrace-new");
  // Remplit la liste des fichiers existants (fid 0 = "Sans fichier").
  fids.forEach(function (fid) {
    var info = files[fid] || {};
    var opt = document.createElement("option");
    opt.value = fid;
    opt.textContent = (info.filename || ("Fichier " + fid)) + " (" + ((info.tids || []).length) + " traces)";
    fileSel.appendChild(opt);
  });
  function syncMode() {
    var modeEl = box.querySelector('input[name="le-newtrace-mode"]:checked');
    var isNew = modeEl && modeEl.value === "new";
    existingDiv.style.display = isNew ? "none" : "";
    newDiv.style.display = isNew ? "" : "none";
  }
  Array.prototype.forEach.call(box.querySelectorAll('input[name="le-newtrace-mode"]'), function (radio) {
    radio.addEventListener("change", syncMode);
  });
  // Aucun fichier existant (carte vide) : force le mode "nouveau".
  if (!fids.length) {
    var newRadio = box.querySelector('input[name="le-newtrace-mode"][value="new"]');
    var existingRadio = box.querySelector('input[name="le-newtrace-mode"][value="existing"]');
    if (newRadio) {
      newRadio.checked = true;
    }
    if (existingRadio) {
      existingRadio.disabled = true;
    }
    syncMode();
  }
}

// -- Détail par fichier -------------------------------------------------------
// Panneau "détail par fichier" : 1 fichier geojson = 1 groupe, avec pour
// chaque trace le nom + le style modifiables (lien direct trace->fichier
// via source_fid). Ouvert depuis le menu contextuel / la barre métier.
// Le nom et le style sont persistés via POST /leaflet-edit/trace/{tid}/update.
function openFileDetail(fid) {
  if (typeof L.control.window !== "function") {
    return;
  }
  fid = parseInt(fid, 10) || 0;
  var fileEntry = (map.leafletEditFiles && map.leafletEditFiles[fid]) || null;
  var filename = (fileEntry && fileEntry.filename) || ("Fichier " + fid);
  var tids = (fileEntry && fileEntry.tids) || [];
  // Fallback : scan du registre si l'index est incomplet.
  if (!tids.length) {
    Object.keys(map.leafletEditTraces || {}).forEach(function (key) {
      var l = map.leafletEditTraces[key];
      try {
        var le = (l.defaultOptions && l.defaultOptions.leafletEdit) || {};
        if ((le.source_fid || 0) === fid) {
          tids.push(le.tid);
        }
      } catch (err) {}
    });
  }

  var rowsHtml = "";
  tids.forEach(function (tid) {
    var layer = map.leafletEditTraces[tid];
    if (!layer) {
      return;
    }
    var le = (layer.defaultOptions && layer.defaultOptions.leafletEdit) || {};
    // Style PROPRE (jamais le violet "sélectionné" ni l'orange "modifié") :
    // une trace sélectionnée affiche ici son vrai style, pas son état.
    var st = (typeof getTraceBaseStyle === "function") ? getTraceBaseStyle(layer) : (layer.options || {});
    var label = le.description || ("Trace " + tid);
    var color = (st.color && toHexColor(st.color)) || "#3388ff";
    var weight = st.weight != null ? st.weight : 3;
    var dash = st.dashArray || "";
    // Attributs d'origine de la trace (propriétés GeoJSON hors clés _*).
    var attrs = {};
    try {
      var props = (layer.feature && layer.feature.properties) || {};
      Object.keys(props).forEach(function (k) {
        if (k.charAt(0) !== "_") {
          attrs[k] = props[k];
        }
      });
    } catch (err) {}
    var attrsHtml = attrsTableHtml(attrs);
    rowsHtml +=
      '<div class="leaflet-edit-file-row" data-tid="' + tid + '">' +
      '<div class="leaflet-edit-file-row-head">' +
      '<input type="text" class="leaflet-edit-file-label" value="' + escapeHtml(label) + '" maxlength="255">' +
      '<button type="button" class="leaflet-edit-file-zoom" title="Zoomer sur la trace">⌖</button>' +
      '<button type="button" class="leaflet-edit-file-toggle" title="Afficher / masquer">👁</button>' +
      "</div>" +
      '<div class="leaflet-edit-file-row-style">' +
      '<input type="color" class="leaflet-edit-file-color" value="' + escapeHtml(color) + '" title="Couleur">' +
      '<input type="number" class="leaflet-edit-file-weight" min="1" max="20" step="1" value="' + escapeHtml(String(weight)) + '" title="Largeur (px)">' +
      '<select class="leaflet-edit-file-dash" title="Pointillés">' +
      dashOption("", dash, "Continu") +
      dashOption("10 10", dash, "Pointillés larges") +
      dashOption("4 6", dash, "Pointillés") +
      dashOption("1 6", dash, "Pointillés fins") +
      dashOption("15,10,1,10", dash, "Mixte") +
      "</select>" +
      "</div>" +
      attrsHtml +
      "</div>";
  });
  if (!rowsHtml) {
    rowsHtml = "<p><i>Aucune trace chargée pour ce fichier.</i></p>";
  }

  var contentHtml =
    '<div class="leaflet-edit-file-detail">' +
    "<p><b>" + escapeHtml(String(tids.length)) + "</b> trace(s) — " + escapeHtml(filename) + "</p>" +
    rowsHtml +
    "</div>";

  var win = L.control.window(map.lMap, {
    title: "Fichier : " + filename,
    content: contentHtml,
    modal: true,
    visible: false,
    position: "top",
    prompt: {
      buttonOK: "Appliquer",
      buttonCancel: "Fermer",
      callback: function () {
        applyFileDetail(win, fid);
      },
    },
  });
  win.show();

  // Boutons par ligne : zoom + afficher/masquer (sans fermer le panneau).
  try {
    var box = win.getContainer();
    box.querySelectorAll(".leaflet-edit-file-row").forEach(function (row) {
      var tid = row.getAttribute("data-tid");
      var zoomBtn = row.querySelector(".leaflet-edit-file-zoom");
      var toggleBtn = row.querySelector(".leaflet-edit-file-toggle");
      if (zoomBtn) {
        zoomBtn.addEventListener("click", function (ev) {
          ev.preventDefault();
          zoomToTrace(tid);
        });
      }
      if (toggleBtn) {
        toggleBtn.addEventListener("click", function (ev) {
          ev.preventDefault();
          toggleTraceVisibility(tid);
        });
      }
    });
  } catch (err) {}
}

// Applique les noms + styles édités dans le panneau fichier.
// Chaque trace modifiée est persistée via updateTrace (nouvelle révision).
function applyFileDetail(win, fid) {
  var box = null;
  try {
    box = win.getContainer();
  } catch (err) {
    return;
  }
  var rows = box.querySelectorAll(".leaflet-edit-file-row");
  if (!rows.length) {
    return;
  }
  var pending = rows.length;
  var errors = 0;
  rows.forEach(function (row) {
    var tid = row.getAttribute("data-tid");
    var layer = map.leafletEditTraces[tid];
    if (!layer) {
      if (--pending === 0) {
        finishFileDetail(errors);
      }
      return;
    }
    var labelEl = row.querySelector(".leaflet-edit-file-label");
    var colorEl = row.querySelector(".leaflet-edit-file-color");
    var weightEl = row.querySelector(".leaflet-edit-file-weight");
    var dashEl = row.querySelector(".leaflet-edit-file-dash");
    var newLabel = labelEl ? labelEl.value : null;
    var newStyle = {};
    if (colorEl && colorEl.value) {
      newStyle.color = colorEl.value;
    }
    if (weightEl && weightEl.value !== "") {
      var w = parseInt(weightEl.value, 10);
      if (!isNaN(w) && w >= 1 && w <= 20) {
        newStyle.weight = w;
      }
    }
    if (dashEl) {
      newStyle.dashArray = dashEl.value || null;
    }
    // Applique localement (style + tooltip + registre).
    try {
      layer.setStyle(newStyle);
      // Le style a changé : reconstruit les flèches (nouvelle couleur).
      if (typeof refreshArrows === "function") {
        refreshArrows(layer);
      }
      layer.defaultOptions = layer.defaultOptions || {};
      layer.defaultOptions.style = Object.assign({}, layer.defaultOptions.style || {}, newStyle);
      layer.orig_style = undefined;
      try {
        delete layer.orig_style;
      } catch (err2) {}
      if (newLabel && newLabel !== ((layer.defaultOptions.leafletEdit || {}).description || "")) {
        layer.defaultOptions.leafletEdit.description = newLabel;
        try {
          layer.unbindTooltip();
        } catch (err3) {}
        layer.bindTooltip(newLabel, { sticky: true });
      }
      refreshTraceStyle(layer);
    } catch (err) {}
    // Persiste (nom + style) côté serveur.
    persistTraceLabelStyle(tid, newLabel, newStyle, function (ok) {
      if (!ok) {
        errors++;
      }
      if (--pending === 0) {
        finishFileDetail(errors);
      }
    });
  });
}

function finishFileDetail(errors) {
  if (errors > 0) {
    leafletEditNotify("error", "Fichier", errors + " trace(s) non sauvegardée(s).");
  } else {
    leafletEditNotify("success", "Fichier", "Noms + styles appliqués et sauvegardés.");
  }
}

// Tableau HTML des attributs d'une trace (lecture seule).
// Clés _* (métadonnées internes) déjà exclues en amont.
function attrsTableHtml(attrs) {
  var keys = Object.keys(attrs || {});
  if (!keys.length) {
    return '<div class="leaflet-edit-file-attrs"><i>Aucun attribut.</i></div>';
  }
  var html = '<table class="leaflet-edit-file-attrs-table"><tbody>';
  keys.forEach(function (k) {
    var v = attrs[k];
    if (v !== null && typeof v === "object") {
      try {
        v = JSON.stringify(v);
      } catch (err) {
        v = String(v);
      }
    }
    html += "<tr><th>" + escapeHtml(k) + "</th><td>" + escapeHtml(String(v)) + "</td></tr>";
  });
  html += "</tbody></table>";
  return '<div class="leaflet-edit-file-attrs">' + html + "</div>";
}

// POST /leaflet-edit/trace/{tid}/update (label + style, token CSRF par URL).
function persistTraceLabelStyle(tid, label, style, done) {
  try {
    // leafletEditEndpoint() peut ajouter un token calculé pour la base
    // seule : on le retire (split("?")[0]) avant de construire l'URL
    // complète + le bon token (lié au chemin exact .../trace/{tid}/update).
    var base = leafletEditEndpoint("updateTrace", "/leaflet-edit/trace").split("?")[0] + "/" + tid + "/update";
    var path = base.replace(/^\//, "").split("?")[0];
    var settings = drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit;
    var tokenUrl = (settings && settings.endpoints && settings.endpoints.csrfTokenUrl) || null;
    var url = base;
    function post() {
      var fd = new FormData();
      if (label !== null && label !== undefined) {
        fd.append("label", label);
      }
      fd.append("style", JSON.stringify(style || {}));
      jQuery.ajax({
        url: url,
        type: "post",
        data: fd,
        contentType: false,
        processData: false,
        success: function (resp) {
          done(!!(resp && resp.success));
        },
        error: function () {
          done(false);
        },
      });
    }
    if (tokenUrl && url.indexOf("token=") === -1) {
      jQuery.getJSON(tokenUrl + encodeURIComponent(path))
        .done(function (data) {
          if (data && data.token) {
            url += (url.indexOf("?") === -1 ? "?" : "&") + "token=" + encodeURIComponent(data.token);
          }
          post();
        })
        .fail(function () {
          post();
        });
    } else {
      post();
    }
  } catch (err) {
    done(false);
  }
}

// Zoome sur une trace depuis le panneau fichier.
function zoomToTrace(tid) {
  try {
    var layer = map.leafletEditTraces[tid];
    if (!layer) {
      return;
    }
    // Groupe (fond découpé) : emprise via getBounds.
    var b = layer.getLatLngs
      ? L.latLngBounds(layer.getLatLngs())
      : (layer.getBounds ? layer.getBounds() : L.latLngBounds([layer.getLatLng(), layer.getLatLng()]));
    map.leafletEditProgrammaticMove = true;
    map.lMap.fitBounds(b);
    setTimeout(function () {
      map.leafletEditProgrammaticMove = false;
    }, 500);
    select_feature(layer);
  } catch (err) {}
}

// Affiche / masque une trace depuis le panneau fichier.
function toggleTraceVisibility(tid) {
  try {
    var layer = map.leafletEditTraces[tid];
    if (!layer) {
      return;
    }
    if (map.lMap.hasLayer(layer)) {
      map.lMap.removeLayer(layer);
    } else {
      layer.addTo(map.lMap);
    }
    // Resynchronise la case du panel : _onInputClick() est la méthode
    // officielle (met à jour les compteurs de groupe + la case groupe),
    // avec forçage direct en secours si le DOM a été reconstruit.
    syncPanelCheckbox(layer);
  } catch (err) {}
}

// Resynchronise la case d'une trace dans le menu panel-layers.
// Passe par _onInputClick() (méthode officielle : compteurs de groupe +
// case "select all" du groupe), avec forçage direct de l'input en secours.
function syncPanelCheckbox(layer) {
  try {
    if (!layer || !panel) {
      return;
    }
    var onMap = false;
    try {
      onMap = map.lMap.hasLayer(layer);
    } catch (err) {}
    if (panel._form) {
      var input = panel._form.querySelector('input[value="' + L.stamp(layer) + '"]');
      if (input) {
        input.checked = onMap;
        input.defaultChecked = onMap;
      }
    }
    if (typeof panel._onInputClick === "function") {
      panel._onInputClick();
    }
  } catch (err) {}
}

// Ouvre le détail du fichier de la trace courante (barre métier).
function openCurrentFileDetail() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Fichier",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  var fid = 0;
  try {
    fid = (cur.defaultOptions && cur.defaultOptions.leafletEdit.source_fid) || 0;
  } catch (err) {}
  openFileDetail(fid);
}

// -- Infos + style de la trace courante --------------------------------------
// Fenêtre modale : type, nb de points, longueur, état + édition du style
// (couleur, épaisseur, pointillés). Toute modification de style marque
// la trace comme modifiée (setUpdated) pour le save ultérieur.
function showTraceInfo() {
  var cur = getCurrentTrace();
  if (!cur) {
    map.lMap.notification.warning(
      "Infos",
      "Touchez d'abord une trace sur la carte."
    );
    return;
  }
  if (typeof L.control.window !== "function") {
    return;
  }
  var info = getTraceInfo(cur);
  // Style PROPRE (jamais le violet "sélectionné") : la trace courante est
  // généralement sélectionnée quand on ouvre Infos/Style.
  var st = (typeof getTraceBaseStyle === "function") ? getTraceBaseStyle(cur) : (cur.options || {});
  var curColor = st.color || "#3388ff";
  var curWeight = st.weight != null ? st.weight : 3;
  var curDash = st.dashArray || "";
  // Attributs d'origine de la trace (propriétés GeoJSON hors clés _*).
  var curAttrs = {};
  try {
    var curProps = (cur.feature && cur.feature.properties) || {};
    Object.keys(curProps).forEach(function (k) {
      if (k.charAt(0) !== "_") {
        curAttrs[k] = curProps[k];
      }
    });
  } catch (err) {}

  var contentHtml =
    '<div class="leaflet-edit-info">' +
    '<table class="leaflet-edit-info-table">' +
    infoRow("Type", info.type) +
    infoRow("Points", info.nbPoints) +
    infoRow("Longueur", info.length) +
    infoRow("État", info.state) +
    infoRow("Fichier", info.filename) +
    "</table>" +
    '<div class="leaflet-edit-info-group"><label><b>Attributs</b></label>' +
    attrsTableHtml(curAttrs) + "</div>" +
    '<div class="leaflet-edit-info-group"><label><b>Couleur</b></label>' +
    '<input type="color" class="leaflet-edit-style-color" value="' + escapeHtml(toHexColor(curColor)) + '"></div>' +
    '<div class="leaflet-edit-info-group"><label><b>Largeur (px)</b></label>' +
    '<input type="number" class="leaflet-edit-style-weight" min="1" max="20" step="1" value="' + escapeHtml(String(curWeight)) + '"></div>' +
    '<div class="leaflet-edit-info-group"><label><b>Pointillés</b></label>' +
    '<select class="leaflet-edit-style-dash">' +
    dashOption("", curDash, "Continu") +
    dashOption("10 10", curDash, "Pointillés larges") +
    dashOption("4 6", curDash, "Pointillés") +
    dashOption("1 6", curDash, "Pointillés fins") +
    dashOption("15,10,1,10", curDash, "Mixte") +
    "</select></div>" +
    "</div>";

  var win = L.control.window(map.lMap, {
    title: "Trace : " + info.title,
    content: contentHtml,
    modal: true,
    visible: false,
    position: "top",
    prompt: {
      buttonOK: "Appliquer",
      buttonCancel: "Fermer",
      callback: function () {
        var box = win.getContainer();
        var colorEl = box.querySelector(".leaflet-edit-style-color");
        var weightEl = box.querySelector(".leaflet-edit-style-weight");
        var dashEl = box.querySelector(".leaflet-edit-style-dash");
        var newStyle = {};
        if (colorEl && colorEl.value) {
          newStyle.color = colorEl.value;
        }
        if (weightEl && weightEl.value !== "") {
          var w = parseInt(weightEl.value, 10);
          if (!isNaN(w) && w >= 1 && w <= 20) {
            newStyle.weight = w;
          }
        }
        if (dashEl) {
          newStyle.dashArray = dashEl.value || null;
        }
        try {
          cur.setStyle(newStyle);
        } catch (err) {}
        // Le style a changé : reconstruit les flèches (nouvelle couleur).
        try {
          if (typeof refreshArrows === "function") {
            refreshArrows(cur);
          }
        } catch (err2) {}
        // Mémorise le nouveau style comme style d'origine : refreshTraceStyle
        // (sélection / modifié) restaurera celui-ci, pas l'ancien.
        try {
          cur.defaultOptions = cur.defaultOptions || {};
          cur.defaultOptions.style = Object.assign(
            {}, cur.defaultOptions.style || {}, newStyle
          );
          // Force la recapture au prochain refresh (sinon orig_style garde
          // l'ancien style et la désélection restaure l'ancienne couleur).
          cur.orig_style = undefined;
          try {
            delete cur.orig_style;
          } catch (err2) {}
        } catch (err) {}
        // Le style fait partie de la donnée sauvegardée : on persiste
        // immédiatement via updateTrace (pas seulement "marqué modifié").
        persistTraceLabelStyle(
          (cur.defaultOptions.leafletEdit || {}).tid,
          null,
          cur.defaultOptions.style,
          function (ok) {
            if (ok) {
              clearUpdated(cur);
              leafletEditNotify("success", "Style", "Style appliqué et sauvegardé.");
            } else {
              setUpdated(cur);
              leafletEditNotify("error", "Style", "Style appliqué localement, sauvegarde ÉCHOUÉE (réessayez).");
            }
          }
        );
      },
    },
  });
  win.show();
}

function infoRow(label, value) {
  return "<tr><th>" + escapeHtml(label) + "</th><td>" + escapeHtml(String(value)) + "</td></tr>";
}

function dashOption(value, current, label) {
  var sel = String(value) === String(current || "") ? " selected" : "";
  return '<option value="' + escapeHtml(value) + '"' + sel + ">" + escapeHtml(label) + "</option>";
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toHexColor(c) {
  if (/^#[0-9a-f]{6}$/i.test(c)) {
    return c;
  }
  if (/^#[0-9a-f]{3}$/i.test(c)) {
    return "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
  }
  var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/i.exec(c || "");
  if (m) {
    var h = function (n) {
      var x = parseInt(n, 10).toString(16);
      return x.length === 1 ? "0" + x : x;
    };
    return "#" + h(m[1]) + h(m[2]) + h(m[3]);
  }
  return "#3388ff";
}

// Calcule les infos d'une trace : type géométrique, nb de points,
// longueur (turf si dispo, sinon haversine), état, nom de fichier.
function getTraceInfo(layer) {
  var title = "Trace";
  var filename = "";
  try {
    var le = layer.defaultOptions && layer.defaultOptions.leafletEdit;
    if (le) {
      if (le.description) {
        title = le.description;
      } else if (le.filename) {
        title = le.filename;
      }
      filename = le.filename || "";
    }
  } catch (err) {}
  var geojson = null;
  try {
    geojson = layer.toGeoJSON();
  } catch (err) {}
  var geomType = (geojson && geojson.geometry && geojson.geometry.type) || "?";
  var coords = (geojson && geojson.geometry && geojson.geometry.coordinates) || [];
  var nbPoints = countCoords(coords);
  var length = formatLength(computeLengthKm(coords, geomType));
  var state = "Origine";
  try {
    if (isEditing(layer)) {
      state = "En édition";
    } else if (layer.leafletEditSel) {
      state = "Sélectionnée";
    }
    if (isUpdated(layer)) {
      state += state === "Origine" ? "Modifiée" : " + modifiée";
    }
  } catch (err) {}
  return {
    title: title,
    type: geomType,
    nbPoints: nbPoints,
    length: length,
    state: state,
    filename: filename || "—",
  };
}

function countCoords(coords) {
  if (!coords || !coords.length) {
    return 0;
  }
  if (typeof coords[0] === "number") {
    return 1;
  }
  var n = 0;
  coords.forEach(function (c) {
    n += countCoords(c);
  });
  return n;
}

// Longueur en km d'une LineString / MultiLineString.
function computeLengthKm(coords, geomType) {
  var lines = [];
  if (geomType === "LineString") {
    lines = [coords];
  } else if (geomType === "MultiLineString") {
    lines = coords;
  } else {
    return 0;
  }
  // turf.length si disponible (km).
  try {
    if (typeof turf !== "undefined" && turf.length) {
      var total = 0;
      lines.forEach(function (line) {
        total += turf.length({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line } }, { units: "kilometers" });
      });
      return total;
    }
  } catch (err) {}
  // Fallback haversine.
  var sum = 0;
  lines.forEach(function (line) {
    for (var i = 1; i < line.length; i++) {
      sum += haversineKm(line[i - 1][1], line[i - 1][0], line[i][1], line[i][0]);
    }
  });
  return sum;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  var R = 6371;
  var dLat = ((lat2 - lat1) * Math.PI) / 180;
  var dLon = ((lon2 - lon1) * Math.PI) / 180;
  var a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatLength(km) {
  if (!km || km <= 0) {
    return "—";
  }
  if (km < 1) {
    return Math.round(km * 1000) + " m";
  }
  if (km < 100) {
    return km.toFixed(2) + " km";
  }
  return km.toFixed(1) + " km";
}

// -- Barre Valider / Annuler --------------------------------------------------
// Rond vert / croix rouge en bas de carte (classe leaflet-control-editConfirm).
// Un seul emplacement partagé : l'afficher en remplace une éventuelle autre.
function showConfirmBar(validateTitle, onValidate, cancelTitle, onCancel) {
  hideEditConfirmBar();
  if (!map || !map.lMap || typeof L.cascadeButtons !== "function") {
    return;
  }
  // Leaflet ne connait pas "bottomcenter" : coin dédié en bas.
  if (!map.lMap._controlCorners.bottomcenter && map.lMap._controlContainer) {
    var corner = L.DomUtil.create(
      "div",
      "leaflet-bottom leaflet-center leaflet-bottom-center",
      map.lMap._controlContainer
    );
    corner.setAttribute("aria-hidden", "true");
    map.lMap._controlCorners.bottomcenter = corner;
  }
  var bar = L.cascadeButtons(
    [
      {
        icon: LE_ICONS.validate,
        title: validateTitle,
        command: function () {
          try {
            onValidate();
          } catch (err) {}
        },
      },
      {
        icon: LE_ICONS.cancel,
        title: cancelTitle,
        command: function () {
          try {
            onCancel();
          } catch (err2) {}
        },
      },
    ],
    {
      position: "bottomcenter",
      direction: "horizontal",
      className: "leaflet-control-editConfirm",
    }
  ).addTo(map.lMap);
  map.lMap.leafletEdit = map.lMap.leafletEdit || {};
  map.lMap.leafletEdit.editConfirmBar = bar;
}

// Barre Valider / Annuler d'édition géométrique.
// Affichée pendant l'édition d'une trace (editLayer), masquée à la sortie
// (finEditLayer). Valider => setUpdated(layer) pour marquer à sauvegarder.
function showEditConfirmBar(layer) {
  var evtLike = { relatedTarget: layer, latlng: null };
  showConfirmBar(
    "Valider les modifications",
    function () {
      finEditLayer(evtLike, true);
    },
    "Annuler les modifications",
    function () {
      finEditLayer(evtLike, false);
    }
  );
}

// Barre Valider / Annuler d'édition de style (voir finishStyleSession,
// menu.drupal.js). Valider garde le style (déjà appliqué en direct),
// Annuler restaure le style d'avant la session.
function showStyleConfirmBar() {
  showConfirmBar(
    "Valider le style",
    function () {
      if (typeof finishStyleSession === "function") {
        finishStyleSession(true);
      }
    },
    "Annuler le style",
    function () {
      if (typeof finishStyleSession === "function") {
        finishStyleSession(false);
      }
    }
  );
}

function hideEditConfirmBar() {
  try {
    if (map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.editConfirmBar) {
      map.lMap.removeControl(map.lMap.leafletEdit.editConfirmBar);
      map.lMap.leafletEdit.editConfirmBar = null;
    }
  } catch (err) {}
}

// -- Actions "Outils" ---------------------------------------------------------
// Bascule l'affichage des points kilométriques au survol des traces.
// L'état est lu par evtFeatureTooltipopen (menu.drupal.js).
function toggleKmPoints() {
  var next = true;
  try {
    next = !isKmPointsEnabled();
  } catch (err) {}
  if (typeof setKmPointsEnabled === "function") {
    setKmPointsEnabled(next);
  }
}

// Bascule l'affichage des flèches de sens des traces.
// L'état est appliqué par setArrowsEnabled (menu.drupal.js).
function toggleArrows() {
  var next = true;
  try {
    next = !isArrowsEnabled();
  } catch (err) {}
  if (typeof setArrowsEnabled === "function") {
    setArrowsEnabled(next);
  }
}

function toggleFullscreen() {
  try {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      var el = map.lMap.getContainer();
      if (el.requestFullscreen) {
        el.requestFullscreen();
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      }
    }
  } catch (err) {
    console.error("[leaflet_edit] fullscreen:", err);
  }
}

function zoomToTraces() {
  try {
    // Visibles d'abord, totalité en repli (ex. que des fonds désactivés).
    var b = (map.bounds && map.bounds.isValid()) ? map.bounds : null;
    if (!b && map.boundsAll && map.boundsAll.isValid()) {
      b = map.boundsAll;
    }
    if (b) {
      console.log("[leaflet_edit] zoomToTraces:", b.toBBoxString());
      map.lMap.fitBounds(b);
    } else {
      map.lMap.notification.info("Outils", "Aucune trace a cadrer.");
    }
  } catch (err) {}
}

// Déclenche le contrôle Locate existant (créé dans init.drupal.js).
// Si absent (désactivé en config), notifie l'utilisateur.
function locateMe() {
  try {
    if (!map || !map.lMap) {
      return;
    }
    map.lMap.leafletEdit = map.lMap.leafletEdit || {};
    var locateCtrl = map.lMap.leafletEdit.locateControl;
    if (!locateCtrl) {
      // Créé à la demande (et une seule fois) : start() exige un contrôle
      // rattaché à la carte (_map). Son bouton carte reste masqué par CSS
      // (.leaflet-control-locate) : point d'entrée unique = menu métier.
      if (typeof L === "undefined" || !L.control || typeof L.control.locate !== "function") {
        throw new Error("locate lib missing");
      }
      locateCtrl = L.control.locate({
        strings: { title: "Où suis-je ???" },
        position: "bottomright",
      });
      map.lMap.addControl(locateCtrl);
      try {
        var el = locateCtrl.getContainer ? locateCtrl.getContainer() : null;
        if (el) {
          el.style.display = "none";
        }
      } catch (errHide) {}
      map.lMap.leafletEdit.locateControl = locateCtrl;
    }
    if (locateCtrl && typeof locateCtrl.start === "function") {
      locateCtrl.start();
      return;
    }
  } catch (err) {}
  try {
    map.lMap.notification.warning(
      "Outils",
      "Localisation désactivée dans la configuration."
    );
  } catch (err2) {}
}

// -- Construction de la barre metier ----------------------------------------
// Groupes : "Fichier" (import/save/export), "Edition" (edit/outils),
// "Outils" (fullscreen/cadrage/localisation). Chaque groupe est un bouton
// cascade qui deplie ses items. Filtrage par permissions Drupal.
function addBusinessBar() {
  if (!map || !map.lMap || typeof L.cascadeButtons !== "function") {
    console.warn("[leaflet_edit] cascadeButtons indisponible.");
    return;
  }
  // Evite les doublons (plusieurs maps / re-init).
  if (map.lMap.leafletEdit && map.lMap.leafletEdit.businessBar) {
    try {
      map.lMap.removeControl(map.lMap.leafletEdit.businessBar);
    } catch (err) {}
  }

  var can = function (action) {
    try {
      return leafletEditCan(action);
    } catch (err) {
      return true;
    }
  };
  // Fonctionnalité activée dans les réglages (outils JS) ? Les entrées de
  // menu des outils désactivés sont masquées (permissions checked first).
  var tool = function (suffix) {
    try {
      return typeof leafletEditToolEnabled === "function" ? leafletEditToolEnabled(suffix) : true;
    } catch (err) {
      return true;
    }
  };

  var fileItems = [];
  if (can("importGPX") && tool("leaflet.togeojson")) {
    fileItems.push({
      icon: LE_ICONS.import,
      title: "Import GPX",
      command: importFileGlobal("GPX"),
    });
    fileItems.push({
      icon: LE_ICONS.import,
      title: "Import GeoJSON",
      command: importFileGlobal("GeoJSON"),
    });
  }
  if (can("save")) {
    fileItems.push({
      icon: LE_ICONS.save,
      title: "Save (trace courante)",
      command: saveCurrentTrace,
    });
    fileItems.push({
      icon: LE_ICONS.saveAll,
      title: "Save (tout)",
      command: saveAllTraces,
    });
  }
  if (can("exportGPX") && tool("leaflet.togpx")) {
    fileItems.push({
      icon: LE_ICONS.export,
      title: "Export GPX",
      command: exportCurrentTrace,
    });
    fileItems.push({
      icon: LE_ICONS.export,
      title: "Export GPX (All)",
      command: exportAllTraces,
    });
    fileItems.push({
      icon: LE_ICONS.export,
      title: "Export GPX (All Merge)",
      command: exportAllMergeTraces,
    });
  }

  var editItems = [];
  if (can("edit") && tool("leaflet-geoman")) {
    editItems.push({
      icon: LE_ICONS.newTrace,
      title: "Nouvelle trace",
      command: openNewTraceDialog,
    });
    editItems.push({
      icon: LE_ICONS.edit,
      title: "Editer la trace",
      command: editCurrentTrace,
    });
  }
  if (can("edit")) {
    // Infos et Détail fichier ouvrent des fenêtres L.control.window.
    if (tool("leaflet.control-window")) {
      editItems.push({
        icon: LE_ICONS.info,
        title: "Infos / Style",
        command: showTraceInfo,
      });
    }
    editItems.push({
      icon: LE_ICONS.style,
      title: "Style interactif",
      command: editStyleInteractive,
    });
    // Détail par fichier : nom + style modifiables pour chaque trace
    // du fichier geojson contenant la trace courante.
    if (tool("leaflet.control-window")) {
      editItems.push({
        icon: LE_ICONS.file,
        title: "Détail fichier (nom + style)",
        command: openCurrentFileDetail,
      });
    }
    if (tool("leaflet.turf")) {
      editItems.push({
        icon: LE_ICONS.simplify,
        title: "Simplifier",
        command: simplifyCurrentTrace,
      });
    }
    editItems.push({
      icon: LE_ICONS.delete,
      title: "Supprimer",
      command: deleteCurrentTrace,
    });
  }

  var toolsItems = [];
  if (tool("leaflet-fullscreen")) {
    toolsItems.push({
      icon: LE_ICONS.fullscreen,
      title: "Plein ecran",
      command: toggleFullscreen,
    });
  }
  toolsItems.push({
    icon: LE_ICONS.fit,
    title: "Cadrer les traces",
    command: zoomToTraces,
  });
  if (tool("leaflet-locatecontrol")) {
    toolsItems.push({
      icon: LE_ICONS.locate,
      title: "Me localiser",
      command: locateMe,
    });
  }
  if (tool("leaflet-distance-markers")) {
    toolsItems.push({
      icon: LE_ICONS.km,
      title: "Points km au survol",
      command: toggleKmPoints,
    });
  }
  if (tool("leaflet-arrowheads")) {
    toolsItems.push({
      icon: LE_ICONS.arrows,
      title: "Flèches de sens",
      command: toggleArrows,
    });
  }

  var buttons = [];
  if (fileItems.length) {
    buttons.push({
      icon: LE_ICONS.file,
      title: "Fichier : import / save / export",
      items: fileItems,
    });
  }
  if (editItems.length) {
    buttons.push({
      icon: LE_ICONS.edit,
      title: "Edition des traces",
      items: editItems,
    });
  }
  buttons.push({
    icon: LE_ICONS.tools,
    title: "Outils : plein ecran / cadrage / localisation",
    items: toolsItems,
  });

  // Leaflet ne connait pas "topcenter" : on enregistre le coin une fois.
  if (!map.lMap._controlCorners.topcenter && map.lMap._controlContainer) {
    var corner = L.DomUtil.create(
      "div",
      "leaflet-top leaflet-center leaflet-top-center",
      map.lMap._controlContainer
    );
    corner.setAttribute("aria-hidden", "true");
    map.lMap._controlCorners.topcenter = corner;
  }

  var bar = L.cascadeButtons(buttons, {
    position: "topcenter",
    direction: "horizontal",
    className: "leaflet-control-businessBar",
  }).addTo(map.lMap);

  map.lMap.leafletEdit = map.lMap.leafletEdit || {};
  map.lMap.leafletEdit.businessBar = bar;
}


function constructConfirm(map, className, message) {
  if (map.hasOwnProperty("options")) {
    container = _container = L.DomUtil.create(
      "div",
      className,
      map.getContainer()
    );
  } else {
    container = _container = L.DomUtil.create("div", className);
  }

  container.style.width = 200 + "px";
  container.style.height = 300 + "px";

  container.style.top = 50 + "px";
  container.style.left = 50 + "px";
  container.style.backgroundColor = "grey";

  container.style.zIndex = "2000";
  container.style.position = "relative";

  var stop = L.DomEvent.stopPropagation;
  L.DomEvent.on(container, "click", stop)
    .on(container, "mousedown", stop)
    .on(container, "touchstart", stop)
    .on(container, "dblclick", stop)
    .on(container, "mousewheel", stop)
    .on(container, "contextmenu", stop)
    .on(container, "MozMousePixelScroll", stop);

  var innerContainer = (_innerContainer = L.DomUtil.create(
    "div",
    className + "-inner"
  ));
  innerContainer.innerHTML = message;

  var grabberNode = (_grabberNode = L.DomUtil.create(
    "div",
    className + "-grabber"
  ));
  var grabberIcon = L.DomUtil.create("i", "fa fa-arrows");
  grabberNode.appendChild(grabberIcon);

  // L.DomEvent.on(grabberNode, "mousedown", this._handleMoveStart, this);

  var closeNode = (_closeNode = L.DomUtil.create("div", className + "-close"));
  var closeIcon = L.DomUtil.create("i", "fa fa-times");
  closeNode.appendChild(closeIcon);
  // L.DomEvent.on(closeNode, "click", this._handleClose, this);

  var resizerNode = (_resizerNode = L.DomUtil.create(
    "div",
    className + "-resizer"
  ));
  var resizeIcon = L.DomUtil.create("i", "fa fa-arrows-h fa-rotate-45");
  resizerNode.appendChild(resizeIcon);

  // L.DomEvent.on(resizerNode, "mousedown", this._handleResizeStart, this);

  var contentNode = (_contentNode = L.DomUtil.create(
    "div",
    className + "-contents"
  ));

  container.appendChild(innerContainer);

  innerContainer.appendChild(contentNode);
  innerContainer.appendChild(grabberNode);
  innerContainer.appendChild(closeNode);
  innerContainer.appendChild(resizerNode);
}

function deleteLay(e) {
  console.log("deleteLay: " + e);
  var flashObj = null;
  try {
    flashObj = flash_features(e.relatedTarget, 100000);
  } catch (err) {
    console.log("flash_feature Err: " + err);
  }

  function cleanup() {
    if (flashObj) {
      cancel_flash_features(flashObj);
    }
  }

  // Fenêtre Leaflet native (L.control.window) : fonctionne en plein écran
  // et sur mobile, contrairement au dialog jQuery UI.
  var win = L.control.window(map.lMap, {
    title: "Suppression trace",
    content: "<b>Vraiment supprimer cette trace ?</b>",
    modal: true,
    visible: false,
    position: "top",
    prompt: {
      buttonOK: "Ok",
      buttonCancel: "Cancel",
      callback: function () {
        cleanup();
        e.relatedTarget.remove();
      },
    },
  });
  win.show();
  // Annulation via la croix : restaure le style clignotant.
  win.on("close hide", cleanup);
}

function joinLine(e) {
  onsole.log("joinLine: " + e);
}


function cutLine(e) {
  console.log("cutLine: " + e);
  if (typeof turf === "undefined") {
    console.error("[leaflet_edit] turf.js non chargé, découpe impossible.");
    if (map && map.lMap && map.lMap.notification) {
      map.lMap.notification.error("Cut", "Librairie turf.js non chargée.");
    }
    return;
  }
  // L.marker(e.latlng).addTo(map.lMap);
  np = turf.nearestPointOnLine(
    e.relatedTarget.feature,
    turf.point([e.latlng["lng"], e.latlng["lat"]])
  );

  // L.marker([np.geometry.coordinates[1],np.geometry.coordinates[0]], {opacity: 0.5}).addTo(map.lMap);

  cutpoint = {
    lay: e.relatedTarget,
    nearestPoint: null,
    segIndex: 0,
    dist: 999,
  };

  turf.segmentEach(
    e.relatedTarget.feature,
    function (
      currentSegment,
      featureIndex,
      multiFeatureIndex,
      geometryIndex,
      segmentIndex
    ) {
      np1 = turf.nearestPointOnLine(currentSegment, np);
      // console.log('cut : ' + segmentIndex + ', distance: '+ np1.properties.dist)
      if (
        turf.booleanPointOnLine(np, currentSegment, {
          ignoreEndVertices: false,
          epsilon: 5e-8,
        })
      ) {
        if (np1.properties.dist < cutpoint.dist) {
          cutpoint.dist = np1.properties.dist;
          cutpoint.segIndex = segmentIndex;
          cutpoint.nearestPoint = np1;
        }
        // cutpoint.lay.feature.geometry.coordinates[geometryIndex][segmentIndex];
        console.log(
          "cut : " + segmentIndex + ", distance: " + np1.properties.dist
        );
      }
    }
  );

  path1 = cutpoint.lay.toGeoJSON();
  path1.geometry.coordinates[0] = path1.geometry.coordinates[0].slice(
    0,
    cutpoint.segIndex
  );
  path1.geometry.coordinates[0].push(
    cutpoint.nearestPoint.geometry.coordinates
  );
  path1.bbox = [];
  path1.bbox = turf.bbox(path1);
  // path1 = cutpoint.lay.getLatLngs().flat().slice(0,cutpoint.segmentIndex);
  // path1.push({lat: cutpoint.nearestPoint.geometry.coordinates[1], lon: cutpoint.nearestPoint.geometry.coordinates[0]});

  path2 = cutpoint.lay.toGeoJSON();
  path2.geometry.coordinates[0] = path2.geometry.coordinates[0].slice(
    cutpoint.segIndex
  );
  path2.geometry.coordinates[0].unshift(
    cutpoint.nearestPoint.geometry.coordinates
  );
  path2.bbox = [];
  path2.bbox = turf.bbox(path2);

  // path2 = [{lat: cutpoint.nearestPoint.geometry.coordinates[1], lon: cutpoint.nearestPoint.geometry.coordinates[0]}];
  // path2.push(cutpoint.lay.getLatLngs().flat().slice(cutpoint.segmentIndex+1 ));

  // Nouveau modèle : 1 trace = 1 layer. Les 2 moitiés héritent du
  // contexte (fichier source, style) de la trace d'origine.
  var originTid = null;
  try {
    var le0 = (e.relatedTarget.defaultOptions && e.relatedTarget.defaultOptions.leafletEdit) || {};
    originTid = le0.tid || null;
  } catch (err) {}
  addData(originTid, path1, e.relatedTarget);
  addData(originTid, path2, e.relatedTarget);

  e.relatedTarget.remove();
}
