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
    if (
      geomanSettings.control &&
      editPermissions["edit"]
    ) {
      L.PM.reInitLayer(map.lMap);

      map.lMap.pm.addControls({
        position: geomanSettings.position,
        drawMarker:
          geomanSettings.options["drawMarker"] == 0
            ? false
            : true,
        drawCircleMarker:
          geomanSettings.options["drawCircleMarker"] == 0
            ? false
            : true,
        drawPolyline:
          geomanSettings.options["drawPolyline"] == 0
            ? false
            : true,
        drawRectangle:
          geomanSettings.options["drawRectangle"] == 0
            ? false
            : true,
        drawPolygon:
          geomanSettings.options["drawPolygon"] == 0
            ? false
            : true,
        drawCircle:
          geomanSettings.options["drawCircle"] == 0
            ? false
            : true,
        drawText:
          geomanSettings.options["drawText"] == 0
            ? false
            : true,
        editMode:
          geomanSettings.options["editMode"] == 0
            ? false
            : true,
        dragMode:
          geomanSettings.options["dragMode"] == 0
            ? false
            : true,
        cutPolygon:
          geomanSettings.options["cutPolygon"] == 0
            ? false
            : true,
        removalMode:
          geomanSettings.options["removalMode"] == 0
            ? false
            : true,
        rotateMode:
          geomanSettings.options["rotateMode"] == 0
            ? false
            : true,
        oneBlock:
          geomanSettings.options["oneBlock"] == 0
            ? false
            : true,
        drawControls:
          geomanSettings.options["drawControls"] == 0
            ? false
            : true,
        editControls:
          geomanSettings.options["editControls"] == 0
            ? false
            : true,
        customControls:
          geomanSettings.options["customControls"] == 0
            ? false
            : true,
      });
      // Add Geoman Custom buttons
      addGeomanCustom();

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

    /// Init StyleEditor
    console.log("event  style editor");
    // if ((drupalSettings.leaflet_edit.styleeditor) && (drupalSettings.leaflet_edit.styleeditor.control)) {
    /* map.lMap.addControl(
      L.control.styleEditor({
        position: drupalSettings.leaflet_edit.styleeditor.position,
      })
    ); */
    // }

    /// Init Notifications
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

    // full  screen
    var fullScreen = new L.control.fullscreen({
      position: "bottomleft", // change the position of the button. It can be topleft, topright,
      //bottomright or bottomleft, defaut topleft
      title: "Show me in full screen !", // change the title of the button, default Full
      //Screen
      titleCancel: "Exit full screen mode", // change the title of the button when
      //fullscreen is on, default Exit Full Screen
      content: null, // change the content of the button, can be HTML, default null
      forceSeparateButton: true, // force seperate button to detach from zoom
      //buttons, default false
      forcePseudoFullscreen: false, // force use of pseudo full screen even if
      //full screen API is available, default false
      fullscreenElement: false, // Dom element to render in full screen, false by
      //default, fallback to map._container
    }).addTo(map.lMap);

    //Locate control
    console.log("event locateconrol");
    if (
      editSettings.locatecontrol &&
      editSettings.locatecontrol.control
    ) {
      map.lMap.addControl(
        L.control.locate({
          strings: { title: "Où suis-je ???" },
          position: editSettings.locatecontrol.position
            ? editSettings.locatecontrol.position
            : "topright",
        })
      );
    }

    // load datas
    map.bounds = null;

    var base = [];
    var over_info = [];
    var over_trace = [];

    if (map.layer_control) {
      for (lay of map.layer_control._layers) {
        if (!lay.overlay) {
          base.push({ layer: lay.layer, name: lay.name });
        } else {
          over_info.push({ layer: lay.layer, name: lay.name });
        }
      }
      map.lMap.removeControl(map.layer_control);
    }

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

    // Slider

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

    //

    if (editPermissions["read"]) {
      console.log("Chargement geojson");
      console.log("[leaflet_edit] mapid =", mapid, "| features_url =", drupalSettings[mapid].features_url);

      var geojsonLayer = null;
      /* var geojsonLayer = new L.GeoJSON.AJAX(
        "/sites/default/files/public/2022-01/zoncommuni.geojson",
        {
          onEachFeature: geojson_onEachFeature,
          style: chemin_style,
        }
      );

      over_info.push({ layer: geojsonLayer, name: "Chemins" }); */

      function oneach_style(feature, layer) {
        style = JSON.parse(layer.defaultOptions.style);
        if (feature.style) {
          if (feature.style.fill) {
            style["color"] = feature.style.fill;
          }
        }
        layer.setStyle(style);
      }

      // Extend selection area
      const canvasRenderer = L.canvas({
        tolerance: 10,
      });

      drupalSettings[mapid].features_url.forEach(function add(feature, idx) {
        console.log("[leaflet_edit] feature #" + idx + " =", JSON.stringify(feature));
        var parsedStyle = null;
        var parsedMapping = null;
        try {
          parsedStyle = JSON.parse(feature.style);
          console.log("[leaflet_edit] feature #" + idx + " style OK, keys =", Object.keys(parsedStyle || {}));
        } catch (e) {
          console.error("[leaflet_edit] feature #" + idx + " style JSON invalide :", feature.style, e);
        }
        try {
          parsedMapping = feature.mapping ? JSON.parse(feature.mapping) : null;
          console.log("[leaflet_edit] feature #" + idx + " mapping OK =", parsedMapping);
        } catch (e) {
          console.error("[leaflet_edit] feature #" + idx + " mapping JSON invalide :", feature.mapping, e);
        }
        console.log("[leaflet_edit] feature #" + idx + " url =", feature.url, "| description =", JSON.stringify(feature.description), "| filename =", feature.filename);
        // Fallback pour le titre : description > filename > "Trace <fid>".
        var traceName = (feature.description && String(feature.description).trim() !== "")
          ? feature.description
          : ((feature.filename && String(feature.filename).trim() !== "")
            ? feature.filename
            : ("Trace " + feature.id));
        if (traceName !== feature.description) {
          console.log("[leaflet_edit] feature #" + idx + " description vide, fallback titre =", JSON.stringify(traceName));
        }
        lay = new L.GeoJSON.AJAX(feature.url, {
          style: parsedStyle,
          mapping: parsedMapping,
          renderer: canvasRenderer,
          distanceMarkers: {
            lazy: true,
            iconSize: null,
            showAll: 14,
            distance: 5000,
          },
          leafletEdit: {
            nid: feature.entity,
            fid: feature.id,
            description: feature.description,
            filename: feature.filename,
            _selected: false,
            _updated: false,
          },
        }).on("data:loaded", function (e) {
          var layers = this.getLayers();
          console.log("[leaflet_edit] data:loaded pour fid =", feature.id, "| nb layers =", layers.length, "| event =", e);
          if (layers.length === 0) {
            console.warn("[leaflet_edit] AUCUNE géométrie chargée pour fid =", feature.id, "url =", feature.url, "— réponse vide ou GeoJSON sans features ?");
          }
          for (const [lid, value] of Object.entries(layers)) {
            processLoadedData(value);
            if (map.bounds && map.bounds.isValid()) {
              map.bounds = map.bounds.extend(
                L.latLngBounds(value.getLatLngs())
              );
            } else {
              map.bounds = L.latLngBounds(value.getLatLngs());
            }
          }

          map.lMap.fitBounds(map.bounds);
        });

        lay.on("data:loading", function () {
          console.log("[leaflet_edit] data:loading fid =", feature.id, "url =", feature.url);
        });
        lay.on("data:progress", function () {
          console.log("[leaflet_edit] data:progress fid =", feature.id);
        });
        lay.on("data:loaderror", function (e) {
          console.error("[leaflet_edit] data:loaderror fid =", feature.id, "url =", feature.url, e);
        });
        lay.on("pm:edit", function (e) {
          evtLayerEdit(e);
        });
        lay.on("pm:update", function (e) {
          evtLayerUpdate(e);
        });
        lay.on("mouseover", function (e) {
          evtLayerMouseover(e);
        });
        lay.on("mouseout", function (e) {
          evtLayerMouseout(e);
        });

        over_trace.push({
          layer: lay,
          name: traceName,
          active: true,
        });
        console.log("[leaflet_edit] entrée panelLayers #" + idx + " name =", JSON.stringify(traceName), "| active = true");
      });
    }

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
        {
          group: "Traces",
          collapsed: false,
          layers: over_trace,
        },
      ],
      {
        collapsed: true,
        compact: true,
        collapsibleGroups: true,
      }
    );

    map.lMap.addControl(panel);
    map.lMap.leafletEdit = {
      LAYGROUP_CONTROL: panel,
    };
  });
})(jQuery, Drupal, drupalSettings);
