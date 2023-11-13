(function ($, Drupal, drupalSettings) {

    $(document).one("leafletMapInit", function (e, initial, self) {
    // if ((drupalSettings.leaflet_plugins.ajax) && (drupalSettings.leaflet_plugins.ajax.control)) {
       console.log("Charge zoncomm");
       function geojson_onEachFeature(feature, layer) {
          // does this feature have a property named popupContent?
          if (feature.properties && feature.properties.TEX) {
          layer.bindPopup(feature.properties.TEX);
          }
       }
       function chemin_style (feature) {
          return {"color": "#c0392b",
          "opacity": "0.73",
          "weight": "5",
          "lineCap": "round",
          "dashArray": "15,10,1,10"};
       }

       console.log("Chargement geojson");
       var geojsonLayer = new L.GeoJSON.AJAX(
          "/sites/default/files/public/2022-01/zoncommuni.geojson",
          { "onEachFeature": geojson_onEachFeature,
             "style": chemin_style,
           }
       );
       // geojsonLayer.popup = "Chemins cadastrés";
       geojsonLayer.popup = {'value': "Chemins cadastrés"};
       // geojsonLayer.addTo(self.lMap);
       self.addLayer(geojsonLayer);
       // hide layer
       geojsonLayer.remove();

       // Allow others to do something with the feature that was just added to the map.
       // $(document).trigger("leaflet_ajax.feature", [geojsonLayer, self]);
       // TODO : passer les bons parametres
       $(document).trigger("leaflet.feature", [geojsonLayer, geojsonLayer, Drupal.Leaflet[initial.id]]);
    }
    // }
    );
 })(jQuery, Drupal, drupalSettings);
