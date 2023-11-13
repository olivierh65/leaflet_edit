(function ($, Drupal, drupalSettings) {

  $(document).one("leafletMapInit", function (e, initial, self) {
    // if ((drupalSettings.leaflet_plugins.ajax) && (drupalSettings.leaflet_plugins.ajax.control)) {
    console.log("Leafmap Edit");
    // azerty
    mapid = initial.id;
    map = Drupal.Leaflet[mapid];


    /// Load layers
    map.bounds=null;
    var layerControl = L.control.layers().addTo(map.lMap);

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

    var geojsonLayer = new L.GeoJSON.AJAX(
      "/sites/default/files/public/2022-01/zoncommuni.geojson",
      {
        "onEachFeature": geojson_onEachFeature,
        "style": chemin_style,
      }) /* .on('data:loaded', function () {
        if (map.bounds) {
          map.bounds.extend(geojsonLayer.getBounds());
        }
        else {
          map.bounds=geojsonLayer.getBounds();
        }
        self.fitBounds(map.bounds);
      }) *//* ;
    panel.addOverlay({ 'layer': geojsonLayer }, 'Chemins', 'Infos');
    map.lMap.addControl(panel); */
      layerControl.addOverlay(geojsonLayer, 'Chemins');

    /* panel_traces = L.control.panelLayers();
    map.lMap.addControl(panel_traces); */

    drupalSettings[mapid].features_url.forEach(function add(feature) {
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
      layerControl.addOverlay(lay, feature.titre);

    });
  });
})(jQuery, Drupal, drupalSettings);
