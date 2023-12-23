<?php

namespace Drupal\leaflet_edit\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\Core\File\FileSystemInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use \Drupal\Component\Utility\Bytes;


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
        if (!$nid || !is_numeric($nid) || $nid < 0) {
            return $this->makeUploadErrorResponse('Bad NID format');
        }
        $node = $this->entityTypeManager->getStorage('node')
            ->load($nid);
        if (!$node) {
            return $this->makeUploadErrorResponse('No node with nid of ' . $nid);
        }
        /** @var \Symfony\Component\HttpFoundation\File\UploadedFile $uploadedFile */
        $uploadedFile = $request->files->get('file');
        if (!$uploadedFile->isValid()) {
            return $this->makeUploadErrorResponse('Invalid file upload.');
        }
        //Get uploaded file metadata.
        $uploadedFileName = $uploadedFile->getClientOriginalName();
        $uploadedFileExtension = $uploadedFile->getClientOriginalExtension();
        $uploadedFileSize = $uploadedFile->getClientSize();
        $uploadedFilePath = $uploadedFile->getPathname();
        //Get node field metadata.
        $nodeFieldMetadata = $this->getFileFieldMetaData('file_test', 'field_da_files');
        if (!$nodeFieldMetadata) {
            return $this->makeUploadErrorResponse('Problem loading file field metadata.');
        }
        //Check uploaded file's extension.
        $allowedExtensions = explode(' ', $nodeFieldMetadata['extensions']);
        if (!in_array($uploadedFileExtension, $allowedExtensions)) {
            return $this->makeUploadErrorResponse('Extension not allowed.');
        }
        //Check the file size.
        $maxSizeAllowed = Bytes::toInt($nodeFieldMetadata['max file size']);
        if ($uploadedFileSize > $maxSizeAllowed) {
            return $this->makeUploadErrorResponse('File too large.');
        }
        //Check cardinality.
        /** @var \Drupal\file\Plugin\Field\FieldType\FileFieldItemList $fieldValueInNode */
        $fieldValueInNode = $node->get('field_da_files');
        $fieldAttachedFileItemList = $fieldValueInNode->getValue();
        $nodeFileFieldNumAttachments = count($fieldAttachedFileItemList);
        $allowedCardinality = $nodeFieldMetadata['cardinality'];
        if ($nodeFileFieldNumAttachments >= $allowedCardinality) {
            return $this->makeUploadErrorResponse('Maximum number of files for this node already reached.');
        }
        //OK. Attach the file.
        //Prepare the directory.
        $directory = 'private://' . $nodeFieldMetadata['directory'];
        $result = file_prepare_directory($directory, FileSystemInterface::CREATE_DIRECTORY);
        if (!$result) {
            return $this->makeUploadErrorResponse('Error preparing directory.');
        }
        //Read the file's contents.
        $fileData = file_get_contents($uploadedFilePath);
        //Save in right dir, creating a file entity instance.
        $savedFile = file_save_data(
            $fileData,
            $directory . '/' . $uploadedFileName,
            FileSystemInterface::EXISTS_RENAME
        );
        if (!$savedFile) {
            return $this->makeUploadErrorResponse('Error saving file.');
        }
        //Attach to the node.
        $node->field_da_files[] = [
            'target_id' => $savedFile->id(),
        ];
        $node->save();
        return new JsonResponse([
            'success' => TRUE,
        ]);
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
        ];
        return $result;
    }
}
