(function ($, Drupal, drupalSettings) {
  $(document).one("leafletMapInit", function (e, initial, self) {
    // if ((drupalSettings.leaflet_plugins.ajax) && (drupalSettings.leaflet_plugins.ajax.control)) {
    console.log("Leafmap Edit");
    // azerty
    mapid = initial.id;
    map = Drupal.Leaflet[mapid];

    map.lMap.doubleClickZoom.disable();

    // Mode Nuit Samsung Internet : le navigateur assombrit les tuiles raster
    // (fond de carte) au rendu, ce que color-scheme ne suffit pas toujours à
    // empêcher. On compense uniquement sur les tuiles (traces et contrôles
    // non affectés), et uniquement sur SamsungBrowser en préférence sombre.
    try {
      var leIsSamsung = /SamsungBrowser/i.test(navigator.userAgent || "");
      var leDarkMq = (typeof window.matchMedia === "function")
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;
      var leApplySamsungNight = function () {
        try {
          var night = !!(leIsSamsung && leDarkMq && leDarkMq.matches);
          var cont = map.lMap.getContainer();
          if (!cont || !cont.classList) {
            return;
          }
          if (night) {
            cont.classList.add("leaflet-edit-samsung-night");
          } else {
            cont.classList.remove("leaflet-edit-samsung-night");
          }
        } catch (eN) {}
      };
      leApplySamsungNight();
      if (leDarkMq) {
        if (typeof leDarkMq.addEventListener === "function") {
          leDarkMq.addEventListener("change", leApplySamsungNight);
        } else if (typeof leDarkMq.addListener === "function") {
          leDarkMq.addListener(leApplySamsungNight);
        }
      }
    } catch (errNight) {}

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
    // Geoman : barre de DESSIN à gauche (topleft forcé), MASQUÉE par
    // défaut : elle n'apparaît que pendant la création "Nouvelle trace"
    // (voir showGeomanToolbar/hideGeomanToolbar, util.drupal.js).
    // Toute l'ÉDITION passe par la barre métier : voir geomanOpt()
    // (util.drupal.js) — boutons d'édition forcés à off.
    if (
      toolEnabled("leaflet-geoman") &&
      typeof map.lMap.pm !== "undefined" &&
      geomanSettings.control &&
      editPermissions["edit"]
    ) {
      L.PM.reInitLayer(map.lMap);

      var geomanControlsOptions = {
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
      };
      map.lMap.pm.addControls(geomanControlsOptions);
      // Mémorise les options pour ré-affichage à la demande
      // (showGeomanToolbar). Puis masque aussitôt : la barre Geoman ne
      // s'affiche que pendant la création "Nouvelle trace".
      try {
        map.lMap.leafletEdit = map.lMap.leafletEdit || {};
        map.lMap.leafletEdit.geomanControlsOptions = geomanControlsOptions;
      } catch (errOpts) {}
      try {
        map.lMap.pm.removeControls();
      } catch (errHide) {}
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
    // map.bounds = emprise des entités VISIBLES (cadrage initial UNIQUEMENT ;
    // les fonds désactivés par défaut n'y participent pas).
    // map.boundsAll = emprise de la TOTALITÉ des entités (repli si tout est
    // caché, ex. carte avec uniquement des fonds).
    // Ne JAMAIS refaire fitBounds sur moveend : l'utilisateur garde son zoom.
    map.bounds = null;
    map.boundsAll = null;
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
    // - Groupe "Fonds" : couches non éditables, placé JUSTE APRÈS
    //   "Cartes" (voir moveFondsAfterCartes) et DÉSACTIVÉ par défaut
    //   (perf chargement initial, voir registerTraceLayer).
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
    // Groupes ouverts EXPLICITEMENT par l'utilisateur (noms) : on ne les
    // referme jamais automatiquement (voir postPanelUpdate).
    map.leafletEditExpandedGroups = {};
    // Toute reconstruction du panel (addOverlay -> _update, à chaque
    // trace/fond chargé) recrée le DOM : groupes nés dépliés, cases
    // potentiellement désynchronisées, groupe "Fonds" en fin de liste.
    // Ce hook rejoue APRÈS chaque _update : Fonds après Cartes, groupes
    // de fichiers fermés par défaut, cases synchronisées avec la carte.
    if (panel && typeof panel._update === "function") {
      try {
        var origPanelUpdate = panel._update.bind(panel);
        panel._update = function () {
          origPanelUpdate();
          postPanelUpdate();
        };
      } catch (err) {}
    }

    // Post-traitement après chaque reconstruction du panel.
    function postPanelUpdate() {
      try {
        // moveFondsAfterCartes vit dans le bloc "read" : absent si pas de
        // permission de lecture (aucune trace chargée dans ce cas).
        if (typeof moveFondsAfterCartes === "function") {
          moveFondsAfterCartes();
        }
        collapseFileGroups();
        syncPanelCheckboxes();
      } catch (err) {}
    }

    // Referme les groupes de fichiers (recréés dépliés à chaque _update),
    // SAUF "Cartes"/"Infos"/"Fonds" et ceux ouverts par l'utilisateur.
    // Attache aussi (nœuds DOM frais à chaque rebuild, ré-attache sûre)
    // l'écoute du clic sur chaque intitulé pour mémoriser l'intention
    // d'ouverture explicite.
    function collapseFileGroups() {
      try {
        if (!panel || !panel._groups) {
          return;
        }
        map.leafletEditExpandedGroups = map.leafletEditExpandedGroups || {};
        Object.keys(panel._groups).forEach(function (name) {
          if (name === "Cartes" || name === "Infos" || name === "Fonds") {
            return;
          }
          var groupdiv = panel._groups[name];
          if (!groupdiv) {
            return;
          }
          // Mémorise l'ouverture explicite. Notre écouteur tourne APRÈS
          // celui du plugin (attaché à la création du groupe), donc la
          // classe reflète déjà le nouvel état au moment de la lecture.
          try {
            var grouplabel = groupdiv.querySelector
              ? groupdiv.querySelector("label.leaflet-panel-layers-grouplabel")
              : null;
            if (grouplabel && !grouplabel.leafletEditTracked) {
              grouplabel.leafletEditTracked = true;
              (function (groupName, groupDiv) {
                grouplabel.addEventListener("click", function () {
                  setTimeout(function () {
                    try {
                      var open = (typeof L !== "undefined" && L.DomUtil)
                        ? L.DomUtil.hasClass(groupDiv, "expanded")
                        : false;
                      if (open) {
                        map.leafletEditExpandedGroups[groupName] = true;
                      } else {
                        delete map.leafletEditExpandedGroups[groupName];
                      }
                    } catch (e) {}
                  }, 0);
                });
              })(name, groupdiv);
            }
          } catch (e) {}
          // Fermé par défaut, sauf intention explicite d'ouverture.
          if (map.leafletEditExpandedGroups[name]) {
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

    // Synchronise les cases avec la carte (double sens) : cochée ssi la
    // couche est affichée. Indispensable après chaque _update qui
    // reconstruit les inputs (sinon cases décochées à l'ouverture alors
    // que les couches sont visibles).
    function syncPanelCheckboxes() {
      try {
        if (!panel || !panel._form) {
          return;
        }
        Object.values(map.leafletEditTraces).forEach(function (l) {
          try {
            if (!l) {
              return;
            }
            var lid = L.stamp(l);
            var input = panel._form.querySelector('input[value="' + lid + '"]');
            if (!input) {
              return;
            }
            var on = false;
            try {
              on = map.lMap.hasLayer(l);
            } catch (e) {}
            input.checked = on;
            input.defaultChecked = on;
          } catch (err2) {}
        });
      } catch (err) {}
    }

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
      // Rendu dual :
      // - données ÉDITABLES (traces) = SVG (1 path DOM par trace, classes
      //   CSS + setStyle par entité, interactif/éditable via Geoman) ;
      // - données NON ÉDITABLES (fonds/background) = Canvas (peint sur
      //   <canvas>, performance gros volumes, non éditable, popup au clic
      //   avec les attributs inclus).
      // Surcharge possible via drupalSettings.leaflet_edit.renderers :
      // { trace: 'svg'|'canvas', background: 'svg'|'canvas' }.
      var TRACE_PERF_CLASS = "leaflet-edit-trace-perf";
      var svgRenderer = L.svg();
      // Extend selection area
      const canvasRenderer = L.canvas({
        tolerance: 10,
      });
      var renderersCfg = editSettings.renderers || {};
      var TRACE_RENDERER = renderersCfg.trace === "canvas" ? canvasRenderer : svgRenderer;
      var BACKGROUND_RENDERER = renderersCfg.background === "svg" ? svgRenderer : canvasRenderer;

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

      // Indicateur de progression du CHARGEMENT INITIAL uniquement (gros
      // volumes) : pastille "Chargement des données… N éléments", visible
      // tant qu'au moins une requête initiale est en vol. Les rechargements
      // au zoom/translation (isInitial === false) restent silencieux.
      // Compteur équilibré : 1 loadingStart() par loadBboxPage initiale,
      // 1 loadingDone() par issue (done/fail, pagination incluse).
      var loadingState = { pending: 0, el: null, hideTimer: null, shownAt: 0 };
      // Durée d'affichage minimale (ms) : la pastille reste perceptible
      // même sur les chargements rapides, et survit aux navigateurs qui ne
      // peignent qu'après le premier rendu (Samsung Internet).
      var LE_LOADING_MIN_MS = 700;
      // Styles visuels critiques en INLINE (fond opaque, pilule, anneau) :
      // ils survivent à un CSS agrégé périmé en cache (navigateurs mobiles
      // agressifs, dont Samsung Internet). Le CSS externe n'apporte plus que
      // l'animation du spinner et l'ellipsis. topCss = "100%" (contrôle sous
      // la barre) ou "58px" (repli racine de carte).
      function loadingStylePill(el, topCss) {
        try {
          if (!el) {
            return;
          }
          el.style.cssText = "display:none;position:absolute;top:" + topCss + ";left:50%;" +
            "-webkit-transform:translateX(-50%);transform:translateX(-50%);" +
            (topCss === "100%" ? "margin-top:8px;" : "") +
            "z-index:1200;max-width:86vw;overflow:hidden;background:#ffffff;" +
            "border:1px solid #888;border-radius:20px;padding:6px 14px;" +
            "font-size:13px;line-height:1.4;color:#222;text-align:left;" +
            "box-shadow:0 1px 5px rgba(0,0,0,0.35);white-space:nowrap;pointer-events:none;";
          var spin = el.querySelector(".leaflet-edit-progress-spinner");
          if (spin) {
            spin.style.cssText = "display:inline-block;vertical-align:middle;width:14px;height:14px;" +
              "margin-right:8px;border-radius:50%;border:2px solid #ccc;border-top-color:#333;";
          }
          var label = el.querySelector(".leaflet-edit-progress-text");
          if (label) {
            label.style.cssText = "display:inline-block;vertical-align:middle;";
          }
        } catch (err) {}
      }
      function loadingEnsureControl() {
        // La pastille est un contrôle Leaflet natif (coin topcenter, créé
        // si besoin comme la barre métier) : c'est le seul chemin de rendu
        // qui s'affiche de façon fiable sur tous les navigateurs mobiles,
        // dont Samsung Internet (un <div> absolu posé à la racine du
        // conteneur de carte n'y est jamais peint).
        // Noms de classes neutres (sans "loading") : certains bloqueurs de
        // contenu des navigateurs Samsung masquent les éléments dont la
        // classe évoque un chargement.
        try {
          if (!map || !map.lMap || typeof L === "undefined" || !L.Control) {
            return null;
          }
          if (!map.lMap._controlCorners.topcenter && map.lMap._controlContainer) {
            var corner = L.DomUtil.create(
              "div",
              "leaflet-top leaflet-center leaflet-top-center",
              map.lMap._controlContainer
            );
            corner.setAttribute("aria-hidden", "true");
            map.lMap._controlCorners.topcenter = corner;
          }
          if (!map.lMap._controlCorners.topcenter) {
            return null;
          }
          var Ctl = L.Control.extend({
            options: { position: "topcenter" },
            onAdd: function () {
              var div = L.DomUtil.create("div", "leaflet-edit-progress");
              div.setAttribute("role", "status");
              div.innerHTML = '<span class="leaflet-edit-progress-spinner"></span><span class="leaflet-edit-progress-text"></span>';
              loadingStylePill(div, "100%");
              try {
                L.DomEvent.disableClickPropagation(div);
              } catch (eProp) {}
              return div;
            },
          });
          var ctl = new Ctl();
          map.lMap.addControl(ctl);
          return ctl.getContainer() || null;
        } catch (err) {
          return null;
        }
      }
      function loadingElement() {
        if (loadingState.el && loadingState.el.parentNode) {
          return loadingState.el;
        }
        var el = loadingEnsureControl();
        if (el) {
          loadingState.el = el;
          return el;
        }
        // Repli (moteurs très anciens) : <div> absolu à la racine du
        // conteneur de carte.
        try {
          var container = map.lMap.getContainer();
          var legacy = document.createElement("div");
          legacy.className = "leaflet-edit-progress leaflet-edit-progress-legacy";
          legacy.setAttribute("role", "status");
          legacy.innerHTML = '<span class="leaflet-edit-progress-spinner"></span><span class="leaflet-edit-progress-text"></span>';
          loadingStylePill(legacy, "58px");
          container.appendChild(legacy);
          loadingState.el = legacy;
        } catch (e) {}
        return loadingState.el;
      }
      // Affiche la pastille en laissant le navigateur peindre AVANT le
      // parsing GeoJSON synchrone (qui bloque le thread principal sur les
      // gros volumes : sans ce délai, certains navigateurs mobiles ne
      // peignent jamais la pastille).
      function loadingPaint(el) {
        var show = function () {
          try {
            // Garde : si le chargement est terminé entre-temps (le minuteur
            // de masquage a déjà consommé l'affichage), ne PAS ré-afficher
            // la pastille — sinon elle reste bloquée visible, aucun minuteur
            // ne venant plus la retirer (constaté sur Samsung Internet où le
            // parsing GeoJSON retarde le rAF au-delà du masquage).
            if (loadingState.pending <= 0 || loadingState.el !== el) {
              return;
            }
            el.classList.add("visible");
            // Affichage piloté en INLINE (pas seulement par la classe) : le
            // masquage/affichage fonctionne même avec un CSS périmé en cache.
            try {
              el.style.display = "block";
            } catch (eDisp) {}
            // Force un reflow : sur certains navigateurs mobiles (dont
            // Samsung Internet) l'ajout de classe au milieu du premier
            // chargement peut sinon rater son paint initial.
            try {
              void el.offsetWidth;
            } catch (e3) {}
          } catch (e2) {}
        };
        try {
          if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
            window.requestAnimationFrame(function () {
              try {
                window.requestAnimationFrame(show);
              } catch (eRaf) {
                show();
              }
            });
            return;
          }
        } catch (err) {}
        show();
      }
      function loadingRender() {
        try {
          var el = loadingElement();
          if (!el) {
            return;
          }
          var n = Object.keys(bboxState.loadedIds).length;
          var txt = el.querySelector(".leaflet-edit-progress-text");
          if (txt) {
            txt.textContent = "Chargement des données… " + n + " élément" + (n > 1 ? "s" : "");
          }
          if (loadingState.pending > 0) {
            if (loadingState.hideTimer) {
              clearTimeout(loadingState.hideTimer);
              loadingState.hideTimer = null;
            }
            if (!loadingState.shownAt) {
              loadingState.shownAt = Date.now();
            }
            var isVisible = false;
            try {
              isVisible = !!((el.classList && el.classList.contains("visible")) || el.style.display === "block");
            } catch (eVis) {}
            if (!isVisible) {
              loadingPaint(el);
            } else {
              try {
                void el.offsetWidth;
              } catch (e3) {}
            }
          } else if (!loadingState.hideTimer) {
            // Anti-scintillement entre 2 pages + durée minimale
            // d'affichage (la pastille ne disparaît jamais avant
            // LE_LOADING_MIN_MS, même sur chargement éclair).
            var elapsed = loadingState.shownAt ? Date.now() - loadingState.shownAt : LE_LOADING_MIN_MS;
            var wait = Math.max(400, LE_LOADING_MIN_MS - elapsed);
            loadingState.hideTimer = setTimeout(function () {
              loadingState.hideTimer = null;
              try {
                if (loadingState.pending === 0 && loadingState.el) {
                  loadingState.el.classList.remove("visible");
                  try {
                    loadingState.el.style.display = "none";
                  } catch (e5) {}
                }
                loadingState.shownAt = 0;
              } catch (e2) {}
            }, wait);
          }
        } catch (err) {}
      }
      function loadingStart() {
        loadingState.pending++;
        loadingRender();
      }
      function loadingTick() {
        loadingRender();
      }
      function loadingDone() {
        loadingState.pending = Math.max(0, loadingState.pending - 1);
        loadingRender();
      }

      function bboxUrl(base, bounds, page) {
        var b = bounds.getWest() + "," + bounds.getSouth() + "," + bounds.getEast() + "," + bounds.getNorth();
        return base + "?bbox=" + b + "&page=" + (page || 0);
      }

      function applyFeatureStyle(layer, feature, isBackground) {
        var style = (feature && feature.style) || null;
        if (typeof style === "string") {
          try {
            style = JSON.parse(style);
          } catch (e) {
            style = null;
          }
        }
        if (isBackground) {
          // Canvas non éditable : style direct (le Canvas ignore className
          // et les dash complexes selon navigateurs : on reste sobre).
          try {
            layer.setStyle(Object.assign({ color: "#6c757d", weight: 3, opacity: 0.9 }, style || {}));
          } catch (e) {}
          return;
        }
        // SVG éditable : classe commune (rendu identique, surcharge CSS
        // possible) + style par entité quand servi par le backend.
        try {
          layer.options = layer.options || {};
          var prev = layer.options.className || "";
          if (prev.indexOf(TRACE_PERF_CLASS) === -1) {
            layer.options.className = (prev ? prev + " " : "") + TRACE_PERF_CLASS;
          }
          if (layer._path && layer._path.classList) {
            layer._path.classList.add(TRACE_PERF_CLASS);
          }
        } catch (e) {}
        if (style && typeof style === "object") {
          try {
            layer.setStyle(style);
            return;
          } catch (e) {}
        }
        try {
          layer.setStyle({ color: "red", weight: 5 });
        } catch (e) {}
      }

      /**
       * Descripteurs par partie d'un fond fusionné (données pures, sans L).
       *
       * Chaque ligne du MultiLineString reçoit son label et son style issus
       * des tableaux parallèles (_part_labels, _part_palette/_part_styles,
       * alignés sur l'ordre des parties). Retourne null si non découpable
       * (pas de labels, longueurs incohérentes…) : repli couche unique.
       */
      function backgroundPartDescriptors(feat, tid) {
        try {
          var props = (feat && feat.properties) || {};
          var labels = props._part_labels;
          var geom = (feat && feat.geometry) || {};
          if (!Array.isArray(labels) || labels.length === 0 ||
              geom.type !== "MultiLineString" || !Array.isArray(geom.coordinates) ||
              geom.coordinates.length !== labels.length) {
            return null;
          }
          var base = (feat && feat.style) || {};
          if (typeof base === "string") {
            try { base = JSON.parse(base); } catch (e) { base = {}; }
          }
          if (!base || typeof base !== "object") {
            base = {};
          }
          var palette = Array.isArray(props._part_palette) ? props._part_palette : null;
          var styleIdx = Array.isArray(props._part_styles) ? props._part_styles : null;
          var fallbackLabel = traceLabel(feat, tid);
          var out = [];
          for (var i = 0; i < geom.coordinates.length; i++) {
            var line = geom.coordinates[i];
            if (!Array.isArray(line)) {
              continue;
            }
            var latlngs = [];
            for (var j = 0; j < line.length; j++) {
              var p = line[j];
              if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number") {
                latlngs.push([p[1], p[0]]);
              }
            }
            if (latlngs.length < 2) {
              continue;
            }
            var st = { color: "#6c757d", weight: 3, opacity: 0.9 };
            Object.assign(st, base);
            if (palette && styleIdx && styleIdx[i] !== undefined && styleIdx[i] !== null && palette[styleIdx[i]]) {
              // Propriétés Leaflet uniquement (pas le 'label' métier).
              var ps = palette[styleIdx[i]];
              ["color", "weight", "opacity", "dashArray", "dashOffset", "lineCap", "lineJoin", "fill", "fillColor", "fillOpacity"].forEach(function (k) {
                if (ps[k] !== undefined) {
                  st[k] = ps[k];
                }
              });
            }
            var title = labels[i];
            if (title === undefined || title === null || String(title).trim() === "") {
              title = fallbackLabel;
            } else {
              title = String(title);
            }
            out.push({ latlngs: latlngs, style: st, title: title });
          }
          return out.length ? out : null;
        } catch (err) {
          return null;
        }
      }

      /**
       * Popup des couches NON éditables (Canvas) : titre = label, corps =
       * table des attributs inclus (hors clés internes _*).
       */
      function backgroundPopupHtml(label, properties) {
        var props = properties || {};
        var keys = Object.keys(props).filter(function (k) { return k.charAt(0) !== "_"; });
        var esc = function (s) {
          return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
        };
        var html = '<div class="leaflet-edit-background-popup"><strong>' + esc(label || "Fond") + "</strong>";
        if (keys.length) {
          html += '<table style="border-collapse:collapse;margin-top:4px;font-size:12px;"><tbody>';
          keys.forEach(function (k) {
            var v = props[k];
            if (v === undefined || v === null) {
              return;
            }
            html += "<tr><th style='border:1px solid #ddd;padding:2px 6px;background:#f5f5f5;'>" + esc(k) + "</th><td style='border:1px solid #ddd;padding:2px 6px;'>" + esc(String(v)) + "</td></tr>";
          });
          html += "</tbody></table>";
        }
        return html + "</div>";
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

      // Enregistre les parties d'un fond fusionné : UN FeatureGroup (UNE
      // entrée panneau, UNE bounding box) contenant UNE polyline Canvas par
      // ligne, chacune avec son label/style propres (popup individuelle).
      // Les fonds restent non éditables : pas de processLoadedData (pas de
      // milliers de bindings), pas d'indexation fichier par partie.
      function registerBackgroundParts(feat, tid, descs, label, groupName) {
        var parts = [];
        descs.forEach(function (d, i) {
          try {
            var pl = L.polyline(d.latlngs, Object.assign({ renderer: BACKGROUND_RENDERER }, d.style));
            pl.bindPopup(backgroundPopupHtml(d.title, {}));
            pl.defaultOptions = pl.defaultOptions || {};
            pl.defaultOptions.leafletEdit = {
              nid: mapid,
              tid: tid,
              part: i,
              revision_id: (feat.properties && feat.properties._revision_id) || null,
              description: d.title,
              filename: (feat.properties && (feat.properties._source || feat.properties.filename)) || "",
              source_fid: -1,
              _selected: false,
              _updated: false,
            };
            pl.defaultOptions.leafletEdit._editable = false;
            pl.defaultOptions.leafletEdit._renderer = "canvas";
            pl.feature = feat;
            parts.push(pl);
          } catch (e) {}
        });
        if (!parts.length) {
          return;
        }
        var group = L.featureGroup(parts);
        extendInitialBounds(group, false);
        registerTraceLayer(group, tid, label, groupName, true);
      }

      // Ajoute UNE trace comme entrée individuelle du panel, dans son
      // groupe fichier. Les entrées dynamiques passent par addOverlay()
      // pour que la case à cocher affiche/masque la trace.
      // - Traces éditables : active: true + ajout carte AVANT addOverlay,
      //   la case naît cochée (checked = hasLayer), visibles au chargement ;
      // - Fonds (non éditables) : DÉSACTIVÉS par défaut (perf chargement
      //   initial : pas de rendu Canvas lourd), case décochée, couche NON
      //   ajoutée à la carte. Activation via le panel (groupe "Fonds"
      //   placé juste après "Cartes", voir moveFondsAfterCartes). Sans
      //   panel (config dégradée), le fond est ajouté directement car
      //   aucun interrupteur n'est disponible sinon.
      // - groupe fermé par défaut : le hook postPanelUpdate (_update)
      //   referme les groupes de fichiers après chaque reconstruction,
      //   sauf ceux ouverts explicitement par l'utilisateur.
      function registerTraceLayer(value, tid, label, groupName, isBackground) {
        map.leafletEditTraces[tid] = value;
        bboxState.layersById[tid] = value;
        if (isBackground && panel && typeof panel.addOverlay === "function") {
          // Fond désactivé par défaut : surtout PAS d'ajout carte (le
          // rendu Canvas d'un fond de 28 000 lignes coûte cher), entrée
          // décochée. Popup/style déjà branchés : l'activation via le
          // panel fonctionne immédiatement.
          try {
            if (map.lMap.hasLayer(value)) {
              map.lMap.removeLayer(value);
            }
          } catch (err) {}
          try {
            panel.addOverlay({ layer: value, name: label, active: false }, label, groupName);
          } catch (err) {
            console.warn("[leaflet_edit] addOverlay failed for background " + tid, err);
          }
          // Le hook postPanelUpdate (_update) repositionne "Fonds" après
          // "Cartes" et synchronise la case (décochée, couche hors carte).
          return;
        }
        // Trace visible par défaut : ajoutée à la carte AVANT addOverlay
        // pour que la case du panel naisse cochée (checked = hasLayer).
        try {
          if (!map.lMap.hasLayer(value)) {
            value.addTo(map.lMap);
          }
        } catch (err) {}
        // Couche sur la carte : applique les flèches de sens si l'option
        // est active (ne fait rien sinon, ou si le plugin est absent).
        // (Les fonds désactivés n'en ont pas besoin : refreshArrows est
        // de toute façon no-op hors carte.)
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
        // Le hook postPanelUpdate (_update) synchronise la case (cochée,
        // couche sur la carte) et referme le groupe fichier, sauf ceux
        // ouverts explicitement par l'utilisateur.
      }

      // Remonte le groupe "Fonds" en tête des overlays, juste après le
      // groupe "Cartes" (fonds de carte).
      // Contexte : panel-layers tient 2 listes séparées (_baseLayersList
      // pour "Cartes", _overlaysList pour "Infos"/"Fonds"/fichiers) et
      // addOverlay() ajoute chaque nouveau groupe à la FIN des overlays
      // (après les groupes de fichiers traces). Comme _update()
      // reconstruit le DOM à chaque ajout, on rejoue ce déplacement
      // après chaque fond enregistré.
      function moveFondsAfterCartes() {
        try {
          if (!panel || !panel._groups || !panel._overlaysList) {
            return;
          }
          var fonds = panel._groups["Fonds"];
          if (!fonds) {
            return;
          }
          var list = panel._overlaysList;
          if (fonds.parentNode !== list) {
            return;
          }
          if (list.firstChild !== fonds) {
            list.insertBefore(fonds, list.firstChild);
          }
        } catch (err) {}
      }

      // Cumule une emprise SANS jamais partager l'instance : chaque variable
      // garde son propre objet (sinon bounds/boundsAll aliasés muteraient
      // ensemble et les fonds pollueraient le cadrage des visibles).
      function accumulateBound(current, b) {
        var fresh = L.latLngBounds(b.getSouthWest(), b.getNorthEast());
        if (current && current.isValid()) {
          return current.extend(fresh);
        }
        return fresh;
      }

      function extendInitialBounds(value, visible) {
        // Emprise cumulée pour le cadrage initial UNIQUEMENT.
        if (bboxState.initialFitDone) {
          return;
        }
        try {
          var b;
          if (value.getLatLngs) {
            b = L.latLngBounds(value.getLatLngs());
          } else if (value.getBounds) {
            // Groupe (fond découpé) : copie neuve (jamais d'alias).
            b = L.latLngBounds(value.getBounds().getSouthWest(), value.getBounds().getNorthEast());
          } else {
            b = L.latLngBounds([value.getLatLng(), value.getLatLng()]);
          }
          if (!b || !b.isValid()) {
            return;
          }
          // Totalité dans tous les cas (repli si tout est caché).
          map.boundsAll = accumulateBound(map.boundsAll, b);
          // Visibles seuls : les fonds désactivés par défaut (visible ===
          // false) ne cadrent pas le zoom initial.
          if (visible === false) {
            return;
          }
          map.bounds = accumulateBound(map.bounds, b);
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
          // Zoom initial sur les entités visibles ; si tout est caché
          // (ex. carte avec uniquement des fonds désactivés), repli sur
          // la totalité des entités.
          var fit = (map.bounds && map.bounds.isValid()) ? map.bounds : null;
          if (!fit && map.boundsAll && map.boundsAll.isValid()) {
            fit = map.boundsAll;
          }
          // Diagnostic console (F12) : quelle emprise a servi au cadrage.
          try {
            console.debug("[leaflet_edit] initial fit:",
              "visibles=" + (map.bounds && map.bounds.isValid() ? map.bounds.toBBoxString() : "∅"),
              "totalité=" + (map.boundsAll && map.boundsAll.isValid() ? map.boundsAll.toBBoxString() : "∅"),
              "retenue=" + (fit ? fit.toBBoxString() : "∅"));
          } catch (e2) {}
          if (fit) {
            map.leafletEditProgrammaticMove = true;
            map.lMap.fitBounds(fit);
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
        // Pastille réservée au chargement initial (silence au zoom/pan).
        if (isInitial) {
          loadingStart();
        }
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
              // Rendu dual : SVG si éditable (trace), Canvas si fond.
              var activeRenderer = isBackground ? BACKGROUND_RENDERER : TRACE_RENDERER;
              var label = traceLabel(feat, tid);
              var groupName = isBackground ? "Fonds" : traceGroupName(feat);
              var sourceFid = isBackground ? -1 : traceSourceFid(feat);
              // Fond fusionné avec labels par ligne : découpe en une
              // polyline Canvas par partie (label/popup individuels),
              // regroupées en UNE entrée panneau (pas d'explosion du menu).
              if (isBackground) {
                var partDescs = backgroundPartDescriptors(feat, tid);
                if (partDescs) {
                  registerBackgroundParts(feat, tid, partDescs, label, groupName);
                  return;
                }
              }
              var sub = L.geoJSON(feat, {
                renderer: activeRenderer,
                style: function (f) {
                  // Style initial (affiné par applyFeatureStyle ci-dessous).
                  var s = (f && f.style) || feat.style || {};
                  if (typeof s === "string") {
                    try { s = JSON.parse(s); } catch (e) { s = {}; }
                  }
                  if (isBackground) {
                    return Object.assign({ color: "#6c757d", weight: 3 }, s);
                  }
                  s.className = s.className || TRACE_PERF_CLASS;
                  return s;
                },
                pointToLayer: function (f, latlng) {
                  if (isBackground) {
                    return L.circleMarker(latlng, { renderer: activeRenderer });
                  }
                  return L.circleMarker(latlng, { renderer: activeRenderer, className: TRACE_PERF_CLASS });
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
                // Indique le moteur au reste du JS métier (édition interdite
                // sur Canvas/fonds).
                value.defaultOptions.leafletEdit._editable = !isBackground;
                value.defaultOptions.leafletEdit._renderer = isBackground ? "canvas" : "svg";
                applyFeatureStyle(value, feat, isBackground);
                if (isBackground) {
                  // Fond non éditable (Canvas) : popup au clic avec label +
                  // attributs inclus (pas de tooltip permanent, pas
                  // d'édition, pas de processLoadedData).
                  try {
                    value.bindPopup(backgroundPopupHtml(label, feat.properties || {}));
                  } catch (e) {}
                }
                else {
                  // Trace éditable (SVG) : tooltip + branchement édition.
                  if (label) {
                    value.bindTooltip(label, { sticky: true });
                  }
                  processLoadedData(value);
                  indexTraceFile(tid, sourceFid, groupName);
                }
                // Visible par défaut sauf fond désactivé (même règle que
                // registerTraceLayer) : le zoom initial ne cadre que les
                // entités visibles.
                var visibleByDefault = !isBackground || !panel || typeof panel.addOverlay !== "function";
                extendInitialBounds(value, visibleByDefault);
                registerTraceLayer(value, tid, label, groupName, isBackground);
              });
            });
            // Compteur d'éléments chargés pour la pastille (initial seul).
            if (isInitial) {
              loadingTick();
            }
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
              // La page suivante a démarré son propre compteur : on solde
              // celui de la page courante (initial seul).
              if (isInitial) {
                loadingDone();
              }
            } else {
              if (isBackground) {
                bboxState.pendingBackground = false;
              } else {
                bboxState.pendingTraces = false;
              }
              // Cadrage initial une fois les 2 flux terminés.
              maybeInitialFit();
              if (isInitial) {
                loadingDone();
              }
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
            if (isInitial) {
              loadingDone();
            }
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
        // Crée la pastille AVANT le premier chargement (contrôle Leaflet
        // natif : seul rendu fiable sur Samsung Internet, voir
        // loadingEnsureControl).
        loadingElement();
        // Expose l'état pour diagnostic à distance (console) si besoin.
        try {
          window.leafletEditLoading = loadingState;
        } catch (eDbg) {}
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
