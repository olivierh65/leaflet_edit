(function ($, Drupal, drupalSettings) {
  $(document).one("leafletMapInit", function (e, initial, self) {
    // if ((drupalSettings.leaflet_plugins.ajax) && (drupalSettings.leaflet_plugins.ajax.control)) {
    console.log("Leafmap Edit");
    // azerty
    mapid = initial.id;
    map = Drupal.Leaflet[mapid];

    ////
    // track contetmenu relatedTarget
    evtMenuShow ();
    ////

    if (map.lMap.zoomControl) {
      // Remove existing zoomControl
      map.lMap.zoomControl.remove();
    }
    var menu_outils = new L.cascadeButtons(
      [
        {
          icon: "fa-solid fa-bars",
          title: "Menu outils",
          items: [
            {
              icon: "fa-regular fa-floppy-disk",
              title: "Save",
              command: () => {
                button_save(this);
              },
            },
            {
              icon: "fa-solid fa-file-export",
              title: "Export to GPX",
              command: () => {
                console.log("hola");
              },
            },
            {
              icon: "fas fa-globe",
              title: "Pas utilisé",
              command: () => {
                console.log("hola");
              },
            },
          ],
        },
      ],
      { position: "topleft", direction: "horizontal" }
    ).addTo(map.lMap);

    function close_menu(e) {
      Array.from(e.getElementsByTagName("button")).forEach((child, index) => {
        if (index !== 0) child.classList.toggle("hidden");
      });
      mainButton = e.getElementsByTagName("button").item(0);
      const isAriaExpanded = JSON.parse(
        mainButton.getAttribute("aria-expanded")
      );
      mainButton.setAttribute("aria-expanded", !isAriaExpanded);
    }

    function button_save(e) {
      close_menu(menu_outils.getContainer());
      a = menu_outils;
      L.control
        .window(map.lMap, {
          title: "Hello world!",
          content: "This is my first control window.",
          modal: true,
        })
        .prompt({
          callback: function () {
            alert("This is called after OK click!");
          },
          buttonCancel: "Annuler",
          buttonOK: "Sauver",
        })
        .show();
    }

    /// Init StyleEditor
    console.log("event  style editor");
    // if ((drupalSettings.leafletedit.styleeditor) && (drupalSettings.leafletedit.styleeditor.control)) {
    map.lMap.addControl(
      L.control.styleEditor({
        position: drupalSettings.leafletedit.styleeditor.position,
      })
    );
    // }



    /// Init Notifications
    try {
      var notification = L.control
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

   
    // Dialog
    var dialog = new L.control.dialog({
      size: [300, 300],
      minSize: [100, 100],
      maxSize: [350, 350],
      anchor: [50, 50],
      position: "topleft",
      initOpen: false,
    });
    dialog
      .setContent("<p>Hello! Welcome to your nice new dialog box!</p>")
      .addTo(map.lMap);

    // leaflet.control-window
    //var win =  L.control.window(map.lMap,{title:'Hello world!',content:'This is my first control window.'})
    //       .show();

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
      forcePseudoFullscreen: true, // force use of pseudo full screen even if
      //full screen API is available, default false
      fullscreenElement: false, // Dom element to render in full screen, false by
      //default, fallback to map._container
    }).addTo(map.lMap);

    /// Load layers
    panel = L.control.panelLayers(null, null, {
      collapsed: true,
      compact: true,
      collapsibleGroups: true,
    });
    map.bounds = null;

    var base = [];
    var over_info = [];
    var over_trace = [];

    if (map.layer_control) {
      for (lay of map.layer_control._layers) {
        if (!lay.overlay) {
          // panel.addBaseLayer({ 'layer': lay.layer }, lay.name, 'Cartes');
          base.push({ layer: lay.layer, name: lay.name });
        } else {
          // panel.addOverlay({ 'layer': lay.layer }, lay.name, 'Infos');
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

    console.log("Chargement geojson");
    /*     $.ajax({url: "/sites/default/files/public/2022-01/zoncommuni.geojson"})
        .done(function(data, feature) {
          lay= new L.GeoJSON(data, {
            style: chemin_style,
            "onEachFeature": geojson_onEachFeature,});
          // panel.addOverlay({ 'layer': lay }, 'Chemins', 'Infos');
          over_trace.push({ 'layer': lay, 'name': 'Chemins'})
        }); */

    var geojsonLayer = new L.GeoJSON.AJAX(
      "/sites/default/files/public/2022-01/zoncommuni.geojson",
      {
        onEachFeature: geojson_onEachFeature,
        style: chemin_style,
      }
    );

    /* panel.addOverlay({ 'layer': geojsonLayer }, 'Chemins', 'Infos'); */

    over_info.push({ layer: geojsonLayer, name: "Chemins" });

    // panel_traces = L.control.panelLayers();
    // map.lMap.addControl(panel_traces);

    function oneach_style(feature, layer) {
      style = JSON.parse(layer.defaultOptions.style);
      if (feature.style) {
        if (feature.style.fill) {
          style["color"] = feature.style.fill;
        }
      }
      layer.setStyle(style);
    }

    function geojson_style(feature, default_style) {
      style = JSON.parse(default_style);
      if (feature.style) {
        if (feature.style.fill) {
          style["color"] = feature.style.fill;
        }
      }
      return style;
    }

    // Extend selection area
    const canvasRenderer = L.canvas({
      tolerance: 5
    });

    drupalSettings[mapid].features_url.forEach(function add(feature) {
      lay = new L.GeoJSON.AJAX(feature.url, {
        // "default_style": feature.style,
        // "onEachFeature": oneach_style,
        style: feature.style,
        mapping: feature.mapping,
        renderer: canvasRenderer,
        distanceMarkers: { lazy: true, iconSize: null, showAll: 14, distance: 5000 },
      }).on("data:loaded", function () {
        for (feat in this._layers) {
          // Add context menu
          this._layers[feat].bindContextMenu(defineContextMenu());
          // Add hide event to close popup
          this._layers[feat]._map.contextmenu.addHooks();
          this._layers[feat]._map.on('contextmenu.show', function (e) {
            evtContextShow(e);
          });

          this._layers[feat].on("click", function (e) {
            evtFeatureClick(e);
          });
          // add variables
          this._layers[feat].selected=false;
          this._layers[feat].updated=false;

          // set global settings
          if (this._layers[feat].defaultOptions.style) {
            console.log("Style global");
            this._layers[feat].setStyle(
              JSON.parse(this._layers[feat].defaultOptions.style)
            );
          } else {
            console.log("Pas de Style global!!!");
            this._layers[feat].setStyle({ color: "red", weight: 5 });
          }

          mappings = JSON.parse(this._layers[feat].defaultOptions.mapping);
          if (mappings && this._layers[feat].feature.properties) {
            for (let i = 0; i < mappings.length; i++) {
              attrib = mappings[i].leaflet_style_mapping.Attribute.attribut;
              console.log("Attrib: " + attrib);
              if (attrib && attrib.length > 0) {
                attrib_val = mappings[i].leaflet_style_mapping.Attribute.value;
                console.log("Attrib value: " + attrib_val);
                if (attrib in this._layers[feat].feature.properties) {
                  if (
                    this._layers[feat].feature.properties[attrib] == attrib_val
                  ) {
                    console.log(
                      "Set Style " + mappings[i].leaflet_style_mapping.Style
                    );
                    this._layers[feat].setStyle(
                      mappings[i].leaflet_style_mapping.Style
                    );
                    this._layers[feat].bindTooltip(attrib_val, {
                      sticky: true,
                    });
                  }
                }
              }
            }
          }
        }

        if (map.bounds) {
          map.bounds.extend(lay.getBounds());
        } else {
          map.bounds = lay.getBounds();
        }
        self.fitBounds(map.bounds);
      });

      lay.on("pm:edit", function(e) {
         evtLayerEdit(e);
      });
      lay.on("pm:update", function(e) {
        evtLayerUpdate(e);
      });
      lay.on('mouseover', function(e) {
        evtLayerMouseover(e);
      });
      lay.on('mouseout', function (e) {
        evtLayerMouseout(e);
      });

      over_trace.push({ layer: lay, name: feature.description, active: true });
    });

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
  });
})(jQuery, Drupal, drupalSettings);
