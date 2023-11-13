(function ($, Drupal, drupalSettings) {

  Drupal.behaviors.leaflet_edit = {
    attach: function (context, settings) {

      $.each(settings.leafletedit, function (m, data) {
        $('#' + data.mapid, context).each(function () {
          var $container = $(this);
          var mapid = data.mapid;

          // If the attached context contains any leaflet maps, make sure we have a Drupal.GeoJsonLeaflet_widget object.
          if ($container.data('leaflet') === undefined) {
            $container.data('leaflet', new Drupal.GeoJsonLeaflet(L.DomUtil.get(mapid), mapid, data.map));
            if (data.features.length > 0) {

              // Initialize the Drupal.GeoJsonLeaflet.[data.mapid] object,
              // for possible external interaction.
              Drupal.GeoJsonLeaflet[mapid].markers = {};

              // Define the Drupal.GeoJsonLeaflet.path object.
              Drupal.GeoJsonLeaflet[mapid].path = data.map.settings.path && data.map.settings.path.length > 0 ? JSON.parse(data.map.settings.path) : {};

              // Add Leaflet Map Features.
              $container.data('leaflet').add_features(mapid, data.features, true);
            }

            // Add the leaflet map to our settings object to make it accessible.
            // @NOTE: This is used by the Leaflet Widget module.
            data.lMap = $container.data('leaflet').lMap;

          } else {
            // If we already had a map instance, add new features.
            // @TODO Does this work? Needs testing.
            if (data.features !== undefined) {
              $container.data('leaflet').add_features(mapid, data.features);
            }
          }
          // After having initialized the Leaflet Map and added features,
          // allow other modules to get access to it via trigger.
          // NOTE: don't change this trigger arguments print, for back porting
          // compatibility.
          $(document).trigger('leaflet.map', [data.map, data.lMap, mapid]);

        });
      });
    }
  };

  Drupal.GeoJsonLeaflet = function (container, mapid, map_definition) {
    this.container = container;
    this.mapid = mapid;
    this.map_definition = map_definition;
    this.settings = this.map_definition.settings;
    this.bounds = [];
    this.base_layers = {};
    this.overlays = {};
    this.lMap = null;
    this.start_center = null;
    this.start_zoom = null;
    this.markers = {};
    this.path = {};

    this.initialise(mapid);
  };

  Drupal.GeoJsonLeaflet.prototype.initialise = function (mapid) {
    var self = this;
    // Instantiate a new Leaflet map.
    self.lMap = new L.Map(self.mapid, self.settings);

    // Set the public map object, to make it accessible from outside.
    Drupal.GeoJsonLeaflet[mapid] = {
      lMap: self.lMap,
    };

    // Add map layers (base and overlay layers).
    var layers = {}, overlays = {};
    var i = 0;
    for (var key in self.map_definition.layers) {
      var layer = self.map_definition.layers[key];
      // Distinguish between "base" and "overlay" layers.
      // Default to "base" in case "layer_type" has not been defined in hook_leaflet_map_info().
      layer.layer_type = (typeof layer.layer_type === 'undefined') ? 'base' : layer.layer_type;

      switch (layer.layer_type) {
        default:
          self.add_base_layer(key, layer, i, mapid);
          // Only the first base layer needs to be added to the map - all the
          // others are accessed via the layer switcher.
          if (i === 0) {
            i++;
          }
          break;
      }
      i++;
    }

    // Set initial view, fallback to displaying the whole world.
    if (self.settings.center && self.settings.zoom) {
      self.lMap.setView(new L.LatLng(self.settings.center.lat, self.settings.center.lon), self.settings.zoom);
    } else {
      self.lMap.fitWorld();
    }

    // Add Fullscreen Control, if requested.
    if (self.settings.fullscreen_control) {
      self.lMap.addControl(new L.Control.Fullscreen());
    }
  };

  Drupal.GeoJsonLeaflet.prototype.add_base_layer = function (key, definition, i, mapid) {
    var self = this;
    var map_layer = self.create_layer(definition, key);
    self.base_layers[key] = map_layer;
    // Only the first base layer needs to be added to the map - all the others are accessed via the layer switcher.
    if (i === 0) {
      self.lMap.addLayer(map_layer);
    }
    Drupal.GeoJsonLeaflet[mapid].base_layers = self.base_layers;
  };

  Drupal.GeoJsonLeaflet.prototype.create_layer = function (layer, key) {
    var self = this;
    var map_layer = new L.TileLayer(layer.urlTemplate);
    map_layer._leaflet_id = key;

    if (layer.options) {
      for (var option in layer.options) {
        map_layer.options[option] = layer.options[option];
      }
    }

    return map_layer;
  };

  Drupal.GeoJsonLeaflet.prototype.add_features = function (mapid, features, initial) {
    var self = this;
    for (var i = 0; i < features.length; i++) {
      var feature = features[i];
      var lFeature;

      lFeature = self.create_geojson_feature(feature);
      if (lFeature !== undefined) {

        // fitbound has to be called as soon as the async geojson data is loaded.
        lFeature.on('data:loaded', function () {
          self.fitbounds(mapid);
        }.bind(this));

        /* if (lFeature.setStyle) {
          lFeature.setStyle(Drupal.Leaflet[mapid].path);
        } */
        self.lMap.addLayer(lFeature);
      }
      // Allow others to do something with the feature that was just added to the map.
      $(document).trigger('geojsonleaflet.feature', [lFeature, feature, self]);
    }

    // Allow plugins to do things after features have been added.
    $(document).trigger('geojsonleaflet.features', [initial || false, self])
  };

  Drupal.GeoJsonLeaflet.prototype.create_geojson_feature = function (feature) {
    var self = this;
    // This is the key of the whole file. Instead of loading embedded json, we load the GeoJSON by url async.
    return L.geoJson.ajax(feature.url, {
      onEachFeature: function (feature, layer) {
        self.process_feature(feature, layer, self);
      }.bind(this)
    });
  };

  Drupal.GeoJsonLeaflet.prototype.process_feature = function (feature, layer, self) {
    if (layer._layers) {
      for (var layer_id in layer._layers) {
        for (var i in layer._layers[layer_id]._latlngs) {
          self.bounds.push(layer._layers[layer_id]._latlngs[i]);
        }
      }
    } else if (layer._latlngs) {
      for (var i in layer._latlngs) {
        self.bounds.push(layer._latlngs[i]);
      }
    }

    if (feature.properties.style) {
      layer.setStyle(feature.properties.style);
    }
  };

  // Set Map position, fitting Bounds in case of more than one feature.
  // @NOTE: This method used by Leaflet Markecluster module (don't remove/rename)
  Drupal.GeoJsonLeaflet.prototype.fitbounds = function (mapid) {
    var self = this;
    // Fit Bounds if both them and features exist, and the Map Position in not forced.
    if (!self.settings.map_position_force && self.bounds.length > 0) {
      Drupal.GeoJsonLeaflet[mapid].lMap.fitBounds(new L.LatLngBounds(self.bounds));
    }
  };

})(jQuery, Drupal, drupalSettings);
