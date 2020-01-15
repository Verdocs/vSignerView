import { DynamicField } from '../models/dynamic-field.model';
import { findIndex } from 'lodash';

export function buildFields(fields, mode) {
  /*
     * PDF 72 DPI
     * Width: 612px
     * Height: 792px
     * */

  const _fields = [];
  let order = 0;
  let role;
  switch (mode) {
    case 'signerview':
    case 'prepareview':
    case 'preview':
      role = 'recipient_role';
      break;
    case 'liveview':
      role = 'role_name';
      break;
    default:
      role = 'recipient_role';
      break;
  }
  let setting = 'setting';

  for (const fieldIndex in fields) {
    if (fields.hasOwnProperty(fieldIndex) && fields[fieldIndex]) {
      const field = fields[fieldIndex];
      let keyNameSuffix = '';
      if (!!field['settings']) {
        setting = 'settings'
      };
      switch (field.type.toLowerCase()) {
        case 'attachment':
        case 'payment':
          field[setting]['width'] = 24;
          field[setting]['height'] = 24;
          break;
        case 'checkbox':
        case 'checkbox_group':
        case 'radio_button_group':
          field[setting]['width'] = 13.5;
          field[setting]['height'] = 13.5;
          keyNameSuffix = field['optionId'] ? '-' + field['optionId'] : '';
          break;
        case 'signature':
          field[setting]['width'] = 82.63636363636;
          field[setting]['height'] = 36;
          break;
        case 'initial':
          field[setting]['width'] = 82.63636363636;
          field[setting]['height'] = 36;
          break;
        default:
          break;
      }

      const fieldValues = new DynamicField({
        key: field.name + keyNameSuffix,
        value: field[setting]['result'] || '',
        required: field.required,
        controlType: field.type,
        order: order++,
        validator: field.validator,
        showCounter: false,
        prepared: field.prepared || false,
        recipientRole: field[role],
        field_name: field.name,
        dirty: false
      });

      switch (field.type) {
        case 'attachment':
          fieldValues.value = field[setting]['name'] ? field[setting]['name'] : '';
          break;
        case 'checkbox':
          fieldValues.value = field[setting]['result'] === false ? false : true;
          break;
        case 'payment':
          fieldValues.value = field[setting]['payment_id'] ? field[setting]['payment_id'] : '';
          break;
        case 'checkbox_group':
          fieldValues.value = field[setting]['checked'];
          if (field.required || field[setting]['maximum_checked'] > 0) {
            fieldValues['min_checked'] = field[setting]['minimum_checked'];
            fieldValues['max_checked'] = field[setting]['maximum_checked'];
          }
          break;
        case 'radio_button_group':
          fieldValues.value = field[setting]['selected'];
          break;
        case 'dropdown':
          fieldValues.value = field[setting]['value'];
          fieldValues['options'] = field[setting]['options'];
          break;
        default:
          break;
      };

      if (field[setting]['url']) {
        fieldValues['url'] = field[setting]['url'];
        fieldValues['name'] = field[setting]['name'];
        fieldValues['value'] = field[setting]['name'];
      }

      if (fields[fieldIndex]) {
        _fields[fieldIndex] = fieldValues;
      }
    }
  }
  return _fields;
}

export function getFieldsMap(fields, pageNum: number) {
  let fieldsMap = {};
  for (const fieldIndex in fields) {
    if (fields.hasOwnProperty(fieldIndex) && fields[fieldIndex]) {
      const field = fields[fieldIndex];
      let keyNameSuffix = '';
      switch (field.type.toLowerCase()) {
        case 'checkbox':
        case 'checkbox_group':
        case 'radio_button_group':
          keyNameSuffix = field['optionId'] ? '-' + field['optionId'] : '';
          break;
        default:
          break;
      }
      fieldsMap[field.name + keyNameSuffix] = {
        field_name: field.name,
        keyNameSuffix: field['optionId'] ? '-' + field['optionId'] : null,
        option_id: field['optionId'],
        field_pageNum: pageNum,
        field_field_index: fieldIndex
      }
    }
  }
  return fieldsMap;
}

export function updateElementStyles(fields, _fields, mode, browserType) {
  if (fields && _fields && fields.length === _fields.length) {
    for (let x = 0; x < _fields.length; x++) {
      let fieldIndex = findIndex(fields, { name: _fields[x].field_name });
      if (fieldIndex >= 0) {
        _fields[x]['initialStyle'] = getInputStyle(fields[fieldIndex], mode, browserType);
        if (_fields[x].controlType.toLowerCase() === 'checkbox' || _fields[x].controlType.toLowerCase() === 'checkbox_group' || _fields[x].controlType.toLowerCase() === 'radio_button_group') {
          _fields[x]['checkboxStyle'] = generateCheckboxLabel(fields[fieldIndex].required);
        }
      }
    }
  }
  return _fields;
}

export function getInputStyle(field, mode, browserType) {
  const fontSize = 11;
  let setting = 'setting';
  if (!!field['settings']) {
    setting = 'settings';
  }
  const inputStyle = {
    'height': '100%',
    'width': '100%',
    'background': 'none'
  };
  if (field[setting].font_size || field.type === 'date' || field.type === 'signature' || field.type === 'initial' || field.type === 'timestamp') {
    inputStyle['fontSize'] = fontSize + 'px';
    inputStyle['letterSpacing'] = '.3px !important';
  }

  if (field.type === 'dropdown') {
    inputStyle['fontSize'] = '10.8px';
    delete inputStyle.background;
  }

  if (field.type === 'textbox') {
    inputStyle['fontSize'] = fontSize + 'px';
    inputStyle['letterSpacing'] = getLetterSpacing(browserType) + 'px';
  }
  if (field['required']) {
    inputStyle['border'] = '1px solid #cc0000';
  }
  if (field['prepared'] && field['prepared'] === true && mode !== 'prepareview') {
    inputStyle['visibility'] = 'hidden';
  }
  if (field[setting].color) {
    inputStyle['color'] = field[setting].color;
  }
  if (field[setting].upperCase) {
    inputStyle['textTransform'] = 'uppercase';
  }

  if (field[setting].leading > 0) {
    inputStyle['lineHeight'] = `${rescale(1, field[setting].leading + .5)}px`;
  }

  return inputStyle;
}

export function generateCheckboxLabel(required) {
  const labelStyle = {
    position: 'absolute',
    top: 0,
    left: 0,
    cursor: 'pointer',
    height: `13.5px`,
    width: `13.5px`,
    backgroundColor: 'transparent',
    border: '1px solid #777'
  }
  if (required === true) {
    labelStyle['boxShadow'] = '0 0 0 1px #cc0000';
  }
  return labelStyle;
};

export function getLetterSpacing(browserType) {
  switch (browserType) {
    case 'opera':
      return -0.0018;
    case 'firefox':
      return -0.23594210526315787;
    case 'ie':
      return -0.0019;
    case 'edge':
      return -0.0019;
    case 'chrome':
      return -0.0018;
    case 'safari':
      return -0.0018;
    case 'blink':
      return -0.0018;
    default:
      return -0.0018;
  }
}

export function rescale(r, n): number {
  return r * n;
}

export function prepareFieldsForSigner(fields) {
  let fieldsForCurrentSigner = new Array(fields.length);
}
