/**
 * @file
 * Ancienne initialisation carte du StyleEditor — DÉSACTIVÉE.
 *
 * Le StyleEditor s'utilise uniquement en programmatique via
 * ensureStyleEditor() (js/leaflet_edit.menu.drupal.js) :
 *   var ctl = L.control.styleEditor({ showTooltip: false });
 *   map.lMap.addControl(ctl); // requis : initialise options.map/controlUI
 *   ctl.options.controlDiv.style.display = 'none'; // pas d'icône à gauche
 *   ctl.enable(layer);
 *
 * Ce fichier est conservé comme no-op pour ne pas casser un éventuel
 * attachement résiduel. Ne rien y réactiver.
 */
(function ($, Drupal, drupalSettings) {
  "use strict";
  // No-op : aucune icône carte, aucun addControl ici.
})(jQuery, Drupal, drupalSettings);
