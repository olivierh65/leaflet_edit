/// context menu (desktop uniquement : sur mobile, voir openTracePopup)
function evtMenuShow() {
  map.lMap.on("contextmenu.show", function refer_context_menu(e) {
    if (isTouchDevice()) {
      // Sur tactile, l'appui long ne doit pas ouvrir le contextmenu :
      // le tap ouvre déjà la popup tactile.
      if (e.contextmenu && typeof e.contextmenu.hide === "function") {
        e.contextmenu.hide();
      }
      return;
    }
    // Double appel, avec la 2eme fois relatedTarget vide !!
    if (e.contextmenu._showLocation.relatedTarget) {
      this.ref_context_menu = e.contextmenu._showLocation.relatedTarget;
    } else {
      e.contextmenu._showLocation.relatedTarget = this.ref_context_menu;
    }
  });
}

/// Détection tactile partagée (mobile / tablette).
function isTouchDevice() {
  if (typeof L !== "undefined" && L.Browser && L.Browser.mobile) {
    return true;
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    try {
      return window.matchMedia("(pointer: coarse)").matches;
    } catch (err) {
      return false;
    }
  }
  return false;
}

/// Permissions d'édition exposées par le formatter (drupalSettings[mapid].leaflet_edit.permissions).
function leafletEditCan(action) {
  try {
    var perms = drupalSettings[mapid] &&
      drupalSettings[mapid].leaflet_edit &&
      drupalSettings[mapid].leaflet_edit.permissions;
    if (!perms) {
      return true;
    }
    if (typeof perms[action] === "undefined") {
      return true;
    }
    return !!perms[action];
  } catch (e) {
    return true;
  }
}

/// Construit la liste d'actions métier d'une trace, partagée entre le
/// contextmenu desktop et la popup tactile (tap). Chaque entrée :
/// { key, text, iconCls, enabled, callback }.
function buildTraceActions(evtLike) {
  var layer = evtLike && evtLike.relatedTarget ? evtLike.relatedTarget : null;
  var editing = !!(layer && layer.pm && typeof layer.pm.enabled === "function" && layer.pm.enabled());
  var updated = false;
  try {
    updated = layer ? isUpdated(layer) : false;
  } catch (e) {
    updated = false;
  }
  // Comme la barre métier : les actions des fonctionnalités désactivées
  // dans les réglages sont proposées désactivées (permissions d'abord).
  var toolOn = function (suffix) {
    try {
      return typeof leafletEditToolEnabled === "function" ? leafletEditToolEnabled(suffix) : true;
    } catch (e2) {
      return true;
    }
  };
  return [
    { key: "showcoord", text: "Show coordinates", iconCls: "fa-solid fa-location-dot", enabled: !!layer, callback: showCoordinates },
    { key: "editlayer", text: editing ? "Finish edit" : "Edit layer", iconCls: "fa-regular fa-pen-to-square", enabled: !!layer && leafletEditCan("edit") && toolOn("leaflet-geoman"), callback: editing ? finEditLayer : editLayer },
    { key: "filedetail", text: "Détail fichier (nom + style)", iconCls: "fa-regular fa-folder-open", enabled: !!layer && leafletEditCan("edit") && toolOn("leaflet.control-window"), callback: openLayerFileDetail },
    { key: "cutline", text: "Cut here", iconCls: "fa-regular fa-scissors", enabled: !!layer && leafletEditCan("edit") && toolOn("leaflet.turf"), callback: cutLine },
    { key: "joinline", text: "Join", iconCls: "fa-regular fa-link", enabled: !!layer && leafletEditCan("edit"), callback: joinLine },
    { key: "deletelay", text: "Delete", iconCls: "fa-regular fa-eraser", enabled: !!layer && leafletEditCan("edit"), callback: deleteLay },
    { key: "save", text: "Save", iconCls: "fa-regular fa-floppy-disk", enabled: !!layer && updated && leafletEditCan("save"), callback: saveEntity },
    { key: "exportgpx", text: "Export to GPX", iconCls: "fa-solid fa-file-export", enabled: !!layer && leafletEditCan("exportGPX") && toolOn("leaflet.togpx"), callback: exportGPX },
    { key: "exportgpxall", text: "Export to GPX (All)", iconCls: "fa-solid fa-file-export", enabled: !!layer && leafletEditCan("exportGPX") && toolOn("leaflet.togpx"), callback: exportGPXAll },
    { key: "exportgpxallmerge", text: "Export to GPX (All Merge)", iconCls: "fa-solid fa-file-export", enabled: !!layer && leafletEditCan("exportGPX") && toolOn("leaflet.togpx"), callback: exportGPXAllMerge },
    { key: "importfile", text: "Import GPX file", iconCls: "fa-solid fa-file-import", enabled: leafletEditCan("importGPX") && toolOn("leaflet.togeojson"), callback: readLocalFile },
    { key: "simplify", text: "Simplify", iconCls: "fa-solid fa-minimize", enabled: !!layer && leafletEditCan("edit") && toolOn("leaflet.turf"), callback: simplify },
    { key: "closemenu", text: "Fermer le menu", iconCls: "fa-regular fa-circle-xmark", enabled: true, callback: closeContextMenu },
    { key: "styleedit", text: "Style interactif", iconCls: "fa-solid fa-palette", enabled: !!layer && leafletEditCan("edit"), callback: editStyleInteractive },
  ];
}

/// Ferme le menu contextuel sans lancer de commande.
/// (Le plugin ferme déjà le menu quand on choisit une action ; cette
/// entrée permet de le refermer explicitement. Clic hors menu, zoom et
/// Échap le ferment aussi, voir wireMapContextMenuDismiss().)
function closeContextMenu(e) {
  try {
    if (map && map.lMap && map.lMap.contextmenu && typeof map.lMap.contextmenu.hide === "function") {
      map.lMap.contextmenu.hide();
    }
  } catch (err) {}
}

/// Branche UNE fois par carte les hooks du contextmenu de la carte :
/// fermeture au clic hors menu (mousedown), à la sortie de la carte, au
/// zoom et à Échap — plus le rafraîchissement des états (evtContextShow).
/// Indispensable car le handler 'contextmenu' de la carte n'est jamais
/// activé par défaut (option map absente) : sans cela, le menu ne se
/// fermerait qu'en choisissant une action.
function wireMapContextMenuDismiss(drupalLeaflet) {
  try {
    var lMap = drupalLeaflet && drupalLeaflet.lMap;
    var cm = lMap && lMap.contextmenu;
    if (!cm || typeof cm.addHooks !== "function" || cm._leDismissWired) {
      return false;
    }
    cm._leDismissWired = true;
    cm.addHooks();
    lMap.on("contextmenu.show", function (e) {
      if (typeof evtContextShow === "function") {
        evtContextShow(e);
      }
    });
    return true;
  } catch (err) {
    return false;
  }
}

// Ouvre le détail du fichier geojson contenant la trace visée
// (panneau nom + style par trace). Utilisé par le contextmenu et la popup.
function openLayerFileDetail(e) {
  var fid = 0;
  try {
    var layer = e && e.relatedTarget ? e.relatedTarget : null;
    fid = (layer && layer.defaultOptions && layer.defaultOptions.leafletEdit.source_fid) || 0;
  } catch (err) {}
  if (typeof openFileDetail === "function") {
    openFileDetail(fid);
  }
}

/// Ouvre la popup tactile (tap) avec les actions métier de la trace.
/// Remplace le contextmenu sur mobile : 1 tap = ouvre, 1 tap = action.
function openTracePopup(e) {
  if (!e || !e.relatedTarget || !map || !map.lMap) {
    return;
  }
  var layer = e.relatedTarget;
  var latlng = e.latlng || (layer.getBounds ? layer.getBounds().getCenter() : map.lMap.getCenter());
  var evtLike = { relatedTarget: layer, latlng: latlng };
  var actions = buildTraceActions(evtLike);

  var title = "Trace";
  try {
    var opts = layer.defaultOptions && layer.defaultOptions.leafletEdit;
    if (opts && opts.description) {
      title = opts.description;
    } else if (opts && opts.filename) {
      title = opts.filename;
    }
  } catch (err) {}

  var html = '<div class="leaflet-edit-trace-popup" data-leaflet-id="' + layer._leaflet_id + '">';
  html += '<div class="leaflet-edit-trace-popup-title">' + jQuery("<div>").text(title).html() + "</div>";
  html += '<div class="leaflet-edit-trace-popup-actions">';
  actions.forEach(function (action) {
    var disabled = action.enabled ? "" : " disabled";
    var icon = action.iconCls ? '<i class="' + action.iconCls + '" aria-hidden="true"></i> ' : "";
    html += '<button type="button" class="leaflet-edit-trace-btn" data-action="' +
      action.key + '"' + disabled + ">" + icon + jQuery("<span>").text(action.text).html() + "</button>";
  });
  html += "</div></div>";

  var popup = L.popup({ closeButton: true, maxWidth: 280, className: "leaflet-edit-trace-popup-wrap" })
    .setLatLng(latlng)
    .setContent(html)
    .openOn(map.lMap);

  // Délégation : un seul listener, compatible tactile.
  jQuery(".leaflet-edit-trace-popup-actions .leaflet-edit-trace-btn").off("click.leafletEdit").on("click.leafletEdit", function (clickEvt) {
    clickEvt.preventDefault();
    clickEvt.stopPropagation();
    var key = jQuery(this).data("action");
    var target = actions.filter(function (a) { return a.key === key; })[0];
    if (!target || !target.enabled) {
      return;
    }
    map.lMap.closePopup(popup);
    try {
      target.callback(evtLike);
    } catch (err) {
      console.error("[leaflet_edit] popup action " + key + " failed:", err);
    }
  });
}

