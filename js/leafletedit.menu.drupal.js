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
  deletelay: 4,
  sep2: 5,
  save: 6,
  exportgpx: 7,
  exportgpxall: 8,
  exportgpxallmerge: 9,
  sep3: 10,
  simplify: 11,
};

function evtContextShow(e) {
  console.log(e);
  if (!e.relatedTarget) {
    return;
  }
  if (e.relatedTarget.updated) {
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
  let menu = [];
  menu[MENU.showcoord] = {
    text: "Show coordinates",
    callback: showCoordinates,
  };
  menu[MENU.sep1] = "-";
  menu[MENU.editlayer] = {
    text: "Edit layer",
    iconCls: "fa-regular fa-pen-to-square",
    callback: editLayer,
  };
  menu[MENU.cutline] = {
    text: "Cut here",
    iconCls: "fa-regular fa-arrow-up-right-from-square",
    callback: cutLine,
  };
  menu[MENU.deletelay] = {
    text: "Delete",
    iconCls: "fa-regular fa-arrow-up-right-from-square",
    callback: deleteLay,
  };
  menu[MENU.sep2] = "-";
  menu[MENU.save] = {
    text: "Save",
    iconCls: "fa-regular fa-floppy-disk",
    callback: saveEntity,
  };
  menu[MENU.exportgpx] = {
    text: "Export to GPX",
    iconCls: "fa-solid fa-file-export",
    callback: exportGPX,
  };
  menu[MENU.exportgpxall] = {
    text: "Export to GPX (All)",
    iconCls: "fa-solid fa-file-export",
    callback: exportGPXAll,
  };
  menu[MENU.exportgpxallmerge] = {
    text: "Export to GPX (All Merge)",
    iconCls: "fa-solid fa-file-export",
    callback: exportGPXAllMerge,
  };
  menu[MENU.sep3] = "-";
  menu[MENU.simplify] = {
    text: "Simplify",
    iconCls: "fa-solid fa-minimize",
    callback: simplify,
  };

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

function __evtMapCreate(e) {
  if (jQuery(".leaflet-confirm-dialog").length == 0) {
    container = L.DomUtil.create(
      "dialog",
      "leaflet-confirm-dialog",
      map.lMap.getContainer()
    );
    container.style.zIndex = "2000";
    container.style.position = "relative";
    container.style.opacity = 0.85;
  }

  container = document.querySelector(".leaflet-confirm-dialog");

  if (jQuery(".leaflet-confirm-dialog-layers").length == 0) {
    layers = L.DomUtil.create(
      "select",
      "leaflet-confirm-dialog-layers",
      container
    );
    // layers.style.zIndex = "2001";
    // layers.style.position = "relative";
  }

  layers = jQuery(".leaflet-confirm-dialog-layers").selectmenu();
  for (const value of Object.values(panel._layersActives)) {
    layers.append(
      new Option(value.options.leafletEdit.description, value._leaflet_id)
    );
  }

  container.showModal();

  //jQuery(".leaflet-confirm-dialog-layers").selectmenu('option', 'appendTo','.leaflet-confirm-dialog');
}

function evtMapCreate(e) {
  if (jQuery(".leaflet-confirm-dialog").length == 0) {
    container = L.DomUtil.create(
      "div",
      "leaflet-confirm-dialog",
      map.lMap.getContainer()
    );
    // container.style.zIndex = "2000";
    // container.style.position = "relative";
    container.style.opacity = 0.85;
  }

  jQuery(".leaflet-confirm-dialog")
    .data("levt", e)
    .dialog({
      autoOpen: false,
      height: "auto",
      width: 400,
      modal: true,
      title: "Affectation de la trace",
      buttons: [
        {
          text: "Ok",
          icon: "ui-icon-heart",
          click: function (e, evt) {
            jQuery(this).dialog("close");
            alert("OK");
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

            l = panel._layersActives.find((_l) => _l._leaflet_id == _lay_v);
            exist_lays = Object.keys(l._layers);
            // l.on('layeradd',(e)=>{
            //   alert('add');
            // });
            l.addData(jQuery(this).data("levt").layer.toGeoJSON());
            for (const nl of Object.keys(l._layers)) {
              if (!exist_lays.includes(nl)) {
                new_layer = l._layers[nl];
                break;
              }
            }
            // recupere les options d'une entite de meme type
            new_layer.defaultOptions = l._layers[_type_v].defaultOptions;
            // et configure
            processLoadedData(new_layer);


            jQuery(this).data("levt").layer.remove();

            // L.DomUtil.remove('.leaflet-confirm-dialog');
            jQuery(".leaflet-confirm-dialog").remove();
          },
        },
        {
          text: "Cancel",
          click: function (e) {
            jQuery(this).dialog("close");
            alert("Cancel");

            jQuery(this).data("levt").layer.remove();

            // L.DomUtil.remove('.leaflet-confirm-dialog');
            jQuery(".leaflet-confirm-dialog").remove();
          },
        },
      ],
    });

  // jQuery(".leaflet-confirm-dialog").dialog('open');

  // Groupe de trace
  label = L.DomUtil.create("label", "", container);
  label.innerHTML = "<b> Quel groupe de traces</b>";

  if (jQuery(".leaflet-confirm-dialog-layers").length == 0) {
    layers = L.DomUtil.create(
      "select",
      "leaflet-confirm-dialog-layers",
      container
    );
    // layers.style.zIndex = "2001";
    // layers.style.position = "relative";
  }

  layers = jQuery(".leaflet-confirm-dialog-layers").selectmenu();
  layers.empty();
  for (const value of Object.values(panel._layersActives)) {
    layers.append(
      new Option(value.options.leafletEdit.description, value._leaflet_id)
    );
  }

  // Type de trace
  label = L.DomUtil.create("label", "", container);
  label.innerHTML = "<br><b> Quel type de trace</b>";
  types = L.DomUtil.create("select", "leaflet-confirm-dialog-types", container);
  types = jQuery(".leaflet-confirm-dialog-types").selectmenu();

  // Update liste
  layers.on("selectmenuselect", function (e, ui) {
    l = panel._layersActives.find((_l) => _l._leaflet_id == ui.item.value);
    types.empty();
    liste_types = {};
    for (const [key, value] of Object.entries(l._layers)) {
      if (! value.feature.properties.type ) {
        type_val = 'N/A';
      }
      else {
        type_val = value.feature.properties.type
      }
      if (type_val in liste_types) {
        liste_types[type_val].push(value);
      } else {
        liste_types[type_val] = [value];
        types.append(new Option(type_val, key));
      }
    }
    types.selectmenu("refresh", true);
  });
  types.on("selectmenuselect", function (e, ui) {
    flash_features(liste_types[ui.item.label], (duree = 2000));
  });

  jQuery(".leaflet-confirm-dialog").dialog("open");
  //jQuery(".leaflet-confirm-dialog-layers").selectmenu('option', 'appendTo','.leaflet-confirm-dialog');
}

function DOevtMapCreate(e) {
  console.log(e);

  // constructConfirm(map.lMap,'leaflet-confirm-dialog', 'Premier message');
  container = L.DomUtil.create(
    "div",
    "leaflet-confirm-dialog",
    map.lMap.getContainer()
  );
  container.style.zIndex = "2000";
  container.style.position = "relative";

  waitDialogConfirm("msg", "Query");

  // jQuery(".leaflet-confirm-dialog").dialog("open");

  /* var win =  L.control.window(map.lMap,{
    title:'Hello world!',
    content:'This is my first control window.',
    modal: true,
  }).show(); */

  e.layer.added = true;
  // TODO select layer
  panel._layersActives[0].addLayer(e.layer);

  for (const [key, value] of Object.entries(panel._layersActives[0]._layers)) {
    if (value.added) {
      value.feature = L.GeoJSON.asFeature(e.layer.toGeoJSON());
      // Add context menu
      value.bindContextMenu(defineContextMenu());
      // Add hide event to close popup menu
      ////     value._map.contextmenu.addHooks();
      value.on("contextmenu.show", function (e) {
        evtContextShow(e);
      });

      value.on("click", function (e) {
        evtFeatureClick(e);
      });
      value.on("dblclick", function (e) {
        evtFeatureDblClick(e);
      });
      value.on("contextmenu", function (e) {
        evtFeatureContextmenu(e);
      });
      value.on("tooltipopen", function (e) {
        evtFeatureTooltipopen(e);
      });
      value.on("tooltipclose", function (e) {
        evtFeatureTooltipclose(e);
      });
      value.on("pm:vertexadded", function (e) {
        evtFeatureVertexadded(e);
      });
      value.on("pm:vertexremoved", function (e) {
        evtFeatureVertexremoved(e);
      });
      value.on("pm:vertexclick", function (e) {
        evtFeatureVertexclick(e);
      });
      value.on("pm:snapdrag", function (e) {
        evtFeatureSnapdrag(e);
      });
      value.on("pm:markerdragstart", function (e) {
        evtFeatureMarkerdragStart(e);
      });
      value.on("pm:markerdragend", function (e) {
        evtFeatureMarkerdragEnd(e);
      });

      // add variables
      value.feature.selected = false;
      value.feature.updated = false;

      value.added = null;
      delete value.added;

      break;
    }
  }
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
  e.layer.updated = true;
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
  if (e.sourceTarget.selected) {
    // already selected
    unselect_feature(e.sourceTarget);
  } else {
    if (!e.sourceTarget.orig_style) {
      //save style only if not already saved
      saveStyle(e.sourceTarget);
    }
    select_feature(e.sourceTarget);
    e.sourceTarget.selected = true;
  }
}

function select_feature(feat, duree = 0) {
  if (!feat.orig_style) {
    //save style only if not already saved
    saveStyle(feat);
  }
  feat.setStyle({
    color: "darkpurple",
    weight: 5,
    opacity: 1,
    dashArray: "10,15",
  });
  feat.selected = true;

  if (duree > 0) {
    setTimeout(unselect_feature, duree, feat);
  }
}

function unselect_feature(feat) {
  if (feat.selected) {
    // already selected
    feat.selected = false;
    restoreStyle(feat);
  }
}

function flash_features(feats, duree = 1000) {
  feats.forEach((feat) => {
    if (!feat.orig_style) {
      //save style only if not already saved
      saveStyle(feat);
    }
  });

  colors = ["red", "yellow"];
  index = 0;
  obj = {
    tid: 0,
  };

  function changeColor(feats, colors, index, tid) {
    if (index >= colors.length) {
      index = 0;
    }

    feats.forEach((feat) => {
      feat.setStyle({
        color: colors[index],
        weight: 5,
        opacity: 1,
        dashArray: "10,15",
      });
    });

    index++;

    obj.tid = setTimeout(changeColor, 250, feats, colors, index, obj.tid);
    return obj.tid;
  }

  changeColor(feats, colors, index, obj.tid);

  setTimeout(
    function (feats) {
      clearTimeout(obj.tid);
      feats.forEach((feat) => {
        restoreStyle(feat);
      });
    },
    duree,
    feats
  );
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
  alert(
    e.latlng +
      "\nColor: " +
      e.relatedTarget.options.color +
      "\nEventParents: " +
      Object.keys(e.relatedTarget._eventParents).toString()
  );
}

function editLayer(e) {
  // saveStyle(this.ref_context_menu);
  if (jQuery(".leaflet_edit-edit").parents("a")[0]) {
    jQuery(".leaflet_edit-edit").parents("a")[0]._layer_edit = e;
    jQuery(".leaflet_edit-edit").parents("a")[0]._layer_edit_orig =
      e.relatedTarget.getLatLngs();
    map.lMap.pm.Toolbar.setButtonDisabled("le_edit", false);
    jQuery(".leaflet_edit-edit").trigger("click");
  }

  if (!e.relatedTarget.orig_style) {
    //save style only if not already saved
    saveStyle(e.relatedTarget);
  }
  if (e.relatedTarget.selected) {
    // deselect feature
    e.relatedTarget.selected = false;
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
    map.lMap.pm.Toolbar.setButtonDisabled("le_edit", true);
    ref._layer_edit = null;
    delete ref._layer_edit;
    ref._layer_edit_orig;
    delete ref._layer_edit_orig;
  }
}

function cutLine(e) {
  console.log("cutLine: " + e);
  // L.marker(e.latlng).addTo(map.lMap);
  np=turf.nearestPointOnLine(e.relatedTarget.feature, turf.point([e.latlng['lng'],e.latlng['lat']]));

  L.marker([np.geometry.coordinates[1],np.geometry.coordinates[0]], {opacity: 0.5}).addTo(map.lMap);
}

function deleteLay(e) {
  console.log("deleteLay: " + e);
}

function moveValidation(layer, marker, event) {
  return true;
}

function removeValidation(obj) {
  evt = obj.event;
  return true;
}

function saveStyle(feature) {
  feature.orig_style = {
    stroke: feature.options["stroke"],
    color: feature.options["color"],
    weight: feature.options["weight"],
    opacity: feature.options["opacity"],
    lineCap: feature.options["lineCap"],
    lineJoin: feature.options["lineJoin"],
    dashArray: feature.options["dashArray"],
    dashOffset: feature.options["dashOffset"],
    fillColor: feature.options["fillColor"],
    fillOpacity: feature.options["fillOpacity"],
    fillRule: feature.options["fillRule"],
    fill: feature.options["fill"],
  };
}

function restoreStyle(feature) {
  feature.setStyle(feature.orig_style);
  feature.orig_style = undefined;
  delete feature.orig_style;
}

function saveEntity(e) {
  console.log("Save");

  var fd = new FormData();
  fd.append("fid", e.relatedTarget.defaultOptions.leafletEdit.fid);
  fd.append("nid", e.relatedTarget.defaultOptions.leafletEdit.nid);
  fd.append("geojson", JSON.stringify(e.relatedTarget.toGeoJSON()));

  var rsave = [];

  jQuery.ajax({
    url: "/leaflet_edit/uptest-save",
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    async: false,
    success: function (response) {
      rsave = response;
      let result = response.success;
      if (result) {
        alert("yay!");
      } else {
        let msg = response.message;
        alert("file not uploaded: " + msg);
      }
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
    e.relatedTarget.pm.updated = false;
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
    url: "/leaflet_edit/uptest-toGpx",
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    async: false,
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
    url: "/leaflet_edit/uptest-toGpx",
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    async: true,
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

  /* 
  data = [{
    'geojson': e.relatedTarget.toGeoJSON(),
    'type': e.relatedTarget.feature.properties['type'] ?? '',
    'properties': JSON.stringify(e.relatedTarget.feature.properties) ?? '',
    'color': e.relatedTarget.options.color ?? '',
    'width': e.relatedTarget.options.weight ?? '',
  }];
  select_feature(e.relatedTarget, 10000);

  for (const [key, value] of Object.entries(e.relatedTarget._map._layers)) {
    console.log(key, value);
    if (key == leafletid) {
      continue;
    }
    if (value.options.leafletEdit) {
      if (value.options.leafletEdit['fid'] == fid && value.options.leafletEdit['nid'] == nid) {
        // alert (key);
        if (value.feature) {
          if (value.defaultOptions) {
            data.push ({
              'geojson': value.toGeoJSON(),
              'type': value.feature.properties['type'] ?? '',
              'properties': JSON.stringify(e.relatedTarget.feature.properties) ?? '',
              'color': value.options.color ?? '',
              'width': value.options.weight ?? '',
            })
            select_feature(value, 10000);
          }
        } 
      }
    }
  }
*/

  var fd = new FormData();
  fd.append("geojson", JSON.stringify(data));
  fd.append("filename", e.relatedTarget.defaultOptions.leafletEdit.filename);
  fd.append(
    "description",
    e.relatedTarget.defaultOptions.leafletEdit.description
  );

  jQuery.ajax({
    url: "/leaflet_edit/uptest-toGpxMerge",
    type: "post",
    data: fd,
    contentType: false,
    processData: false,
    async: true,
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

/////////////////////////
// Geoman custo
////////////////////////
function __GeomancancelEdit(e) {
  console.log(e);
  ref = jQuery(".leaflet_edit-edit").parents("a")[0];
  if (ref._layer_edit) {
    ref._layer_edit.relatedTarget.setLatLngs(ref._layer_edit_orig);
    finEditLayer(ref._layer_edit);
  }
}

function __GeomanfinishEdit(e) {
  console.log(e);
  ref = jQuery(".leaflet_edit-edit").parents("a")[0];
  if (ref._layer_edit) {
    finEditLayer(ref._layer_edit);
  }
}

// creates new actions
const actions = {
  name: "le_edit",
  block: "custom",
  title: "Edit",
  className: "fa-regular fa-pen-to-square leaflet_edit-edit",
  actions: [
    {
      text: "Cancel",
      onClick: (e) => {
        __GeomancancelEdit(e);
      },
    },
    {
      text: "Finish",
      onClick: (e) => {
        __GeomanfinishEdit(e);
      },
    },
    // creates a new action with text and a click event
    {
      text: "click me",
      onClick: () => {
        alert("🙋‍♂️");
      },
    },
  ],
  disableOtherButtons: true,
};

function addGeomanCustom() {
  map.lMap.pm.Toolbar.createCustomControl(actions);
  map.lMap.pm.Toolbar.setButtonDisabled("le_edit", true);
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

async function buildDialogConfirm(msg, title) {
  return new Promise(function (resolve, reject) {
    jQuery(".leaflet-confirm-dialog").dialog({
      height: "auto",
      width: 400,
      modal: true,
      title: "TITRE",
      buttons: [
        {
          text: "Ok",
          icon: "ui-icon-heart",
          click: function () {
            jQuery(this).dialog("close");
            resolve();
          },
        },
        {
          text: "Cancel",
          click: function () {
            jQuery(this).dialog("close");
            reject();
          },
        },
      ],
    });
  });
}

async function waitDialogConfirm(msg, query) {
  await buildDialogConfirm(msg, query)
    .then(function () {
      // 'yes' was clicked...
      alert("Yes");
    })
    .catch(function () {
      alert("No");
    });
}
