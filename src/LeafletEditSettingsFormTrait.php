<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit;

/**
 * Shared builders for the Leaflet Edit map settings form elements.
 *
 * Single source of truth, used in two places with the exact same
 * structure and defaults:
 * - LeafletEditFormatter::settingsForm(): the content type display
 *   settings (formatter configuration).
 * - LeafletEditSettingsWidget::formElement(): the per-map override field
 *   (node form), minus the tools section and the position selects, which
 *   keep their dedicated fields (field_leaflet_tools,
 *   field_leaflet_geoman_pos, field_leaflet_locate_pos).
 *
 * Every builder takes the whole 'leaflet_edit' settings array and returns
 * one form section (details element or checkboxes). Callers own the
 * wrapper, the #tree structure and any #access restriction.
 */
trait LeafletEditSettingsFormTrait {

  /**
   * Maps tool IDs (config-safe, no dots) to library suffixes.
   *
   * @return array<string, string>
   *   Tool ID mapped to 'leaflet_edit/<suffix>' suffix.
   */
  public static function toolLibraryMap(): array {
    // NOTE : 'styleeditor' volontairement absent : librairie chargée en dur
    // par LeafletEditService (menu métier, sans bouton carte).
    return [
      'geoman' => 'leaflet-geoman',
      'locatecontrol' => 'leaflet-locatecontrol',
      'panel_layers' => 'leaflet-panel-layers',
      'notifications' => 'leaflet-notifications',
      'fullscreen' => 'leaflet-fullscreen',
      'ajax' => 'leaflet.ajax',
      'contextmenu' => 'leaflet-contextmenu',
      'control_window' => 'leaflet.control-window',
      'cascadebuttons' => 'leaflet.cascadebuttons',
      'distance_markers' => 'leaflet-distance-markers',
      'geometryutil' => 'leaflet.GeometryUtil',
      'turf' => 'leaflet.turf',
      'togeojson' => 'leaflet.togeojson',
      'slider' => 'leaflet-slider',
      'arrowheads' => 'leaflet-arrowheads',
      'feature_control' => 'leaflet-feature-control',
      'doubleclick' => 'leaflet-doubleclick-drupal',
      'toolbar' => 'leaflet-toolbar',
      'select2' => 'leaflet.select2',
      'dialog' => 'leaflet.Dialog',
      'togpx' => 'togpx',
    ];
  }

  /**
   * Returns the selectable JS tool options.
   *
   * Keys are config-safe IDs (no dots); see toolLibraryMap() for the
   * library suffix mapping.
   *
   * @return array<string, string>
   *   Tool machine names mapped to human labels.
   */
  protected function getToolOptions(): array {
    // NOTE : pas d'entrée 'styleeditor' : usage programmatique uniquement
    // via le menu métier (librairie toujours chargée, sans icône carte).
    return [
      'geoman' => $this->t('Geoman (draw / edit toolbar)')->render(),
      'locatecontrol' => $this->t('LocateControl (geolocation)')->render(),
      'panel_layers' => $this->t('PanelLayers (base maps + traces switcher)')->render(),
      'notifications' => $this->t('Notifications')->render(),
      'fullscreen' => $this->t('Fullscreen')->render(),
      'ajax' => $this->t('leaflet.ajax')->render(),
      'contextmenu' => $this->t('Contextmenu (right-click, desktop)')->render(),
      'control_window' => $this->t('Control.Window (modal dialogs)')->render(),
      'cascadebuttons' => $this->t('CascadeButtons (business bar)')->render(),
      'distance_markers' => $this->t('Distance markers')->render(),
      'geometryutil' => $this->t('GeometryUtil')->render(),
      'turf' => $this->t('Turf (simplify, cut, measure)')->render(),
      'togeojson' => $this->t('ToGeoJSON (GPX/KML parsing)')->render(),
      'slider' => $this->t('Slider (basemap opacity)')->render(),
      'arrowheads' => $this->t('Arrowheads (track direction)')->render(),
      'feature_control' => $this->t('FeatureControl (legacy)')->render(),
      'doubleclick' => $this->t('Doubleclick (legacy)')->render(),
      'toolbar' => $this->t('Toolbar (legacy, unmaintained)')->render(),
      'select2' => $this->t('Select2 (legacy)')->render(),
      'dialog' => $this->t('Dialog (legacy)')->render(),
      'togpx' => $this->t('ToGPX (client-side export)')->render(),
    ];
  }

