<?php

namespace Drupal\leaflet_edit\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\File\FileSystemInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\ResponseHeaderBag;
use Symfony\Component\HttpFoundation\Request;
use \Drupal\Component\Utility\Bytes;
use geoPHP;
use SimpleXMLElement;

class DefaultController extends ControllerBase {

    public function hello() {
        $renderable = [
            '#theme' => 'uptest',
            '#cache' => [
                'max-age' => 0,
            ],
            '#attached' => [
                'library' => [
                    'uptest/uptest',
                ],
            ],
        ];
        return $renderable;
    }

    public function saveFile(Request $request) {
        $nid = $request->get('nid');
        $fid = $request->get('fid');
        $geojson = $request->get('geojson');


        if (!$nid || !is_numeric($nid) || $nid < 0) {
            return $this->makeUploadErrorResponse('Bad NID format');
        }
        $node = \Drupal::entityTypeManager()->getStorage('node')
            ->load($nid);
        if (!$node) {
            return $this->makeUploadErrorResponse('No node with nid of ' . $nid);
        }

        if (isset($fid)) {
            // Check that this fid is attached to this nid
            $chk = \Drupal::entityQuery('node')->condition('nid', $nid)->condition('field_leafletedit_geojsonfile.target_id', $fid)->accessCheck(FALSE)->execute();

            if (count($chk) != 1) {
                return $this->makeUploadErrorResponse('fid and nid mismatch');
            }
        }

        //Get node field metadata.
        $nodeFieldMetadata = $this->getFileFieldMetaData('leaflet_edit', 'field_leafletedit_geojsonfile');
        if (!$nodeFieldMetadata) {
            return $this->makeUploadErrorResponse('Problem loading file field metadata.');
        }
        //Check the file size.
        /* $maxSizeAllowed = Bytes::toInt($nodeFieldMetadata['max file size']);
        if ($uploadedFileSize > $maxSizeAllowed) {
            return $this->makeUploadErrorResponse('File too large.');
        } */
        //Check cardinality.
        /** @var \Drupal\file\Plugin\Field\FieldType\FileFieldItemList $fieldValueInNode */
        $fieldValueInNode = $node->get('field_leafletedit_geojsonfile');
        $fieldAttachedFileItemList = $fieldValueInNode->getValue();
        $nodeFileFieldNumAttachments = count($fieldAttachedFileItemList);
        $allowedCardinality = $nodeFieldMetadata['cardinality'];
        if ($nodeFileFieldNumAttachments >= $allowedCardinality) {
            return $this->makeUploadErrorResponse('Maximum number of files for this node already reached.');
        }
        //OK. Attach the file.
        //Prepare the directory.
        $directory = 'public://' . $nodeFieldMetadata['directory'];
        $result = \Drupal::service('file_system')->prepareDirectory($directory, \Drupal\Core\File\FileSystemInterface::CREATE_DIRECTORY);
        if (!$result) {
            return $this->makeUploadErrorResponse('Error preparing directory.');
        }
        //Read the file's contents.
        $fileData = $geojson;
        //Save in right dir, creating a file entity instance.
        $savedFile = \Drupal::service('file.repository')->writeData(
            $fileData,
            $directory . '/' . 'test.geojson',
            FileSystemInterface::EXISTS_RENAME
        );
        if (!$savedFile) {
            return $this->makeUploadErrorResponse('Error saving file.');
        }

        if (isset($fid)) {
            // update node
            $updated = false;
            for ($i = 0; $i < $node->field_leafletedit_geojsonfile->count(); $i++) {
                if ($fid == $node->field_leafletedit_geojsonfile->get($i)->get('target_id')->getValue()) {
                    $node->field_leafletedit_geojsonfile->get($i)->get('target_id')->setValue($savedFile->id());
                    $updated = true;
                    break;
                }
            }
            if (!$updated) {
                return $this->makeUploadErrorResponse('Error updating node file reference.');
            }
        } else {
            //Attach to the node.
            $node->field_leafletedit_geojsonfile[] = [
                'target_id' => $savedFile->id(),
            ];
        }

        $node->save();
        return new JsonResponse([
            'success' => TRUE,
            'fid' => $savedFile->id(),
        ]);
    }

    public function exportToGpx__(Request $request) {
        $geojson = $request->get('geojson');
        $filename = $request->get('filename');

        geophp_load();

        $gpx = geoPHP::load($geojson)->out('gpx');

        $response = new Response($gpx);
        $disposition = $response->headers->makeDisposition(
            ResponseHeaderBag::DISPOSITION_ATTACHMENT,
            $filename,
        );

        // Add filename in GPX file
        $gpx_temp = simplexml_load_string($gpx);
        $gpx_temp->addChild('metadata');
        $gpx_temp->metadata->addChild('name', $filename);
        $gpx = $gpx_temp->asXML();

        // Set the content disposition
        $response->headers->set('Content-Disposition', $disposition);
        $response->headers->set('Content-Type', 'data:text/octet-stream');
        $response->headers->set('Content-Length', strlen($gpx));
        $response->headers->set('Content-Description', 'Export GPX');
        // Dispatch request
        return $response;
    }

