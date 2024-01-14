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
  finedit: 3,
  sep2: 4,
  save: 5,
  exportgpx: 6,
  sep3: 7,
  simplify: 8,
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
  menu[MENU.finedit] = {
    text: "Fin Edit layer",
    iconCls: "fa-regular fa-arrow-up-right-from-square",
    callback: finEditLayer,
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
  console.log(e);
}
function evtFeatureDblClick(e) {
  console.log(e);
  map.lMap.notification.info("Info", "double click");
  if (e.sourceTarget.pm.enabled()) {
    // do nothing if feature is in edit mode
    return;
  }
  if (e.sourceTarget.selected) {
    // already selected
    e.sourceTarget.selected = false;
    restoreStyle(e.sourceTarget);
  } else {
    if (!e.sourceTarget.orig_style) {
      //save style only if not already saved
      saveStyle(e.sourceTarget);
    }
    e.sourceTarget.setStyle({
      color: "darkpurple",
      weight: 10,
      opacity: 1,
      dashArray: "10",
    });
    e.sourceTarget.selected = true;
  }
}

function select_feature(feat) {
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
}

function unselect_feature(feat) {
  if (feat.selected) {
    // already selected
    feat.selected = false;
    restoreStyle(feat);
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

function showCoordinates(e) {
  alert(e.latlng);
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

  select_feature(e.relatedTarget);
  setTimeout(unselect_feature, 5000, e.relatedTarget);

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
      var blob = new Blob([response.gpx]);
      filename =
        response.filename +
        (response.description.length > 0 ? "-" + response.description : "") +
        ".gpx";
      //Check the Browser type and download the File.
      var isIE = false || !!document.documentMode;
      if (isIE) {
        window.navigator.msSaveBlob(blob, filename, "text/octet-stream");
      } else {
        var conv = document.createElement("a");
        conv.setAttribute(
          "href",
          "data:text/octet-stream;charset=utf-8," + encodeURIComponent(blob)
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
    ref._layer_edit.relatedTarget.setLatLngs(ref._layer_edit_orig);
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
