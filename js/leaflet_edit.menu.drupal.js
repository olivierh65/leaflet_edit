/// context menu
function evtMenuShow() {
  map.lMap.on("contextmenu.show", function refer_context_menu(e) {
    // Double appel, avec la 2eme fois relatedTarget vide !!
    if (e.contextmenu._showLocation.relatedTarget) {
      this.ref_context_menu = e.contextmenu._showLocation.relatedTarget;
    } else {
      e.contextmenu._showLocation.relatedTarget = this.ref_context_menu;
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
  if (!e.relatedTarget || !e.contextmenu) {
    return;
  }
  // Menu réduit : plus d'entrées Save/Edit à activer/désactiver ici
  // (c'est la barre haute qui gère les états). Garde-fou conservé
  // pour ne pas appeler setDisabled sur des index inexistants.
}

function defineContextMenu() {
  // Menu contextuel réduit : la barre haute couvre désormais
  // Edit / Cut / Delete / Save / Export / Import / Simplify.
  // Ne restent ici que les actions purement contextuelles (position du clic).
  // NOTE : tableau dense (sans trous) — Leaflet.contextmenu plante sur
  // les éléments undefined (Cannot read properties of undefined (reading 'index')).
  let menu = [
    {
      text: "Show coordinates",
      callback: showCoordinates,
    },
    "-",
    {
      text: "Cut here",
      iconCls: "fa-regular fa-scissors",
      callback: cutLine,
    },
  ];

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
  if (jQuery(".leaflet-confirm-dialog").length == 0) {
    container = L.DomUtil.create(
      "div",
      "leaflet-confirm-dialog",
      map.lMap.getContainer()
    );
    // container.style.zIndex = 99999;
    // container.style.position = "relative";
    container.style.opacity = 0.85;
  }

  dialog = jQuery(".leaflet-confirm-dialog")
    .data("levt", e)
    .dialog({
      autoOpen: false,
      height: "auto",
      width: 300,
      modal: true,
      draggable: true,
      resizable: true,
      title: "Affectation de la trace",
      buttons: [
        {
          text: "Ok",
          icon: "fa-solid fa-check",
          click: function (e, evt) {
            jQuery(this).dialog("close");
            // alert("OK");
            _type_t = jQuery(
              ".leaflet-confirm-dialog-types option:selected"
            ).text();
            _type_v = jQuery(
              ".leaflet-confirm-dialog-types option:selected"
            ).val();
            _lay_t = jQuery(
              ".leaflet-confirm-dialog-layers option:selected"
            ).text();
            _lay_v = jQuery(
              ".leaflet-confirm-dialog-layers option:selected"
            ).val();
            // ajoute le nouveau tracé

            // copies les proprietes 
            trace=jQuery(this).data("levt").layer.toGeoJSON();
            try {
              trace.properties=l._layers[_type_v].feature.properties;
            }
            catch (error) {
              console.error(error);
            }
            addData(
              _lay_v,
              trace,
              l._layers[_type_v]
            );

            // allow to save this layer
            setUpdated(l._layers[_type_v]);

            jQuery(this).data("levt").layer.remove();

            // L.DomUtil.remove('.leaflet-confirm-dialog');
            jQuery(".leaflet-confirm-dialog-grplayers").remove();
            jQuery(".leaflet-confirm-dialog-grptrace").remove();
            jQuery(".leaflet-confirm-dialog").remove();
          },
        },
        {
          text: "Cancel",
          icon: "fa-solid fa-xmark",
          click: function (e) {
            jQuery(this).dialog("close");
            // alert("Cancel");

            jQuery(this).data("levt").layer.remove();

            // L.DomUtil.remove('.leaflet-confirm-dialog');
            jQuery(".leaflet-confirm-dialog-grplayers").remove();
            jQuery(".leaflet-confirm-dialog-grptrace").remove();
            jQuery(".leaflet-confirm-dialog").remove();
          },
        },
      ],
    });

  // jQuery(".leaflet-confirm-dialog").dialog('open');

  // Groupe de trace
  grp_layers = L.DomUtil.create(
    "div",
    "leaflet-confirm-dialog-grplayers",
    container
  );
  label = L.DomUtil.create("label", "label-grp-layers", grp_layers);
  label.innerHTML = "<b> Quel groupe de traces</b><br>";

  if (jQuery(".leaflet-confirm-dialog-layers").length == 0) {
    layers = L.DomUtil.create(
      "select",
      "leaflet-confirm-dialog-layers",
      grp_layers
    );
  }

  layers = jQuery(".leaflet-confirm-dialog-layers").select2({
    width: "60%", // need to override the changed default
    placeholder: "Groupe de traces",
  });

  layers.empty();
  layers.append(new Option("", -1)); // To not select first entry on open
  for (const value of Object.values(panel._layersActives)) {
    layers.append(
      new Option(value.options.leafletEdit.description, value._leaflet_id)
    );
  }

  // Type de trace
  grp_trace = L.DomUtil.create(
    "div",
    "leaflet-confirm-dialog-grptrace",
    container
  );
  label = L.DomUtil.create("label", "label-grp-trace", grp_trace);
  label.innerHTML = "<br><b> Quel type de trace</b><br>";
  types = L.DomUtil.create("select", "leaflet-confirm-dialog-types", grp_trace);
  types = jQuery(".leaflet-confirm-dialog-types").select2({
    width: "60%", // need to override the changed default
    placeholder: "Type de trace",
  });

  // Update liste
  layers.on("select2:select", function (e) {
    l = panel._layersActives.find((_l) => _l._leaflet_id == e.params.data.id);
    types.empty();
    liste_types = {};
    for (const [key, value] of Object.entries(l._layers)) {
      if (!value.feature.properties.type) {
        type_val = "N/A";
      } else {
        type_val = value.feature.properties.type;
      }
      if (type_val in liste_types) {
        liste_types[type_val].push(value);
      } else {
        liste_types[type_val] = [value];
        types.append(new Option(type_val, key));
      }
    }
    types.trigger("change");
  });
  types.on("select2:select", function (e) {
    flash_features(liste_types[e.params.data.text], 2000);
  });

  if (document.fullscreenElement) {
    jQuery(".leaflet-confirm-dialog").dialog(
      "option",
      "appendTo",
      "#" + document.fullscreenElement.id
    );
    // jQuery('#' + document.fullscreenElement.id).append(jQuery(".leaflet-confirm-dialog").parentNode);

    jQuery(".leaflet-confirm-dialog").dialog("option", "position", {
      my: "left+50 top+50",
      at: "left top",
      of: "#" + document.fullscreenElement.id,
    });

    // Increase zindex in fullscreen mode
    container.parentNode.style["zIndex"] = 400;

    layers.select2({
      dropdownParent: map.lMap.getContainer(),
      width: "60%",
    });
    types.select2({
      dropdownParent: map.lMap.getContainer(),
      width: "60%",
    });
  }

  jQuery(".leaflet-confirm-dialog").prev(".ui-dialog-titlebar").css("font-size" , '1em');
  jQuery("label-grp-layers").css("font-size" , '1em');
  jQuery("label-grp-trace").css("font-size" , '1em');
  jQuery(".leaflet-confirm-dialog").dialog("open");
  jQuery(".leaflet-confirm-dialog").dialog("moveToTop");
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
}

function evtFeatureContextmenu(e) {
  console.log(e);
}

function evtFeatureDblClick(e) {
  console.log(e);
  if (isSelected(e.sourceTarget)) {
    // already selected
    unselect_feature(e.sourceTarget);
  } else {
    if (!e.sourceTarget.orig_style) {
      //save style only if not already saved
      saveStyle(e.sourceTarget);
    }
    select_feature(e.sourceTarget);
  }
}

function evtLayerMouseover(e) {
  console.log("Mouseover: " + e);
  // e.sourceTarget.addDistanceMarkers();
}

function evtLayerMouseout(e) {
  console.log("Mouseout: " + e);
  // e.sourceTarget.removeDistanceMarkers();
}

function evtFeatureTooltipopen(e) {
  console.log(e);
  e.sourceTarget.addDistanceMarkers();
}

function evtFeatureTooltipclose(e) {
  console.log(e);
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

function leafletEditSetGeomanButtonDisabled(name, disabled) {
  // Tente d'abord la voie DOM directe (bouton custom le_edit : un <a>
  // avec la classe leaflet_edit-edit). C'est la plus fiable car elle ne
  // dépend pas de l'API interne Geoman (setButtonDisabled suppose des
  // méthodes disable()/enable() que les boutons custom n'ont pas).
  try {
    var anchor = jQuery(".leaflet_edit-edit").parents("a")[0];
    if (anchor && name === "le_edit") {
      if (disabled) {
        anchor.classList.add("leaflet-pm-disabled");
        anchor.setAttribute("aria-disabled", "true");
      } else {
        anchor.classList.remove("leaflet-pm-disabled");
        anchor.removeAttribute("aria-disabled");
      }
      return;
    }
  } catch (e) {}
  try {
    var toolbar = map && map.lMap && map.lMap.pm && map.lMap.pm.Toolbar;
    if (!toolbar) {
      return;
    }
    if (typeof toolbar.setButtonDisabled === "function") {
      try {
        toolbar.setButtonDisabled(name, disabled);
        return;
      } catch (e) {
        console.warn("[leaflet_edit] setButtonDisabled a échoué, fallback DOM", e);
      }
    }
    // Fallback : Geoman sans setButtonDisabled() fonctionnel.
    if (typeof toolbar._btnNameMapping === "function") {
      let i = toolbar._btnNameMapping(name);
      let entry = toolbar.buttons[i];
      let btn = entry && (entry._button || entry);
      if (btn) {
        if (typeof btn.disable === "function" && typeof btn.enable === "function") {
          disabled ? btn.disable() : btn.enable();
        } else if (btn._button && btn._button instanceof HTMLElement) {
          btn._button.disabled = !!disabled;
        } else if (btn instanceof HTMLElement) {
          btn.disabled = !!disabled;
        }
      }
    }
  } catch (e) {
    console.warn("[leaflet_edit] setButtonDisabled indisponible", e);
  }
}

function editLayer(e) {
  // saveStyle(this.ref_context_menu);
  if (jQuery(".leaflet_edit-edit").parents("a")[0]) {
    jQuery(".leaflet_edit-edit").parents("a")[0]._layer_edit = e;
    jQuery(".leaflet_edit-edit").parents("a")[0]._layer_edit_orig =
      e.relatedTarget.getLatLngs();
    leafletEditSetGeomanButtonDisabled("le_edit", false);

    jQuery(".leaflet_edit-edit").trigger("click");
  }

  if (!e.relatedTarget.orig_style) {
    //save style only if not already saved
    saveStyle(e.relatedTarget);
  }
  if (isSelected(e.relatedTarget)) {
    // deselect feature
    clearSelected(e.relatedTarget);
  }
  // this.ref_context_menu.setStyle({color: 'yellow'});
  e.relatedTarget.setStyle({
    color: "#666",
    weight: 5,
    opacity: 0.7,
    fillOpacity: 0.7,
    dashArray: "10 10",
  });
  // this.ref_context_menu.pm.enable({

  e.relatedTarget.pm.enable({
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
}

function finEditLayer(e) {
  // restoreStyle(this.ref_context_menu);
  restoreStyle(e.relatedTarget);
  // this.ref_context_menu.pm.enable({
  e.relatedTarget.pm.enable({
    allowSelfIntersection: false,
    allowEditing: false,
  });
  if (jQuery(".leaflet_edit-edit").parents("a")[0]) {
    ref = jQuery(".leaflet_edit-edit").parents("a")[0];
    jQuery(".leaflet_edit-edit").trigger("click");
    leafletEditSetGeomanButtonDisabled("le_edit", true);
    ref._layer_edit = null;
    delete ref._layer_edit;
    ref._layer_edit_orig;
    delete ref._layer_edit_orig;
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

  jQuery.ajax({
    url: leafletEditEndpoint("save", "/leaflet-edit/save"),
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    success: function (response) {
      rsave = response;
      let result = response.success;
      if (result) {
        map.lMap.notification.success("Save", "Saved");
      } else {
        let msg = response.message;
        map.lMap.notification.error("Save", "file not uploaded: " + msg);
      }
    },
    error: function (xhr) {
      map.lMap.notification.error("Save", "file not uploaded (" + xhr.status + ")");
    },
  });
  if (rsave.success) {
    map.lMap.notification.success(
      "Save",
      "Saved (" +
        e.relatedTarget.defaultOptions.leafletEdit.fid +
        "=>" +
        rsave.fid +
        ")"
    );
    e.relatedTarget.defaultOptions.leafletEdit.fid = rsave.fid;
    clearUpdated(e.relatedTarget);
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
    map.lMap.notification.success(
      "Simplify",
      "Path simplified (" +
        before_elem +
        " => " +
        e.relatedTarget.getLatLngs()[before.length - 1].length +
        ")"
    );
  } else {
    map.lMap.notification.warning(
      "Simplify",
      "not simplified, number of layers " + b.getLayers().length
    );
  }
}

function readLocalFile(e, button_name, file_type) {
  closeGeomanMenu(button_name);

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

function saveAll(e, button_name) {
  alert("PAs encore fait");
  closeGeomanMenu(button_name);
  // button_save(e);
}

function button_save(e) {
  L.control
    .window(map.lMap, {
      title: "Hello world!",
      content: "This is my first control window.",
      modal: true,
    })
    .prompt({
      callback: function () {
        alert("This is called after OK click!");
      },
      buttonCancel: "Annuler",
      buttonOK: "Sauver",
    })
    .show();
}
