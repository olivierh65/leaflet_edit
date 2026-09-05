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
  return [
    { key: "showcoord", text: "Show coordinates", iconCls: "fa-solid fa-location-dot", enabled: !!layer, callback: showCoordinates },
    { key: "editlayer", text: editing ? "Finish edit" : "Edit layer", iconCls: "fa-regular fa-pen-to-square", enabled: !!layer && leafletEditCan("edit"), callback: editing ? finEditLayer : editLayer },
    { key: "cutline", text: "Cut here", iconCls: "fa-regular fa-scissors", enabled: !!layer && leafletEditCan("edit"), callback: cutLine },
    { key: "joinline", text: "Join", iconCls: "fa-regular fa-link", enabled: !!layer && leafletEditCan("edit"), callback: joinLine },
    { key: "deletelay", text: "Delete", iconCls: "fa-regular fa-eraser", enabled: !!layer && leafletEditCan("edit"), callback: deleteLay },
    { key: "save", text: "Save", iconCls: "fa-regular fa-floppy-disk", enabled: !!layer && updated && leafletEditCan("save"), callback: saveEntity },
    { key: "exportgpx", text: "Export to GPX", iconCls: "fa-solid fa-file-export", enabled: !!layer && leafletEditCan("exportGPX"), callback: exportGPX },
    { key: "exportgpxall", text: "Export to GPX (All)", iconCls: "fa-solid fa-file-export", enabled: !!layer && leafletEditCan("exportGPX"), callback: exportGPXAll },
    { key: "exportgpxallmerge", text: "Export to GPX (All Merge)", iconCls: "fa-solid fa-file-export", enabled: !!layer && leafletEditCan("exportGPX"), callback: exportGPXAllMerge },
    { key: "importfile", text: "Import GPX file", iconCls: "fa-solid fa-file-import", enabled: leafletEditCan("importGPX"), callback: readLocalFile },
    { key: "simplify", text: "Simplify", iconCls: "fa-solid fa-minimize", enabled: !!layer && leafletEditCan("edit"), callback: simplify },
  ];
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
  cutline: 3,
  joinline: 4,
  deletelay: 5,
  sep2: 6,
  save: 7,
  exportgpx: 8,
  exportgpxall: 9,
  exportgpxallmerge: 10,
  sep3: 11,
  importfile: 12,
  sep4: 13,
  simplify: 14,
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
}

