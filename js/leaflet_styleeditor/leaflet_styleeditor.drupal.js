/**
 * We are overriding the adding features functionality of the Leaflet module.
 */

(function ($, Drupal, drupalSettings) {
  console.log("init StyleEditor_");
  $(document).on("leafletMapInit", function (e, settings, lMap, mapid) {
    console.log ("event  style editor");
    if ((drupalSettings.leaflet_edit.styleeditor) && (drupalSettings.leaflet_edit.styleeditor.control)) {
      lMap.addControl(
        L.control.styleEditor({
          position: drupalSettings.leaflet_edit.styleeditor.position,
        })
      );
    }
  });
})(jQuery, Drupal, drupalSettings);
