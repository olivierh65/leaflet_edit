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
    var sel = anySelected();
    if (sel && sel.length) {
      var layers = Object.values(sel[0]._layers || {});
      if (layers.length) {
        return layers[0];
      }
    }
    var upd = anyUpdated();
    if (upd && upd.length) {
      var ulayers = Object.values(upd[0]._layers || {});
      if (ulayers.length) {
        return ulayers[0];
      }
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
  info: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
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
  // Sauvegarde tous les groupes de traces modifies (1 appel par groupe).
  var updated = [];
  try {
    updated = anyUpdated();
  } catch (err) {}
  if (!updated.length) {
    map.lMap.notification.info("Save", "Aucune modification a sauvegarder.");
    return;
  }
  updated.forEach(function (laygroup) {
    var first = null;
    try {
      first = Object.values(laygroup._layers || {})[0] || null;
    } catch (err) {}
    if (first) {
      saveEntity({ relatedTarget: first, latlng: null });
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
  var st = cur.options || {};
  var curColor = st.color || "#3388ff";
  var curWeight = st.weight != null ? st.weight : 3;
  var curDash = st.dashArray || "";

  var contentHtml =
    '<div class="leaflet-edit-info">' +
    '<table class="leaflet-edit-info-table">' +
    infoRow("Type", info.type) +
    infoRow("Points", info.nbPoints) +
    infoRow("Longueur", info.length) +
    infoRow("État", info.state) +
    infoRow("Fichier", info.filename) +
    "</table>" +
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
        // Le style fait partie de la donnée sauvegardée : on marque modifié.
        setUpdated(cur);
        leafletEditNotify("success", "Style", "Style appliqué (trace marquée modifiée).");
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

// -- Barre Valider / Annuler d'édition ---------------------------------------
// Affichée pendant l'édition d'une trace (editLayer), masquée à la sortie
// (finEditLayer). Valider => setUpdated(layer) pour marquer à sauvegarder.
function showEditConfirmBar(layer) {
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
  var evtLike = { relatedTarget: layer, latlng: null };
  var bar = L.cascadeButtons(
    [
      {
        icon: LE_ICONS.validate,
        title: "Valider les modifications",
        command: function () {
          finEditLayer(evtLike, true);
        },
      },
      {
        icon: LE_ICONS.cancel,
        title: "Annuler les modifications",
        command: function () {
          finEditLayer(evtLike, false);
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

function hideEditConfirmBar() {
  try {
    if (map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.editConfirmBar) {
      map.lMap.removeControl(map.lMap.leafletEdit.editConfirmBar);
      map.lMap.leafletEdit.editConfirmBar = null;
    }
  } catch (err) {}
}

// -- Actions "Outils" ---------------------------------------------------------
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
    if (map.bounds && map.bounds.isValid()) {
      map.lMap.fitBounds(map.bounds);
    } else {
      map.lMap.notification.info("Outils", "Aucune trace a cadrer.");
    }
  } catch (err) {}
}

// Déclenche le contrôle Locate existant (créé dans init.drupal.js).
// Si absent (désactivé en config), notifie l'utilisateur.
function locateMe() {
  try {
    var locateCtrl = map.lMap.leafletEdit && map.lMap.leafletEdit.locateControl;
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
  } catch (err) {}
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

  var fileItems = [];
  if (can("importGPX")) {
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
  if (can("exportGPX")) {
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
  if (can("edit")) {
    editItems.push({
      icon: LE_ICONS.edit,
      title: "Editer la trace",
      command: editCurrentTrace,
    });
    editItems.push({
      icon: LE_ICONS.info,
      title: "Infos / Style",
      command: showTraceInfo,
    });
    editItems.push({
      icon: LE_ICONS.simplify,
      title: "Simplifier",
      command: simplifyCurrentTrace,
    });
    editItems.push({
      icon: LE_ICONS.delete,
      title: "Supprimer",
      command: deleteCurrentTrace,
    });
  }

  var toolsItems = [
    {
      icon: LE_ICONS.fullscreen,
      title: "Plein ecran",
      command: toggleFullscreen,
    },
    {
      icon: LE_ICONS.fit,
      title: "Cadrer les traces",
      command: zoomToTraces,
    },
    {
      icon: LE_ICONS.locate,
      title: "Me localiser",
      command: locateMe,
    },
  ];

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

  laygroup = panel._layersActives.find(
    (_l) =>
      _l._leaflet_id == Object.keys(e.relatedTarget.pm._parentLayerGroup)[0]
  );
  addData(
    Object.keys(e.relatedTarget.pm._parentLayerGroup)[0],
    path1,
    e.relatedTarget
  );
  addData(
    Object.keys(e.relatedTarget.pm._parentLayerGroup)[0],
    path2,
    e.relatedTarget
  );

  e.relatedTarget.remove();
}
