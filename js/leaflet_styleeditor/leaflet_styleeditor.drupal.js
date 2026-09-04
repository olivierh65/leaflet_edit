/**
 * We are overriding the adding features functionality of the Leaflet module.
 */

(function ($, Drupal, drupalSettings) {
  console.log("init StyleEditor_");
  $(document).on("leafletMapInit", function (e, settings, lMap, mapid) {
    console.log ("event  style editor");
    var editSettings = (drupalSettings[mapid] && drupalSettings[mapid].leaflet_edit) || {};
    if ((editSettings.styleeditor) && (editSettings.styleeditor.control)) {
      lMap.addControl(
        L.control.styleEditor({
          position: editSettings.styleeditor.position,
        })
      );
    }
  });
})(jQuery, Drupal, drupalSettings);
