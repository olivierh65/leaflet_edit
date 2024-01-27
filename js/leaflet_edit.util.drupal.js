function processLoadedData(layer) {
  // Add context menu
  layer.bindContextMenu(defineContextMenu());
  // Add hide event to close popup menu
  layer._map.contextmenu.addHooks();
  layer._map.on("contextmenu.show", function (e) {
    evtContextShow(e);
  });

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
  }

  mappings = layer.defaultOptions.mapping;
  if (mappings && layer.feature.properties) {
    for (let i = 0; i < mappings.length; i++) {
      attrib = mappings[i].leaflet_style_mapping.Attribute.attribut;
      // console.log("Attrib: " + attrib);
      if (attrib && attrib.length > 0) {
        attrib_val = mappings[i].leaflet_style_mapping.Attribute.value;
        // console.log("Attrib value: " + attrib_val);
        if (attrib in layer.feature.properties) {
          if (layer.feature.properties[attrib] == attrib_val) {
            //console.log("Set Style " + mappings[i].leaflet_style_mapping.Style);
            layer.setStyle(mappings[i].leaflet_style_mapping.Style);
            layer.bindTooltip(attrib_val, {
              sticky: true,
            });
          }
        }
      }
    }
  }
}

function addData (layGroupid, lay, origin) {
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

  function setUpdated(layer) {
    getLayGroup(layer).options.leafletEdit._updated = true;
  }

  function clearUpdated(layer) {
    getLayGroup(layer).options.leafletEdit._updated = false;
  }

  function isUpdated(layer) {
    return getLayGroup(layer).options.leafletEdit._updated;
  }

  function anyUpdated() {
    a= map.lMap.leafletEdit.LAYGROUP_CONTROL._layersActives.filter(function (lays) {
      return  lays.options.leafletEdit._updated;
      });
    return a;
  }

  function setSelected(layer) {
    getLayGroup(layer).options.leafletEdit._selected = true;
  }

  function clearSelected(layer) {
    getLayGroup(layer).options.leafletEdit._selected = false;
  }

  function isSelected(layer) {
    return getLayGroup(layer).options.leafletEdit._selected;
  }

  function anySelected() {
    a=map.lMap.leafletEdit.LAYGROUP_CONTROL._layersActives.filter(function (lays) {
      return  lays.options.leafletEdit._selected;
      });
    return a;
  }

  function getLayGroup(layer) {
    return map.lMap.leafletEdit.LAYGROUP_CONTROL._layersActives.find(function (lays) {
      return  layer._leaflet_id in lays._layers
      });
  }

  function select_feature(layer, duree = 0) {
    if (!layer.orig_style) {
      //save style only if not already saved
      saveStyle(layer);
    }
    layer.setStyle({
      color: "darkpurple",
      weight: 5,
      opacity: 1,
      dashArray: "10,15",
    });
  
    if (duree > 0) {
      setTimeout(unselect_feature, duree, layer);
    }
    setSelected(layer);
  }
  
  function unselect_feature(layer) {
    if (isSelected(layer)) {
      // already selected
      clearSelected(layer);
      restoreStyle(layer);
    }
  }
  
  function cancel_flash_features(obj) {
    clearTimeout(obj.tid);
        obj.layers.forEach((feat) => {
          restoreStyle(feat);
        });
  }
  

  function flash_features(layers, duree = 1000) {
    if (! (layers instanceof Array)) {
      layers = [ layers ];
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
  