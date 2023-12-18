(function ($, Drupal, drupalSettings) {
  $(document).one("leafletMapInit", function (e, initial, self) {
    // if ((drupalSettings.leaflet_plugins.ajax) && (drupalSettings.leaflet_plugins.ajax.control)) {
    console.log("Leafmap Edit");
    // azerty
    mapid = initial.id;
    map = Drupal.Leaflet[mapid];

    ////

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

    /// Init Toolbar
    /* A sub-action which completes as soon as it is activated.
     * Sub-actions receive their parent action as an argument to
     * their `initialize` function. We save a reference to this
     * parent action so we can disable it as soon as the sub-action
     * completes.
     */
    try {
      var ImmediateSubAction = L.Toolbar2.Action.extend({
        initialize: function (map, myAction) {
          this.map = map;
          this.myAction = myAction;
          L.Toolbar2.Action.prototype.initialize.call(this);
        },
        addHooks: function () {
          this.myAction.disable();
        },
      });
      var World = ImmediateSubAction.extend({
        options: {
          toolbarIcon: {
            html: "World",
            tooltip: "See the whole world",
          },
        },
        addHooks: function () {
          this.map.setView([0, 0], 0);
          ImmediateSubAction.prototype.addHooks.call(this);
        },
      });
      var Eiffel = ImmediateSubAction.extend({
        options: {
          toolbarIcon: {
            html: "Eiffel Tower",
            tooltip: "Go to the Eiffel Tower",
          },
        },
        addHooks: function () {
          this.map.setView([48.85815, 2.2942], 19);
          ImmediateSubAction.prototype.addHooks.call(this);
        },
      });
      var Cancel = ImmediateSubAction.extend({
        options: {
          toolbarIcon: {
            html: '<i class="fa fa-times"></i>',
            tooltip: "Cancel",
          },
        },
      });
      var MyCustomAction = L.Toolbar2.Action.extend({
        options: {
          toolbarIcon: {
            className: "fa fa-eye",
          },
          /* Use L.Toolbar2 for sub-toolbars. A sub-toolbar is,
           * by definition, contained inside another toolbar, so it
           * doesn't need the additional styling and behavior of a
           * L.Toolbar2.Control or L.Toolbar2.Popup.
           */
          subToolbar: new L.Toolbar2({
            actions: [World, Eiffel, Cancel],
          }),
        },
      });
      new L.Toolbar2.Control({
        position: "topleft",
        actions: [MyCustomAction],
      }).addTo(map.lMap);
    } catch (error) {
      console.error("Toolbar : " + error);
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

    drupalSettings[mapid].features_url.forEach(function add(feature) {
      /*
      $.ajax({url: feature.url})
        .done(function(data, feature) {
          lay= new L.GeoJSON(data, {style: feature.style});
          if (map.bounds ) {
            map.bounds.extend(lay.getBounds());
          }
          else {
            map.bounds=lay.getBounds();
          }
          self.fitBounds(map.bounds);
 */
      /* lay.addEventListener('pm:edit', function() {
            console.log('pm:edit');
            // e.target.updated = true;
          }); */
      /* lay.on('pm:edit', function(e) {
            console.log(e);
            e.target.updated = true;
          }); */
      // panel_traces.addBaseLayer({'layer': lay}, feature.titre, 'Traces_');
      /////  });

      lay = new L.GeoJSON.AJAX(feature.url, {
        // "default_style": feature.style,
        // "onEachFeature": oneach_style,
        style: feature.style,
        mapping: feature.mapping,
      }).on("data:loaded", function () {
        for (k in this._layers) {
          // set global settings
          if (this._layers[k].defaultOptions.style) {
            console.log(this._layers[k].defaultOptions.style);
            this._layers[k].setStyle(
              JSON.parse(this._layers[k].defaultOptions.style)
            );
          } else {
            this._layers[k].setStyle({ color: "red", weight: 5 });
          }

          mappings=JSON.parse(this._layers[k].defaultOptions.mapping);
          if (mappings && this._layers[k].feature.properties) {
            for (let i=0; i < mappings.length; i++) {
              attrib=mappings[i].leaflet_style_mapping.Attribute.attribut;
              console.log('Attrib: ' + attrib);
              if (attrib && attrib.length > 0) {
                attrib_val = mappings[i].leaflet_style_mapping.Attribute.value;
                console.log('Attrib value: ' + attrib_val);
                if (attrib in this._layers[k].feature.properties) {
                  if (this._layers[k].feature.properties[attrib] == attrib_val) {
                    console.log('Set Style ' + mappings[i].leaflet_style_mapping.Style);
                    this._layers[k].setStyle(mappings[i].leaflet_style_mapping.Style);
                    this._layers[k].bindTooltip(attrib_val, {
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

      lay.on("pm:edit", function (e) {
        console.log(e);
        e.target.updated = true;
      });
      // panel.addOverlay({ 'layer': lay }, feature.title, 'Traces');

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
