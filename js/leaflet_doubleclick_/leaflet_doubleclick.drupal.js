/**
 * We are overriding the adding features functionality of the Leaflet module.
 */

(function ($, Drupal, drupalSettings) {
    console.log('Init Double Click_');
    $(document).on("leafletMapInit", function (e, settings, lMap, mapid) {
        console.log ("event doubleclick");
        // disable doubleclick Zoom
        lMap.doubleClickZoom.disable();
        lMap.on("dblclick", function (e) {
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
            ).openOn(lMap);
        });
  });
})(jQuery, Drupal, drupalSettings);