const MENU = {
  showcoord: 0,
  sep1: 1,
  editlayer: 2,
  filedetail: 3,
  cutline: 4,
  joinline: 5,
  deletelay: 6,
  sep2: 7,
  save: 8,
  exportgpx: 9,
  exportgpxall: 10,
  exportgpxallmerge: 11,
  sep3: 12,
  importfile: 13,
  sep4: 14,
  simplify: 15,
  closemenu: 16,
  styleedit: 17,
};

function evtContextShow(e) {
  console.log(e);
  if (isTouchDevice()) {
    return;
  }
  if (!e.relatedTarget) {
    return;
  }
  if (isUpdated(e.relatedTarget)) {
    e.contextmenu.setDisabled(MENU.save, false);
  } else {
    e.contextmenu.setDisabled(MENU.save, true);
  }
  if (e.relatedTarget.pm.enabled()) {
    e.contextmenu.setDisabled(MENU.editlayer, true);
    e.contextmenu.setDisabled(MENU.finedit, false);
  } else {
    e.contextmenu.setDisabled(MENU.editlayer, false);
    e.contextmenu.setDisabled(MENU.finedit, true);
  }
}

function defineContextMenu() {
  // Construit depuis la source unique buildTraceActions() pour rester
  // synchronisé avec la popup tactile. Les séparateurs gardent les
  // index MENU.* existants utilisés par evtContextShow().
  var evtLike = { relatedTarget: null, latlng: null };
  var byKey = {};
  buildTraceActions(evtLike).forEach(function (a) {
    byKey[a.key] = a;
  });
  function item(key) {
    var a = byKey[key];
    return { text: a.text, iconCls: a.iconCls, callback: a.callback };
  }
  let menu = [];
  menu[MENU.showcoord] = item("showcoord");
  menu[MENU.sep1] = "-";
  menu[MENU.editlayer] = item("editlayer");
  menu[MENU.filedetail] = item("filedetail");
  menu[MENU.cutline] = item("cutline");
  menu[MENU.joinline] = item("joinline");
  menu[MENU.deletelay] = item("deletelay");
  menu[MENU.sep2] = "-";
  menu[MENU.save] = item("save");
  menu[MENU.exportgpx] = item("exportgpx");
  menu[MENU.exportgpxall] = item("exportgpxall");
  menu[MENU.exportgpxallmerge] = item("exportgpxallmerge");
  menu[MENU.sep3] = "-";
  menu[MENU.importfile] = item("importfile");
  menu[MENU.sep4] = "-";
  menu[MENU.simplify] = item("simplify");
  menu[MENU.closemenu] = item("closemenu");
  menu[MENU.styleedit] = item("styleedit");

  let context_menu = {
    contextmenu: true,
    contextmenuWidth: 140,
    contextmenuItems: menu,
  };

  return context_menu;
}

function evtMapDrawstart(e) {
  console.log(e);
}
function evtMapDrawend(e) {
  console.log(e);
  // Dessin annulé (Échap) avec un fichier en attente : oublie le choix
  // (après un pm:create réussi, pendingNewTrace est déjà consommé).
  try {
    if (map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.pendingNewTrace) {
      map.lMap.leafletEdit.pendingNewTrace = null;
      leafletEditNotify("info", "Nouvelle trace", "Dessin annulé.");
    }
  } catch (err) {}
  // Session de dessin terminée (création ou annulation) : la barre
  // Geoman se referme (no-op si déjà masquée).
  try {
    if (typeof hideGeomanToolbar === "function") {
      hideGeomanToolbar();
    }
  } catch (errHide) {}
}

function evtMapCreate(e) {
  // Création guidée ("Nouvelle trace" de la barre métier) : le fichier
  // a déjà été choisi avant le dessin, on crée directement côté serveur.
  try {
    if (map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.pendingNewTrace) {
      createTraceFromDraw(e);
      // Fin de création (tracé terminé) : la barre Geoman se referme.
      try {
        if (typeof hideGeomanToolbar === "function") {
          hideGeomanToolbar();
        }
      } catch (errHide) {}
      return;
    }
  } catch (err) {}
  // Fenêtre Leaflet native (L.control.window) : fonctionne en plein écran
  // et sur mobile, contrairement au dialog jQuery UI. Les <select> sont
  // natifs (pas de select2) pour éviter les problèmes de dropdown.
  var drawnLayer = e.layer;

  var contentHtml =
    '<div class="leaflet-edit-assign">' +
    '<div class="leaflet-edit-assign-group">' +
    "<label><b>Quel groupe de traces</b></label>" +
    '<select class="leaflet-edit-assign-layers" style="width:100%"></select>' +
    "</div>" +
    '<div class="leaflet-edit-assign-group">' +
    "<label><b>Quel type de trace</b></label>" +
    '<select class="leaflet-edit-assign-types" style="width:100%"></select>' +
    "</div>" +
    "</div>";

  var win = L.control.window(map.lMap, {
    title: "Affectation de la trace",
    content: contentHtml,
    modal: true,
    visible: false,
    position: "top",
    prompt: {
      buttonOK: "Ok",
      buttonCancel: "Cancel",
      callback: function () {
        var layersSel = win.getContainer().querySelector(".leaflet-edit-assign-layers");
        var typesSel = win.getContainer().querySelector(".leaflet-edit-assign-types");
        var layId = layersSel ? layersSel.value : "-1";
        var typeKey = typesSel ? typesSel.value : null;
        // Nouveau modèle : 1 trace = 1 layer (registre par tid).
        var origin = (map.leafletEditTraces && map.leafletEditTraces[layId]) || null;
        if (!origin || typeKey === null || typeKey === "") {
          drawnLayer.remove();
          return;
        }
        // Copie les propriétés du type choisi.
        var trace = drawnLayer.toGeoJSON();
        try {
          trace.properties = JSON.parse(JSON.stringify(origin.feature.properties || {}));
        } catch (error) {
          console.error(error);
        }
        addData(layId, trace, origin);
        // Autorise la sauvegarde de ce calque.
        setUpdated(origin);
        drawnLayer.remove();
      },
    },
  });
  // Annulation via la croix : retire le tracé dessiné.
  win.on("close hide", function () {
    try {
      if (map.lMap.hasLayer(drawnLayer)) {
        drawnLayer.remove();
      }
    } catch (err) {}
  });
  win.show();

  var box = win.getContainer();
  var layersSel = box.querySelector(".leaflet-edit-assign-layers");
  var typesSel = box.querySelector(".leaflet-edit-assign-types");

  function fillLayers() {
    layersSel.innerHTML = "";
    var empty = document.createElement("option");
    empty.value = "-1";
    empty.textContent = "";
    layersSel.appendChild(empty);
    // Nouveau modèle : 1 trace = 1 layer (registre par tid).
    Object.keys((map && map.leafletEditTraces) || {}).forEach(function (tid) {
      var value = map.leafletEditTraces[tid];
      var label = "Trace " + tid;
      try {
        label = (value.defaultOptions && value.defaultOptions.leafletEdit.description) || label;
      } catch (err) {}
      var opt = document.createElement("option");
      opt.value = tid;
      opt.textContent = label;
      layersSel.appendChild(opt);
    });
  }

  function fillTypes(origin) {
    typesSel.innerHTML = "";
    var listeTypes = {};
    // Le "type" proposé = le type géométrique / propriété type de la
    // trace d'origine choisie (1 seule trace, pas un groupe).
    var typeVal = "N/A";
    try {
      typeVal = (origin.feature && origin.feature.properties && origin.feature.properties.type) || "N/A";
    } catch (err) {}
    var opt = document.createElement("option");
    opt.value = "origin";
    opt.textContent = typeVal;
    typesSel.appendChild(opt);
    listeTypes[typeVal] = { key: "origin", layers: [origin] };
    return listeTypes;
  }

  var currentTypes = {};
  fillLayers();
  layersSel.addEventListener("change", function () {
    var origin = (map.leafletEditTraces && map.leafletEditTraces[layersSel.value]) || null;
    if (!origin) {
      typesSel.innerHTML = "";
      currentTypes = {};
      return;
    }
    currentTypes = fillTypes(origin);
  });
  typesSel.addEventListener("change", function () {
    var selected = typesSel.options[typesSel.selectedIndex];
    var label = selected ? selected.textContent : null;
    if (label && currentTypes[label]) {
      flash_features(currentTypes[label].layers, 2000);
    }
  });
}

function requestFullscreen(id) {
  var elem = jQuery(id)[0],
    isFullscreenSupported = false;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
    isFullscreenSupported = true;
  } else if (elem.msRequestFullscreen) {
    elem.msRequestFullscreen();
    isFullscreenSupported = true;
  } else if (elem.mozRequestFullScreen) {
    elem.mozRequestFullScreen();
    isFullscreenSupported = true;
  } else if (elem.webkitRequestFullscreen) {
    elem.webkitRequestFullscreen();
    isFullscreenSupported = true;
  }
  return isFullscreenSupported;
}

function evtLayerEdit(e) {
  console.log(e);
  // update distanceMarkers on each change
  if (e.layer.updateDistanceMarkers) {
    e.layer.updateDistanceMarkers(map.lMap);
  }
}

