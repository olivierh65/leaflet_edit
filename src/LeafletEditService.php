<?php

namespace Drupal\leaflet_edit;

use Drupal\Core\Url;
use Drupal\file\Entity\File;
use Drupal\Component\Utility\Html;
use Drupal\leaflet\LeafletService;
use Drupal\node\NodeInterface;


use Drupal\Core\Cache\CacheBackendInterface;
use Drupal\Core\Session\AccountInterface;
use Drupal\Core\StreamWrapper\StreamWrapperManager;
use Drupal\Core\StreamWrapper\StreamWrapperManagerInterface;
use Drupal\Core\StringTranslation\StringTranslationTrait;
use Drupal\geofield\GeoPHP\GeoPHPInterface;
use Drupal\Core\Extension\ModuleHandlerInterface;
use Drupal\Component\Utility\UrlHelper;
use Drupal\Core\Utility\LinkGeneratorInterface;
use Drupal\Component\Serialization\Json;
use Symfony\Component\HttpFoundation\RequestStack;

/**
 * Provides a LeafletService class.
 */
class LeafletEditService extends LeafletService {

  /**
   * Load all Leaflet required client files and return markup for a map.
   *
   * @param array $map
   *   The map settings array.
   * @param array $features
   *   The features array.
   * @param string $height
   *   The height value string.
   *
   * @return array
   *   The leaflet_map render array.
   */
  public function __construct(
    AccountInterface $current_user,
    GeoPHPInterface $geophp_wrapper,
    ModuleHandlerInterface $module_handler,
    LinkGeneratorInterface $link_generator,
    StreamWrapperManagerInterface $stream_wrapper_manager,
    RequestStack $request_stack,
    CacheBackendInterface $cache
  ) {
    parent::__construct( $current_user,
     $geophp_wrapper,
     $module_handler,
     $link_generator,
     $stream_wrapper_manager,
     $request_stack,
     $cache);
  }