function evtMapCreate(e) {
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
    prompt: {
      buttonOK: "Ok",
      buttonCancel: "Cancel",
      callback: function () {
        var layersSel = win.getContainer().querySelector(".leaflet-edit-assign-layers");
        var typesSel = win.getContainer().querySelector(".leaflet-edit-assign-types");
        var layId = layersSel ? layersSel.value : "-1";
        var typeKey = typesSel ? typesSel.value : null;
        var laygroup = panel._layersActives.find(function (_l) {
          return String(_l._leaflet_id) === String(layId);
        });
        if (!laygroup || typeKey === null || typeKey === "") {
          drawnLayer.remove();
          return;
        }
        // Copie les propriétés du type choisi.
        var trace = drawnLayer.toGeoJSON();
        try {
          trace.properties = laygroup._layers[typeKey].feature.properties;
        } catch (error) {
          console.error(error);
        }
        addData(layId, trace, laygroup._layers[typeKey]);
        // Autorise la sauvegarde de ce calque.
        setUpdated(laygroup._layers[typeKey]);
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
    Object.values(panel._layersActives).forEach(function (value) {
      var opt = document.createElement("option");
      opt.value = value._leaflet_id;
      opt.textContent = value.options.leafletEdit.description;
      layersSel.appendChild(opt);
    });
  }

  function fillTypes(laygroup) {
    typesSel.innerHTML = "";
    var listeTypes = {};
    Object.entries(laygroup._layers).forEach(function (entry) {
      var key = entry[0];
      var value = entry[1];
      var typeVal = value.feature && value.feature.properties && value.feature.properties.type
        ? value.feature.properties.type
        : "N/A";
      if (!(typeVal in listeTypes)) {
        listeTypes[typeVal] = { key: key, layers: [] };
        var opt = document.createElement("option");
        opt.value = key;
        opt.textContent = typeVal;
        typesSel.appendChild(opt);
      }
      listeTypes[typeVal].layers.push(value);
    });
    return listeTypes;
  }

  var currentTypes = {};
  fillLayers();
  layersSel.addEventListener("change", function () {
    var laygroup = panel._layersActives.find(function (_l) {
      return String(_l._leaflet_id) === String(layersSel.value);
    });
    if (!laygroup) {
      typesSel.innerHTML = "";
      currentTypes = {};
      return;
    }
    currentTypes = fillTypes(laygroup);
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
function evtFeatureClick(e) {
  console.log(e);
  // 1 tap/clic sur la trace = sélection (surbrillance) + trace courante
  // pour la barre métier. Sur tactile, ouvre en plus la popup d'actions.
  // Le clic droit garde le contextmenu complet sur desktop.
  if (!e || !e.sourceTarget) {
    return;
  }
  // Ne pas changer la sélection pendant une édition Geoman en cours.
  var editing = false;
  try {
    editing = !!(e.sourceTarget.pm && typeof e.sourceTarget.pm.enabled === "function" && e.sourceTarget.pm.enabled());
  } catch (err) {}
  if (!editing) {
    select_feature(e.sourceTarget);
  }
  try {
    if (typeof setCurrentTrace === "function") {
      setCurrentTrace(e.sourceTarget);
    }
  } catch (err) {}
  if (!isTouchDevice()) {
    return;
  }
  if (editing) {
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
    select_feature(e.sourceTarget);
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
  // console.log(e);
  e.sourceTarget.addDistanceMarkers();
}

function evtFeatureTooltipclose(e) {
  // console.log(e);
  e.sourceTarget.removeDistanceMarkers();
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
  a = getLayGroup(e.relatedTarget);
  alert(
    e.latlng +
      "\nColor: " +
      e.relatedTarget.options.color +
      "\nEventParents: " +
      Object.keys(e.relatedTarget._eventParents).toString() +
      "\nLaygroupID: " +
      a._leaflet_id +
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
}

function moveValidation(layer, marker, event) {
  return true;
}

function removeValidation(obj) {
  evt = obj.event;
  return true;
}

function leafletEditEndpoint(key, fallback) {
  try {
    var settings = drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit;
    if (settings && settings.endpoints && settings.endpoints[key]) {
      return settings.endpoints[key];
    }
  } catch (e) {}
  return fallback;
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

function saveEntity(e) {
  console.log("Save");

  var fd = new FormData();

  // search all features with same fid
  var nid = e.relatedTarget.options.leafletEdit["nid"];
  var fid = e.relatedTarget.options.leafletEdit["fid"];
  var leafletid = e.relatedTarget._leaflet_id;

  var data = [];
  data.push(e.relatedTarget.toGeoJSON()); /*= [
     {
      geojson: e.relatedTarget.toGeoJSON(),
      type: e.relatedTarget.feature.properties["type"],
    },

  ];*/

  for (const [key, value] of Object.entries(e.relatedTarget._map._layers)) {
    console.log(key, value);
    if (key == leafletid) {
      continue;
    }
    if (value.options.leafletEdit) {
      if (
        value.options.leafletEdit["fid"] == fid &&
        value.options.leafletEdit["nid"] == nid
      ) {
        // alert (key);
        if (value.feature) {
          if (value.defaultOptions) {
            /* data.push({
              geojson: value.toGeoJSON(),
              type: value.feature.properties["type"],
            }); */
            data.push(value.toGeoJSON());
            select_feature(value, 10000);
          }
        }
      }
    }
  }

  fd.append("fid", e.relatedTarget.defaultOptions.leafletEdit.fid);
  fd.append("nid", e.relatedTarget.defaultOptions.leafletEdit.nid);
  fd.append("geojson", JSON.stringify(turf.featureCollection(data)));

  var rsave = [];
  // Modale bloquante pendant la sauvegarde (évite les doubles clics /
  // autres opérations concurrentes). Fermée dans success + error.
  showBusyModal("Sauvegarde", "Sauvegarde de la trace en cours…");

  jQuery.ajax({
    url: leafletEditEndpoint("save", "/leaflet-edit/save"),
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    success: function (response) {
      hideBusyModal();
      rsave = response;
      let result = response.success;
      if (result) {
        leafletEditNotify("success", "Save", "Saved");
        // Sauvegarde OK : le groupe n'est plus "modifié", le style
        // orange disparaît sur toutes ses traces.
        e.relatedTarget.defaultOptions.leafletEdit.fid = response.fid;
        clearUpdatedGroup(e.relatedTarget);
      } else {
        let msg = response.message;
        leafletEditNotify("error", "Save", "file not uploaded: " + msg);
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
  if (rsave.success) {
    leafletEditNotify(
      "success",
      "Save",
      "Saved (" +
        e.relatedTarget.defaultOptions.leafletEdit.fid +
        "=>" +
        rsave.fid +
        ")"
    );
    e.relatedTarget.defaultOptions.leafletEdit.fid = rsave.fid;
    clearUpdatedGroup(e.relatedTarget);
  }
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

  var nid = e.relatedTarget.options.leafletEdit["nid"];
  var fid = e.relatedTarget.options.leafletEdit["fid"];
  var leafletid = e.relatedTarget._leaflet_id;

  data = [
    {
      geojson: e.relatedTarget.toGeoJSON(),
      type: e.relatedTarget.feature.properties["type"],
    },
  ];
  select_feature(e.relatedTarget, 10000);

  for (const [key, value] of Object.entries(e.relatedTarget._map._layers)) {
    console.log(key, value);
    if (key == leafletid) {
      continue;
    }
    if (value.options.leafletEdit) {
      if (
        value.options.leafletEdit["fid"] == fid &&
        value.options.leafletEdit["nid"] == nid
      ) {
        // alert (key);
        if (value.feature) {
          if (value.defaultOptions) {
            data.push({
              geojson: value.toGeoJSON(),
              type: value.feature.properties["type"],
            });
            select_feature(value, 10000);
          }
        }
      }
    }
  }

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
  console.log("export GPX (All)");

  var nid = e.relatedTarget.options.leafletEdit["nid"];
  var fid = e.relatedTarget.options.leafletEdit["fid"];
  var leafletid = e.relatedTarget._leaflet_id;

  data = [];
  for (const [pkey, pvalue] of Object.entries(e.relatedTarget._eventParents)) {
    p = pkey;
    v = pvalue;
    for (const [lkey, lvalue] of Object.entries(pvalue._layers)) {
      data.push({
        geojson: lvalue.toGeoJSON(),
        type: lvalue.feature.properties["type"] ?? "",
        properties: JSON.stringify(e.relatedTarget.feature.properties) ?? "",
        color: lvalue.options.color ?? "",
        width: lvalue.options.weight ?? "",
      });
      select_feature(lvalue, 10000);
    }
  }

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

  a = turf.simplify(e.relatedTarget.toGeoJSON(), {
    tolerance: 0.0001,
    highQuality: true,
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


