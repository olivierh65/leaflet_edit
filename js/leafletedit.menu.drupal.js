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

function defineContextMenu() {
  let context_menu = {
    contextmenu: true,
    contextmenuWidth: 140,
    contextmenuItems: [
      {
        text: "Show coordinates",
        callback: showCoordinates,
      },
      "-",
      {
        text: "Edit layer",
        iconCls: "fa-regular fa-pen-to-square",
      },
      {
        text: "Fin Edit layer",
        iconCls: "fa-regular fa-arrow-up-right-from-square",
        callback: finEditLayer,
      },
      "-",
      {
        text: "Save",
        iconCls: "fa-regular fa-floppy-disk",
        callback: saveEntity,
      },
      {
        text: "Export to GPX",
        iconCls: "fa-solid fa-file-export",
        callback: exportGPX,
      },
    ],
  };

  return context_menu;
}

function evtFeatureEdit (e) {
    console.log(e);
}

function evtFeatureUpdate (e) {
    console.log(e);
    e.target.updated = true;
}
// var map1 = L.map('map', context_menu);

function showCoordinates(e) {
  alert(e.latlng);
}

function editLayer(e) {
  // saveStyle(this.ref_context_menu);
  saveStyle(e.relatedTarget);
  // this.ref_context_menu.setStyle({color: 'yellow'});
  e.relatedTarget.setStyle({ color: "yellow" });
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
}


function moveValidation(layer, marker, event) {
  return true;
}

function removeValidation(obj) {
  evt = obj.event;
  return true;
}

function saveStyle(feature) {
  feature.edit_style = {
    stroke: feature.options["stroke"],
    color: feature.options["color"],
    weight: feature.options["weight"],
    opacity: feature.options["opacity"],
    linecap: feature.options["linecap"],
    linejoin: feature.options["linejoin"],
    dasharray: feature.options["dasharray"],
    dashoffset: feature.options["dashoffset"],
    fill_color: feature.options["fill_color"],
    fill_opacity: feature.options["fill_opacity"],
    fillrule: feature.options["fillrule"],
    fill: feature.options["fill"],
  };
}

function restoreStyle(feature) {
  feature.setStyle(feature.edit_style);
  feature.edit_style = undefined;
  delete feature.edit_style;
}

function saveEntity() {
  console.log("Save");
}

function exportGPX() {
  console.log("exportGPX");
}
