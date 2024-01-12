/**
 * We are overriding the adding features functionality of the Leaflet module.
 */

(function ($, Drupal, drupalSettings) {
            $(document).on('leafletMapInit', function(e, settings, lMap, mapid) {
                console.log ("Init geoman_");
                if ((drupalSettings.leaflet_edit.geoman) && (drupalSettings.leaflet_edit.geoman.control))  {
                    L.PM.reInitLayer(lMap);

                    lMap.pm.addControls({
                        'position': drupalSettings.leaflet_edit.geoman.position,
                        'drawMarker': drupalSettings.leaflet_edit.geoman.options['drawMarker'] == 0 ? false : true,
                        'drawCircleMarker': drupalSettings.leaflet_edit.geoman.options['drawCircleMarker'] == 0 ? false : true,
                        'drawPolyline': drupalSettings.leaflet_edit.geoman.options['drawPolyline'] == 0 ? false : true,
                        'drawRectangle': drupalSettings.leaflet_edit.geoman.options['drawRectangle'] == 0 ? false : true,
                        'drawPolygon': drupalSettings.leaflet_edit.geoman.options['drawPolygon'] == 0 ? false : true,
                        'drawCircle': drupalSettings.leaflet_edit.geoman.options['drawCircle'] == 0 ? false : true,
                        'drawText': drupalSettings.leaflet_edit.geoman.options['drawText'] == 0 ? false : true,
                        'editMode': drupalSettings.leaflet_edit.geoman.options['editMode'] == 0 ? false : true,
                        'dragMode': drupalSettings.leaflet_edit.geoman.options['dragMode'] == 0 ? false : true,
                        'cutPolygon': drupalSettings.leaflet_edit.geoman.options['cutPolygon'] == 0 ? false : true,
                        'removalMode': drupalSettings.leaflet_edit.geoman.options['removalMode'] == 0 ? false : true,
                        'rotateMode': drupalSettings.leaflet_edit.geoman.options['rotateMode'] == 0 ? false : true,
                        'oneBlock': drupalSettings.leaflet_edit.geoman.options['oneBlock'] == 0 ? false : true,
                        'drawControls': drupalSettings.leaflet_edit.geoman.options['drawControls'] == 0 ? false : true,
                        'editControls': drupalSettings.leaflet_edit.geoman.options['editControls'] == 0 ? false : true,
                        'customControls': drupalSettings.leaflet_edit.geoman.options['customControls'] == 0 ? false : true,
                    });
                }
            })
}(jQuery, Drupal, drupalSettings));
