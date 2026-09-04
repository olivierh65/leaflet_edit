<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;

/**
 * Configure Leaflet Edit global settings.
 */
class SettingsForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'leaflet_edit_settings';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state): array {
    $config = $this->config('leaflet_edit.settings');

    $form['nb_mapping'] = [
      '#type' => 'number',
      '#title' => $this->t('Number of mapping attributes'),
      '#default_value' => $config->get('nb_mapping') ?? 2,
      '#description' => $this->t('Define number of attribute mapping.'),
      '#min' => 1,
      '#max' => 20,
      '#step' => 1,
      '#weight' => 1,
    ];

    $form['plugins'] = [
      '#type' => 'details',
      '#title' => $this->t('Leaflet Edit Settings'),
      '#open' => TRUE,
      '#weight' => 2,
    ];
    $form['plugins']['feature_control'] = [
      '#type' => 'details',
      '#title' => $this->t('Feature Control Settings'),
    ];
    $form['plugins']['feature_control']['feature_control_control'] = [
      '#type' => 'radios',
      '#title' => $this->t('Enable Feature Control'),
      '#options' => [
        0 => $this->t('None'),
        1 => $this->t('Default control'),
        2 => $this->t('Appearance plugin control'),
      ],
      '#description' => $this->t('Select control to use.'),
      '#default_value' => $config->get('feature_control_control') ?? 0,
    ];
    $form['plugins']['feature_control']['feature_control_position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getPositionOptions(),
      '#default_value' => $config->get('feature_control_position') ?? 'topright',
    ];

    $form['plugins']['styleeditor'] = [
      '#type' => 'details',
      '#title' => $this->t('Style Editor Settings'),
    ];
    $form['plugins']['styleeditor']['styleeditor_control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Style Editor'),
      '#description' => $this->t('Add Style Editor.'),
      '#default_value' => $config->get('styleeditor_control') ?? FALSE,
    ];
    $form['plugins']['styleeditor']['styleeditor_position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getPositionOptions(),
      '#default_value' => $config->get('styleeditor_position') ?? 'topleft',
    ];

    $form['plugins']['locatecontrol'] = [
      '#type' => 'details',
      '#title' => $this->t('LocateControl Settings'),
    ];
    $form['plugins']['locatecontrol']['locatecontrol_control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable LocateControl'),
      '#description' => $this->t('Add LocateControl.'),
      '#default_value' => $config->get('locatecontrol_control') ?? FALSE,
    ];
    $form['plugins']['locatecontrol']['locatecontrol_position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getPositionOptions(),
      '#default_value' => $config->get('locatecontrol_position') ?? 'topleft',
    ];

    $form['plugins']['doubleclick'] = [
      '#type' => 'details',
      '#title' => $this->t('Doubleclick Settings'),
    ];
    $form['plugins']['doubleclick']['doubleclick_control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Double Click'),
      '#description' => $this->t('Open a popup on shift + double-click.'),
      '#default_value' => $config->get('doubleclick_control') ?? FALSE,
    ];

    $form['plugins']['geoman'] = [
      '#type' => 'details',
      '#title' => $this->t('Geoman Settings'),
    ];
    $form['plugins']['geoman']['geoman_control'] = [
      '#type' => 'checkbox',
      '#title' => $this->t('Enable Geoman functionality'),
      '#description' => $this->t('Add Geoman.'),
      '#default_value' => $config->get('geoman_control') ?? FALSE,
    ];
    $form['plugins']['geoman']['geoman_position'] = [
      '#type' => 'select',
      '#title' => $this->t('Control position.'),
      '#options' => $this->getPositionOptions(),
      '#default_value' => $config->get('geoman_position') ?? 'topleft',
    ];
    $form['plugins']['geoman']['options'] = [
      '#type' => 'details',
      '#title' => $this->t('Geoman Options'),
    ];
    $form['plugins']['geoman']['options']['geoman_options'] = [
      '#type' => 'checkboxes',
      '#title' => $this->t('Options'),
      '#description' => $this->t('Geoman Options.'),
      '#options' => $this->getGeomanOptions(),
      '#default_value' => $config->get('geoman_options') ?? [
        'drawMarker',
        'drawPolyline',
        'drawPolygon',
        'editMode',
        'dragMode',
        'cutPolygon',
        'removalMode',
        'drawControls',
        'editControls',
        'customControls',
      ],
    ];
    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $this->config('leaflet_edit.settings')
      ->set('nb_mapping', (int) $form_state->getValue('nb_mapping'))
      ->set('feature_control_control', (int) $form_state->getValue('feature_control_control'))
      ->set('feature_control_position', $form_state->getValue('feature_control_position'))
      ->set('styleeditor_control', (bool) $form_state->getValue('styleeditor_control'))
      ->set('styleeditor_position', $form_state->getValue('styleeditor_position'))
      ->set('locatecontrol_control', (bool) $form_state->getValue('locatecontrol_control'))
      ->set('locatecontrol_position', $form_state->getValue('locatecontrol_position'))
      ->set('doubleclick_control', (bool) $form_state->getValue('doubleclick_control'))
      ->set('geoman_control', (bool) $form_state->getValue('geoman_control'))
      ->set('geoman_position', $form_state->getValue('geoman_position'))
      ->set('geoman_options', array_filter((array) $form_state->getValue('geoman_options')))
      ->save();

    parent::submitForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames(): array {
    return ['leaflet_edit.settings'];
  }

  /**
   * Returns the control position options.
   *
   * @return array<string, string>
   *   The position options.
   */
  protected function getPositionOptions(): array {
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
    return [
      'drawMarker' => $this->t('Adds button to draw Markers.')->render(),
      'drawCircleMarker' => $this->t('Adds button to draw CircleMarkers.')->render(),
      'drawPolyline' => $this->t('Adds button to draw Line.')->render(),
      'drawRectangle' => $this->t('Adds button to draw Rectangle.')->render(),
      'drawPolygon' => $this->t('Adds button to draw Polygon.')->render(),
      'drawCircle' => $this->t('Adds button to draw Circle.')->render(),
      'editMode' => $this->t('Adds button to toggle Edit Mode for all layers.')->render(),
      'dragMode' => $this->t('Adds button to toggle Drag Mode for all layers.')->render(),
      'cutPolygon' => $this->t('Adds button to cut a hole in a Polygon or Line.')->render(),
      'removalMode' => $this->t('Adds a button to remove layers.')->render(),
      'rotateMode' => $this->t('Adds a button to rotate layers.')->render(),
      'oneBlock' => $this->t('All buttons will be displayed as one block.')->render(),
      'drawControls' => $this->t('Shows all draw buttons / buttons in the draw block.')->render(),
      'editControls' => $this->t('Shows all edit buttons / buttons in the edit block.')->render(),
      'customControls' => $this->t('Shows all buttons in the custom block.')->render(),
    ];
  }

}
