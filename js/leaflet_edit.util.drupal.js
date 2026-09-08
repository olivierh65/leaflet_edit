// Boutons d'édition Geoman définitivement masqués : toute l'édition
// (edit/move/cut/remove/rotate) passe par la barre métier (appels
// layer.pm programmatiques).
var GEOMAN_EDIT_BUTTONS = ["editMode", "dragMode", "cutPolygon", "removalMode", "rotateMode", "editControls"];
// Repli quand la config ne définit pas un bouton de dessin (vieilles
// configs) : préserve le comportement visible actuel.
var GEOMAN_DRAW_FALLBACKS = {
  drawMarker: true,
  drawCircleMarker: false,
  drawPolyline: true,
  drawRectangle: false,
  drawPolygon: false,
  drawCircle: false,
  drawText: false,
  oneBlock: true,
  drawControls: true,
  customControls: true,
};
// Lit une option Geoman de façon robuste : une clé absente valait
// autrefois "activé" avec le test `== 0` (boutons fantômes), et une
// valeur désactivée vaut 0 / "0" / false / "" selon les sauvegardes.
function geomanOpt(geomanSettings, name) {
  if (GEOMAN_EDIT_BUTTONS.indexOf(name) !== -1) {
    return false;
  }
  var opts = (geomanSettings && geomanSettings.options) || {};
  if (typeof opts[name] === "undefined" || opts[name] === null) {
    return !!GEOMAN_DRAW_FALLBACKS[name];
  }
  return opts[name] !== 0 && opts[name] !== "0" && opts[name] !== false && opts[name] !== "";
}

// Retire de la barre Geoman tout bouton d'édition résiduel (tool edit),
// quelle que soit la façon dont il est apparu. L'édition passe
// uniquement par la barre métier. Ne fait rien si la barre est absente.
function removeGeomanEditButtons(lMap) {
  try {
    var pmToolbar = lMap && lMap.pm && lMap.pm.Toolbar;
    if (!pmToolbar || typeof pmToolbar.getButtons !== "function") {
      return false;
    }
    var removed = 0;
    var tbButtons = pmToolbar.getButtons() || {};
    Object.keys(tbButtons).forEach(function (key) {
      try {
        var btn = tbButtons[key];
        if (btn && btn._button && btn._button.tool === "edit") {
          btn.remove();
          try {
            delete pmToolbar.buttons[key];
          } catch (errDel) {}
          removed++;
        }
      } catch (errBtn) {}
    });
    return removed;
  } catch (errTb) {
    return false;
  }
}