function evtLayerUpdate(e) {
  console.log(e);
  setUpdated(e.layer);
}
// var map1 = L.map('map', context_menu);
/// Appui long tactile : le 'click' Leaflet ne distingue pas tap et appui
/// long. On mesure nous-mêmes (touchstart -> click) : durée minimale +
/// déplacement maximal. Branché une fois par carte, paresseusement.
/// Tap = sélection seule ; appui long = popup d'actions ; déplacement
/// (panoramique, pincement) = jamais de popup.
var LE_LONGPRESS_MS = 550;
var LE_LONGPRESS_PX = 12;
var leTouchBegin = null;
var leTouchMoved = false;
function wireLongPress() {
  try {
    if (!map || !map.lMap || typeof map.lMap.getContainer !== "function") {
      return;
    }
    var le = (map.lMap.leafletEdit = map.lMap.leafletEdit || {});
    if (le.longPressWired) {
      return;
    }
    var container = map.lMap.getContainer();
    container.addEventListener("touchstart", function (ev) {
      try {
        if (ev.touches && ev.touches.length === 1) {
          leTouchBegin = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, time: Date.now() };
          leTouchMoved = false;
        } else {
          leTouchBegin = null;
          leTouchMoved = true;
        }
      } catch (e1) {
        leTouchBegin = null;
      }
    }, { passive: true });
    container.addEventListener("touchmove", function (ev) {
      try {
        if (!leTouchBegin || !ev.touches || !ev.touches.length) {
          return;
        }
        var dx = ev.touches[0].clientX - leTouchBegin.x;
        var dy = ev.touches[0].clientY - leTouchBegin.y;
        if (dx * dx + dy * dy > LE_LONGPRESS_PX * LE_LONGPRESS_PX) {
          leTouchMoved = true;
        }
      } catch (e2) {}
    }, { passive: true });
    le.longPressWired = true;
  } catch (err) {}
}
function leWasLongPress() {
  var result = false;
  try {
    wireLongPress();
    if (leTouchBegin && !leTouchMoved) {
      result = Date.now() - leTouchBegin.time >= LE_LONGPRESS_MS;
    }
  } catch (err) {
    result = false;
  }
  try {
    leTouchBegin = null;
  } catch (e3) {}
  return result;
}

function evtFeatureClick(e) {
  console.log(e);
  // 1er clic sur la trace = sélection (surbrillance) + trace courante
  // pour la barre métier. 2e clic sur la MÊME trace = désélection
  // (toggle). Sur tactile, SEUL un appui long ouvre la popup d'actions
  // (un tap ne fait que sélectionner : plus ergonomique, évite les
  // popups intempestives). Le clic droit garde le contextmenu complet
  // sur desktop.
  if (!e || !e.sourceTarget) {
    return;
  }
  // Ne pas changer la sélection pendant une édition Geoman en cours,
  // ni pendant une édition de style (le panneau StyleEditor gère ses
  // propres clics ; chaque clic y basculerait sinon la sélection).
  var editing = false;
  try {
    editing = !!(e.sourceTarget.pm && typeof e.sourceTarget.pm.enabled === "function" && e.sourceTarget.pm.enabled());
  } catch (err) {}
  if (!editing && typeof isStyleEditorActive === "function" && isStyleEditorActive()) {
    return;
  }
  if (!editing) {
    if (isSelected(e.sourceTarget)) {
      // Toggle : re-cliquer la trace sélectionnée la désélectionne.
      unselect_feature(e.sourceTarget);
      try {
        if (map.lMap.leafletEdit && map.lMap.leafletEdit.currentTrace === e.sourceTarget) {
          map.lMap.leafletEdit.currentTrace = null;
        }
      } catch (err) {}
    } else {
      // Tap mobile : sélection + affichage du label (pas de survol).
      select_feature(e.sourceTarget, 0, e.latlng);
      try {
        if (typeof setCurrentTrace === "function") {
          setCurrentTrace(e.sourceTarget);
        }
      } catch (err) {}
    }
  } else {
    try {
      if (typeof setCurrentTrace === "function") {
        setCurrentTrace(e.sourceTarget);
      }
    } catch (err) {}
  }
  // Empêche le handler "click" de la carte de désélectionner aussitôt
  // (le clic remonte de la trace vers la carte : propagation Leaflet,
  // pas DOM, donc stopPropagation ne suffit pas). On pose un timestamp
  // que le handler carte respecte (voir init.drupal.js).
  try {
    if (map && map.lMap) {
      map.lMap.leafletEdit = map.lMap.leafletEdit || {};
      map.lMap.leafletEdit.suppressMapClickUntil = Date.now() + 400;
    }
    if (e.originalEvent && typeof e.originalEvent.stopPropagation === "function") {
      e.originalEvent.stopPropagation();
    }
    if (typeof L !== "undefined" && L.DomEvent && e.originalEvent) {
      L.DomEvent.stopPropagation(e.originalEvent);
    }
  } catch (err) {}
  if (!isTouchDevice()) {
    return;
  }
  if (editing) {
    return;
  }
  // Mobile : tap = sélection seule, appui long = popup d'actions.
  if (!leWasLongPress()) {
    return;
  }
  openTracePopup({
    relatedTarget: e.sourceTarget,
    latlng: e.latlng || null,
  });
}

function evtFeatureContextmenu(e) {
  console.log(e);
}

function evtFeatureDblClick(e) {
  console.log(e);
  // Double-clic = bascule la sélection (surbrillance on/off).
  if (!e || !e.sourceTarget) {
    return;
  }
  if (isSelected(e.sourceTarget)) {
    unselect_feature(e.sourceTarget);
  } else {
    select_feature(e.sourceTarget, 0, e.latlng);
  }
}

function evtLayerMouseover(e) {
  // Logs désactivés : se déclenchent à chaque survol de trace (bruit console).
  // console.log("Mouseover: " + e);
  // e.sourceTarget.addDistanceMarkers();
}

function evtLayerMouseout(e) {
  // Logs désactivés : voir evtLayerMouseover.
  // console.log("Mouseout: " + e);
  // e.sourceTarget.removeDistanceMarkers();
}

function evtFeatureTooltipopen(e) {
  // Points kilométriques au survol : seulement si l'option "Points km"
  // est activée dans la barre Outils (désactivée par défaut).
  // console.log(e);
  try {
    if (map && map.lMap && map.lMap.leafletEdit && !map.lMap.leafletEdit.kmPoints) {
      return;
    }
  } catch (err) {}
  if (e.sourceTarget && typeof e.sourceTarget.addDistanceMarkers === "function") {
    e.sourceTarget.addDistanceMarkers();
  }
}

function evtFeatureTooltipclose(e) {
  // console.log(e);
  if (e.sourceTarget && typeof e.sourceTarget.removeDistanceMarkers === "function") {
    e.sourceTarget.removeDistanceMarkers();
  }
}

// Active / coupe les points km au survol (barre Outils).
// Quand on coupe, retire les marqueurs éventuellement affichés.
function setKmPointsEnabled(enabled) {
  try {
    map.lMap.leafletEdit = map.lMap.leafletEdit || {};
    map.lMap.leafletEdit.kmPoints = !!enabled;
    if (!enabled) {
      Object.values(map.leafletEditTraces || {}).forEach(function (l) {
        try {
          if (l && typeof l.removeDistanceMarkers === "function") {
            l.removeDistanceMarkers();
          }
        } catch (err) {}
      });
    }
    leafletEditNotify(
      "info",
      "Points km",
      enabled ? "Points kilométriques affichés au survol." : "Points kilométriques masqués."
    );
  } catch (err) {}
}

function isKmPointsEnabled() {
  try {
    return !!(map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.kmPoints);
  } catch (err) {
    return false;
  }
}

// -- Édition interactive du style (plugin leaflet-styleeditor) -------------
// Le panneau StyleEditor applique chaque réglage DIRECTEMENT sur la
// couche (layer.setStyle) et émet 'styleeditor:changed' sur la carte à
// chaque fois. Notre handler récupère le style de la couche, le mémorise
// (defaultOptions.style + recapture orig_style) et marque la trace comme
// modifiée : la sauvegarde (Save) persiste alors le style via
// getTraceBaseStyle(), exactement comme après une édition validée.
// Lancement : barre métier "Style interactif" ou menu contextuel (la
// trace courante ou visée). La librairie est chargée en dur par
// LeafletEditService (plus d'option 'styleeditor' dans la config).
var LE_STYLE_PATH_KEYS = [
  "stroke",
  "color",
  "weight",
  "opacity",
  "lineCap",
  "lineJoin",
  "dashArray",
  "dashOffset",
  "fill",
  "fillColor",
  "fillOpacity",
  "fillRule",
];

// Monte (une fois) le contrôle StyleEditor et branche le signal.
// Usage programmatique doc : L.control.styleEditor() + enable(layer),
// SANS addControl : aucun bouton carte n'est créé. On rejoue uniquement
// ce que onAdd() fait d'utile pour notre version vendored : options.map
// + createUi() (panneau + styleForm ; le controlDiv bouton reste détaché
// du DOM, donc invisible par construction, sans CSS spécifique).
// Point d'entrée unique = barre métier / menu contextuel.
function ensureStyleEditor() {
  try {
    if (typeof L === "undefined" || !L.control || typeof L.control.styleEditor !== "function") {
      leafletEditNotify(
        "error",
        "Style interactif",
        "Librairie StyleEditor non chargée."
      );
      return null;
    }
    if (!map || !map.lMap) {
      return null;
    }
    map.lMap.leafletEdit = map.lMap.leafletEdit || {};
    if (!map.lMap.leafletEdit.styleEditor) {
      // Pas de tooltip "Cliquez sur l'élément..." : la trace est déjà
      // choisie (barre métier / menu contextuel), le formulaire s'ouvre
      // directement dessus.
      var ctl = L.control.styleEditor({ showTooltip: false });
      ctl.options.map = map.lMap;
      ctl.createUi();
      map.lMap.leafletEdit.styleEditor = ctl;
      map.lMap.on("styleeditor:changed", onStyleEditorChanged);
    }
    return map.lMap.leafletEdit.styleEditor;
  } catch (err) {
    return null;
  }
}

