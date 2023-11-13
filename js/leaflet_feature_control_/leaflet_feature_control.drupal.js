/**
 * register event to add features
 */


(function ($, Drupal, drupalSettings) {
    console.log('Init Feature Control_');
    $(document).on("leaflet.feature", function (e, lFeature, feature, self) {
        console.log ("event feature control");
        if ( drupalSettings.leafletedit.feature_control &&
        drupalSettings.leafletedit.feature_control.control &&
        !self.track_control
        ) {
        if (
            drupalSettings.leafletedit.feature_control.control == 2 &&
            L.control.appearance
        ) {
            self.track_control = new L.Control.Appearance([], [], [], {
            color: true,
            collapsed: false,
            opacity: false,
            });
        } else {
            self.track_control = new L.Control.Layers();
        }
        self.track_control.setPosition(
            drupalSettings.leafletedit.feature_control.position
        );
        self.lMap.addControl(self.track_control);
        }

        if (drupalSettings.leafletedit.feature_control.control == 2) {
        // addOverlay Appearance plugin set layer to unmodiable if a second argument is passed
        // Layer label should be in option name
        if (!lFeature.options.name && feature.popup) {
            lFeature.options.name = feature.popup.value.trim();
        } else {
            lFeature.options.name = "track";
        }
        if (self.track_control) {
            self.track_control.addOverlay(lFeature);
        }
        } else {
        if (self.track_control && feature.popup)  {
            self.track_control.addOverlay(lFeature,feature.popup.value.trim());
        }
        }
    });

    $(document).on('leaflet_ajax.feature', function (e, lFeature, self) {
        console.log ("event feature control");
        if (drupalSettings.leafletedit.feature_control.control &&
                !self.track_control) {
            if (drupalSettings.leafletedit.feature_control.control == 2 &&
                    L.control.appearance) {
            self.track_control = new L.Control.Appearance([], [], [], {
                    color: true,
                    collapsed: false,
                    opacity: false});
            }
            else {
                self.track_control = new L.Control.Layers();
            }
            self.track_control.setPosition(
                drupalSettings.leafletedit.feature_control.position);
            // self.lMap.addControl(self.track_control);
            drupalSettings.leaflet[mapid].lMap.addControl(self.track_control);
        }

        if (drupalSettings.leafletedit.feature_control.control == 2) {
        // addOverlay Appearance plugin set layer to unmodiable if a second argument is passed
        // Layer label should be in option name
            if (!lFeature.options.name) {
                lFeature.options.name = feature.popup.trim();
            }
            else {
                lFeature.options.name = "track";
            }
            if (self.track_control) {
                self.track_control.addOverlay(lFeature);
            }
        }
        else {
            if (self.track_control) {
               if (lFeature.popup) {
                  self.track_control.addOverlay(lFeature, lFeature.popup.trim());
               }
               else {
                  self.track_control.addOverlay(lFeature, 'xxx');
               }

            }
        }
    });
})(jQuery, Drupal, drupalSettings);
