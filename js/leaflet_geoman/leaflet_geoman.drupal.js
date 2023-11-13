/**
 * We are overriding the adding features functionality of the Leaflet module.
 */

(function ($, Drupal, drupalSettings) {
            $(document).on('leafletMapInit', function(e, settings, lMap, mapid) {
                console.log ("Init geoman_");
                if ((drupalSettings.leafletedit.geoman) && (drupalSettings.leafletedit.geoman.control))  {
                    L.PM.reInitLayer(lMap);

                    lMap.pm.addControls({
                        'position': drupalSettings.leafletedit.geoman.position,
                        'drawMarker': drupalSettings.leafletedit.geoman.options['drawMarker'] == 0 ? false : true,
                        'drawCircleMarker': drupalSettings.leafletedit.geoman.options['drawCircleMarker'] == 0 ? false : true,
                        'drawPolyline': drupalSettings.leafletedit.geoman.options['drawPolyline'] == 0 ? false : true,
                        'drawRectangle': drupalSettings.leafletedit.geoman.options['drawRectangle'] == 0 ? false : true,
                        'drawPolygon': drupalSettings.leafletedit.geoman.options['drawPolygon'] == 0 ? false : true,
                        'drawCircle': drupalSettings.leafletedit.geoman.options['drawCircle'] == 0 ? false : true,
                        'editMode': drupalSettings.leafletedit.geoman.options['editMode'] == 0 ? false : true,
                        'dragMode': drupalSettings.leafletedit.geoman.options['dragMode'] == 0 ? false : true,
                        'cutPolygon': drupalSettings.leafletedit.geoman.options['cutPolygon'] == 0 ? false : true,
                        'removalMode': drupalSettings.leafletedit.geoman.options['removalMode'] == 0 ? false : true,
                        'rotateMode': drupalSettings.leafletedit.geoman.options['rotateMode'] == 0 ? false : true,
                        'oneBlock': drupalSettings.leafletedit.geoman.options['oneBlock'] == 0 ? false : true,
                        'drawControls': drupalSettings.leafletedit.geoman.options['drawControls'] == 0 ? false : true,
                        'editControls': drupalSettings.leafletedit.geoman.options['editControls'] == 0 ? false : true,
                        'customControls': drupalSettings.leafletedit.geoman.options['customControls'] == 0 ? false : true,
                    });
                }
            })
}(jQuery, Drupal, drupalSettings));
