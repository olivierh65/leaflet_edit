<?php

declare(strict_types=1);

namespace Drupal\leaflet_edit\Service;

use Drupal\geofield\GeoPHP\GeoPHPInterface;

/**
 * Converts GeoJSON payloads to GPX documents.
 *
 * Isolates geoPHP usage and DOM manipulation out of the controller so the
 * conversion can be unit-tested and reused.
 */
class GpxExporter {

  /**
   * Constructs a GpxExporter object.
   *
   * @param \Drupal\geofield\GeoPHP\GeoPHPInterface $geoPhp
   *   The geoPHP wrapper service.
   */
  public function __construct(protected GeoPHPInterface $geoPhp) {}

  /**
   * Converts a single GeoJSON structure to a GPX string.
   *
   * @param mixed $geojson
   *   A decoded GeoJSON structure.
   * @param string $name
   *   The track name to embed in GPX metadata.
   *
   * @return string
   *   The GPX XML document.
   *
   * @throws \InvalidArgumentException
   *   Thrown when the GeoJSON cannot be converted.
   */
  public function geojsonToGpx(mixed $geojson, string $name): string {
    $encoded = is_string($geojson) ? $geojson : json_encode($geojson);
    if ($encoded === FALSE || $encoded === '') {
      throw new \InvalidArgumentException('Invalid GeoJSON payload.');
    }
    try {
      $gpx = $this->geoPhp->load($encoded)->out('gpx');
    }
    catch (\Exception $e) {
      throw new \InvalidArgumentException('Unable to convert GeoJSON to GPX.');
    }
    if (!is_string($gpx) || $gpx === '') {
      throw new \InvalidArgumentException('Unable to convert GeoJSON to GPX.');
    }

    return $this->injectMetadataName($gpx, $name);
  }