    public function exportToGpx(Request $request) {
        $geojsons = json_decode($request->get('geojson'), true);
        $description = $request->get('description');
        $filename = $request->get('filename');

        geophp_load();

        $gpxs = [];
        foreach ($geojsons as $geojson) {
            $gpx = geoPHP::load(json_encode($geojson['geojson']))->out('gpx');
            $name = $filename .
                (strlen($description) > 0 ? '-' . $description : '') .
                (strlen($geojson['type']) > 0 ? '-' . $geojson['type'] : '');

            // Add filename in GPX file
            $gpx_temp = simplexml_load_string($gpx);
            $gpx_temp->addChild('metadata');
            $gpx_temp->metadata->addChild('name', $name);
            $gpx = $gpx_temp->asXML();

            $gpxs[] =  [
                'gpx' => $gpx,
                'filename' => $name,
            ];
        }

        $response = new JsonResponse([
            'success' => TRUE,
            'gpx' => $gpxs,
        ]);
        return $response;
    }

    public function exportToGpxMerge(Request $request) {
        $geojsons = json_decode($request->get('geojson'), true);
        $description = $request->get('description');
        $filename = $request->get('filename');

        /* foreach ($geojsons as &$geojson) {
            foreach ($geojson['geojson']['geometry']['coordinates'] as &$coords) {
                $i=0;
                foreach ($coords as &$coord) {
                        $coord[0] = sprintf('%f', $coord[0]);
                        $coord[1] = sprintf('%f', $coord[1]);
                    
                }

            }
        } */
        // prepare merge by type
        $types = [];
        $i = 0;
        for ($i = 0; $i < count($geojsons); $i++) {
            if ($geojsons[$i]['type']) {
                $types[$geojsons[$i]['type']][] = $i;
            }
        }

        geophp_load();

        $gpxs = [];

        $b = new \DOMDocument("1.0", "UTF-8");
        $gpxRoot = $b->createElement('gpx');
        $gpxRoot->setAttribute('creator', 'Drupal Leaflet Edit');
        $gpxRoot->setAttribute('version', '1.1');
        $gpxRoot->setAttribute('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance');
        $gpxRoot->setAttribute('xmlns', 'http://www.topografix.com/GPX/1/1');
        $gpxRoot->setAttribute('xmlns', 'xmlns:ogr="http://osgeo.org/gdal');
        $gpxRoot->setAttribute('xsi:schemaLocation', 'http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd http://www.garmin.com/xmlschemas/WaypointExtension/v1 http://www8.garmin.com/xmlschemas/WaypointExtensionv1.xsd http://www.garmin.com/xmlschemas/TrackPointExtension/v1 http://www.garmin.com/xmlschemas/TrackPointExtensionv1.xsd http://www.garmin.com/xmlschemas/GpxExtensions/v3 http://www8.garmin.com/xmlschemas/GpxExtensionsv3.xsd http://www.garmin.com/xmlschemas/ActivityExtension/v1 http://www8.garmin.com/xmlschemas/ActivityExtensionv1.xsd http://www.garmin.com/xmlschemas/AdventuresExtensions/v1 http://www8.garmin.com/xmlschemas/AdventuresExtensionv1.xsd http://www.garmin.com/xmlschemas/PressureExtension/v1 http://www.garmin.com/xmlschemas/PressureExtensionv1.xsd http://www.garmin.com/xmlschemas/TripExtensions/v1 http://www.garmin.com/xmlschemas/TripExtensionsv1.xsd http://www.garmin.com/xmlschemas/TripMetaDataExtensions/v1 http://www.garmin.com/xmlschemas/TripMetaDataExtensionsv1.xsd http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensions/v1 http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensionsv1.xsd http://www.garmin.com/xmlschemas/CreationTimeExtension/v1 http://www.garmin.com/xmlschemas/CreationTimeExtensionsv1.xsd http://www.garmin.com/xmlschemas/AccelerationExtension/v1 http://www.garmin.com/xmlschemas/AccelerationExtensionv1.xsd http://www.garmin.com/xmlschemas/PowerExtension/v1 http://www.garmin.com/xmlschemas/PowerExtensionv1.xsd http://www.garmin.com/xmlschemas/VideoExtension/v1 http://www.garmin.com/xmlschemas/VideoExtensionv1.xsd');
        $gpxRoot->setAttribute('xmlns:wptx1', 'http://www.garmin.com/xmlschemas/WaypointExtension/v1');
        $gpxRoot->setAttribute('xmlns:gpxtrx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3');
        $gpxRoot->setAttribute('xmlns:gpxtpx', 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1');
        $gpxRoot->setAttribute('xmlns:gpxx', 'http://www.garmin.com/xmlschemas/GpxExtensions/v3');
        $gpxRoot->setAttribute('xmlns:trp', 'http://www.garmin.com/xmlschemas/TripExtensions/v1');
        $gpxRoot->setAttribute('xmlns:adv', 'http://www.garmin.com/xmlschemas/AdventuresExtensions/v1');
        $gpxRoot->setAttribute('xmlns:prs', 'http://www.garmin.com/xmlschemas/PressureExtension/v1');
        $gpxRoot->setAttribute('xmlns:tmd', 'http://www.garmin.com/xmlschemas/TripMetaDataExtensions/v1');
        $gpxRoot->setAttribute('xmlns:vptm', 'http://www.garmin.com/xmlschemas/ViaPointTransportationModeExtensions/v1');
        $gpxRoot->setAttribute('xmlns:ctx', 'http://www.garmin.com/xmlschemas/CreationTimeExtension/v1');
        $gpxRoot->setAttribute('xmlns:gpxacc', 'http://www.garmin.com/xmlschemas/AccelerationExtension/v1');
        $gpxRoot->setAttribute('xmlns:gpxpx', 'http://www.garmin.com/xmlschemas/PowerExtension/v1');
        $gpxRoot->setAttribute('xmlns:vidx1', 'http://www.garmin.com/xmlschemas/VideoExtension/v1');
        $gpxRoot->setAttribute('xmlns:ogr', 'http://osgeo.org/gdal');

        $b->appendChild($gpxRoot);

        $XMLRoot = $b->createElement('metadata');
        $meta = $b->createElement('name', $filename);
        $XMLRoot->appendChild($meta);
        $meta = $b->createElement('desc', $description);
        $XMLRoot->appendChild($meta);
        $gpxRoot->appendChild($XMLRoot);


        foreach ($types as $type => $indexes) {

            $trkRoot = $b->createElement('trk');

            $name_done = false;
            foreach ($indexes as $index) {

                if (!$name_done) {
                    $meta = $b->createElement('name', $filename .
                        (strlen($description) > 0 ? '-' . $description : '') .
                        (strlen($type) > 0 ? '-' . $type : ''));
                    $trkRoot->appendChild($meta);
                    if ($type) {
                        $meta = $b->createElement('type', $type);
                        $trkRoot->appendChild($meta);
                    }
                    $extRoot=$b->createElement('extensions');

                    if (isset($geojsons[$index]['color'])) {
                        $gpxxRoot=$b->createElement('gpxx:TrackExtension');
                        $color = $this->hex2colorName($geojsons[$index]['color']);
                        $meta = $b->createElement('gpxx:DisplayColor', $color);
                        $gpxxRoot->appendChild($meta);
                        $extRoot->appendChild($gpxxRoot);
                    }

                    if (isset($geojsons[$index]['width'])) {
                        $lineRoot=$b->createElement('line');
                        $lineRoot->setAttribute('xmlns', 'http://www.topografix.com/GPX/gpx_style/0/2');
                        $meta = $b->createElement('width', $geojsons[$index]['width']);
                        $lineRoot->appendChild($meta);
                        $extRoot->appendChild($lineRoot);
                    }

                    if (isset($geojsons[$index]['properties'])) {
                        $props=json_decode($geojsons[$index]['properties'], true);
                        foreach ($props as $prop => $value) {
                            $meta = $b->createElement('ogr:' . $prop, $value);
                            $extRoot->appendChild($meta);
                        }
                    }

                    $trkRoot->appendChild($extRoot);

                    $name_done = true;
                }


                $gpx = geoPHP::load(json_encode($geojsons[$index]['geojson']))->out('gpx');

                $b_tmp = new \DOMDocument();
                $b_tmp->loadXML($gpx);

                // geoPHP can write numbers in scientific notation (at least when close to greenwitch meridian),
                // which is not correct with the GPX specification.
                // Rewrites all coordinates as floats
                foreach ($b_tmp->getElementsByTagName('trkpt') as $key => $value) {
                    $b_tmp->getElementsByTagName('trkpt')->item($key)->setAttribute('lon', sprintf('%f', $b_tmp->getElementsByTagName('trkpt')->item($key)->getAttribute('lon')));
                }
                // trk
                foreach ($b_tmp->getElementsByTagName('trkseg') as $trkseg) {

                    // $tr = $b->getElementsByTagName('trk');
                    // $tr1 = $tr->item($tr->count() - 1);
                    if ($ti = $b->importNode($trkseg, true)) {
                        $trkRoot->appendChild($ti);
                    }
                }
                $gpxRoot->appendChild($trkRoot);
            }
            $b->appendChild($gpxRoot);
        }

        $b->preserveWhiteSpace = false;
        $b->formatOutput = true;
        $gpxs[] =  [
            'gpx' => $b->saveXML(),
            'filename' => $filename,
        ];

        $response = new JsonResponse([
            'success' => TRUE,
            'gpx' => $gpxs,
        ]);
        return $response;
    }

    /**
     * Make a response for file upload attempt with an error message.
     *
     * @param string $message The error message.
     *
     * @return \Symfony\Component\HttpFoundation\JsonResponse Response to return to client.
     */
    protected function makeUploadErrorResponse($message) {
        $result = [
            'success' => FALSE,
            'message' => $message,
        ];
        return new JsonResponse($result);
    }

    /**
     * Get metadata for a file field.
     *
     * @param string $contentType Content type with the field.
     * @param string $fieldName Name of the field.
     *
     * @return array|bool Metadata, or false if a problem.
     */
    public function getFileFieldMetaData($contentType, $fieldName) {
        if ($contentType === '' || $fieldName === '') {
            return FALSE;
        }
        $entityFieldManager = \Drupal::service('entity_field.manager');
        $fields = $entityFieldManager->getFieldDefinitions('node', $contentType);
        if (!$fields || count($fields) === 0) {
            return FALSE;
        }
        //Get file field definition.
        if (!isset($fields[$fieldName])) {
            return FALSE;
        }
        /** @var \Drupal\field\Entity\FieldConfig $fieldDef */
        $fieldDef = $fields[$fieldName];
        //Get settings, doesn't include cardinality.
        $directory = $fieldDef->getSetting('file_directory');
        //Resolve tokens.
        /** @var \Drupal\Core\Utility\Token $tokenService */
        $tokenService = \Drupal::service('token');
        $directory = $tokenService->replace($directory);
        $fileExtensions = $fieldDef->getSetting('file_extensions');
        $maxFileSize = $fieldDef->getSetting('max_filesize');
        //Get cardinality.
        /** @var \Drupal\field\Entity\FieldStorageConfig $fieldStorageDef */
        $fieldStorageDef = $fieldDef->getFieldStorageDefinition();
        $cardinality = $fieldStorageDef->getCardinality();
        //Return results.
        $result = [
            'content type' => $contentType,
            'field' => $fieldName,
            'directory' => $directory,
            'extensions' => $fileExtensions,
            'max file size' => $maxFileSize,
            'cardinality' => $cardinality,
            'uri_scheme' => $fieldDef->getSetting('uri_scheme'),
        ];
        return $result;
    }
    private function hex2colorName($value) {
        // Garmin colors
        $colors = array(
            "Black"     => array(0, 0, 0),
            "DarkRed"     => array(139, 0, 0),
            "DarkGreen"    => array(0, 100, 0),
            "DarkYellow"      => array(139, 128, 0),
            "DarkBlue"      => array(0, 0, 139),
            "DarkMagenta"     => array(139, 0, 139),
            "DarkCyan"     => array(0, 139, 139),
            "LightGray"    => array(211, 211, 211),
            "DarkGray"    => array(169, 169, 169),
            "Red"      => array(255, 0, 0),
            "Green"       => array(0, 128, 0),
            "Yellow"      => array(255, 255, 0),
            "Blue"    => array(0, 0, 255),
            "Magenta"      => array(255, 0, 255),
            "Cyan"   => array(0, 255, 255),
            "White"      => array(255, 255, 255),
        );


        $distances = array();
        $val = $this->html2rgb($value);
        foreach ($colors as $name => $c) {
            $distances[$name] = $this->distancel2($c, $val);
        }

        $mincolor = "";
        $minval = pow(2, 30); /*big value*/
        foreach ($distances as $k => $v) {
            if ($v < $minval) {
                $minval = $v;
                $mincolor = $k;
            }
        }

        return $mincolor;
    }
    private function html2rgb($color) {
        if ($color[0] == '#')
            $color = substr($color, 1);

        if (strlen($color) == 6)
            list($r, $g, $b) = array(
                $color[0] . $color[1],
                $color[2] . $color[3],
                $color[4] . $color[5]
            );
        elseif (strlen($color) == 3)
            list($r, $g, $b) = array(
                $color[0] . $color[0],
                $color[1] . $color[1], $color[2] . $color[2]
            );
        else
            return false;

        $r = hexdec($r);
        $g = hexdec($g);
        $b = hexdec($b);

        return array($r, $g, $b);
    }

    private function distancel2(array $color1, array $color2) {
        return sqrt(pow($color1[0] - $color2[0], 2) +
            pow($color1[1] - $color2[1], 2) +
            pow($color1[2] - $color2[2], 2));
    }
}
