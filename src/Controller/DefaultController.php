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
        $geojson = $request->get('geojson');
        $description = $request->get('description');
        $filename = $request->get('filename');

        geophp_load();

        $gpx = geoPHP::load($geojson)->out('gpx');

        // Add filename in GPX file
        $gpx_temp = simplexml_load_string($gpx);
        $gpx_temp->addChild('metadata');
        $gpx_temp->metadata->addChild('name', $filename . (strlen($description) > 0 ? '-' . $description : ''));
        $gpx = $gpx_temp->asXML();

        $response = new JsonResponse([
            'success' => TRUE,
            'gpx' => $gpx,
            'filename' => $filename,
            'description' => $description,
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
}
