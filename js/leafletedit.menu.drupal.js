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

function evtContextShow(e) {
  console.log(e);
  if (e.relatedTarget.updated) {
    e.contextmenu.setDisabled(5, false);
  }
  else {
    e.contextmenu.setDisabled(5, true);
  }
  if ( e.relatedTarget.pm.enabled()) {
    e.contextmenu.setDisabled(2, true);
    e.contextmenu.setDisabled(3, false);
  }
  else {
    e.contextmenu.setDisabled(2, false);
    e.contextmenu.setDisabled(3, true);
  }
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
        callback: editLayer,
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
    e.layer.updated = true;
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

function saveEntity(e) {
  console.log("Save");
}

async function exportGPX(e) {
  console.log("exportGPX");
  let fileHandle;
  try {
    fileHandle = await getNewFileHandle();
  } catch (ex) {
    if (ex.name === 'AbortError') {
      return;
    }
    const msg = 'An error occured trying to open the file.';
    console.error(msg, ex);
    alert(msg);
    return;
  }
  try {
    await writeFile(fileHandle, togpx(e.relatedTarget.toGeoJSON()));
  } catch (ex) {
    const msg = 'Unable to save file.';
    console.error(msg, ex);
    alert(msg);
    return;
  }

}

async function getNewFileHandle() {
  const options = {
    types: [{
      description: 'GPX documents',
      accept: {
        'text/plain': ['.gpx'],
      },
    }],
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