  public function leafletRenderMap(array $map, array $features = [], $height = '400px') {

    $feat=[];
    $feat_url=[];
    foreach ($features as $feature) {
      if ($feature['type'] == 'url') {
        array_push($feat_url, $feature);
      } else {
        array_push($feat, $feature);
      }
    }

    // add features that are not 'url'
    $par = parent::leafletRenderMap($map, $feat, $height);
    $config = \Drupal::config('leaflet_edit.settings');
    $attached_libraries = $par['#attached']['library'];
    $settings = $par['#attached']['drupalSettings'];

    // Doubleclick
    /* $attached_libraries[] = 'leaflet_edit/leaflet-doubleclick-drupal'; */
    //Feature_control
    /* $attached_libraries[] = 'leaflet_edit/leaflet-feature-control';
    $attached_libraries[] = 'leaflet_edit/leaflet-feature-control-drupal';
    $settings['leafletedit']['feature_control']['control'] = $config->get('feature_control_control') ?? false;
    $settings['leafletedit']['feature_control']['position'] = $config->get('feature_control_position') ?? 'topright'; */
    // Geoman
    $attached_libraries[] = 'leaflet_edit/leaflet-geoman';
    $attached_libraries[] = 'leaflet_edit/leaflet-geoman-drupal';
    $settings['leafletedit']['geoman']['control'] = $config->get('geoman_control') ?? false;
    $settings['leafletedit']['geoman']['position'] = $config->get('geoman_position') ?? 'topleft';
    $settings['leafletedit']['geoman']['options'] = $config->get('geoman_options') ??
        ['drawmarker', 'drawpolyline', 'drawpolygon',
        'editmode', 'dragmode', 'cutpolygon', 'removalmode', 'drawcontrols', 'editcontrols', 'customcontrols' ];
    // Locate
    $attached_libraries[] = 'leaflet_edit/leaflet-locatecontrol';
    // $attached_libraries[] = 'leaflet_edit/leaflet-locatecontrol-drupal';
    $settings['leafletedit']['locatecontrol']['control'] = $config->get('locatecontrol_control') ?? false;
    $settings['leafletedit']['locatecontrol']['position'] = $config->get('locatecontrol_position') ?? 'bottomright';
    // StyleEditor
    $attached_libraries[] = 'leaflet_edit/leaflet-styleeditor';
    // $attached_libraries[] = 'leaflet_edit/leaflet-styleeditor-drupal';
    $settings['leafletedit']['styleeditor']['control'] = $config->get('styleeditor_control') ?? false;
    $settings['leafletedit']['styleeditor']['position'] = $config->get('styleeditor_position') ?? 'bottomright';

    // geojson
    /* $attached_libraries[] = 'leaflet_edit/leaflet-geojson'; */

    // layerJSON
    /* $attached_libraries[] = 'leaflet_edit/leaflet-layerjson'; */

    // panel-layers
    $attached_libraries[] = 'leaflet_edit/leaflet-panel-layers';

    // Notifications
    $attached_libraries[] = 'leaflet_edit/leaflet-notifications';

    // Toolbar
    $attached_libraries[] = 'leaflet_edit/leaflet-toolbar';
    //
    // Fullscreen
    $attached_libraries[] = 'leaflet_edit/leaflet-fullscreen';
    //
    $map_id = $par['#map_id'];
    $attached_libraries[] = 'leaflet_edit/leaflet-edit';
    // $attached_libraries[] =  'leaflet/leaflet-drupal';
    $attached_libraries[] =  'leaflet_edit/leaflet.ajax';
    // $attached_libraries[] =  'leaflet/general';

    // Context Menu
    $attached_libraries[] = 'leaflet_edit/leaflet-contextmenu';

    // Select2 
    $attached_libraries[] =  'leaflet_edit/select2.min';

    // Dialog
    $attached_libraries[] =  'leaflet_edit/leaflet.Dialog';

    // Control window
    $attached_libraries[] =  'leaflet_edit/leaflet.control-window';

    //CascadeButtons
    $attached_libraries[] =  'leaflet_edit/leaflet.cascadebuttons';

    //togpx
    $attached_libraries[] =  'leaflet_edit/togpx';

    // leaflet-distance-markers
    $attached_libraries[] =  'leaflet_edit/leaflet-distance-markers';
    // leaflet.GeometryUtil
    $attached_libraries[] =  'leaflet_edit/leaflet.GeometryUtil';

    // turf
    $attached_libraries[] =  'leaflet_edit/leaflet.turf';

    // now add url features
    $settings[$map_id] = [
      'mapid' => $map_id,
      'map' => $map,
      // JS only works with arrays, make sure we have one with numeric keys.
      'features_url' => array_values($feat_url),
    ];
    return [
      '#theme' => $par['#theme'],
      '#map_id' => $map_id,
      '#height' => $height,
      '#map' => $map,
      '#attached' => [
        'library' => $attached_libraries,
        'drupalSettings' => $settings,
      ],
    ];
  }

  /**
   * Returns the relative url of a file.
   *
   * @param $fid
   *
   * @return string
   */
  public function leafletProcessGeofieldFileUrl($fid, NodeInterface $entity) {
    /** @var \Drupal\file\Entity\File $file */
    $file = File::load($fid);
    if ($file) {
      /** @var \Drupal\Core\Url $file_uri */
      ///$file_uri = Url::fromUri($file->getFileUri());
      ///$file_uri->setOption('query', ['v' => $entity->getRevisionId()]);
      ///return file_url_transform_relative($file_uri->toUriString());

      // return \Drupal::service('file_url_generator')->generateAbsoluteString($file->getFileUri()) . '?v=' . $entity->getRevisionId();

      return \Drupal\Core\Url::fromUserInput('/',  array('absolute' => 'true'))->toString() . 'leaflet/read/' . $entity->getRevisionId() . '/' . $fid . '/' . $entity->id() . '?_format=json';
    }
  }

}