  /**
   * Returns the default enabled tools.
   *
   * @return array<string, string>
   *   Enabled tool names keyed by tool name.
   */
  protected function defaultTools(): array {
    $defaults = [
      'geoman' => 'geoman',
      'locatecontrol' => 'locatecontrol',
      'panel_layers' => 'panel_layers',
      'notifications' => 'notifications',
      'fullscreen' => 'fullscreen',
      'ajax' => 'ajax',
      'contextmenu' => 'contextmenu',
      'control_window' => 'control_window',
      'cascadebuttons' => 'cascadebuttons',
      'distance_markers' => 'distance_markers',
      'geometryutil' => 'geometryutil',
      'turf' => 'turf',
      'togeojson' => 'togeojson',
      'slider' => 'slider',
      'arrowheads' => 'arrowheads',
      'togpx' => 'togpx',
    ];
    return $defaults;
  }

  /**
   * Returns the control position options.
   *
   * @return array<string, string>
   *   The position options.
   */
  protected function getControlPositions(): array {
    return [
      'topleft' => $this->t('Top left')->render(),
      'topright' => $this->t('Top right')->render(),
      'bottomleft' => $this->t('Bottom left')->render(),
      'bottomright' => $this->t('Bottom right')->render(),
    ];
  }

  /**
   * Returns the Geoman options.
   *
   * @return array<string, string>
   *   The Geoman options.
   */
  protected function getGeomanOptions(): array {
    // Draw buttons only. All editing (edit/move/cut/remove/rotate) lives
    // in the business bar (programmatic layer.pm calls), so the Geoman
    // edit block is intentionally not configurable anymore (forced off
    // in init.drupal.js, even for stale saved configs).
    return [
      'drawControls' => $this->t('Shows the draw block.')->render(),
      'drawMarker' => $this->t('Adds button to draw Markers.')->render(),
      'drawCircleMarker' => $this->t('Adds button to draw CircleMarkers.')->render(),
      'drawPolyline' => $this->t('Adds button to draw Line.')->render(),
      'drawRectangle' => $this->t('Adds button to draw Rectangle.')->render(),
      'drawPolygon' => $this->t('Adds button to draw Polygon.')->render(),
      'drawCircle' => $this->t('Adds button to draw Circle.')->render(),
      'drawText' => $this->t('Adds button to draw Text.')->render(),
      'oneBlock' => $this->t('All buttons will be displayed as one block.')->render(),
      'customControls' => $this->t('Shows the custom block.')->render(),
    ];
  }

  /**
   * Returns the Turf operations available in the UI.
   *
   * @return array<string, string>
   *   Operation machine names mapped to human labels. 'concatenate' is
   *   listed for roadmap visibility but not implemented yet (safely
   *   ignored at runtime).
   */
  protected function getTurfOperationOptions(): array {
    return [
      'simplify' => $this->t('Simplify (Douglas-Peucker)')->render(),
      'concatenate' => $this->t('Concatenate (coming soon)')->render(),
    ];
  }

  /**
   * Returns the arrowheads frequency mode options.
   *
   * @return array<string, string>
   *   Frequency modes mapped to human labels.
   */
  protected function getArrowheadsFrequencyOptions(): array {
    return [
      'endonly' => $this->t('Single arrow at the end (direction of travel)')->render(),
      'allvertices' => $this->t('One arrow on each vertex')->render(),
      'count' => $this->t('N arrows evenly distributed (uses the value below)')->render(),
      'distance' => $this->t('Arrows spaced by distance (uses the value below, e.g. 500m)')->render(),
    ];
  }

