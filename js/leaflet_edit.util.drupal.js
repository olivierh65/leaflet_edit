function processLoadedData(layer) {
  // Contextmenu (clic droit) : desktop uniquement. Sur mobile, le tap
  // ouvre une popup tactile via openTracePopup() (voir menu.drupal.js).
  var isMobile = (typeof L !== "undefined" && L.Browser && L.Browser.mobile) ||
    (typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(pointer: coarse)").matches);
  if (!isMobile && typeof layer.bindContextMenu === "function") {
    // Add context menu
    layer.bindContextMenu(defineContextMenu());
    // Add hide event to close popup menu
    if (layer._map && layer._map.contextmenu) {
      layer._map.contextmenu.addHooks();
      layer._map.on("contextmenu.show", function (e) {
        evtContextShow(e);
      });
    }
  }

  layer.on("click", function (e) {
    evtFeatureClick(e);
  });
  layer.on("dblclick", function (e) {
    evtFeatureDblClick(e);
  });
  layer.on("contextmenu", function (e) {
    evtFeatureContextmenu(e);
  });
  layer.on("tooltipopen", function (e) {
    evtFeatureTooltipopen(e);
  });
  layer.on("tooltipclose", function (e) {
    evtFeatureTooltipclose(e);
  });
  layer.on("pm:vertexadded", function (e) {
    evtFeatureVertexadded(e);
  });
  layer.on("pm:vertexremoved", function (e) {
    evtFeatureVertexremoved(e);
  });
  layer.on("pm:vertexclick", function (e) {
    evtFeatureVertexclick(e);
  });
  layer.on("pm:snapdrag", function (e) {
    evtFeatureSnapdrag(e);
  });
  layer.on("pm:markerdragstart", function (e) {
    evtFeatureMarkerdragStart(e);
  });
  layer.on("pm:markerdragend", function (e) {
    evtFeatureMarkerdragEnd(e);
  });

  // set global settings
  if (layer.defaultOptions.style) {
    // console.log("Style global");
    layer.setStyle(layer.defaultOptions.style);
    // layer.setStyle(JSON.stringify(layer.defaultOptions.style));
    // layer.setStyle({ color: layer.defaultOptions.style['color'], weight: layer.defaultOptions.style['weight'] });
  } else {
    // console.log("Pas de Style global!!!");
    layer.setStyle({ color: "red", weight: 5 });
  }
  // set global popup name
  if (layer.defaultOptions.leafletEdit.description) {
    layer.bindTooltip(layer.defaultOptions.leafletEdit.description, {
      sticky: true,
    });
  } else {
    // console.log("Pas de description");
    // Sans description, on affiche le nom du fichier
    layer.bindTooltip(layer.defaultOptions.leafletEdit.filename, {
      sticky: true,
    });
  }

  // return;

  mappings = layer.defaultOptions.mapping;
  if (mappings) {
    for (const [key, value] of Object.entries(mappings)) {
      console.log("Key: " + key + " Value: " + value);
    }
  }
  if (mappings && layer.feature.properties) {
    for (let i = 1; i <= Object.keys(mappings).length; i++) {
      if (mappings[i] == undefined) {
        continue;
      }
      attrib = mappings[i].attribut;
      console.log("Attrib: " + attrib);
      if (attrib && Object.keys(attrib).length > 0) {
        attrib_val = mappings[i].value;
        console.log("Attrib value: " + attrib_val);
        if (attrib in layer.feature.properties) {
          if (layer.feature.properties[attrib] == attrib_val) {
            console.log(
              "Set Style " + JSON.stringify(mappings[i].detail_style.style)
            );
            // delete(mappings[i].detail_style.style['fill']);
            // delete(mappings[i].detail_style.style['fillColor']);
            // delete(mappings[i].detail_style.style['fillOpacity']);
            // delete(mappings[i].detail_style.style['fillRule']);
            // delete(mappings[i].detail_style.style['dashArray']);
            // delete(mappings[i].detail_style.style['dashOffset']);
            // delete(mappings[i].detail_style.style['lineCap']);
            // delete(mappings[i].detail_style.style['lineJoin']);
            // delete(mappings[i].detail_style.style['opacity']);
            // delete(mappings[i].detail_style.style['weight']);
            // delete(mappings[i].detail_style.style['color']);

            // layer.setStyle(JSON.stringify(mappings[i].detail_style.style));
            layer.setStyle(mappings[i].detail_style.style);
            // layer.setStyle({ color: mappings[i].detail_style.style['color'], weight: mappings[i].detail_style.style['weight'] });
            layer.bindTooltip(
              mappings[i].label.trim().length == 0
                ? attrib_val
                : mappings[i].label.trim(),
              {
                sticky: true,
              }
            );
            //console.log('mapping termine: ' + layer.feature.properties.name + '(' . layer.feature.properties.type + ')');
          }
        }
        //console.log(' Pas de mapping: ' + layer.feature.properties.name + '(' . layer.feature.properties.type + ')');
      }
    }
  }
}

function addData(layGroupid, lay, origin) {
  try {
    laygroup = panel._layersActives.find((_l) => _l._leaflet_id == layGroupid);

    exist_lays = Object.keys(laygroup._layers);

    laygroup.addData(lay);

    // search added layer
    for (const nl of Object.keys(laygroup._layers)) {
      if (!exist_lays.includes(nl)) {
        new_layer = laygroup._layers[nl];
        break;
      }
    }
    // recupere les options de l'entite d'origine
    new_layer.defaultOptions = origin.defaultOptions;
    // et configure
    processLoadedData(new_layer);
  } catch (error) {
    console.error(error);
  }
}

function saveStyle(feature) {
  if (feature.orig_style) {
    return;
  }
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

// Styles d'état (priorité : édition > sélection > modifié > origine).
var LE_STYLE_EDITING = {
  color: "#666",
  weight: 5,
  opacity: 0.7,
  fillOpacity: 0.7,
  dashArray: "10 10",
};
var LE_STYLE_SELECTED = {
  color: "#6a1b9a",
  weight: 6,
  opacity: 1,
  dashArray: null,
};
var LE_STYLE_UPDATED = {
  color: "#ff8f00",
  weight: 5,
  opacity: 1,
  dashArray: "4 6",
};

function isEditing(layer) {
  try {
    return !!(layer.pm && typeof layer.pm.enabled === "function" && layer.pm.enabled());
  } catch (err) {
    return false;
  }
}

// Applique le style correspondant à l'état courant du layer.
// À appeler après chaque changement de flag plutôt que restoreStyle().
function refreshTraceStyle(layer) {
  if (!layer || typeof layer.setStyle !== "function") {
    return;
  }
  saveStyle(layer);
  if (isEditing(layer)) {
    layer.setStyle(LE_STYLE_EDITING);
  } else if (layer.leafletEditSel) {
    layer.setStyle(LE_STYLE_SELECTED);
  } else if (layer.leafletEditUpd) {
    layer.setStyle(LE_STYLE_UPDATED);
  } else if (layer.orig_style) {
    layer.setStyle(layer.orig_style);
  }
}

function restoreStyle(feature) {
  // Conservé pour compat : ré-applique le style d'état au lieu d'écraser.
  if (!feature) {
    return;
  }
  if (!feature.leafletEditSel && !feature.leafletEditUpd && !isEditing(feature)) {
    if (feature.orig_style) {
      feature.setStyle(feature.orig_style);
      feature.orig_style = undefined;
      try {
        delete feature.orig_style;
      } catch (err) {}
    }
    return;
  }
  refreshTraceStyle(feature);
}

function setUpdated(layer) {
  try {
    getLayGroup(layer).options.leafletEdit._updated = true;
  } catch (err) {}
  if (layer) {
    layer.leafletEditUpd = true;
    refreshTraceStyle(layer);
  }
}

function clearUpdated(layer) {
  try {
    getLayGroup(layer).options.leafletEdit._updated = false;
  } catch (err) {}
  if (layer) {
    layer.leafletEditUpd = false;
    refreshTraceStyle(layer);
  }
}

// Efface le flag modifié sur tout le groupe (après sauvegarde réussie).
function clearUpdatedGroup(layer) {
  var group = null;
  try {
    group = getLayGroup(layer);
    group.options.leafletEdit._updated = false;
  } catch (err) {}
  if (group && group._layers) {
    Object.values(group._layers).forEach(function (l) {
      l.leafletEditUpd = false;
      refreshTraceStyle(l);
    });
  } else if (layer) {
    layer.leafletEditUpd = false;
    refreshTraceStyle(layer);
  }
}

function isUpdated(layer) {
  if (layer && layer.leafletEditUpd) {
    return true;
  }
  try {
    return !!getLayGroup(layer).options.leafletEdit._updated;
  } catch (err) {
    return false;
  }
}

function anyUpdated() {
  a = map.lMap.leafletEdit.LAYGROUP_CONTROL._layersActives.filter(function (
    lays
  ) {
    return lays.options.leafletEdit._updated;
  });
  return a;
}

function setSelected(layer) {
  try {
    getLayGroup(layer).options.leafletEdit._selected = true;
  } catch (err) {}
  if (layer) {
    layer.leafletEditSel = true;
    refreshTraceStyle(layer);
  }
}

function clearSelected(layer) {
  try {
    getLayGroup(layer).options.leafletEdit._selected = false;
  } catch (err) {}
  if (layer) {
    layer.leafletEditSel = false;
    refreshTraceStyle(layer);
  }
}

function isSelected(layer) {
  if (layer && layer.leafletEditSel) {
    return true;
  }
  try {
    return !!getLayGroup(layer).options.leafletEdit._selected;
  } catch (err) {
    return false;
  }
}

function anySelected() {
  a = map.lMap.leafletEdit.LAYGROUP_CONTROL._layersActives.filter(function (
    lays
  ) {
    return lays.options.leafletEdit._selected;
  });
  return a;
}

function getLayGroup(layer) {
  return map.lMap.leafletEdit.LAYGROUP_CONTROL._layersActives.find(function (
    lays
  ) {
    return layer._leaflet_id in lays._layers;
  });
}

function select_feature(layer, duree = 0) {
  if (!layer) {
    return;
  }
  // Sélection exclusive : une seule trace en surbrillance à la fois.
  deselectAllFeatures(layer);
  setSelected(layer);
  refreshTraceStyle(layer);

  if (duree > 0) {
    setTimeout(unselect_feature, duree, layer);
  }
}

function unselect_feature(layer) {
  if (!layer) {
    return;
  }
  if (isSelected(layer)) {
    // already selected
    clearSelected(layer);
  }
  refreshTraceStyle(layer);
}

// Désélectionne toutes les traces sauf (optionnellement) celle donnée.
function deselectAllFeatures(except) {
  try {
    var actives = map.lMap.leafletEdit.LAYGROUP_CONTROL._layersActives || [];
    actives.forEach(function (laygroup) {
      Object.values(laygroup._layers || {}).forEach(function (l) {
        if (except && l._leaflet_id === except._leaflet_id) {
          return;
        }
        if (l.leafletEditSel) {
          l.leafletEditSel = false;
          refreshTraceStyle(l);
        }
      });
      try {
        laygroup.options.leafletEdit._selected = false;
      } catch (err) {}
    });
  } catch (err) {}
}

function cancel_flash_features(obj) {
  clearTimeout(obj.tid);
  obj.layers.forEach((feat) => {
    restoreStyle(feat);
  });
}

function flash_features(layers, duree = 1000) {
  if (!(layers instanceof Array)) {
    layers = [layers];
  }
  layers.forEach((layer) => {
    if (!layer.orig_style) {
      //save style only if not already saved
      saveStyle(layer);
    }
  });

  colors = ["red", "yellow"];
  index = 0;
  obj = {
    tid: 0,
    layers: layers,
  };

  function changeColor(layers, colors, index, tid) {
    if (index >= colors.length) {
      index = 0;
    }

    layers.forEach((layer) => {
      layer.setStyle({
        color: colors[index],
        weight: 5,
        opacity: 1,
        dashArray: "10,15",
      });
    });

    index++;

    obj.tid = setTimeout(changeColor, 250, layers, colors, index, obj.tid);
    return obj.tid;
  }

  changeColor(layers, colors, index, obj.tid);

  setTimeout(
    function (layers) {
      clearTimeout(obj.tid);
      layers.forEach((layer) => {
        restoreStyle(layer);
      });
    },
    duree,
    layers
  );
  return obj;
}