function processLoadedData(layer) {
  // Contextmenu (clic droit) : desktop uniquement, et seulement si
  // l'outil leaflet-contextmenu est chargé. Sur mobile, le tap
  // ouvre une popup tactile via openTracePopup() (voir menu.drupal.js).
  var isMobile = (typeof L !== "undefined" && L.Browser && L.Browser.mobile) ||
    (typeof window !== "undefined" && window.matchMedia &&
      window.matchMedia("(pointer: coarse)").matches);
  if (!isMobile && typeof layer.bindContextMenu === "function" && typeof defineContextMenu === "function") {
    // Add context menu
    layer.bindContextMenu(defineContextMenu());
    // Garde anti-empilement : le plugin partage UN seul conteneur de menu
    // pour toute la carte et y AJOUTE les entrées de la couche à chaque
    // clic droit (retirées seulement au 'contextmenu.hide' suivant). Si un
    // menu est déjà ouvert, un nouveau clic droit empilerait un second
    // menu : dans ce cas on ignore le clic au lieu d'en ouvrir un nouveau.
    // (Le menu ouvert se ferme au clic gauche / zoom / Échap.)
    if (typeof layer._showContextMenu === "function") {
      layer.off("contextmenu", layer._showContextMenu, layer);
      layer.on("contextmenu", function (e) {
        try {
          var menu = layer._map && layer._map.contextmenu;
          if (menu && menu._visible) {
            if (e && e.originalEvent && typeof L !== "undefined" && L.DomEvent) {
              L.DomEvent.preventDefault(e.originalEvent);
              L.DomEvent.stopPropagation(e.originalEvent);
            }
            return;
          }
        } catch (err) {}
        layer._showContextMenu(e);
      }, layer);
    }
    // NOTE : les hooks de la carte (fermeture hors menu / zoom / Échap)
    // ne sont PAS branchés ici : à ce stade la couche n'est pas encore
    // ajoutée à la carte (layer._map vide). Voir wireMapContextMenuDismiss(),
    // appelé une fois par carte dans init.drupal.js.
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

function addData(traceId, lay, origin) {
  // Nouveau modèle : 1 trace = 1 layer. Le tracé dessiné (Geoman) est
  // converti en GeoJSON puis ajouté comme nouvelle trace rattachée au
  // même fichier source que la trace d'origine (même groupe panel).
  try {
    var groupName = "Traces";
    var label = "Trace";
    try {
      var le = (origin.defaultOptions && origin.defaultOptions.leafletEdit) || {};
      groupName = (le.filename && String(le.filename).trim() !== "") ? le.filename : "Traces";
      label = le.description || label;
    } catch (err) {}
    var geo = lay && lay.type === "Feature" ? lay : { type: "Feature", properties: {}, geometry: null };
    var newLayer = L.geoJSON(geo, {
      pointToLayer: function (f, latlng) {
        return L.circleMarker(latlng, f.style || { color: "red", weight: 5 });
      },
    });
    var added = null;
    newLayer.eachLayer(function (l) {
      added = l;
    });
    if (!added) {
      return;
    }
    added.defaultOptions = added.defaultOptions || {};
    try {
      added.defaultOptions.leafletEdit = JSON.parse(JSON.stringify(origin.defaultOptions.leafletEdit || {}));
    } catch (err) {
      added.defaultOptions.leafletEdit = origin.defaultOptions.leafletEdit || {};
    }
    added.defaultOptions.style = origin.defaultOptions.style || null;
    added.feature = added.feature || geo;
    processLoadedData(added);
    // Enregistre comme nouvelle trace (nouveau stamp, même groupe).
    var newTid = "drawn-" + Date.now();
    if (typeof registerTraceLayer === "function") {
      registerTraceLayer(added, newTid, label + " (copie)", groupName, false);
    } else {
      try {
        added.addTo(map.lMap);
      } catch (err) {}
      map.leafletEditTraces[newTid] = added;
    }
    setUpdated(added);
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

// Retourne le style PROPRE de la trace (jamais le style d'état
// sélectionné / modifié / édition). Priorité : orig_style (capturé avant
// tout changement d'état) > defaultOptions.style (style persisté) >
// options courantes filtrées. Utilisé pour l'affichage des formulaires
// (Détail fichier, Infos/Style) et pour la sauvegarde serveur.
function getTraceBaseStyle(layer) {
  try {
    if (layer && layer.orig_style && (layer.orig_style.color !== undefined || layer.orig_style.weight !== undefined)) {
      return {
        color: layer.orig_style.color,
        weight: layer.orig_style.weight,
        opacity: layer.orig_style.opacity,
        lineCap: layer.orig_style.lineCap,
        lineJoin: layer.orig_style.lineJoin,
        dashArray: layer.orig_style.dashArray,
        dashOffset: layer.orig_style.dashOffset,
        fillColor: layer.orig_style.fillColor,
        fillOpacity: layer.orig_style.fillOpacity,
        fillRule: layer.orig_style.fillRule,
        fill: layer.orig_style.fill,
      };
    }
  } catch (err) {}
  try {
    var ds = layer && layer.defaultOptions && layer.defaultOptions.style;
    if (ds) {
      if (typeof ds === "string") {
        try {
          ds = JSON.parse(ds);
        } catch (e2) {
          ds = null;
        }
      }
      if (ds && typeof ds === "object") {
        return ds;
      }
    }
  } catch (err) {}
  try {
    var o = (layer && layer.options) || {};
    return {
      color: o.color,
      weight: o.weight,
      dashArray: o.dashArray || null,
    };
  } catch (err) {}
  return { color: "#3388ff", weight: 3, dashArray: null };
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
  if (layer) {
    layer.leafletEditUpd = true;
    refreshTraceStyle(layer);
  }
}

function clearUpdated(layer) {
  if (layer) {
    layer.leafletEditUpd = false;
    refreshTraceStyle(layer);
  }
}

// Efface le flag modifié sur tout le groupe (après sauvegarde réussie).
// Conservé pour compat : avec 1 trace = 1 layer, équivaut à clearUpdated.
function clearUpdatedGroup(layer) {
  clearUpdated(layer);
}

function isUpdated(layer) {
  return !!(layer && layer.leafletEditUpd);
}

// Toutes les traces modifiées (registre global par tid).
function anyUpdated() {
  var out = [];
  try {
    Object.values((map && map.leafletEditTraces) || {}).forEach(function (l) {
      if (l && l.leafletEditUpd) {
        out.push(l);
      }
    });
  } catch (err) {}
  return out;
}

function setSelected(layer) {
  if (layer) {
    layer.leafletEditSel = true;
    refreshTraceStyle(layer);
  }
}

function clearSelected(layer) {
  if (layer) {
    layer.leafletEditSel = false;
    refreshTraceStyle(layer);
  }
}

function isSelected(layer) {
  return !!(layer && layer.leafletEditSel);
}

// Toutes les traces sélectionnées (registre global par tid).
function anySelected() {
  var out = [];
  try {
    Object.values((map && map.leafletEditTraces) || {}).forEach(function (l) {
      if (l && l.leafletEditSel) {
        out.push(l);
      }
    });
  } catch (err) {}
  return out;
}

// Compat : avec 1 trace = 1 layer, le "groupe" est la trace elle-même.
function getLayGroup(layer) {
  return layer || null;
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
  clearSelected(layer);
  refreshTraceStyle(layer);
}

// Désélectionne toutes les traces sauf (optionnellement) celle donnée.
function deselectAllFeatures(except) {
  try {
    Object.values((map && map.leafletEditTraces) || {}).forEach(function (l) {
      if (except && l._leaflet_id === except._leaflet_id) {
        return;
      }
      if (l.leafletEditSel) {
        l.leafletEditSel = false;
        refreshTraceStyle(l);
      }
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