// Le panneau StyleEditor est-il ouvert (mode édition) ?
function isStyleEditorActive() {
  try {
    var ctl = map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.styleEditor;
    return !!(ctl && typeof ctl.isEnabled === "function" && ctl.isEnabled());
  } catch (err) {
    return false;
  }
}

// Une édition géométrique Geoman est-elle en cours (édition ou dessin) ?
function isGeomanBusy() {
  try {
    if (!map || !map.lMap) {
      return false;
    }
    var pm = map.lMap.pm;
    if (pm && pm.Draw && typeof pm.Draw.getActiveShape === "function" && pm.Draw.getActiveShape()) {
      return true;
    }
    var traces = map.leafletEditTraces || {};
    return Object.values(traces).some(function (l) {
      try {
        return !!(l && l.pm && typeof l.pm.enabled === "function" && l.pm.enabled());
      } catch (err) {
        return false;
      }
    });
  } catch (err2) {
    return false;
  }
}

// Ouvre le StyleEditor sur une trace (courante si non précisée).
// Barre métier sans trace (appel sans couche) alors que le mode est déjà
// actif : quitte le mode style. Le bouton natif étant retiré au montage,
// la barre métier est l'unique interrupteur (entrée + sortie). Un appel
// AVEC couche explicite (menu contextuel, popup tactile) ouvre toujours
// le formulaire sur cette couche, même si le mode est déjà actif.
// Une barre Valider (rond vert) / Annuler (croix rouge) s'affiche en bas
// de carte pendant la session (voir showStyleConfirmBar).
function editStyleInteractive(e) {
  var layer = (e && e.relatedTarget) || null;
  if (!layer && typeof isStyleEditorActive === "function" && isStyleEditorActive()) {
    if (typeof finishStyleSession === "function") {
      finishStyleSession(true);
    }
    return;
  }
  if (!layer && typeof getCurrentTrace === "function") {
    try {
      layer = getCurrentTrace();
    } catch (err) {}
  }
  if (!layer) {
    leafletEditNotify("warning", "Style interactif", "Touchez d'abord une trace sur la carte.");
    return;
  }
  if (typeof isGeomanBusy === "function" && isGeomanBusy()) {
    leafletEditNotify("warning", "Style interactif", "Terminez d'abord l'édition géométrique en cours.");
    return;
  }
  var ctl = ensureStyleEditor();
  if (!ctl) {
    return;
  }
  // Snapshot pour "Annuler" : style persisté + style d'origine + flag.
  try {
    map.lMap.leafletEdit.styleSnapshot = {
      style: JSON.parse(JSON.stringify((layer.defaultOptions && layer.defaultOptions.style) || {})),
      orig: layer.orig_style ? JSON.parse(JSON.stringify(layer.orig_style)) : null,
      hasOrig: !!layer.orig_style,
      options: extractLeafletPathStyle(layer) || {},
      updated: !!layer.leafletEditUpd,
    };
  } catch (errSnap) {
    map.lMap.leafletEdit.styleSnapshot = null;
  }
  map.lMap.leafletEdit.styleLayer = layer;
  // Le formulaire du StyleEditor s'initialise depuis le style VIVANT de
  // la couche : une trace sélectionnée y présenterait son violet de
  // surbrillance (et sa largeur) au lieu de son vrai style. On pose
  // d'abord le style PROPRE (persisté), comme les autres formulaires.
  // La surbrillance revient en fin de session si besoin
  // (finishStyleSession(false) appelle refreshTraceStyle()).
  try {
    if (typeof getTraceBaseStyle === "function") {
      var baseSt = getTraceBaseStyle(layer);
      if (baseSt && typeof baseSt === "object") {
        var cleanSt = {};
        Object.keys(baseSt).forEach(function (k) {
          if (baseSt[k] !== undefined && baseSt[k] !== null) {
            cleanSt[k] = baseSt[k];
          }
        });
        // dashArray null = trait continu (convention des formulaires).
        if (!("dashArray" in cleanSt)) {
          cleanSt.dashArray = null;
        }
        layer.setStyle(cleanSt);
      }
    }
  } catch (errBase) {}
  try {
    ctl.enable(layer);
  } catch (err2) {
    leafletEditNotify("error", "Style interactif", "Ouverture impossible sur cette trace.");
    return;
  }
  if (typeof showStyleConfirmBar === "function") {
    showStyleConfirmBar();
  }
  leafletEditNotify(
    "info",
    "Style interactif",
    "Modifiez le style dans le panneau, puis Validez (rond vert) ou Annulez (croix rouge) en bas de carte."
  );
}

// Termine la session de style. commit=false : restaure le snapshot
// (style persisté + origine + flag + visuel). Sinon garde le style
// appliqué en direct. Ferme le panneau et la barre de confirmation.
function finishStyleSession(commit) {
  var le = null;
  try {
    le = map && map.lMap && map.lMap.leafletEdit;
  } catch (err) {}
  if (!le) {
    return;
  }
  var layer = le.styleLayer || null;
  var snap = le.styleSnapshot || null;
  if (commit === false && layer && snap) {
    try {
      layer.defaultOptions = layer.defaultOptions || {};
      layer.defaultOptions.style = JSON.parse(JSON.stringify(snap.style || {}));
      if (snap.hasOrig) {
        layer.orig_style = JSON.parse(JSON.stringify(snap.orig));
      } else {
        layer.orig_style = undefined;
        try {
          delete layer.orig_style;
        } catch (errDel) {}
      }
      layer.setStyle(JSON.parse(JSON.stringify(snap.options || {})));
      layer.leafletEditUpd = !!snap.updated;
      if (typeof refreshTraceStyle === "function") {
        refreshTraceStyle(layer);
      }
    } catch (errRevert) {}
    leafletEditNotify("info", "Style interactif", "Modifications de style annulées.");
  } else if (commit !== false) {
    // La couleur a pu changer : recalcule le contraste des flèches.
    try {
      if (layer && typeof refreshArrows === "function") {
        refreshArrows(layer);
      }
    } catch (errArrows) {}
    leafletEditNotify("info", "Style interactif", "Style validé — pensez à Save pour persister.");
  }
  try {
    if (le.styleEditor && typeof le.styleEditor.disable === "function") {
      le.styleEditor.disable();
    }
  } catch (errOff) {}
  le.styleLayer = null;
  le.styleSnapshot = null;
  if (typeof hideEditConfirmBar === "function") {
    hideEditConfirmBar();
  }
}

// Résout la trace visée par un événement 'styleeditor:changed'.
// L'événement transporte une COPIE des propriétés de la couche : on
// retrouve la vraie couche via son identifiant Leaflet, vérifié dans
// le registre des traces (repli : couche de lancement explicite).
function resolveStyleLayer(e) {
  try {
    var registry = (map && map.leafletEditTraces) || {};
    var lid = e && e._leaflet_id;
    if (lid) {
      var found = Object.values(registry).filter(function (l) {
        try {
          return l && typeof L !== "undefined" && L.stamp(l) === lid;
        } catch (err2) {
          return false;
        }
      })[0];
      if (found) {
        return found;
      }
    }
  } catch (err) {}
  try {
    var launched = map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.styleLayer;
    if (launched) {
      return launched;
    }
  } catch (err3) {}
  return null;
}

// Extrait le style de chemin courant d'une couche (mêmes clés que
// saveStyle()). null si rien d'exploitable (ex. marqueur icône).
function extractLeafletPathStyle(layer) {
  var out = null;
  try {
    var options = (layer && layer.options) || {};
    LE_STYLE_PATH_KEYS.forEach(function (key) {
      if (typeof options[key] !== "undefined" && options[key] !== null) {
        out = out || {};
        out[key] = options[key];
      }
    });
  } catch (err) {}
  return out;
}

// Signal 'styleeditor:changed' : récupère le style et marque à sauver,
// SANS toucher au visuel. Surtout pas de setUpdated()/refreshTraceStyle()
// ici : le style d'état orange écraserait le réglage en cours (chaque
// curseur semblerait mort car immédiatement réinitialisé). Le flag seul
// suffit à proposer la sauvegarde ; le style choisi reste affiché tel quel.
function onStyleEditorChanged(e) {
  var layer = resolveStyleLayer(e);
  if (!layer) {
    return;
  }
  var style = extractLeafletPathStyle(layer);
  if (!style) {
    return;
  }
  layer.defaultOptions = layer.defaultOptions || {};
  layer.defaultOptions.style = Object.assign({}, layer.defaultOptions.style || {}, style);
  // Mémorise comme style d'origine (sinon la désélection restaurerait
  // l'ancien style, et Save persisterait l'ancien via getTraceBaseStyle).
  try {
    layer.orig_style = Object.assign({}, layer.orig_style || {}, style);
  } catch (err) {}
  layer.leafletEditUpd = true;
}

