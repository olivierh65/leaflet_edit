<?php

namespace Drupal\leaflet_edit\Plugin\Field\FieldWidget;

use Drupal\file\Plugin\Field\FieldWidget\FileWidget;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Core\Field\FieldItemListInterface;

/**
 * Provides the field widget for Symbol field.
 *
 * @FieldWidget(
 *   id = "geojsonfile_widget",
 *   label = @Translation("geojson File widget"),
 *   description = @Translation("An File field with a text field for a description"),
 *   field_types = {
 *     "geojsonfile_field"
 *   }
 * )
 */
class GeojsonFileWidget extends FileWidget {

    /**
     * {@inheritdoc}
     */
    public function formElement(FieldItemListInterface $items, $delta, array $element, array &$form, FormStateInterface $form_state) {
    // The formElement method returns the form for a single field widget (Used to render the form in the Admin Interface of Drupal)
    // We need to add our new field to this

        // Get the parents form elements
        $element = parent::formElement($items, $delta, $element, $form, $form_state);

        // Get the field settings
        $field_settings = $this->getFieldSettings();

        // Add the field setting for the description field to the array, so that the process function can access it to see if it is enabled
        // $element['#field_description'] = $field_settings['field_description'];

        // Add the render array for our new field
        $element['Style'] = [
            '#type' => 'details',
            '#title' => $this->t('Style'),
            '#open' => TRUE,
            '#weight' => 20,
          ];
          $element['Style']['stroke'] = [
            '#type' => 'checkbox',
            '#title' => $this->t('<em>Stroke</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('stroke') ?? TRUE, */
            '#description' => $this->t('Whether to draw stroke along the path. Set it to false to disable borders on polygons or circles.'),
            '#weight' => 1,
          ];
          $element['Style']['color'] = [
            '#type' => 'color',
            '#title' => $this->t('<em>Color</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('color') ?? '#F00FE8', */
            '#description' => $this->t('Stroke color.'),
            '#weight' => 2,
          ];
          $element['Style']['weight'] = [
            '#type' => 'number',
            '#title' => $this->t('<em>Weight</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('weight') ?? 2, */
            '#description' => $this->t('Stroke width in pixels.'),
            '#min' => 1,
            '#step' => 1,
            '#max' => 20,
            '#weight' => 3,
          ];
          $element['Style']['opacity'] = [
            '#type' => 'range',
            '#title' => $this->t('<em>Opacity</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('opacity') ?? 1, */
            '#description' => $this->t('Stroke opacity.'),
            '#min' => 0,
            '#max' => 1,
            '#step' => 0.1,
            '#weight' => 4,
          ];
          $element['Style']['linecap'] = [
            '#type' => 'select',
            '#title' => $this->t('<em>LineCap</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('linecap') ?? 'round', */
            '#description' => $this->t('A string that defines shape to be used at the end of the stroke.'),
            '#options' => [
              'butt' => 'Butt : indicates that the stroke for each subpath does not extend beyond its two endpoints.',
              'round' => 'Round : indicates that at the end of each subpath the stroke will be extended by a half circle with a diameter equal to the stroke width.',
              'square' => 'Square : indicates that at the end of each subpath the stroke will be extended by a rectangle with a width equal to half the width of the stroke and a height equal to the width of the stroke.',
            ],
            '#weight' => 5,
          ];
          $element['Style']['linejoin'] = [
            '#type' => 'select',
            '#title' => $this->t('<em>LineJoin</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('linejoin') ?? 'round', */
            '#description' => $this->t('A string that defines shape to be used at the corners of the stroke.'),
            '#options' => [
              'arcs' => 'Arcs : indicates that an arcs corner is to be used to join path segments.',
              'bevel' => 'Bevel : indicates that a bevelled corner is to be used to join path segments.',
              'miter' => 'Miter : indicates that a sharp corner is to be used to join path segments.',
              'miter-clip' => 'Miter-Clip : indicates that a sharp corner is to be used to join path segments.',
              'round' => 'Round : indicates that a round corner is to be used to join path segments.',
            ],
            '#weight' => 6,
          ];
          $element['Style']['dasharray'] = [
            '#type' => 'textfield',
            '#title' => $this->t('<em>dashArray</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('dasharray') ?? NULL, */
            '#description' => $this->t('A string that defines the stroke <a href="https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin>dash pattern</a>. Doesn\'t work on Canvas-powered layers in some old browsers.'),
            '#maxlength' => 64,
            '#pattern' => '([0-9]+)(,[0-9]+)*',
            '#weight' => 7,
          ];
          $element['Style']['dashoffset'] = [
            '#type' => 'textfield',
            '#title' => $this->t('<em>dashOffset</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('dashoffset') ?? 0, */
            '#description' => $this->t('A string that defines the <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset">distance into the dash</a> pattern to start the dash.'),
            '#maxlength' => 64,
            '#pattern' => '([0-9]+)|([0-9]+%)',
            '#weight' => 8,
          ];
          $element['Style']['fill'] = [
            '#type' => 'checkbox',
            '#title' => $this->t('<em>Fill</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('fill') ?? FALSE, */
            '#description' => $this->t('Whether to fill the path with color. Set it to false to disable filling on polygons or circle'),
            '#weight' => 9,
          ];
          $element['Style']['fill_color'] = [
            '#type' => 'color',
            '#title' => $this->t('<em>Fill Color</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('fill_color') ?? '#C7A8A8', */
            '#description' => $this->t('Fill Color.'),
            '#weight' => 10,
          ];
          $element['Style']['fill_opacity'] = [
            '#type' => 'range',
            '#title' => $this->t('<em>Fill Opacity</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('fill_opacity') ?? 0.2, */
            '#description' => $this->t('Stroke opacity.'),
            '#min' => 0,
            '#max' => 1,
            '#step' => 0.1,
            '#weight' => 11,
          ];
          $element['Style']['fillrule'] = [
            '#type' => 'select',
            '#title' => $this->t('<em>Fill Rule</em> field'),
            /* '#default_value' => $this->config('geojson_file.settings')->get('fillrule') ?? 'evenodd', */
            '#description' => $this->t('A string that defines <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule">how the inside of a shape</a> is determined.'),
            '#options' => [
              'nonzero ' => 'Nonzero : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction, and then examining the places where a segment of the shape crosses the ray',
              'evenodd' => 'Evenodd : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction and counting the number of path segments from the given shape that the ray crosses.',
            ],
            '#weight' => 12,
          ];
        // Return the updated widget
        return $element;

    }

     /**
     * {@inheritdoc}
     */
    public static function process($element, FormStateInterface $form_state, $form) {

        $item = $element['#value'];
        $item['fids'] = $element['fids']['#value'];

        // Add the render array for our new field
        $element['Style'] = [
            '#type' => 'details',
            '#title' => t('Style'),
            '#open' => TRUE,
            '#weight' => 20,
          ];
          $element['Style']['stroke'] = [
            '#type' => 'checkbox',
            '#title' => t('<em>Stroke</em> field'),
            '#default_value' => isset($item['stroke']) ? $item['stroke'] : TRUE,
            '#description' => t('Whether to draw stroke along the path. Set it to false to disable borders on polygons or circles.'),
            '#weight' => 1,
          ];
          $element['Style']['color'] = [
            '#type' => 'color',
            '#title' => t('<em>Color</em> field'),
            '#default_value' => isset($item['color']) ? $item['color'] : '#F00FE8',
            '#description' => t('Stroke color.'),
            '#weight' => 2,
          ];
          $element['Style']['weight'] = [
            '#type' => 'number',
            '#title' => t('<em>Weight</em> field'),
            '#default_value' => isset($item['weight']) ? $item['weight'] : 2,
            '#description' => t('Stroke width in pixels.'),
            '#min' => 1,
            '#step' => 1,
            '#max' => 20,
            '#weight' => 3,
          ];
          $element['Style']['opacity'] = [
            '#type' => 'range',
            '#title' => t('<em>Opacity</em> field'),
            '#default_value' => isset($item['opacity']) ? $item['opacity'] : 1,
            '#description' => t('Stroke opacity.'),
            '#min' => 0,
            '#max' => 1,
            '#step' => 0.1,
            '#weight' => 4,
          ];
          $element['Style']['linecap'] = [
            '#type' => 'select',
            '#title' => t('<em>LineCap</em> field'),
            '#default_value' => isset($item['linecap']) ? $item['linecap'] : 'round',
            '#description' => t('A string that defines shape to be used at the end of the stroke.'),
            '#options' => [
              'butt' => 'Butt : indicates that the stroke for each subpath does not extend beyond its two endpoints.',
              'round' => 'Round : indicates that at the end of each subpath the stroke will be extended by a half circle with a diameter equal to the stroke width.',
              'square' => 'Square : indicates that at the end of each subpath the stroke will be extended by a rectangle with a width equal to half the width of the stroke and a height equal to the width of the stroke.',
            ],
            '#weight' => 5,
          ];
          $element['Style']['linejoin'] = [
            '#type' => 'select',
            '#title' => t('<em>LineJoin</em> field'),
            '#default_value' => isset($item['linejoin']) ? $item['linejoin'] : 'round',
            '#description' => t('A string that defines shape to be used at the corners of the stroke.'),
            '#options' => [
              'arcs' => 'Arcs : indicates that an arcs corner is to be used to join path segments.',
              'bevel' => 'Bevel : indicates that a bevelled corner is to be used to join path segments.',
              'miter' => 'Miter : indicates that a sharp corner is to be used to join path segments.',
              'miter-clip' => 'Miter-Clip : indicates that a sharp corner is to be used to join path segments.',
              'round' => 'Round : indicates that a round corner is to be used to join path segments.',
            ],
            '#weight' => 6,
          ];
          $element['Style']['dasharray'] = [
            '#type' => 'textfield',
            '#title' => t('<em>dashArray</em> field'),
            '#default_value' => isset($item['dasharray']) ? $item['dasharray'] : NULL,
            '#description' => t('A string that defines the stroke <a href="https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin>dash pattern</a>. Doesn\'t work on Canvas-powered layers in some old browsers.'),
            '#maxlength' => 64,
            '#pattern' => '([0-9]+)(,[0-9]+)*',
            '#weight' => 7,
          ];
          $element['Style']['dashoffset'] = [
            '#type' => 'textfield',
            '#title' => t('<em>dashOffset</em> field'),
            '#default_value' => isset($item['dashoffset']) ? $item['dashoffset'] : 0,
            '#description' => t('A string that defines the <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/stroke-dashoffset">distance into the dash</a> pattern to start the dash.'),
            '#maxlength' => 64,
            '#pattern' => '([0-9]+)|([0-9]+%)',
            '#weight' => 8,
          ];
          $element['Style']['fill'] = [
            '#type' => 'checkbox',
            '#title' => t('<em>Fill</em> field'),
            '#default_value' => isset($item['fill']) ? $item['fill'] : FALSE,
            '#description' => t('Whether to fill the path with color. Set it to false to disable filling on polygons or circle'),
            '#weight' => 9,
          ];
          $element['Style']['fill_color'] = [
            '#type' => 'color',
            '#title' => t('<em>Fill Color</em> field'),
            '#default_value' => isset($item['fill_color']) ? $item['fill_color'] : '#C7A8A8',
            '#description' => t('Fill Color.'),
            '#weight' => 10,
          ];
          $element['Style']['fill_opacity'] = [
            '#type' => 'range',
            '#title' => t('<em>Fill Opacity</em> field'),
            '#default_value' => isset($item['fill_opacity']) ? $item['fill_opacity'] : 0.2,
            '#description' => t('Stroke opacity.'),
            '#min' => 0,
            '#max' => 1,
            '#step' => 0.1,
            '#weight' => 11,
          ];
          $element['Style']['fillrule'] = [
            '#type' => 'select',
            '#title' => t('<em>Fill Rule</em> field'),
            '#default_value' => isset($item['fillrule']) ? $item['fillrule'] : 'evenodd',
            '#description' => t('A string that defines <a href="https://developer.mozilla.org/docs/Web/SVG/Attribute/fill-rule">how the inside of a shape</a> is determined.'),
            '#options' => [
              'nonzero ' => 'Nonzero : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction, and then examining the places where a segment of the shape crosses the ray',
              'evenodd' => 'Evenodd : determines the "insideness" of a point in the shape by drawing a ray from that point to infinity in any direction and counting the number of path segments from the given shape that the ray crosses.',
            ],
            '#weight' => 12,
          ];

        $element['description'] = array(
            '#title' => t('Description'),
            '#type' => 'textfield',
            '#default_value' => isset($item['description']) ? $item['description'] : '',
            '#description' => t('A description of the track.'),
            // #access renders to page only under certain conditions
            // $item[fids] (Does it have an image specified)
            // $element[#field_description] (is the #field_description setting set to 1?)
            '#access' => (bool) $item['fids'] /* && $element['#field_description'] */,
            '#maxlength' => '512',
            '#weight' => '-10',
        );

        // Return the processed image as per Parents method
        return parent::process($element, $form_state, $form);

    }

}
