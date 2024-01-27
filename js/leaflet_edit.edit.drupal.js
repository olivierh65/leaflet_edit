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
const edit_actions = {
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

const import_actions = {
  name: "le_import",
  block: "custom",
  title: "Import",
  className: "fa-solid fa-file-import",
  actions: [
    {
      text: "GPX",
      onClick: (e) => {
        readLocalFile(e, "le_import", "GPX");
      },
    },
    {
      text: "Geojson",
      onClick: (e) => {
        readLocalFile(e, "le_import", "GeoJSON");
      },
    },
  ],
  disableOtherButtons: true,
};

const save_actions = {
  name: "le_save",
  block: "custom",
  title: "Save",
  className: "fa-regular fa-floppy-disk",
  actions: [
    {
      text: "All",
      onClick: (e) => {
        saveAll(e, "le_save");
      },
    },
  ],
  disableOtherButtons: true,
};

function addGeomanCustom() {
  map.lMap.pm.Toolbar.createCustomControl(edit_actions);
  map.lMap.pm.Toolbar.createCustomControl(import_actions);
  map.lMap.pm.Toolbar.createCustomControl(save_actions);
  map.lMap.pm.Toolbar.setButtonDisabled("le_edit", true);
  // map.lMap.pm.Toolbar.setButtonDisabled("le_save", true);
}

function closeGeomanMenu(button_name) {
  map.lMap.pm.Toolbar.buttons[button_name].toggle();
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
  if (jQuery(".leaflet-confirm-dialog").length == 0) {
    container = L.DomUtil.create(
      "div",
      "leaflet-confirm-dialog",
      map.lMap.getContainer()
    );
  }

  try {
    obj = flash_features(e.relatedTarget, 100000);
  } catch (err) {
    console.log("flash_feature Err: " + err);
  }

  jQuery(".leaflet-confirm-dialog")
    .data("levt", e)
    .data("obj", obj)
    .dialog({
      autoOpen: false,
      height: "auto",
      width: 400,
      modal: true,
      title: "Suppresion trace",
      buttons: [
        {
          text: "Ok",
          icon: "ui-icon-heart",
          click: function (e, evt) {
            jQuery(this).dialog("close");
            if (jQuery(this).data("obj")) {
              cancel_flash_features(jQuery(this).data("obj"));
            }
            jQuery(this).data("levt").relatedTarget.remove();
            jQuery(".leaflet-confirm-dialog").remove();
          },
        },
        {
          text: "Cancel",
          click: function (e) {
            jQuery(this).dialog("close");
            if (jQuery(this).data("obj")) {
              cancel_flash_features(jQuery(this).data("obj"));
            }
            jQuery(".leaflet-confirm-dialog").remove();
          },
        },
      ],
    });

  // Groupe de trace
  label = L.DomUtil.create("label", "", container);
  label.innerHTML = "<b> Vraiment supprimer cette trace ?</b>";

  jQuery(".leaflet-confirm-dialog").dialog("open");
}

function joinLine(e) {
  onsole.log("joinLine: " + e);
}


function cutLine(e) {
  console.log("cutLine: " + e);
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