// Flèches de sens des traces (barre Outils), via leaflet-arrowheads.
// Fallbacks kept in sync with LeafletEditFormatter::defaultSettings()
// (used when the display predates these settings or values are invalid).
// The effective values come from the content type configuration
// (formatter 'Arrowheads Settings'), see getArrowsDefaults().
var LE_ARROWS_FALLBACK = {
  yawn: 50,
  size: "30px",
  frequency: "endonly",
  fill: true,
  contrast: true,
};
var LE_TURF_SIMPLIFY_FALLBACK = {
  tolerance: 0.0001,
  highQuality: true,
};

// Reads the Arrowheads settings configured on the content type
// (formatter 'Arrowheads Settings'), with safe fallbacks.
// Parse une couleur CSS (hex #rgb/#rrggbb, rgb()/rgba(), noms courants)
// en {r, g, b} (0-255). Retourne null si illisible.
function parseCssColor(input) {
  if (input === undefined || input === null) {
    return null;
  }
  var s = String(input).trim().toLowerCase();
  if (!s) {
    return null;
  }
  var named = {
    black: "#000000", white: "#ffffff", red: "#ff0000", lime: "#00ff00",
    blue: "#0000ff", yellow: "#ffff00", cyan: "#00ffff", aqua: "#00ffff",
    magenta: "#ff00ff", fuchsia: "#ff00ff", gray: "#808080", grey: "#808080",
    green: "#008000", maroon: "#800000", navy: "#000080", olive: "#808000",
    purple: "#800080", silver: "#c0c0c0", teal: "#008080", orange: "#ffa500",
  };
  if (named[s]) {
    s = named[s];
  }
  var m = /^#([0-9a-f]{3}|[0-9a-f]{6})([0-9a-f]{2})?$/.exec(s);
  if (m) {
    var h = m[1];
    if (h.length === 3) {
      h = h.charAt(0) + h.charAt(0) + h.charAt(1) + h.charAt(1) + h.charAt(2) + h.charAt(2);
    }
    return {
      r: parseInt(h.substr(0, 2), 16),
      g: parseInt(h.substr(2, 2), 16),
      b: parseInt(h.substr(4, 2), 16),
    };
  }
  m = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/.exec(s);
  if (m) {
    return { r: Math.min(255, +m[1]), g: Math.min(255, +m[2]), b: Math.min(255, +m[3]) };
  }
  return null;
}

// Couleur contrastée automatique (flèches de sens) : teinte
// complémentaire de la couleur de l'entité (lisible sur la trace
// elle-même) ; repli noir/blanc par luminance pour les gris.
function leafletEditContrastColor(input) {
  try {
    var rgb = parseCssColor(input);
    if (!rgb) {
      return "#000000";
    }
    var mx = Math.max(rgb.r, rgb.g, rgb.b) / 255;
    var mn = Math.min(rgb.r, rgb.g, rgb.b) / 255;
    if (mx - mn < 0.12) {
      var lum = 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
      return lum > 140 ? "#000000" : "#ffffff";
    }
    var hx = function (v) {
      var s = Math.round(Math.max(0, Math.min(255, v))).toString(16);
      return s.length < 2 ? "0" + s : s;
    };
    return "#" + hx(255 - rgb.r) + hx(255 - rgb.g) + hx(255 - rgb.b);
  } catch (err) {
    return "#000000";
  }
}

function getArrowsDefaults() {
  var out = {
    yawn: LE_ARROWS_FALLBACK.yawn,
    size: LE_ARROWS_FALLBACK.size,
    frequency: LE_ARROWS_FALLBACK.frequency,
    fill: LE_ARROWS_FALLBACK.fill,
    contrast: LE_ARROWS_FALLBACK.contrast,
  };
  try {
    var cfg = drupalSettings[mapid] &&
      drupalSettings[mapid].leaflet_edit &&
      drupalSettings[mapid].leaflet_edit.arrowheads;
    if (!cfg) {
      return out;
    }
    var yawn = parseInt(cfg.yawn, 10);
    if (!isNaN(yawn)) {
      out.yawn = Math.min(120, Math.max(10, yawn));
    }
    var size = (cfg.size || "").toString().trim();
    if (size !== "") {
      out.size = size;
    }
    out.fill = !!cfg.fill;
    // Absent des vieux displays : contraste actif (comportement effectif).
    out.contrast = !(cfg.contrast === false || cfg.contrast === 0 || cfg.contrast === "0");
    var mode = (cfg.frequency_mode || "endonly").toString();
    var value = (cfg.frequency_value || "").toString().trim();
    if (mode === "allvertices" || mode === "endonly") {
      out.frequency = mode;
    } else if (mode === "count") {
      var n = parseInt(value, 10);
      out.frequency = !isNaN(n) && n > 0 ? n : LE_ARROWS_FALLBACK.frequency;
    } else if (mode === "distance") {
      out.frequency = /^\d+(\.\d+)?(m|px)$/.test(value) ? value : LE_ARROWS_FALLBACK.frequency;
    }
  } catch (err) {}
  return out;
}

// Reads the Turf simplify settings configured on the content type
// (formatter 'Turf Settings'), with safe fallbacks.
function getTurfSimplifyOptions() {
  var out = {
    tolerance: LE_TURF_SIMPLIFY_FALLBACK.tolerance,
    highQuality: LE_TURF_SIMPLIFY_FALLBACK.highQuality,
  };
  try {
    var turf = drupalSettings[mapid] &&
      drupalSettings[mapid].leaflet_edit &&
      drupalSettings[mapid].leaflet_edit.turf;
    var cfg = turf && turf.simplify;
    if (!cfg) {
      return out;
    }
    var tolerance = parseFloat(cfg.tolerance);
    if (!isNaN(tolerance) && tolerance >= 0) {
      out.tolerance = tolerance;
    }
    out.highQuality = !!cfg.high_quality;
  } catch (err) {}
  return out;
}

// Is the Turf 'simplify' operation enabled on the content type ?
// (Absent settings = legacy displays : enabled.)
function isTurfSimplifyEnabled() {
  try {
    var turf = drupalSettings[mapid] &&
      drupalSettings[mapid].leaflet_edit &&
      drupalSettings[mapid].leaflet_edit.turf;
    if (!turf || !turf.operations) {
      return true;
    }
    return !!turf.operations.simplify;
  } catch (err) {
    return true;
  }
}

// Le plugin leaflet-arrowheads est-il chargé ?
function arrowsPluginLoaded() {
  try {
    return !!(
      typeof L !== "undefined" &&
      L.Polyline &&
      L.Polyline.prototype &&
      typeof L.Polyline.prototype.arrowheads === "function"
    );
  } catch (err) {
    return false;
  }
}

function isArrowsEnabled() {
  try {
    return !!(map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.arrows);
  } catch (err) {
    return false;
  }
}

// Retire les flèches d'une trace (sans toucher à l'état global).
function clearArrows(layer) {
  try {
    if (layer && typeof layer.deleteArrowheads === "function") {
      layer.deleteArrowheads();
    }
  } catch (err) {}
}

// (Dé)applique les flèches à UNE trace selon l'état global. Idempotent :
// les anciennes flèches sont retirées avant reconstruction. Sans effet
// si le plugin est absent, la couche hors carte ou non linéaire (points).
function refreshArrows(layer) {
  try {
    if (!layer || typeof layer.arrowheads !== "function" || typeof layer.deleteArrowheads !== "function") {
      return;
    }
    try {
      layer.deleteArrowheads();
    } catch (e) {}
    if (!isArrowsEnabled() || !layer._map) {
      return;
    }
    var arrowOpts = getArrowsDefaults();
    // Flèches en couleur contrastée (vs couleur RÉELLE de l'entité, pas
    // la surbrillance) pour rester visibles sur la trace elle-même.
    // Désactivable par la checkbox "Contrasting arrows" des réglages.
    if (arrowOpts.contrast) {
      try {
        var baseSt = (typeof getTraceBaseStyle === "function") ? getTraceBaseStyle(layer) : null;
        var baseColor = (baseSt && baseSt.color) || (layer.options && layer.options.color) || "#3388ff";
        var contrast = leafletEditContrastColor(baseColor);
        arrowOpts.color = contrast;
        arrowOpts.fillColor = contrast;
      } catch (eColor) {}
    }
    layer.arrowheads(arrowOpts);
    // arrowheads() ne fait que mémoriser les options : force le rendu
    // immédiat (sinon visible seulement au prochain zoom/recentrage).
    if (typeof layer._reset === "function") {
      layer._reset();
    }
  } catch (err) {}
}

// Active / coupe les flèches de sens (barre Outils).
function setArrowsEnabled(enabled) {
  try {
    if (enabled && !arrowsPluginLoaded()) {
      leafletEditNotify(
        "error",
        "Flèches de sens",
        "Librairie leaflet-arrowheads non chargée (outil désactivé dans la configuration)."
      );
      return;
    }
    map.lMap.leafletEdit = map.lMap.leafletEdit || {};
    map.lMap.leafletEdit.arrows = !!enabled;
    Object.values(map.leafletEditTraces || {}).forEach(function (l) {
      try {
        if (!l) {
          return;
        }
        if (enabled) {
          refreshArrows(l);
        } else {
          clearArrows(l);
        }
      } catch (err) {}
    });
    leafletEditNotify(
      "info",
      "Flèches de sens",
      enabled ? "Flèches de sens affichées." : "Flèches de sens masquées."
    );
  } catch (err) {}
}

function evtFeatureVertexadded(e) {
  console.log("Vertexadded: " + e);
}

