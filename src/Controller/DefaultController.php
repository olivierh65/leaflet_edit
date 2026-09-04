<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Controller;

use Drupal\Component\Serialization\Json;
use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\Datetime\TimeInterface;
use Drupal\Core\Entity\EntityFieldManagerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\File\FileSystemInterface;
use Drupal\Core\Utility\Token;
use Drupal\file\FileRepositoryInterface;
use Drupal\leaflet_edit\Service\GpxExporter;
use Drupal\leaflet_edit\Service\PermissionChecker;
use Drupal\node\NodeInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Handles GeoJSON save and GPX export for the Leaflet map editor.
 */
class DefaultController extends ControllerBase {

  /**
   * The GeoJSON file field on the map content type.
   *
   * Must match config/optional/field.field.node.leaflet_map_editor.field_leaflet_geojson_files.yml.
   */
  public const GEOJSON_FIELD_NAME = 'field_leaflet_geojson_files';

  /**
   * Maximum accepted GeoJSON payload size (5 MB).
   */
  public const MAX_GEOJSON_BYTES = 5242880;

  /**
   * Constructs a DefaultController object.
   */
  public function __construct(
    protected EntityTypeManagerInterface $entityTypeManagerService,
    protected EntityFieldManagerInterface $entityFieldManagerService,
    protected FileSystemInterface $fileSystemService,
    protected FileRepositoryInterface $fileRepository,
    protected Token $token,
    protected TimeInterface $time,
    protected PermissionChecker $permissionChecker,
    protected GpxExporter $gpxExporter,
  ) {}

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('entity_field.manager'),
      $container->get('file_system'),
      $container->get('file.repository'),
      $container->get('token'),
      $container->get('datetime.time'),
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
    return [
      '#type' => 'html_tag',
      '#tag' => 'p',
      '#value' => $this->t('Use the @label view display to render the editable map.', ['@label' => $node->label()]),
      '#cache' => [
        'tags' => $node->getCacheTags(),
        'contexts' => ['user.permissions'],
      ],
    ];
  }

  /**
   * Saves an edited GeoJSON payload as a new file revision on the node.
   *
   * The node gets a new revision on each save so the history of changes
   * (who modified what and when) is preserved.
   */
  public function saveFile(Request $request): JsonResponse {
    if (!$this->permissionChecker->hasAnyPermission(['save leaflet tracks'])) {
      return new JsonResponse(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
    }

    $nid = $request->request->get('nid') ?? $request->query->get('nid');
    $fid = $request->request->get('fid') ?? $request->query->get('fid');
    $geojson = $request->request->get('geojson') ?? $request->query->get('geojson');

    if (!is_scalar($nid) || !ctype_digit((string) $nid) || (int) $nid <= 0) {
      return $this->makeUploadErrorResponse('Bad NID format.');
    }
    $node = $this->entityTypeManagerService->getStorage('node')->load((int) $nid);
    if (!$node instanceof NodeInterface) {
      return $this->makeUploadErrorResponse('No node with nid of ' . $nid);
    }
    if (!$node->access('update')) {
      return new JsonResponse(['error' => 'Access denied.'], Response::HTTP_FORBIDDEN);
    }
    if (!$node->hasField(static::GEOJSON_FIELD_NAME)) {
      return $this->makeUploadErrorResponse('GeoJSON field is missing on this node.');
    }

    $fileId = NULL;
    if ($fid !== NULL && $fid !== '') {
      if (!ctype_digit((string) $fid)) {
        return $this->makeUploadErrorResponse('Bad FID format.');
      }
      $fileId = (int) $fid;
      $attached = FALSE;
      foreach ($node->get(static::GEOJSON_FIELD_NAME) as $item) {
        if ((int) $item->get('file')->getValue() === $fileId) {
          $attached = TRUE;
          break;
        }
      }
      if (!$attached) {
        return $this->makeUploadErrorResponse('fid and nid mismatch.');
      }
    }

    if (!is_string($geojson) || $geojson === '') {
      return $this->makeUploadErrorResponse('Missing GeoJSON payload.');
    }
    if (strlen($geojson) > static::MAX_GEOJSON_BYTES) {
      return $this->makeUploadErrorResponse('GeoJSON payload too large.');
    }
    try {
      $decoded = Json::decode($geojson);
    }
    catch (\InvalidArgumentException) {
      return $this->makeUploadErrorResponse('Invalid GeoJSON payload.');
    }
    if (!is_array($decoded) || ($decoded['type'] ?? NULL) !== 'FeatureCollection') {
      return $this->makeUploadErrorResponse('Only GeoJSON FeatureCollection payloads are accepted.');
    }

    $fieldMetadata = $this->getFileFieldMetaData($node->bundle(), static::GEOJSON_FIELD_NAME);
    if ($fieldMetadata === FALSE) {
      return $this->makeUploadErrorResponse('Problem loading file field metadata.');
    }

    $fieldItems = $node->get(static::GEOJSON_FIELD_NAME);
    $cardinality = $fieldMetadata['cardinality'];
    if ($cardinality > 0 && count($fieldItems) >= $cardinality && $fileId === NULL) {
      return $this->makeUploadErrorResponse('Maximum number of files for this node already reached.');
    }

    $directory = 'public://' . trim($fieldMetadata['directory'] ?? 'leaflet_edit', '/');
    if (!$this->fileSystemService->prepareDirectory($directory, FileSystemInterface::CREATE_DIRECTORY)) {
      return $this->makeUploadErrorResponse('Error preparing directory.');
    }

    $savedFile = $this->fileRepository->writeData(
      $geojson,
      $directory . '/' . $this->buildGeojsonFilename($node),
      FileSystemInterface::EXISTS_RENAME
    );
    if (!$savedFile) {
      return $this->makeUploadErrorResponse('Error saving file.');
    }
    $savedFile->setPermanent();
    $savedFile->save();

    if ($fileId !== NULL) {
      $updated = FALSE;
      foreach ($node->get(static::GEOJSON_FIELD_NAME) as $item) {
        if ((int) $item->get('file')->getValue() === $fileId) {
          $item->set('file', $savedFile->id());
          $updated = TRUE;
          break;
        }
      }
      if (!$updated) {
        return $this->makeUploadErrorResponse('Error updating node file reference.');
      }
    }
    else {
      $node->get(static::GEOJSON_FIELD_NAME)->appendItem(['file' => $savedFile->id()]);
    }

    // Create a new node revision on each save to keep the change history
    // (who modified what and when).
    $node->setNewRevision(TRUE);
    $node->setRevisionLogMessage($this->t('GeoJSON file @old saved as @new.', [
      '@old' => $fileId ?? $this->t('new')->render(),
      '@new' => $savedFile->id(),
    ])->render());
    $node->setRevisionUserId($this->currentUser()->id());
    $node->setRevisionCreationTime($this->time->getRequestTime());
    $node->save();

    return new JsonResponse([
      'success' => TRUE,
      'fid' => $savedFile->id(),
    ]);
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
   * Makes a JSON response for a file upload attempt with an error message.
   *
   * @param string $message
   *   The error message.
   *
   * @return \Symfony\Component\HttpFoundation\JsonResponse
   *   The response to return to the client.
   */
  protected function makeUploadErrorResponse(string $message): JsonResponse {
    return new JsonResponse([
      'success' => FALSE,
      'message' => $message,
    ], Response::HTTP_BAD_REQUEST);
  }

  /**
   * Gets metadata for a file field.
   *
   * @param string $bundle
   *   The bundle carrying the field.
   * @param string $fieldName
   *   The field name.
   *
   * @return array|false
   *   Metadata, or FALSE on failure.
   */
  protected function getFileFieldMetaData(string $bundle, string $fieldName): array|false {
    if ($bundle === '' || $fieldName === '') {
      return FALSE;
    }
    $fields = $this->entityFieldManagerService->getFieldDefinitions('node', $bundle);
    if (!isset($fields[$fieldName])) {
      return FALSE;
    }
    $fieldDefinition = $fields[$fieldName];
    $directory = $this->token->replace($fieldDefinition->getSetting('file_directory') ?? '');
    $fieldStorageDefinition = $fieldDefinition->getFieldStorageDefinition();

    return [
      'bundle' => $bundle,
      'field' => $fieldName,
      'directory' => trim($directory, '/'),
      'extensions' => $fieldDefinition->getSetting('file_extensions'),
      'max file size' => $fieldDefinition->getSetting('max_filesize'),
      'cardinality' => $fieldStorageDefinition->getCardinality(),
      'uri_scheme' => $fieldDefinition->getSetting('uri_scheme'),
    ];
  }

  /**
   * Builds a safe GeoJSON file name for a node.
   */
  protected function buildGeojsonFilename(NodeInterface $node): string {
    $timestamp = $this->time->getRequestTime();
    return sprintf('leaflet-edit-%d-%d.geojson', $node->id(), $timestamp);
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