  /**
   * Builds a merged GPX document grouped by track type.
   *
   * @param array $tracks
   *   List of tracks, each with keys: geojson, type, properties, color, width.
   * @param string $filename
   *   The file name used for metadata.
   * @param string $description
   *   The description used for metadata.
   *
   * @return string
   *   The merged GPX XML document.
   */
  public function mergeTracksToGpx(array $tracks, string $filename, string $description = ''): string {
    $grouped = [];
    foreach ($tracks as $index => $track) {
      $type = (string) ($track['type'] ?? '');
      $grouped[$type !== '' ? $type : '__notyped__'][] = $index;
    }

    $document = new \DOMDocument('1.0', 'UTF-8');
    $gpxRoot = $document->createElement('gpx');
    $gpxRoot->setAttribute('creator', 'Drupal Leaflet Edit');
    $gpxRoot->setAttribute('version', '1.1');
    $gpxRoot->setAttribute('xmlns', 'http://www.topografix.com/GPX/1/1');
    $gpxRoot->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
    $gpxRoot->setAttribute('xmlns:wptx1', 'http://www.garmin.com/xmlschemas/WaypointExtension/v1');
    $gpxRoot->setAttribute('xmlns:gpxx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3');
    $gpxRoot->setAttribute('xmlns:gpxtpx', 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1');
    $gpxRoot->setAttribute('xmlns:ogr', 'http://osgeo.org/gdal');
    $document->appendChild($gpxRoot);

    $metadata = $document->createElement('metadata');
    $metadata->appendChild($document->createElement('name', $filename));
    if ($description !== '') {
      $metadata->appendChild($document->createElement('desc', $description));
    }
    $gpxRoot->appendChild($metadata);

    foreach ($grouped as $type => $indexes) {
      $label = $type === '__notyped__' ? '' : $type;
      $trackName = $filename
        . ($description !== '' ? '-' . $description : '')
        . ($label !== '' ? '-' . $label : '');

      $trkRoot = $document->createElement('trk');
      $trkRoot->appendChild($document->createElement('name', $trackName));
      if ($label !== '') {
        $trkRoot->appendChild($document->createElement('type', $label));
      }

      $extensions = $document->createElement('extensions');
      $first = $tracks[$indexes[0]] ?? [];
      if (!empty($first['color']) && is_string($first['color'])) {
        $trackExtension = $document->createElement('gpxx:TrackExtension');
        $trackExtension->appendChild($document->createElement('gpxx:DisplayColor', $this->hexToGarminColor($first['color'])));
        $extensions->appendChild($trackExtension);
      }
      if (!empty($first['properties']) && is_string($first['properties'])) {
        $properties = json_decode($first['properties'], TRUE);
        if (is_array($properties)) {
          foreach ($properties as $key => $value) {
            if (preg_match('/^[a-zA-Z_][a-zA-Z0-9_.-]*$/', (string) $key) && !is_array($value) && !is_object($value)) {
              $extensions->appendChild($document->createElement('ogr:' . $key, (string) $value));
            }
          }
        }
      }
      $trkRoot->appendChild($extensions);

      foreach ($indexes as $index) {
        $geojson = $tracks[$index]['geojson'] ?? NULL;
        $encoded = is_string($geojson) ? $geojson : json_encode($geojson);
        if (!is_string($encoded) || $encoded === '') {
          continue;
        }
        try {
          $gpx = $this->geoPhp->load($encoded)->out('gpx');
        }
        catch (\Exception) {
          continue;
        }
        if (!is_string($gpx) || $gpx === '') {
          continue;
        }
        $tmp = new \DOMDocument();
        if (@$tmp->loadXML($gpx) === FALSE) {
          continue;
        }
        // geoPHP may write coordinates in scientific notation near the
        // Greenwich meridian, which is invalid per the GPX specification.
        foreach ($tmp->getElementsByTagName('trkpt') as $trkpt) {
          $trkpt->setAttribute('lon', sprintf('%F', (float) $trkpt->getAttribute('lon')));
          $trkpt->setAttribute('lat', sprintf('%F', (float) $trkpt->getAttribute('lat')));
        }
        foreach ($tmp->getElementsByTagName('trkseg') as $trkseg) {
          $imported = $document->importNode($trkseg, TRUE);
          if ($imported) {
            $trkRoot->appendChild($imported);
          }
        }
      }

      $gpxRoot->appendChild($trkRoot);
    }

    $document->preserveWhiteSpace = FALSE;
    $document->formatOutput = TRUE;
    $xml = $document->saveXML();
    return is_string($xml) ? $xml : '';
  }

  /**
   * Injects a metadata name into a GPX document.
   */
  protected function injectMetadataName(string $gpx, string $name): string {
    $previous = libxml_use_internal_errors(TRUE);
    $xml = simplexml_load_string($gpx);
    libxml_clear_errors();
    libxml_use_internal_errors($previous);
    if ($xml === FALSE) {
      throw new \InvalidArgumentException('Invalid GPX document generated.');
    }
    if (!isset($xml->metadata)) {
      $xml->addChild('metadata');
    }
    if (!isset($xml->metadata->name)) {
      $xml->metadata->addChild('name', htmlspecialchars($name, ENT_XML1 | ENT_COMPAT, 'UTF-8'));
    }
    $result = $xml->asXML();
    if ($result === FALSE) {
      throw new \InvalidArgumentException('Invalid GPX document generated.');
    }
    return $result;
  }

  /**
   * Maps an HTML color to the closest Garmin display color name.
   */
  protected function hexToGarminColor(string $value): string {
    $colors = [
      'Black' => [0, 0, 0],
      'DarkRed' => [139, 0, 0],
      'DarkGreen' => [0, 100, 0],
      'DarkYellow' => [139, 128, 0],
      'DarkBlue' => [0, 0, 139],
      'DarkMagenta' => [139, 0, 139],
      'DarkCyan' => [0, 139, 139],
      'LightGray' => [211, 211, 211],
      'DarkGray' => [169, 169, 169],
      'Red' => [255, 0, 0],
      'Green' => [0, 128, 0],
      'Yellow' => [255, 255, 0],
      'Blue' => [0, 0, 255],
      'Magenta' => [255, 0, 255],
      'Cyan' => [0, 255, 255],
      'White' => [255, 255, 255],
    ];
    $rgb = $this->htmlToRgb($value);
    if ($rgb === NULL) {
      return 'Black';
    }
    $closest = 'Black';
    $minDistance = PHP_FLOAT_MAX;
    foreach ($colors as $name => $candidate) {
      $distance = sqrt(
        ($candidate[0] - $rgb[0]) ** 2
        + ($candidate[1] - $rgb[1]) ** 2
        + ($candidate[2] - $rgb[2]) ** 2
      );
      if ($distance < $minDistance) {
        $minDistance = $distance;
        $closest = $name;
      }
    }
    return $closest;
  }

  /**
   * Converts an HTML color to RGB.
   *
   * @return int[]|null
   *   The RGB triplet, or NULL if invalid.
   */
  protected function htmlToRgb(string $color): ?array {
    $color = ltrim($color, '#');
    if (strlen($color) === 3) {
      $color = $color[0] . $color[0] . $color[1] . $color[1] . $color[2] . $color[2];
    }
    if (strlen($color) !== 6 || !ctype_xdigit($color)) {
      return NULL;
    }
    return [
      hexdec(substr($color, 0, 2)),
      hexdec(substr($color, 2, 2)),
      hexdec(substr($color, 4, 2)),
    ];
  }

}
