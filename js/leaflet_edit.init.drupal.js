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
    if (
      drupalSettings.leaflet_edit.geoman &&
      drupalSettings.leaflet_edit.geoman.control &&
      drupalSettings.leaflet_edit.permissions["edit"]
    ) {
      L.PM.reInitLayer(map.lMap);

      map.lMap.pm.addControls({
        position: drupalSettings.leaflet_edit.geoman.position,
        drawMarker:
          drupalSettings.leaflet_edit.geoman.options["drawMarker"] == 0
            ? false
            : true,
        drawCircleMarker:
          drupalSettings.leaflet_edit.geoman.options["drawCircleMarker"] == 0
            ? false
            : true,
        drawPolyline:
          drupalSettings.leaflet_edit.geoman.options["drawPolyline"] == 0
            ? false
            : true,
        drawRectangle:
          drupalSettings.leaflet_edit.geoman.options["drawRectangle"] == 0
            ? false
            : true,
        drawPolygon:
          drupalSettings.leaflet_edit.geoman.options["drawPolygon"] == 0
            ? false
            : true,
        drawCircle:
          drupalSettings.leaflet_edit.geoman.options["drawCircle"] == 0
            ? false
            : true,
        drawText:
          drupalSettings.leaflet_edit.geoman.options["drawText"] == 0
            ? false
            : true,
        editMode:
          drupalSettings.leaflet_edit.geoman.options["editMode"] == 0
            ? false
            : true,
        dragMode:
          drupalSettings.leaflet_edit.geoman.options["dragMode"] == 0
            ? false
            : true,
        cutPolygon:
          drupalSettings.leaflet_edit.geoman.options["cutPolygon"] == 0
            ? false
            : true,
        removalMode:
          drupalSettings.leaflet_edit.geoman.options["removalMode"] == 0
            ? false
            : true,
        rotateMode:
          drupalSettings.leaflet_edit.geoman.options["rotateMode"] == 0
            ? false
            : true,
        oneBlock:
          drupalSettings.leaflet_edit.geoman.options["oneBlock"] == 0
            ? false
            : true,
        drawControls:
          drupalSettings.leaflet_edit.geoman.options["drawControls"] == 0
            ? false
            : true,
        editControls:
          drupalSettings.leaflet_edit.geoman.options["editControls"] == 0
            ? false
            : true,
        customControls:
          drupalSettings.leaflet_edit.geoman.options["customControls"] == 0
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
      drupalSettings.leaflet_edit.locatecontrol &&
      drupalSettings.leaflet_edit.locatecontrol.control
    ) {
      map.lMap.addControl(
        L.control.locate({
          strings: { title: "Où suis-je ???" },
          position: drupalSettings.leaflet_edit.locatecontrol.position
            ? drupalSettings.leaflet_edit.locatecontrol.position
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

    if (drupalSettings.leaflet_edit.permissions["read"]) {
      console.log("Chargement geojson");

      var geojsonLayer = new L.GeoJSON.AJAX(
        "/sites/default/files/public/2022-01/zoncommuni.geojson",
        {
          onEachFeature: geojson_onEachFeature,
          style: chemin_style,
        }
      );

      over_info.push({ layer: geojsonLayer, name: "Chemins" });

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

      drupalSettings[mapid].features_url.forEach(function add(feature) {
        lay = new L.GeoJSON.AJAX(feature.url, {
          style: JSON.parse(feature.style),
          mapping: JSON.parse(feature.mapping),
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
          for (const [lid, value] of Object.entries(this.getLayers())) {
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
          name: feature.description,
          active: true,
        });
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
