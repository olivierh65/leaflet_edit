<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Controller;

use Drupal\Component\Serialization\Json;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\leaflet_edit\Service\GpxExporter;
use Drupal\leaflet_edit\Service\PermissionChecker;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Handles GPX export for the Leaflet map editor.
 *
 * Note: per-trace save is handled by geofile_field
 * (TraceController::saveTrace / createTrace). This controller only keeps
 * GPX export endpoints.
 */
class DefaultController extends ControllerBase {

  /**
   * Constructs a DefaultController object.
   */
  public function __construct(
    protected EntityTypeManagerInterface $entityTypeManagerService,
    protected PermissionChecker $permissionChecker,
    protected GpxExporter $gpxExporter,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('leaflet_edit.permission_checker'),
      $container->get('leaflet_edit.gpx_exporter'),
    );
  }

/**
 * Displays the map editor for a node.
 *
 * @param \Drupal\node\NodeInterface $node
 *   The map node.
 *
 * @return array
 *   A render array.
 */
  public function map(NodeInterface $node): array {
    // TODO: Implement full map rendering functionality.
    // This method should return a proper map rendering, not just a text message.
    return [
      '#type' => 'html_tag',
      '#tag' => 'p',
      '#value' => $this->t('Map editor for @label is implemented in the view display.', ['@label' => $node->label()]),
      '#cache' => [
        'tags' => $node->getCacheTags(),
        'contexts' => ['user.permissions'],
      ],
    ];
  }

  /**
   * Exports one or more GeoJSON features to GPX.
   */
  public function exportToGpx(Request $request): JsonResponse {
    if (!$this->permissionChecker->hasAnyPermission(['export leaflet tracks to gpx'])) {
      return new JsonResponse(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
    }

    $payload = $request->request->get('geojson') ?? $request->query->get('geojson');
    $description = (string) ($request->request->get('description') ?? $request->query->get('description') ?? '');
    $filename = $this->sanitizeFilename((string) ($request->request->get('filename') ?? $request->query->get('filename') ?? 'export'));

    if (!is_string($payload) || $payload === '') {
      return new JsonResponse(['error' => 'Missing GeoJSON payload.'], Response::HTTP_BAD_REQUEST);
    }
    try {
      $tracks = Json::decode($payload);
    }
    catch (\InvalidArgumentException) {
      return new JsonResponse(['error' => 'Invalid GeoJSON payload.'], Response::HTTP_BAD_REQUEST);
    }
    if (!is_array($tracks)) {
      return new JsonResponse(['error' => 'Invalid GeoJSON payload.'], Response::HTTP_BAD_REQUEST);
    }
    // Accept either a single track payload or a list of tracks.
    if (isset($tracks['geojson'])) {
      $tracks = [$tracks];
    }

    $gpxDocuments = [];
    foreach ($tracks as $track) {
      if (!is_array($track) || !isset($track['geojson'])) {
        continue;
      }
      $name = $filename
        . ($description !== '' ? '-' . $description : '')
        . (!empty($track['type']) && is_string($track['type']) ? '-' . $track['type'] : '');
      try {
        $gpxDocuments[] = [
          'gpx' => $this->gpxExporter->geojsonToGpx($track['geojson'], $name),
          'filename' => $name,
        ];
      }
      catch (\InvalidArgumentException) {
        continue;
      }
    }

    if ($gpxDocuments === []) {
      return new JsonResponse(['error' => 'No convertible track found.'], Response::HTTP_BAD_REQUEST);
    }

    return new JsonResponse([
      'success' => TRUE,
      'gpx' => $gpxDocuments,
    ]);
  }

  /**
   * Exports several GeoJSON features merged into a single GPX document.
   */
  public function exportToGpxMerge(Request $request): JsonResponse {
    if (!$this->permissionChecker->hasAnyPermission(['export leaflet tracks to gpx'])) {
      return new JsonResponse(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
    }

    $payload = $request->request->get('geojson') ?? $request->query->get('geojson');
    $description = (string) ($request->request->get('description') ?? $request->query->get('description') ?? '');
    $filename = $this->sanitizeFilename((string) ($request->request->get('filename') ?? $request->query->get('filename') ?? 'export'));

    if (!is_string($payload) || $payload === '') {
      return new JsonResponse(['error' => 'Missing GeoJSON payload.'], Response::HTTP_BAD_REQUEST);
    }
    try {
      $tracks = Json::decode($payload);
    }
    catch (\InvalidArgumentException) {
      return new JsonResponse(['error' => 'Invalid GeoJSON payload.'], Response::HTTP_BAD_REQUEST);
    }
    if (!is_array($tracks) || $tracks === []) {
      return new JsonResponse(['error' => 'Invalid GeoJSON payload.'], Response::HTTP_BAD_REQUEST);
    }

    $normalized = [];
    foreach ($tracks as $track) {
      if (!is_array($track) || !isset($track['geojson'])) {
        continue;
      }
      $normalized[] = [
        'geojson' => $track['geojson'],
        'type' => is_string($track['type'] ?? NULL) ? $track['type'] : '',
        'properties' => is_string($track['properties'] ?? NULL) ? $track['properties'] : '',
        'color' => is_string($track['color'] ?? NULL) ? $track['color'] : '',
        'width' => is_string($track['width'] ?? NULL) ? $track['width'] : '',
      ];
    }
    if ($normalized === []) {
      return new JsonResponse(['error' => 'No convertible track found.'], Response::HTTP_BAD_REQUEST);
    }

    $gpx = $this->gpxExporter->mergeTracksToGpx($normalized, $filename, $description);

    return new JsonResponse([
      'success' => TRUE,
      'gpx' => [
        [
          'gpx' => $gpx,
          'filename' => $filename,
        ],
      ],
    ]);
  }

  /**
   * Sanitizes a user-provided file name.
   */
  protected function sanitizeFilename(string $filename): string {
    $filename = trim($filename);
    $filename = preg_replace('/[^a-zA-Z0-9._-]+/', '-', $filename) ?? 'export';
    $filename = trim($filename, '-.');
    return $filename !== '' ? substr($filename, 0, 100) : 'export';
  }

}