function evtFeatureVertexremoved(e) {
  console.log("Vertexremoved: " + e);
}

function evtFeatureVertexclick(e) {
  console.log("Vertexclick: " + e);
}

function evtFeatureSnapdrag(e) {
  console.log("Snapdrag: " + e);
}

function evtFeatureMarkerdragStart(e) {
  console.log("MarkerdragStart: " + e);
  // map.lMap.notification.info("Info", "DragStart");
  // disable map dragging when moving vertex
  map.lMap.dragging._enabled = false;
}

function evtFeatureMarkerdragEnd(e) {
  console.log("MarkerdragEnd: " + e);
  // map.lMap.notification.info("Info", "DragEnd");
  map.lMap.dragging._enabled = true;
}

function evtPanelAdd(e) {
  console.log("PanelAdd: " + e);
}

function showCoordinates(e) {
  var le = (e.relatedTarget.defaultOptions && e.relatedTarget.defaultOptions.leafletEdit) ||
    (e.relatedTarget.options && e.relatedTarget.options.leafletEdit) || {};
  alert(
    e.latlng +
      "\nColor: " +
      e.relatedTarget.options.color +
      "\nTrace ID: " +
      (le.tid || "?") +
      "\nFichier: " +
      (le.filename || "—") +
      "\nisUpdated: " +
      isUpdated(e.relatedTarget) +
      "(any updated: " +
      anyUpdated().length +
      ")" +
      "\nisSelected: " +
      isSelected(e.relatedTarget) +
      "(any selected: " +
      anySelected().length +
      ")"
  );
}

function editLayer(e) {
  // Une session de style en cours libère la barre de confirmation et le
  // panneau (style gardé tel quel) avant l'édition géométrique.
  try {
    if (typeof isStyleEditorActive === "function" && isStyleEditorActive() && typeof finishStyleSession === "function") {
      finishStyleSession(true);
    }
  } catch (errStyle) {}
  var layer = e.relatedTarget;
  // Mémorise les positions d'origine pour une annulation éventuelle.
  if (!layer.leafletEditOrigLatLngs) {
    try {
      layer.leafletEditOrigLatLngs = JSON.parse(JSON.stringify(layer.getLatLngs()));
    } catch (err) {
      layer.leafletEditOrigLatLngs = layer.getLatLngs();
    }
  }
  layer.pm.enable({
    allowSelfIntersection: true,
    allowEditing: true,
    snapDistance: 10,
    moveVertexValidation: moveValidation,
    removeVertexValidation: removeValidation,
    allowRemoval: false,
    allowCutting: false,
    addVertexOn: "click",
    limitMarkersToCount: 25,
    removeVertexOn: "dblclick",
  });
  // Style d'édition via le gestionnaire d'état (prioritaire).
  refreshTraceStyle(layer);
  // Retire les flèches pendant l'édition (géométrie en cours de
  // modification) : reconstruites à la validation (finEditLayer).
  if (typeof clearArrows === "function") {
    clearArrows(layer);
  }
  // Affiche la barre Valider / Annuler.
  if (typeof showEditConfirmBar === "function") {
    showEditConfirmBar(layer);
  }
}

function finEditLayer(e, save) {
  var layer = e.relatedTarget;
  if (save === false) {
    // Annulation : restaure la géométrie d'origine.
    try {
      if (layer.leafletEditOrigLatLngs) {
        layer.setLatLngs(layer.leafletEditOrigLatLngs);
      }
    } catch (err) {
      console.error("[leaflet_edit] cancel edit:", err);
    }
  } else if (save === true) {
    // Validation : la géométrie a changé, marque à sauvegarder.
    setUpdated(layer);
  }
  layer.leafletEditOrigLatLngs = null;
  try {
    delete layer.leafletEditOrigLatLngs;
  } catch (err) {}
  layer.pm.disable();
  // Ré-applique le style d'état (sélectionné / modifié / origine).
  refreshTraceStyle(layer);
  // Masque la barre Valider / Annuler.
  if (typeof hideEditConfirmBar === "function") {
    hideEditConfirmBar();
  }
  // La géométrie a pu changer : reconstruit les flèches de sens.
  if (typeof refreshArrows === "function") {
    refreshArrows(layer);
  }
}

function moveValidation(layer, marker, event) {
  return true;
}

function removeValidation(obj) {
  evt = obj.event;
  return true;
}