  /**
   * Describes the configured arrowheads frequency in one line.
   *
   * @param array $arrowheads
   *   The arrowheads settings.
   *
   * @return string
   *   Human-readable frequency description.
   */
  protected function describeArrowheadsFrequency(array $arrowheads): string {
    $mode = $arrowheads['frequency_mode'] ?? 'endonly';
    $value = trim((string) ($arrowheads['frequency_value'] ?? ''));
    if ($mode === 'count') {
      return ((int) $value > 0 ? (int) $value : $this->t('invalid count')->render()) . ' arrows';
    }
    if ($mode === 'distance') {
      return $value !== '' ? $this->t('every @value', ['@value' => $value])->render() : $this->t('invalid distance')->render();
    }
    return (string) $mode;
  }

  /**
   * Builds the 'leaflet' (click tolerance) section.
   *
   * @param array $leafletEdit
   *   The whole 'leaflet_edit' settings array (display or node values).
   *
   * @return array
   *   The section form element.
   */
  protected function buildLeafletSection(array $leafletEdit): array {
    $element = [
      '#type' => 'details',
      '#title' => $this->t('Leaflet Settings'),
    ];
    $element['tolerance'] = [
      '#type' => 'number',
      '#title' => $this->t('Click tolerance'),
      '#description' => $this->t('Click tolerance in pixels.'),
      '#min' => 0,
      '#max' => 50,
      '#step' => 1,
      '#default_value' => $leafletEdit['leaflet']['tolerance'] ?? 10,
    ];
    return $element;
  }

