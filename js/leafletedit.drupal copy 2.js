(function ($, Drupal, drupalSettings) {

  $(document).one("leafletMapInit", function (e, initial, self) {
    // if ((drupalSettings.leaflet_plugins.ajax) && (drupalSettings.leaflet_plugins.ajax.control)) {
    console.log("Leafmap Edit");
    // azerty
    mapid = initial.id;
    map = Drupal.Leaflet[mapid];

    /////
    // Init doubleclick
    console.log("event doubleclick");
    // disable doubleclick Zoom
    map.lMap.doubleClickZoom.disable();
    map.lMap.on("dblclick", function (e) {
      if (!e.originalEvent.shiftKey) {
        return;
      }
      var NorS, EorW;
      var RAWLAT = e.latlng.lat;
      var RAWLONG = e.latlng.lng;
      if (RAWLAT < 0) {
        NorS = "S";
      } else {
        NorS = "N";
      }
      if (RAWLONG < 0) {
        EorW = "W";
      } else {
        EorW = "E";
      }
      var ABSLAT = Math.abs(RAWLAT);
      var ABSLONG = Math.abs(RAWLONG);
      var DEGLAT = Math.floor(ABSLAT);
      var DEGLONG = Math.floor(ABSLONG);
      var MINLAT = ((ABSLAT - DEGLAT) * 60).toFixed(4);
      var ZMINLAT = MINLAT < 10 ? "0" : "";
      var MINLONG = ((ABSLONG - DEGLONG) * 60).toFixed(4);
      var ZMINLONG = MINLONG < 10 ? "0" : "";
      var popup = L.popup().setLatLng(e.latlng).setContent(
        "<b>Location :</b>" +
        DEGLAT + "° " +
        ZMINLAT +
        MINLAT +
        "' " +
        NorS +
        " " +
        DEGLONG +
        "° " +
        ZMINLONG +
        MINLONG +
        "' " +
        EorW +
        "" +
        e.latlng.lat.toFixed(7) +
        ", " +
        e.latlng.lng.toFixed(7)
      ).openOn(map.lMap);
    });

    ////

    /// Init StyleEditor
    console.log("event  style editor");
    if ((drupalSettings.leafletedit.styleeditor) && (drupalSettings.leafletedit.styleeditor.control)) {
      map.lMap.addControl(
        L.control.styleEditor({
          position: drupalSettings.leafletedit.styleeditor.position,
        })
      );
    }

    /// Init Notifications
    try {
      var notification = L.control
        .notifications({
          timeout: 3000,
          position: 'topright',
          closable: true,
          dismissable: true,
        })
        .addTo(map.lMap);
    }
    catch (error) {
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
        }
      });
      var World = ImmediateSubAction.extend({
        options: {
          toolbarIcon: {
            html: 'World',
            tooltip: 'See the whole world'
          }
        },
        addHooks: function () {
          this.map.setView([0, 0], 0);
          ImmediateSubAction.prototype.addHooks.call(this);
        }
      });
      var Eiffel = ImmediateSubAction.extend({
        options: {
          toolbarIcon: {
            html: 'Eiffel Tower',
            tooltip: 'Go to the Eiffel Tower'
          }
        },
        addHooks: function () {
          this.map.setView([48.85815, 2.29420], 19);
          ImmediateSubAction.prototype.addHooks.call(this);
        }
      });
      var Cancel = ImmediateSubAction.extend({
        options: {
          toolbarIcon: {
            html: '<i class="fa fa-times"></i>',
            tooltip: 'Cancel'
          }
        }
      });
      var MyCustomAction = L.Toolbar2.Action.extend({
        options: {
          toolbarIcon: {
            className: 'fa fa-eye',
          },
          /* Use L.Toolbar2 for sub-toolbars. A sub-toolbar is,
           * by definition, contained inside another toolbar, so it
           * doesn't need the additional styling and behavior of a
           * L.Toolbar2.Control or L.Toolbar2.Popup.
           */
          subToolbar: new L.Toolbar2({
            actions: [World, Eiffel, Cancel]
          })
        }
      });
      new L.Toolbar2.Control({
        position: 'topleft',
        actions: [MyCustomAction]
      }).addTo(map.lMap);
    }
    catch (error) {
      console.error("Toolbar : " + error);
    }

    /// Load layers
    panel = L.control.panelLayers();
    map.bounds=null;

    for (lay of map.layer_control._layers) {
      if (!lay.overlay) {
        panel.addBaseLayer({ 'layer': lay.layer }, lay.name, 'Cartes');
      }
      else {
        panel.addOverlay({ 'layer': lay.layer }, lay.name, 'Infos');
      }
    }
    map.lMap.removeControl(map.layer_control);

    function geojson_onEachFeature(feature, layer) {
      // does this feature have a property named popupContent?
      if (feature.properties && feature.properties.TEX) {
        layer.bindPopup(feature.properties.TEX);
      }
    }
    function chemin_style(feature) {
      return {
        "color": "#c0392b",
        "opacity": "0.73",
        "weight": "5",
        "lineCap": "round",
        "dashArray": "15,10,1,10"
      };
    }

    console.log("Chargement geojson");
    $.ajax({url: "/sites/default/files/public/2022-01/zoncommuni.geojson"},
    {
      "onEachFeature": geojson_onEachFeature,
      "style": chemin_style,
    })
        .done(function(data, feature) {
          lay= new L.GeoJSON(data, {style: chemin_style});
          panel.addOverlay({ 'layer': lay }, 'Chemins', 'Infos');
        });
    /* var geojsonLayer = new L.GeoJSON.AJAX(
      "/sites/default/files/public/2022-01/zoncommuni.geojson",
      {
        "onEachFeature": geojson_onEachFeature,
        "style": chemin_style,
      }) *//* .on('data:loaded', function () {
        if (map.bounds) {
          map.bounds.extend(geojsonLayer.getBounds());
        }
        else {
          map.bounds=geojsonLayer.getBounds();
        }
        self.fitBounds(map.bounds);
      }) *//* ;
    panel.addOverlay({ 'layer': geojsonLayer }, 'Chemins', 'Infos'); */
    map.lMap.addControl(panel);

    panel_traces = L.control.panelLayers();
    map.lMap.addControl(panel_traces);
    drupalSettings[mapid].features_url.forEach(function add(feature) {

      /* $.ajax({url: feature.url})
        .done(function(data, feature) {
          lay= new L.GeoJSON(data, {style: feature.style});
          panel_traces.addBaseLayer({'layer': lay}, feature.titre, 'Traces_');
        }); */

      lay = new L.GeoJSON.AJAX(feature.url, {
        style: feature.style,

      }).on('data:loaded', function () {
        if (map.bounds ) {
          map.bounds.extend(lay.getBounds());
        }
        else {
          map.bounds=lay.getBounds();
        }
        self.fitBounds(map.bounds);
      });

      lay.on("pm:edit", (e) => {
        console.log(e);
        e.target.updated = true;
      });
      panel_traces.addBaseLayer({ 'layer': lay }, feature.titre, 'Traces');


    });

    /* drupalSettings[mapid].features_url.forEach(function add(feature) {
      console.log(feature.url);
      lay = new L.GeoJSON.AJAX(feature.url);
      lay.style = feature.style;
      lay.on("pm:edit", (e) => {
        console.log(e);
        e.target.updated = true;
      });

      // self.addLayer(lay);
      $(document).trigger('leaflet_ajax.feature', [lay, drupalSettings.leaflet[mapid]]);
      lay.on('data:loaded', function () {
        self.fitBounds(lay.getBounds());
        lay.setStyle(JSON.parse(lay.style));
      }.bind(this));
    }); */
  });
})(jQuery, Drupal, drupalSettings);