function leafletEditEndpoint(key, fallback) {
  var url = fallback;
  try {
    var settings = drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit;
    if (settings && settings.endpoints && settings.endpoints[key]) {
      url = settings.endpoints[key];
    }
  } catch (e) {}
  // Les routes POST exigent un token CSRF en query (?token=...), lié au
  // chemin EXACT de la route (ex: 'leaflet-edit/trace/848'). Le JS le
  // récupère via l'endpoint csrf-token (endpoints.csrfTokenUrl + path).
  if ((key === "saveTrace") && url.indexOf("token=") === -1) {
    try {
      var settings2 = drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit;
      var tokenUrl = (settings2 && settings2.endpoints && settings2.endpoints.csrfTokenUrl) || null;
      var path = url.replace(/^\//, "").split("?")[0];
      if (tokenUrl) {
        jQuery.ajax({ url: tokenUrl + encodeURIComponent(path), async: false }).done(function (data) {
          if (data && data.token) {
            url += (url.indexOf("?") === -1 ? "?" : "&") + "token=" + encodeURIComponent(data.token);
          }
        });
      }
    } catch (e2) {}
  }
  return url;
}

function leafletEditNotify(type, title, message) {
  try {
    var n = map && map.lMap && map.lMap.notification;
    if (n && typeof n[type] === "function") {
      n[type](title, message);
      return;
    }
  } catch (e) {}
  // Fallback si le plugin notifications n'est pas (encore) initialisé.
  try {
    if (type === "error") {
      console.error("[leaflet_edit] " + title + ": " + message);
    } else {
      console.log("[leaflet_edit] " + title + ": " + message);
    }
  } catch (e) {}
}

// -- Fenêtre modale "opération en cours" (bloque les interactions) ---------
// Utilisée pendant le Save : empêche l'utilisateur de lancer d'autres
// opérations tant que la requête AJAX n'a pas répondu.
function showBusyModal(title, message) {
  hideBusyModal();
  if (!map || !map.lMap || typeof L.control.window !== "function") {
    return null;
  }
  var win = L.control.window(map.lMap, {
    title: title || "Opération en cours",
    content: '<div class="leaflet-edit-busy"><div class="leaflet-edit-spinner"></div><p>' +
      jQuery("<div>").text(message || "Veuillez patienter…").html() + "</p></div>",
    modal: true,
    visible: false,
    position: "top",
    closeButton: false,
  });
  win.show();
  map.lMap.leafletEdit = map.lMap.leafletEdit || {};
  map.lMap.leafletEdit.busyModal = win;
  return win;
}

function hideBusyModal() {
  try {
    if (map && map.lMap && map.lMap.leafletEdit && map.lMap.leafletEdit.busyModal) {
      var win = map.lMap.leafletEdit.busyModal;
      map.lMap.leafletEdit.busyModal = null;
      win.close();
    }
  } catch (err) {}
}

// Construit les champs POST pour la création d'une trace (testable).
// pending: {mode: 'existing'|'new', fid, filename, label}.
function buildCreateTraceFields(pending, geojson, nid, label) {
  var fields = {
    nid: nid,
    geojson: JSON.stringify(geojson),
    label: label,
  };
  if (pending && pending.mode === "existing" && parseInt(pending.fid, 10) > 0) {
    fields.fid = String(parseInt(pending.fid, 10));
  } else if (pending && pending.mode !== "existing" && pending.filename) {
    fields.filename = pending.filename;
  }
  return fields;
}

// Crée côté serveur la trace dessinée (flux "Nouvelle trace").
// Le fichier a été choisi AVANT le dessin : existant (fid) ou nouveau
// (filename, créé par le serveur). Enregistre ensuite la couche avec
// son vrai tid (plus de "drawn-*" unsauvegardable).
function createTraceFromDraw(e) {
  var pending = null;
  try {
    pending = map.lMap.leafletEdit.pendingNewTrace || null;
    map.lMap.leafletEdit.pendingNewTrace = null;
  } catch (err) {}
  var drawnLayer = e && e.layer;
  var geojson = null;
  try {
    geojson = drawnLayer ? drawnLayer.toGeoJSON() : null;
  } catch (err2) {}
  if (!pending || !drawnLayer || !geojson || !geojson.geometry) {
    try {
      if (drawnLayer && drawnLayer.remove) {
        drawnLayer.remove();
      }
    } catch (err3) {}
    leafletEditNotify("error", "Nouvelle trace", "Dessin inexploitable.");
    return;
  }
  var label = pending.label || "Trace";
  var nid = null;
  try {
    nid = drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit && drupalSettings[mapid].leaflet_edit.nid;
  } catch (err4) {}
  var fields = buildCreateTraceFields(pending, geojson, nid, label);
  var fd = new FormData();
  Object.keys(fields).forEach(function (k) {
    fd.append(k, fields[k]);
  });

  showBusyModal("Création", "Création de la trace en cours…");

  // Token CSRF lié au chemin EXACT 'leaflet-edit/trace' (voir saveEntity).
  var createBase = leafletEditEndpoint("createTrace", "/leaflet-edit/trace");
  createBase = createBase.split("?")[0];
  var createUrl = createBase;
  try {
    var settings = drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit;
    var tokenUrl = (settings && settings.endpoints && settings.endpoints.csrfTokenUrl) || null;
    var createPath = createUrl.replace(/^\//, "").split("?")[0];
    if (tokenUrl) {
      jQuery.ajax({ url: tokenUrl + encodeURIComponent(createPath), async: false }).done(function (data) {
        if (data && data.token) {
          createUrl += (createUrl.indexOf("?") === -1 ? "?" : "&") + "token=" + encodeURIComponent(data.token);
        }
      });
    }
  } catch (err5) {}

  jQuery.ajax({
    url: createUrl,
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    success: function (response) {
      hideBusyModal();
      if (!response || !response.success || !response.trace_id) {
        try {
          drawnLayer.remove();
        } catch (err6) {}
        leafletEditNotify("error", "Nouvelle trace", "Création refusée : " + ((response && response.message) || "?"));
        return;
      }
      var tid = parseInt(response.trace_id, 10);
      var sourceFid = parseInt(response.source_fid || 0, 10) || 0;
      var filename = response.filename || "";
      var groupName = filename !== "" ? filename : "Traces";
      try {
        drawnLayer.remove();
      } catch (err7) {}
      // Reconstruit une couche propre (même modèle que le chargement
      // bbox) avec le contexte serveur (vrai tid, révision, fichier).
      var feature = {
        type: "Feature",
        geometry: geojson.geometry,
        properties: {
          _trace_id: tid,
          _revision_id: response.revision_id || null,
          _label: label,
          _source: filename,
          _source_fid: sourceFid,
        },
        style: response.style || { color: "#3388ff", weight: 3 },
      };
      var sub = L.geoJSON(feature, {
        pointToLayer: function (f, latlng) {
          return L.circleMarker(latlng, f.style || { color: "red", weight: 5 });
        },
      });
      sub.eachLayer(function (value) {
        value.defaultOptions = value.defaultOptions || {};
        value.defaultOptions.leafletEdit = {
          nid: nid,
          tid: tid,
          revision_id: response.revision_id || null,
          description: label,
          filename: filename,
          source_fid: sourceFid,
          _selected: false,
          _updated: false,
        };
        value.defaultOptions.style = feature.style;
        value.feature = value.feature || feature;
        if (label) {
          try {
            value.bindTooltip(label, { sticky: true });
          } catch (err8) {}
        }
        processLoadedData(value);
        if (map && typeof map.registerTraceLayer === "function") {
          map.registerTraceLayer(value, tid, label, groupName, false);
        } else {
          try {
            value.addTo(map.lMap);
          } catch (err9) {}
          map.leafletEditTraces[tid] = value;
        }
        if (map && typeof map.indexTraceFile === "function") {
          map.indexTraceFile(tid, sourceFid, groupName);
        }
        // Sélection visuelle (non bloquant : ne doit jamais empêcher
        // la notification de succès ci-dessous).
        try {
          if (typeof select_feature === "function") {
            select_feature(value);
          }
          if (typeof setCurrentTrace === "function") {
            setCurrentTrace(value);
          }
        }
        catch (err12) {}
      });
      leafletEditNotify("success", "Nouvelle trace", "Trace " + tid + " créée dans " + (filename !== "" ? filename : "Sans fichier") + ".");
    },
    error: function (xhr) {
      hideBusyModal();
      try {
        drawnLayer.remove();
      } catch (err10) {}
      var detail = "";
      try {
        var resp = xhr && xhr.responseJSON ? xhr.responseJSON : null;
        if (resp && (resp.message || resp.error)) {
          detail = " - " + (resp.message || resp.error);
        }
      } catch (err11) {}
      leafletEditNotify("error", "Nouvelle trace", "Création impossible (" + xhr.status + ")" + detail);
    },
  });
}

function saveEntity(e) {
  var le = (e.relatedTarget.defaultOptions && e.relatedTarget.defaultOptions.leafletEdit) ||
    (e.relatedTarget.options && e.relatedTarget.options.leafletEdit) || {};
  var tid = le.tid || e.relatedTarget._geofileTid || null;
  if (!tid) {
    leafletEditNotify("error", "Save", "Trace sans identifiant (rechargez la carte).");
    return;
  }
  var fd = new FormData();
  fd.append("geojson", JSON.stringify(e.relatedTarget.toGeoJSON()));
  // Style PROPRE persisté avec la géométrie : jamais le style d'état
  // "sélectionné" (violet) / "modifié" (orange). Si la trace est
  // sélectionnée au moment du save, on envoie son style d'origine.
  try {
    var baseStyle = (typeof getTraceBaseStyle === "function")
      ? getTraceBaseStyle(e.relatedTarget)
      : (e.relatedTarget.options || {});
    fd.append("style", JSON.stringify({
      color: baseStyle.color,
      weight: baseStyle.weight,
      dashArray: baseStyle.dashArray || null,
    }));
  } catch (err) {}

  // Modale bloquante pendant la sauvegarde (évite les doubles clics /
  // autres opérations concurrentes). Fermée dans success + error.
  showBusyModal("Sauvegarde", "Sauvegarde de la trace en cours…");

  // Le token CSRF est lié au chemin EXACT de la route
  // ('leaflet-edit/trace/{tid}') : on le demande pour l'URL complète
  // (base + tid), pas pour la base seule (sinon 403 'csrf_token invalid').
  // NOTE : leafletEditEndpoint("saveTrace") ajoute DÉJÀ un token calculé
  // pour la base seule ('leaflet-edit/trace') : il faut le RETIRER avant
  // d'ajouter le bon token, sinon l'URL finit en
  // '/leaflet-edit/trace?token=<base>/924' (token invalide -> 403).
  var saveBase = leafletEditEndpoint("saveTrace", "/leaflet-edit/trace");
  // Retire un éventuel token calculé pour la base seule.
  saveBase = saveBase.split("?")[0];
  var saveUrl = saveBase + "/" + tid;
  try {
    if (saveUrl.indexOf("token=") === -1) {
      var settings3 = drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit;
      var tokenUrl3 = (settings3 && settings3.endpoints && settings3.endpoints.csrfTokenUrl) || null;
      var savePath = saveUrl.replace(/^\//, "").split("?")[0];
      if (tokenUrl3) {
        jQuery.ajax({ url: tokenUrl3 + encodeURIComponent(savePath), async: false }).done(function (data) {
          if (data && data.token) {
            saveUrl += (saveUrl.indexOf("?") === -1 ? "?" : "&") + "token=" + encodeURIComponent(data.token);
          }
        });
      }
    }
  } catch (e3) {}

  jQuery.ajax({
    url: saveUrl,
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    success: function (response) {
      hideBusyModal();
      if (response && response.success) {
        leafletEditNotify("success", "Save", "Saved (révision " + response.revision_id + ")");
        // Sauvegarde OK : la trace n'est plus "modifiée".
        try {
          e.relatedTarget.defaultOptions.leafletEdit.revision_id = response.revision_id;
        } catch (err) {}
        clearUpdated(e.relatedTarget);
      } else {
        leafletEditNotify("error", "Save", "file not uploaded: " + ((response && response.message) || "?"));
      }
    },
    error: function (xhr) {
      hideBusyModal();
      var detail = "";
      try {
        var resp = xhr && xhr.responseJSON ? xhr.responseJSON : null;
        if (resp && (resp.message || resp.error)) {
          detail = " - " + (resp.message || resp.error);
        }
      } catch (e2) {}
      leafletEditNotify("error", "Save", "file not uploaded (" + xhr.status + ")" + detail);
    },
  });
}

async function exportGPX(e) {
  console.log("export GPX");

  select_feature(e.relatedTarget, 5000);

  var fd = new FormData();
  fd.append("geojson", JSON.stringify(e.relatedTarget.toGeoJSON()));
  fd.append("filename", e.relatedTarget.defaultOptions.leafletEdit.filename);
  fd.append(
    "description",
    e.relatedTarget.defaultOptions.leafletEdit.description
  );

  jQuery.ajax({
    url: leafletEditEndpoint("exportGpx", "/leaflet-edit/export-gpx"),
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    success: function (response) {
      filename =
        response.filename +
        (response.description.length > 0 ? "-" + response.description : "") +
        ".gpx";
      //Check the Browser type and download the File.
      var isIE = false || !!document.documentMode;
      if (isIE) {
        window.navigator.msSaveBlob(
          new Blob([response.gpx]),
          filename,
          "text/octet-stream"
        );
      } else {
        var conv = document.createElement("a");
        conv.setAttribute(
          "href",
          "data:text/octet-stream;charset=utf-8," +
            encodeURIComponent(response.gpx)
        );
        conv.setAttribute("download", filename);
        conv.style.display = "none";
        document.body.appendChild(conv);
        conv.click();
        document.body.removeChild(conv);
      }

      map.lMap.notification.success("Export GPX", "Export " + filename + " OK");
    },
    error: function (response) {
      map.lMap.notification.error("Export GPX", "Export " + filename + " KO");
    },
  });
}

async function exportGPXAll(e) {
  console.log("export GPX (All)");

  // Nouveau modèle : 1 trace = 1 layer, regroupées par fichier source.
  // "Export All" = toutes les traces du MÊME fichier source que la trace
  // courante (même groupe panel), pas tout le registre.
  var cur = e.relatedTarget;
  var curLe = (cur.defaultOptions && cur.defaultOptions.leafletEdit) ||
    (cur.options && cur.options.leafletEdit) || {};
  var curSource = curLe.filename || "";
  var leafletid = cur._leaflet_id;

  function layerSource(value) {
    var le = (value.defaultOptions && value.defaultOptions.leafletEdit) ||
      (value.options && value.options.leafletEdit) || {};
    return le.filename || "";
  }
  function layerType(value) {
    try {
      return (value.feature && value.feature.properties && value.feature.properties.type) || "";
    } catch (err) {
      return "";
    }
  }

  data = [
    {
      geojson: cur.toGeoJSON(),
      type: layerType(cur),
    },
  ];
  select_feature(cur, 10000);

  Object.values((map && map.leafletEditTraces) || {}).forEach(function (value) {
    if (!value || value._leaflet_id === leafletid) {
      return;
    }
    if (!value.feature || !value.toGeoJSON) {
      return;
    }
    if (layerSource(value) !== curSource) {
      return;
    }
    data.push({
      geojson: value.toGeoJSON(),
      type: layerType(value),
    });
    select_feature(value, 10000);
  });

  var fd = new FormData();
  fd.append("geojson", JSON.stringify(data));
  fd.append("filename", e.relatedTarget.defaultOptions.leafletEdit.filename);
  fd.append(
    "description",
    e.relatedTarget.defaultOptions.leafletEdit.description
  );

  jQuery.ajax({
    url: leafletEditEndpoint("exportGpx", "/leaflet-edit/export-gpx"),
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    success: function (response) {
      response.gpx.forEach((g) => {
        filename = g.filename + ".gpx";
        //Check the Browser type and download the File.
        var isIE = false || !!document.documentMode;
        if (isIE) {
          window.navigator.msSaveBlob(
            new Blob([g.gpx]),
            filename,
            "text/octet-stream"
          );
        } else {
          var conv = document.createElement("a");
          conv.setAttribute(
            "href",
            "data:text/octet-stream;charset=utf-8," + encodeURIComponent(g.gpx)
          );
          conv.setAttribute("download", filename);
          conv.style.display = "none";
          document.body.appendChild(conv);
          conv.click();
          document.body.removeChild(conv);
        }
        map.lMap.notification.success(
          "Export GPX",
          "Export " + filename + " OK"
        );
      });
    },
    error: function (response) {
      map.lMap.notification.error("Export GPX", "Export KO");
    },
  });
}

async function exportGPXAllMerge(e) {
  console.log("export GPX (All Merge)");

  // Nouveau modèle : 1 trace = 1 layer. "All Merge" = toutes les traces
  // du MÊME fichier source que la trace courante.
  var cur = e.relatedTarget;
  var curLe = (cur.defaultOptions && cur.defaultOptions.leafletEdit) ||
    (cur.options && cur.options.leafletEdit) || {};
  var curSource = curLe.filename || "";

  data = [];
  Object.values((map && map.leafletEditTraces) || {}).forEach(function (lvalue) {
    if (!lvalue || !lvalue.toGeoJSON || !lvalue.feature) {
      return;
    }
    var le = (lvalue.defaultOptions && lvalue.defaultOptions.leafletEdit) ||
      (lvalue.options && lvalue.options.leafletEdit) || {};
    if ((le.filename || "") !== curSource) {
      return;
    }
    var props = {};
    try {
      props = lvalue.feature.properties || {};
    } catch (err) {}
    data.push({
      geojson: lvalue.toGeoJSON(),
      type: props.type || "",
      properties: JSON.stringify(cur.feature.properties) || "",
      color: lvalue.options.color || "",
      width: lvalue.options.weight || "",
    });
    select_feature(lvalue, 10000);
  });

  var fd = new FormData();
  fd.append("geojson", JSON.stringify(data));
  fd.append("filename", e.relatedTarget.defaultOptions.leafletEdit.filename);
  fd.append(
    "description",
    e.relatedTarget.defaultOptions.leafletEdit.description
  );

  jQuery.ajax({
    url: leafletEditEndpoint("exportGpxMerge", "/leaflet-edit/export-gpx-merge"),
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    success: function (response) {
      response.gpx.forEach((g) => {
        filename = g.filename + ".gpx";
        //Check the Browser type and download the File.
        var isIE = false || !!document.documentMode;
        if (isIE) {
          window.navigator.msSaveBlob(
            new Blob([g.gpx]),
            filename,
            "text/octet-stream"
          );
        } else {
          var conv = document.createElement("a");
          conv.setAttribute(
            "href",
            "data:text/octet-stream;charset=utf-8," + encodeURIComponent(g.gpx)
          );
          conv.setAttribute("download", filename);
          conv.style.display = "none";
          document.body.appendChild(conv);
          conv.click();
          document.body.removeChild(conv);
        }
        map.lMap.notification.success(
          "Export GPX",
          "Export " + filename + " OK"
        );
      });
    },
    error: function (response) {
      map.lMap.notification.error("Export GPX", "Export KO");
    },
  });
}

async function exportGPX__(e) {
  console.log("exportGPX");
  let fileHandle;
  try {
    fileHandle = await getNewFileHandle();
  } catch (ex) {
    if (ex.name === "AbortError") {
      return;
    }
    const msg = "An error occured trying to open the file.";
    console.error(msg, ex);
    alert(msg);
    return;
  }
  try {
    await writeFile(fileHandle, togpx(e.relatedTarget.toGeoJSON()));
  } catch (ex) {
    const msg = "Unable to save file.";
    console.error(msg, ex);
    alert(msg);
    return;
  }
}

async function getNewFileHandle() {
  const options = {
    types: [
      {
        description: "GPX documents",
        accept: {
          "text/plain": [".gpx"],
        },
      },
    ],
  };
  const handle = await window.showSaveFilePicker(options);
  return handle;
}

async function writeFile(fileHandle, contents) {
  // Support for Chrome 82 and earlier.
  if (fileHandle.createWriter) {
    // Create a writer (request permission if necessary).
    const writer = await fileHandle.createWriter();
    // Write the full length of the contents
    await writer.write(0, contents);
    // Close the file and write the contents to disk
    await writer.close();
    return;
  }
  // For Chrome 83 and later.
  // Create a FileSystemWritableFileStream to write to.
  const writable = await fileHandle.createWritable();
  // Write the contents of the file to the stream.
  await writable.write(contents);
  // Close the file and write the contents to disk.
  await writable.close();
}

function simplify(e) {
  console.log("Simplify");
  if (typeof turf === "undefined") {
    console.error("[leaflet_edit] turf.js non chargé, simplification impossible.");
    if (map && map.lMap && map.lMap.notification) {
      map.lMap.notification.error("Simplify", "Librairie turf.js non chargée.");
    }
    return;
  }
  if (!isTurfSimplifyEnabled()) {
    if (map && map.lMap && map.lMap.notification) {
      map.lMap.notification.warning("Simplify", "Opération désactivée dans la configuration du type de contenu.");
    }
    return;
  }

  // Tolérance / qualité configurées sur le content type (Turf Settings).
  var simplifyOptions = getTurfSimplifyOptions();
  a = turf.simplify(e.relatedTarget.toGeoJSON(), {
    tolerance: simplifyOptions.tolerance,
    highQuality: simplifyOptions.highQuality,
  });
  // e.relatedTarget.feature.geometry=a.geometry;
  // e.relatedTarget.feature.bbox=a.bbox;

  b = L.geoJSON(a);
  if (b.getLayers().length == 1) {
    before = e.relatedTarget.getLatLngs();
    before_elem = before[before.length - 1].length;
    e.relatedTarget.setLatLngs(b.getLayers()[0].getLatLngs());
    var after_elem = e.relatedTarget.getLatLngs()[before.length - 1].length;
    // La géométrie a été réécrite : marque la trace comme modifiée
    // (style orange + proposée au save), comme après une édition validée.
    setUpdated(e.relatedTarget);
    // Reconstruit les flèches sur la nouvelle géométrie.
    if (typeof refreshArrows === "function") {
      refreshArrows(e.relatedTarget);
    }
    map.lMap.notification.success(
      "Simplify",
      "Path simplified (" +
        before_elem +
        " => " +
        after_elem +
        ")"
    );
  } else {
    map.lMap.notification.warning(
      "Simplify",
      "not simplified, number of layers " + b.getLayers().length
    );
  }
}

function readLocalFile(e, file_type) {
  // Appels possibles : readLocalFile(evtLike) depuis la popup/panel,
  // ou readLocalFile(null, "GPX") depuis la barre metier.
  if (typeof e === "string" && !file_type) {
    file_type = e;
  } else if (typeof file_type === "undefined" || file_type === null) {
    file_type = "GPX";
  }

  var conv = document.createElement("input");
  conv.setAttribute("type", "file");
  conv.setAttribute("id", "leaflet_edit-file-input");
  conv.setAttribute("accept", "." + file_type);
  conv.style.display = "none";
  document.body.appendChild(conv);
  conv.addEventListener("change", readSingleFile, false);
  conv.click();
  document.body.removeChild(conv);
}

function readSingleFile(e) {
  var file = e.target.files[0];
  if (!file) {
    return;
  }
  var file_infos = e.target.files;
  var reader = new FileReader();
  reader.onload = (function (file_infos) {
    var fileInfos = file_infos;
    return function (e) {
      var contents = e.target.result;
      // Display file content
      importTrack(contents, fileInfos);
    };
  })(file);
  reader.readAsText(file);
}

function importTrack(track) {
  content = new window.DOMParser().parseFromString(track, "text/xml");
  geojson = gpx(content);
  lay = new L.geoJSON(geojson);
  lay.addTo(map.lMap);
}