  /**
   * Builds the 'locatecontrol' section.
   *
   * @param array $leafletEdit
   *   The whole 'leaflet_edit' settings array (display or node values).
   *
   * @return array
   *   The section form element.
   */
  protected function buildLocateControlSection(array $leafletEdit): array {
    $element = [
      '#type' => 'details',
      '#title' => $this->t('LocateControl Settings'),
    ];
    $element['control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable LocateControl'),
      '#description' => $this->t('Add LocateControl.'),
      '#default_value' => $leafletEdit['locatecontrol']['control'] ?? TRUE,
    ];
    $element['position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getControlPositions(),
      '#default_value' => $leafletEdit['locatecontrol']['position'] ?? 'bottomright',
    ];
    return $element;
  }

  /**
   * Builds the 'geoman' section.
   *
   * @param array $leafletEdit
   *   The whole 'leaflet_edit' settings array (display or node values).
   *
   * @return array
   *   The section form element.
   */
  protected function buildGeomanSection(array $leafletEdit): array {
    $element = [
      '#type' => 'details',
      '#title' => $this->t('Geoman Settings'),
      '#description' => $this->t('Draw buttons only: all editing lives in the business bar.'),
    ];
    $element['control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Geoman functionality'),
      '#description' => $this->t('Add Geoman.'),
      '#default_value' => $leafletEdit['geoman']['control'] ?? TRUE,
    ];
    $element['position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getControlPositions(),
      '#default_value' => $leafletEdit['geoman']['position'] ?? 'topleft',
    ];
    $element['options'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Options'),
      '#description' => $this->t('Geoman Options.'),
      '#options' => $this->getGeomanOptions(),
      '#default_value' => $leafletEdit['geoman']['options'] ?? ['drawMarker', 'drawPolyline', 'drawControls', 'customControls'],
    ];
    return $element;
  }

  /**
   * Builds the 'turf' section.
   *
   * @param array $leafletEdit
   *   The whole 'leaflet_edit' settings array (display or node values).
   *
   * @return array
   *   The section form element.
   */
  protected function buildTurfSection(array $leafletEdit): array {
    $element = [
      '#type' => 'details',
      '#title' => $this->t('Turf Settings'),
      '#description' => $this->t('Parameters of the Turf.js geoprocessing operations.'),
    ];
    $element['operations'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Enabled operations'),
      '#options' => $this->getTurfOperationOptions(),
      '#default_value' => array_keys(array_filter($leafletEdit['turf']['operations'] ?? ['simplify' => 'simplify'])),
    ];
    $element['simplify'] = [
      '#type' => 'details',
      '#title' => $this->t('Simplify'),
      '#open' => TRUE,
    ];
    $element['simplify']['tolerance'] = [
      '#type' => 'number',
      '#title' => $this->t('Tolerance (degrees)'),
      '#description' => $this->t('Simplification tolerance in degrees. Smaller preserves more detail (current value is a good default for hiking tracks).'),
      '#min' => 0,
      '#max' => 1,
      '#step' => 0.00001,
      '#default_value' => $leafletEdit['turf']['simplify']['tolerance'] ?? 0.0001,
    ];
    $element['simplify']['high_quality'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('High quality (slower, better result)'),
      '#default_value' => !empty($leafletEdit['turf']['simplify']['high_quality'] ?? TRUE),
    ];
    return $element;
  }

  /**
   * Builds the 'arrowheads' section.
   *
   * @param array $leafletEdit
   *   The whole 'leaflet_edit' settings array (display or node values).
   *
   * @return array
   *   The section form element.
   */
  protected function buildArrowheadsSection(array $leafletEdit): array {
    $element = [
      '#type' => 'details',
      '#title' => $this->t('Arrowheads Settings'),
      '#description' => $this->t('Direction arrows shown by the "Flèches de sens" tools menu entry (leaflet-arrowheads).'),
    ];
    $element['frequency_mode'] = [
      '#type' => 'select',
      '#title' => $this->t('Arrow distribution'),
      '#options' => $this->getArrowheadsFrequencyOptions(),
      '#default_value' => $leafletEdit['arrowheads']['frequency_mode'] ?? 'endonly',
    ];
    $element['frequency_value'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Distribution value'),
      '#description' => $this->t('Only used by the modes above: arrow count (e.g. 20) or spacing distance (e.g. 500m or 50px).'),
      '#default_value' => $leafletEdit['arrowheads']['frequency_value'] ?? '',
    ];
    $element['size'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Arrow size'),
      '#description' => $this->t('Pixels (e.g. 30px, constant on screen), meters (e.g. 300m, scales with zoom) or percent of the segment (e.g. 15%).'),
      '#default_value' => $leafletEdit['arrowheads']['size'] ?? '30px',
      '#required' => TRUE,
    ];
    $element['yawn'] = [
      '#type' => 'number',
      '#title' => $this->t('Opening angle (degrees)'),
      '#description' => $this->t('Width of the arrowhead opening. Larger angle = wider arrow.'),
      '#min' => 10,
      '#max' => 120,
      '#step' => 1,
      '#default_value' => $leafletEdit['arrowheads']['yawn'] ?? 50,
    ];
    $element['fill'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Filled arrows'),
      '#default_value' => !empty($leafletEdit['arrowheads']['fill'] ?? TRUE),
    ];
    $element['contrast'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Contrasting arrows'),
      '#description' => $this->t('Draw direction arrows in the automatic contrasting color of each trace (readable on the trace itself). Unchecked: arrows use the trace color.'),
      '#default_value' => !empty($leafletEdit['arrowheads']['contrast'] ?? TRUE),
    ];
    return $element;
  }

  /**
   * Builds the 'tools' (JS plugins) section.
   *
   * @param array $leafletEdit
   *   The whole 'leaflet_edit' settings array (display or node values).
   *
   * @return array
   *   The section form element.
   */
  protected function buildToolsSection(array $leafletEdit): array {
    $element = [
      '#type' => 'checkboxes',
      '#title' => $this->t('JS tools'),
      '#description' => $this->t('Leaflet plugins loaded on the map. Unchecked tools are not loaded at all (lighter pages). The core (leaflet-edit) is always loaded. StyleEditor is always loaded for the business menu (programmatic use, no map button). Configured once on the Default display, inherited by other view modes.'),
      '#options' => $this->getToolOptions(),
      // Filtre les clés legacy (ex. 'styleeditor') absentes des options.
      '#default_value' => array_values(array_intersect(array_keys(array_filter($leafletEdit['tools'] ?? $this->defaultTools())), array_keys($this->getToolOptions()))),
    ];
    return $element;
  }

}
