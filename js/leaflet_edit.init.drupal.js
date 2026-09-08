(function ($, Drupal, drupalSettings) {
  $(document).one("leafletMapInit", function (e, initial, self) {
    // if ((drupalSettings.leaflet_plugins.ajax) && (drupalSettings.leaflet_plugins.ajax.control)) {
    console.log("Leafmap Edit");
    // azerty
    mapid = initial.id;
    map = Drupal.Leaflet[mapid];

    map.lMap.doubleClickZoom.disable();

    // Workaround for https://github.com/elmarquis/Leaflet.GestureHandling/issues/75
    if (map.lMap.gestureHandling) {
      map.lMap.whenReady(() => map.lMap.gestureHandling?._handleMouseOver?.());
      if (L.Browser.mobile == false) {
        //Disable on desktop
        map.lMap.gestureHandling?.disable();
      }
    }
    ////
    // track contextmenu relatedTarget
    evtMenuShow();
    ////

    if (map.lMap.zoomControl) {
      // Remove existing zoomControl
      map.lMap.zoomControl.remove();
    }

    // Geoman
    console.log("Init geoman_");
    var editSettings = (drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit) || {};
    var geomanSettings = editSettings.geoman || {};
    var editPermissions = editSettings.permissions || {};
    // Outils JS activés (config du formatter, voir settingsForm 'JS tools').
    // Chaque outil ne se monte que si sa librairie a été attachée.
    // Fallback : si la liste est absente (ancien rendu), tout est monté.
    var enabledTools = editSettings.tools_enabled || null;
    function toolEnabled(name) {
      if (!enabledTools) {
        return true;
      }
      return enabledTools.indexOf(name) !== -1;
    }
    // Expose aux autres fichiers JS (barre métier, contextmenu) la liste
    // des suffixes de librairies activées, pour montrer/cacher les entrées
    // de menu correspondant aux fonctionnalités désactivées.
    // null = rendu legacy, tout est montré (voir leafletEditToolEnabled).
    try {
      map.lMap.leafletEdit = map.lMap.leafletEdit || {};
      map.lMap.leafletEdit.toolsEnabled = enabledTools;
    } catch (err) {}
    // Dismiss du menu contextuel : fermeture au clic hors menu, au zoom
    // et à Échap + états des entrées. Branché UNE fois par carte (les
    // couches sont traitées avant leur ajout à la carte et ne peuvent
    // pas le faire elles-mêmes, voir wireMapContextMenuDismiss).
    if (toolEnabled("leaflet-contextmenu") && typeof wireMapContextMenuDismiss === "function") {
      wireMapContextMenuDismiss(map);
    }
    // Geoman : barre de DESSIN à gauche (topleft forcé).
    // Toute l'ÉDITION passe par la barre métier : voir geomanOpt()
    // (util.drupal.js) — boutons d'édition forcés à off.
    if (
      toolEnabled("leaflet-geoman") &&
      typeof map.lMap.pm !== "undefined" &&
      geomanSettings.control &&
      editPermissions["edit"]
    ) {
      L.PM.reInitLayer(map.lMap);

      map.lMap.pm.addControls({
        position: "topleft",
        drawMarker: geomanOpt(geomanSettings, "drawMarker"),
        drawCircleMarker: geomanOpt(geomanSettings, "drawCircleMarker"),
        drawPolyline: geomanOpt(geomanSettings, "drawPolyline"),
        drawRectangle: geomanOpt(geomanSettings, "drawRectangle"),
        drawPolygon: geomanOpt(geomanSettings, "drawPolygon"),
        drawCircle: geomanOpt(geomanSettings, "drawCircle"),
        drawText: geomanOpt(geomanSettings, "drawText"),
        editMode: geomanOpt(geomanSettings, "editMode"),
        dragMode: geomanOpt(geomanSettings, "dragMode"),
        cutPolygon: geomanOpt(geomanSettings, "cutPolygon"),
        removalMode: geomanOpt(geomanSettings, "removalMode"),
        rotateMode: geomanOpt(geomanSettings, "rotateMode"),
        oneBlock: geomanOpt(geomanSettings, "oneBlock"),
        drawControls: geomanOpt(geomanSettings, "drawControls"),
        editControls: geomanOpt(geomanSettings, "editControls"),
        customControls: geomanOpt(geomanSettings, "customControls"),
      });
      // Ceinture + bretelles : retire tout bouton d'édition qui existerait
      // malgré les options ci-dessus (voir removeGeomanEditButtons()).
      if (typeof removeGeomanEditButtons === "function") {
        removeGeomanEditButtons(map.lMap);
      }
      // Barre métier (Fichier/Édition/Outils) en haut : sous-menus
      // cascadeButtons, fullscreen + locate inclus. Voir edit.drupal.js.
      // Ne se monte que si cascadebuttons est activé (la barre elle-même)
      // ET geoman (les actions d'édition associées).
      if (toolEnabled("leaflet.cascadebuttons") && typeof addBusinessBar === "function") {
        addBusinessBar();
      }

      // Event geoman Draw
      map.lMap.on("pm:drawstart", function (e) {
        evtMapDrawstart(e);
      });
      map.lMap.on("pm:drawend", function (e) {
        evtMapDrawend(e);
      });
      map.lMap.on("pm:create", function (e) {
        evtMapCreate(e);
      });
    }

    // StyleEditor : AUCUNE initialisation carte ici (volontaire).
    // Usage strictement programmatique via ensureStyleEditor()
    // (menu métier : L.control.styleEditor() + enable(layer), bouton
    // carte masqué). La librairie est chargée en dur par le service.

    /// Init Notifications (outil configurable, défaut ON).
    if (toolEnabled("leaflet-notifications") && typeof L.control.notifications === "function") {
      try {
        map.lMap.notification = L.control
          .notifications({
            timeout: 3000,
            position: "topright",
            closable: true,
            dismissable: true,
          })
          .addTo(map.lMap);
      } catch (error) {
        console.error("Notification : " + error);
      }
    }

    // full screen : bouton intégré à la barre métier ("Vue").
    // Ancien contrôle bottomleft supprimé pour éviter le doublon.

    // LocateControl : AUCUNE instance ici (volontaire). Elle est créée à
    // la demande par locateMe() (menu "Outils") : start() exige un
    // contrôle rattaché à la carte, et son bouton carte reste masqué
    // par CSS. Pas de bouton carte dédié.

    // load datas
    // map.bounds = emprise cumulée des traces (cadrage initial UNIQUEMENT).
    // Ne JAMAIS refaire fitBounds sur moveend : l'utilisateur garde son zoom.
    map.bounds = null;
    // Garde-fou : fitBounds() déclenche moveend -> on ignore le moveend
    // programmatique pour ne pas relancer un chargement + un recadrage.
    map.leafletEditProgrammaticMove = false;
    // Registre global des traces (par tid) : utilisé par la sélection,
    // le style, les exports et le panel (1 entrée = 1 trace).
    map.leafletEditTraces = {};
    // Index fichier -> tids pour le panneau "détail par fichier"
    // (1 groupe = 1 fichier geojson, lien direct via source_fid).
    map.leafletEditFiles = {};
    // Expose aux autres fichiers JS (création "Nouvelle trace") :
    // registerTraceLayer / indexTraceFile sont déclarés plus bas
    // (hoisting : l'assignation est sûre dès ici).
    map.registerTraceLayer = function (value, tid, label, groupName, isBackground) {
      return registerTraceLayer(value, tid, label, groupName, isBackground);
    };
    map.indexTraceFile = function (tid, fid, filename) {
      return indexTraceFile(tid, fid, filename);
    };

    var base = [];
    var over_info = [];

    // Fonds de carte : le module leaflet stocke les couches de base dans
    // map.base_layers (objet clé -> layer). La carte "~Cartes Topo" de
    // leaflet_more_maps déclare 7 fonds (IGN topo/scan25/ortho/cadastre/
    // natura2000...) : le module leaflet les a TOUS instanciés dans
    // map.base_layers (seul le 1er est ajouté à la carte, les autres
    // passent par le layer switcher). On les reprend tous pour le groupe
    // "Cartes" du panel.
    // map.layer_control est un L.Control.Layers dont _layers est un OBJET
    // (pas un tableau) : on itère avec Object.values().
    // Sans fond déclaré, on ajoute un OSM de secours pour que le groupe
    // "Cartes" ne soit jamais vide.
    // Construit un fond de secours depuis une définition (type custom
    // 'wms' IGN, 'quad' Bing, 'google'...) via create_layer() si dispo.
    function buildBaseLayerFromDef(key, def) {
      try {
        if (!def || typeof L === "undefined") {
          return null;
        }
        if (def.type === "quad" && typeof L.TileLayerQuad !== "undefined") {
          return new L.TileLayerQuad(def.urlTemplate, def.options || {});
        }
        if (def.type === "google" && L.TileLayer) {
          return new L.TileLayer(def.urlTemplate, def.options || {});
        }
        if (def.urlTemplate && L.tileLayer) {
          return L.tileLayer(def.urlTemplate, def.options || {});
        }
        if (def.layer && def.layer instanceof L.Layer) {
          return def.layer;
        }
      } catch (err) {}
      return null;
    }
    function collectBaseLayers() {
      var found = {};
      // 1) Instances déjà créées par le module leaflet (source de vérité :
      // contient les 7 fonds more_maps, même avec layerControl: FALSE car
      // add_base_layer() remplit base_layers dans tous les cas).
      try {
        if (map.base_layers && typeof map.base_layers === "object") {
          Object.keys(map.base_layers).forEach(function (name) {
            if (!found[name]) {
              found[name] = map.base_layers[name];
            }
          });
        }
      } catch (err) {}
      // 2) Ancien contrôle Layers natif (complément éventuel).
      try {
        if (map.layer_control && map.layer_control._layers) {
          Object.values(map.layer_control._layers).forEach(function (lay) {
            if (lay && !lay.overlay && lay.layer && !found[lay.name]) {
              found[lay.name] = lay.layer;
            }
          });
        }
      } catch (err) {}
      // 3) Reconstruction depuis la définition (secours si base_layers vide).
      // Les fonds IGN utilisent un type custom 'wms' (leaflet_more_maps) :
      // on passe par Drupal.Leaflet.create_layer() qui sait les construire.
      try {
        var defLayers = (map.map_definition && map.map_definition.layers) || {};
        Object.keys(defLayers).forEach(function (name) {
          if (found[name]) {
            return;
          }
          var def = defLayers[name];
          var layerType = (def && def.layer_type) || "base";
          if (layerType !== "base") {
            return;
          }
          var built = null;
          try {
            if (typeof map.create_layer === "function") {
              built = map.create_layer(def, name);
            } else {
              built = buildBaseLayerFromDef(name, def);
            }
          } catch (err2) {
            built = buildBaseLayerFromDef(name, def);
          }
          if (built) {
            found[name] = built;
          }
        });
      } catch (err) {}
      Object.keys(found).forEach(function (name) {
        var isActive = false;
        try {
          isActive = map.lMap.hasLayer(found[name]);
        } catch (err) {}
        base.push({ layer: found[name], name: name, active: isActive });
      });
      // Premier fond affiché si aucun actif (radio "Cartes" : 1 choix).
      try {
        var anyActive = base.some(function (entry) { return entry.active; });
        if (!anyActive && base.length && map.lMap) {
          base[0].layer.addTo(map.lMap);
          base[0].active = true;
        }
      } catch (err) {}
      if (!base.length && typeof L !== "undefined" && L.tileLayer) {
        var osm = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        });
        // Affiche le fond de secours immédiatement (avant le panel).
        try {
          if (map.lMap && !map.lMap.hasLayer(osm)) {
            osm.addTo(map.lMap);
          }
        } catch (err) {}
        base.push({ layer: osm, name: "OpenStreetMap", active: true });
      }
    }
    collectBaseLayers();
    // Retire l'ancien contrôle Layers natif (remplacé par panelLayers).
    try {
      if (map.layer_control) {
        map.lMap.removeControl(map.layer_control);
      }
    } catch (err) {}
    // Overlays éventuels déjà présents (hors traces métier).
    try {
      if (map.overlays && typeof map.overlays === "object") {
        Object.keys(map.overlays).forEach(function (name) {
          over_info.push({ layer: map.overlays[name], name: name });
        });
      }
    } catch (err) {}

    function geojson_onEachFeature(feature, layer) {
      // does this feature have a property named popupContent?
      if (feature.properties && feature.properties.TEX) {
        layer.bindPopup(feature.properties.TEX);
      }
    }
    function chemin_style(feature) {
      return {
        color: "#c0392b",
        opacity: "0.73",
        weight: "5",
        lineCap: "round",
        dashArray: "15,10,1,10",
      };
    }

    // Slider (outil configurable, défaut ON).
    if (toolEnabled("leaflet-slider") && typeof L.control.slider === "function") {
      var slider = L.control
        .slider(
        function (value) {
          console.log(value);
          function _findActiveBaseLayer() {
            if (! map.layer_control) {
              return null;
            }
            var layers = map.layer_control._layers;
            for (var i = 0; i < layers.length; i++) {
              var layer = layers[i];
              if (!layer.overlay && map.lMap.hasLayer(layer.layer)) {
                return layer;
              }
            }
            return null;
          }
          layer = _findActiveBaseLayer();
          if (layer) {
            if (layer.layer.setStyle) {
              layer.layer.setStyle({});
              this.opacity = value / 100;
            } else if (layer.layer.setOpacity) {
              layer.layer.setOpacity(value / 100);
            }
          }
        },
        {
          size: "100px",
          orientation: "horizontal",
          id: "slider",
          min: 0,
          max: 100,
          step: 1,
          value: 100,
          title: "Opacity",
          logo: "O",
        }
      )
      .addTo(map.lMap);
      map.lMap.on('baselayerchange', function(layer) {
        // remove transparency on new layer
        slider.slider.value = 100;
        slider._updateValue();
      });
    }

    // Gestion des couches à droite (topright), replié par défaut.
    // - Groupe "Cartes" : fonds de carte (choix restauré).
    // - Groupes dynamiques par fichier source : 1 entrée = 1 trace
    //   (afficher/masquer individuellement), regroupées par fichier.
    // - selectorGroup : case à cocher sur chaque groupe pour
    //   afficher/masquer tout le fichier d'un coup.
    // Le panel est créé AVANT le chargement bbox (registerTraceLayer y
    // ajoute les traces au fil de l'eau via panel.addOverlay).
    var panelWanted = toolEnabled("leaflet-panel-layers") && typeof L.control.panelLayers === "function";
    if (panelWanted) {
      panel = L.control.panelLayers(
        [
          {
            group: "Cartes",
            collapsed: true,
            layers: base,
          },
        ],
        [
          {
            group: "Infos",
            collapsed: true,
            layers: over_info,
          },
        ],
        {
          collapsed: true,
          compact: true,
          collapsibleGroups: true,
          selectorGroup: true,
          position: "topright",
        }
      );
      map.lMap.addControl(panel);
    }
    else {
      // Sans panel-layers : ajoute les fonds directement à la carte.
      base.forEach(function (entry) {
        if (entry.layer) {
          entry.layer.addTo(map.lMap);
        }
      });
      panel = null;
    }
    // Ne pas écraser l'objet leafletEdit (businessBar, locateControl,
    // currentTrace... déjà posés plus haut) : on fusionne.
    map.lMap.leafletEdit = map.lMap.leafletEdit || {};
    map.lMap.leafletEdit.LAYGROUP_CONTROL = panel;

    // Clic sur le fond de carte = désélectionne la trace courante.
    // (Le toggle au clic sur la trace est géré dans evtFeatureClick.)
    // NOTE : en Leaflet, le clic sur un path remonte TOUJOURS à la carte
    // (propagation Leaflet, pas DOM : stopPropagation ne suffit pas).
    // evtFeatureClick pose donc un timestamp que ce handler respecte :
    // tout clic carte arrivé < 400 ms après un clic trace est ignoré.
    map.lMap.on("click", function () {
      try {
        var lastTraceClick = (map.lMap.leafletEdit && map.lMap.leafletEdit.suppressMapClickUntil) || 0;
        if (Date.now() < lastTraceClick) {
          return;
        }
        if (typeof deselectAllFeatures === "function") {
          deselectAllFeatures();
        }
        if (map.lMap.leafletEdit) {
          map.lMap.leafletEdit.currentTrace = null;
        }
      } catch (err) {}
    });

    //

    if (editPermissions["read"]) {
      // Extend selection area
      const canvasRenderer = L.canvas({
        tolerance: 10,
      });

      // Nouveau modèle : les géométries sont chargées via les endpoints
      // bbox (latest revision par défaut), avec cache par trace id et
      // rechargement au moveend (debounce). Remplace L.GeoJSON.AJAX par
      // URL de fichier.
      // Règles anti-boucle zoom :
      // - fitBounds() initial UNE SEULE FOIS (initialFitDone) ;
      // - fitBounds() déclenche moveend -> ignoré via
      //   map.leafletEditProgrammaticMove ;
      // - moveend ne recharge que les NOUVEAUX tids (cache loadedIds),
      //   sans jamais toucher au zoom ni à map.bounds.
      var bboxState = {
        loadedIds: {},
        layersById: {},
        pendingTraces: false,
        pendingBackground: false,
        timer: null,
        initialFitDone: false,
      };

      function bboxUrl(base, bounds, page) {
        var b = bounds.getWest() + "," + bounds.getSouth() + "," + bounds.getEast() + "," + bounds.getNorth();
        return base + "?bbox=" + b + "&page=" + (page || 0);
      }

      function applyFeatureStyle(layer, feature) {
        var style = feature.style || null;
        if (typeof style === "string") {
          try {
            style = JSON.parse(style);
          } catch (e) {
            style = null;
          }
        }
        if (style && typeof style === "object") {
          try {
            layer.setStyle(style);
            return;
          } catch (e) {}
        }
        layer.setStyle({ color: "red", weight: 5 });
      }

      // Nom du groupe panel = fichier source (regroupement par fichier).
      // Le fid est conservé pour le panneau "détail par fichier"
      // (openFileDetail) : 1 groupe = 1 fichier, avec nom + style
      // modifiables par trace.
      function traceGroupName(feat) {
        var src = feat.properties && (feat.properties._source || feat.properties.source || feat.properties.filename);
        if (src && String(src).trim() !== "") {
          return String(src);
        }
        return "Traces";
      }

      function traceSourceFid(feat) {
        try {
          var fid = feat.properties && feat.properties._source_fid;
          if (fid !== undefined && fid !== null && fid !== "") {
            return parseInt(fid, 10) || 0;
          }
        } catch (e) {}
        return 0;
      }

      function traceLabel(feat, tid) {
        if (feat.properties && (feat.properties._label || feat.properties.name)) {
          return feat.properties._label || feat.properties.name;
        }
        return "Trace " + tid;
      }

      // Index fichier -> tids (registre pour le panneau détail par fichier).
      // map.leafletEditFiles[fid] = { fid, filename, tids: [] }.
      function indexTraceFile(tid, fid, filename) {
        try {
          map.leafletEditFiles = map.leafletEditFiles || {};
          if (!map.leafletEditFiles[fid]) {
            map.leafletEditFiles[fid] = { fid: fid, filename: filename || ("Fichier " + fid), tids: [] };
          }
          if (map.leafletEditFiles[fid].tids.indexOf(tid) === -1) {
            map.leafletEditFiles[fid].tids.push(tid);
          }
          if (filename && map.leafletEditFiles[fid].filename !== filename) {
            map.leafletEditFiles[fid].filename = filename;
          }
        } catch (err) {}
      }

      // Ajoute UNE trace comme entrée individuelle du panel, dans son
      // groupe fichier. Les entrées dynamiques passent par addOverlay()
      // pour que la case à cocher affiche/masque la trace.
      // - active: true + ajout carte AVANT addOverlay : la case naît cochée
      //   (checked = hasLayer) car les traces sont visibles au chargement ;
      // - groupe replié par défaut : addOverlay() crée le groupe déplié,
      //   on le referme aussitôt pour la lisibilité (voir collapsePanelGroup).
      function registerTraceLayer(value, tid, label, groupName, isBackground) {
        map.leafletEditTraces[tid] = value;
        bboxState.layersById[tid] = value;
        // Trace visible par défaut : ajoutée à la carte AVANT addOverlay
        // pour que la case du panel naisse cochée (checked = hasLayer).
        try {
          if (!map.lMap.hasLayer(value)) {
            value.addTo(map.lMap);
          }
        } catch (err) {}
        // Couche sur la carte : applique les flèches de sens si l'option
        // est active (ne fait rien sinon, ou si le plugin est absent).
        if (typeof refreshArrows === "function") {
          refreshArrows(value);
        }
        if (!panel || typeof panel.addOverlay !== "function") {
          return;
        }
        try {
          // addOverlay() attend un descripteur {layer, name, active},
          // pas le layer brut (sinon _addLayer lève
          // "layer not defined in item").
          panel.addOverlay({ layer: value, name: label, active: true }, label, groupName);
        } catch (err) {
          console.warn("[leaflet_edit] addOverlay failed for trace " + tid, err);
        }
        // addOverlay() -> _update() reconstruit le DOM : la case peut naître
        // décochée même si le layer est sur la carte. On force l'état coché
        // sur TOUTES les cases de traces (pas seulement la courante), car
        // le _update a pu recréer les inputs des traces précédentes.
        try {
          if (panel && panel._form) {
            Object.values(map.leafletEditTraces).forEach(function (l) {
              try {
                if (!l) {
                  return;
                }
                var lid = L.stamp(l);
                var input = panel._form.querySelector('input[value="' + lid + '"]');
                if (input && map.lMap.hasLayer(l)) {
                  input.checked = true;
                  input.defaultChecked = true;
                }
              } catch (err2) {}
            });
          }
        } catch (err) {}
        // Replie le groupe fichier pour la lisibilité (traces visibles
        // mais menu compact). Le groupe "Fonds" reste déplié : 1 seul
        // groupe générique, pas de bruit visuel.
        if (!isBackground) {
          collapsePanelGroup(groupName);
        }
      }

      // Referme un groupe du panel (classe 'expanded' retirée, icône '+').
      // Appelé à chaque ajout de trace : le groupe reste replié même quand
      // les pages bbox arrivent au fil de l'eau.
      // NOTE : addOverlay() -> _addLayer() -> _update() RECONSTRUIT tout le
      // DOM du panel (_groups/_items recréés). Le repli doit donc avoir lieu
      // APRÈS chaque _update, pas seulement après l'ajout courant : on
      // replie TOUS les groupes de traces à chaque appel.
      function collapsePanelGroup(groupName) {
        try {
          if (!panel || !panel._groups) {
            return;
          }
          Object.keys(panel._groups).forEach(function (name) {
            // Ne jamais replier "Cartes" ni "Infos" (groupes natifs) :
            // seuls les groupes de fichiers traces sont repliés.
            if (name === "Cartes" || name === "Infos" || name === "Fonds") {
              return;
            }
            var groupdiv = panel._groups[name];
            if (!groupdiv) {
              return;
            }
            if (typeof L !== "undefined" && L.DomUtil) {
              if (L.DomUtil.hasClass(groupdiv, "expanded")) {
                L.DomUtil.removeClass(groupdiv, "expanded");
              }
              var icon = groupdiv.querySelector && groupdiv.querySelector("label i");
              if (icon) {
                icon.innerHTML = " + ";
              }
            }
          });
        } catch (err) {}
      }

      function extendInitialBounds(value) {
        // Emprise cumulée pour le cadrage initial UNIQUEMENT.
        if (bboxState.initialFitDone) {
          return;
        }
        try {
          var b = value.getLatLngs
            ? L.latLngBounds(value.getLatLngs())
            : L.latLngBounds([value.getLatLng(), value.getLatLng()]);
          if (map.bounds && map.bounds.isValid()) {
            map.bounds = map.bounds.extend(b);
          } else {
            map.bounds = b;
          }
        } catch (e) {}
      }

      function maybeInitialFit() {
        if (bboxState.initialFitDone) {
          return;
        }
        if (bboxState.pendingTraces || bboxState.pendingBackground) {
          return;
        }
        bboxState.initialFitDone = true;
        try {
          if (map.bounds && map.bounds.isValid()) {
            map.leafletEditProgrammaticMove = true;
            map.lMap.fitBounds(map.bounds);
            // moveend (asynchrone) retombe à false dans le handler.
            setTimeout(function () {
              map.leafletEditProgrammaticMove = false;
            }, 500);
          }
        } catch (e) {
          map.leafletEditProgrammaticMove = false;
        }
      }

      function loadBboxPage(url, isBackground, isInitial) {
        jQuery.getJSON(url)
          .done(function (collection) {
            var feats = (collection && collection.features) || [];
            var meta = (collection && collection.meta) || {};
            feats.forEach(function (feat) {
              var tid = feat.id || (feat.properties && feat.properties._trace_id);
              if (!tid || bboxState.loadedIds[tid]) {
                return;
              }
              bboxState.loadedIds[tid] = true;
              var sub = L.geoJSON(feat, {
                renderer: canvasRenderer,
                style: feat.style || undefined,
                pointToLayer: function (f, latlng) {
                  return L.circleMarker(latlng, f.style || { color: "red", weight: 5 });
                },
                // Options distanceMarkers par défaut : le plugin les crée
                // au onAdd (points km, voir textFunction ci-dessous).
                // L'affichage au survol est piloté par l'option "Points km"
                // de la barre Outils (map.leafletEditKmPoints).
                distanceMarkers: {
                  lazy: true,
                  offset: 1000,
                  showAll: 14,
                  cssClass: "leaflet-edit-km-marker",
                  textFunction: function (distance) {
                    return (distance / 1000) + " km";
                  },
                },
              });
              var label = traceLabel(feat, tid);
              var groupName = isBackground ? "Fonds" : traceGroupName(feat);
              var sourceFid = isBackground ? -1 : traceSourceFid(feat);
              sub.eachLayer(function (value) {
                // Contexte leafletEdit : trace id + révision servie.
                // source_fid = lien direct trace -> fichier geojson pour le
                // panneau "détail par fichier" (openFileDetail).
                value.defaultOptions = value.defaultOptions || {};
                value.defaultOptions.leafletEdit = {
                  nid: mapid,
                  tid: tid,
                  revision_id: (feat.properties && feat.properties._revision_id) || null,
                  description: label,
                  filename: (feat.properties && (feat.properties._source || feat.properties.filename)) || "",
                  source_fid: sourceFid,
                  _selected: false,
                  _updated: false,
                };
                value.defaultOptions.style = feat.style || null;
                value.feature = value.feature || feat;
                applyFeatureStyle(value, feat);
                // Tooltip : label de la trace.
                if (label) {
                  value.bindTooltip(label, { sticky: true });
                }
                if (!isBackground) {
                  processLoadedData(value);
                  indexTraceFile(tid, sourceFid, groupName);
                }
                extendInitialBounds(value);
                registerTraceLayer(value, tid, label, groupName, isBackground);
              });
            });
            if (meta.has_more) {
              // Pagination : même mode (initial = sans bbox, sinon bbox courante).
              var nextPage = (meta.page || 0) + 1;
              var nextUrl;
              if (isInitial) {
                nextUrl = initialUrl(
                  isBackground ? drupalSettings[mapid].leaflet_edit.endpoints.background : drupalSettings[mapid].leaflet_edit.endpoints.traces,
                  nextPage
                );
              } else {
                nextUrl = bboxUrl(
                  isBackground ? drupalSettings[mapid].leaflet_edit.endpoints.background : drupalSettings[mapid].leaflet_edit.endpoints.traces,
                  map.lMap.getBounds(), nextPage
                );
              }
              loadBboxPage(nextUrl, isBackground, isInitial);
            } else {
              if (isBackground) {
                bboxState.pendingBackground = false;
              } else {
                bboxState.pendingTraces = false;
              }
              // Cadrage initial une fois les 2 flux terminés.
              maybeInitialFit();
            }
          })
          .fail(function (xhr) {
            console.error("[leaflet_edit] bbox load failed:", url, xhr.status);
            if (isBackground) {
              bboxState.pendingBackground = false;
            } else {
              bboxState.pendingTraces = false;
            }
            maybeInitialFit();
          });
      }

      // URL initiale SANS bbox : charge TOUTES les traces (paginé) pour
      // pouvoir cadrer dessus. Sans ça, si la vue par défaut ne contient
      // aucune trace, le filtre bbox renvoie vide -> pas de fitBounds ->
      // menu vide -> l'utilisateur ne trouve jamais ses traces.
      function initialUrl(base, page) {
        return base + "?page=" + (page || 0);
      }

      function loadInitial() {
        var endpoints = drupalSettings[mapid].leaflet_edit.endpoints || {};
        if (endpoints.traces && !bboxState.pendingTraces) {
          bboxState.pendingTraces = true;
          loadBboxPage(initialUrl(endpoints.traces, 0), false, true);
        }
        if (endpoints.background && !bboxState.pendingBackground) {
          bboxState.pendingBackground = true;
          loadBboxPage(initialUrl(endpoints.background, 0), true, true);
        }
      }

      function loadVisibleBbox() {
        var endpoints = drupalSettings[mapid].leaflet_edit.endpoints || {};
        var bounds = map.lMap.getBounds();
        if (endpoints.traces && !bboxState.pendingTraces) {
          bboxState.pendingTraces = true;
          loadBboxPage(bboxUrl(endpoints.traces, bounds, 0), false, false);
        }
        if (endpoints.background && !bboxState.pendingBackground) {
          bboxState.pendingBackground = true;
          loadBboxPage(bboxUrl(endpoints.background, bounds, 0), true, false);
        }
      }

      map.lMap.whenReady(function () {
        // Premier chargement : SANS filtre bbox (toutes les traces) pour
        // cadrer la carte dessus. Les moveend suivants utilisent la bbox.
        loadInitial();
      });
      map.lMap.on("moveend", function () {
        // Ignore le moveend provoqué par notre fitBounds initial.
        if (map.leafletEditProgrammaticMove) {
          return;
        }
        if (bboxState.timer) {
          clearTimeout(bboxState.timer);
        }
        // Recharge les nouvelles traces visibles SANS toucher au zoom.
        bboxState.timer = setTimeout(loadVisibleBbox, 300);
      });
      // Sans panel-layers : les traces arrivent directement sur la carte
      // (registerTraceLayer fait value.addTo quand panel est null).
      if (!panelWanted) {
        Object.values(map.leafletEditTraces).forEach(function (l) {
          try {
            if (!map.lMap.hasLayer(l)) {
              l.addTo(map.lMap);
            }
          } catch (err) {}
        });
      }
    }
  });
})(jQuery, Drupal, drupalSettings);
