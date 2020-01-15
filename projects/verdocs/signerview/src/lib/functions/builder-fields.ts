import { findIndex } from 'lodash';
import { getRGBA, nameToRGBA } from 'app/core/functions/rgb';
import { getLetterSpacing } from 'app/core/functions/viewer-fields';
import { getUIFieldStyling } from 'app/core/functions/conversion';

export function setRatio(pages, pdfPages) {
  for (let i = 0; i < pages.length; i++) {
    for (let j = 0; j < pages[i].fields.length; j++) {
      if (pages[i].fields[j]) {
        pages[i].fields[j]['ratio'] = {
          x: pdfPages[i].xRatio,
          y: pdfPages[i].yRatio
        };
      }
    }
  }
  return pages;
}

export function constructPages(pages, roles, pdfPages, browserType) {
  if (pages && pages.length > 0) {
    let fieldPages = new Array(pages.length);
    for (let i = 0; i < pages.length; i++) {
      fieldPages[i] = { fields: [] }
      for (let j = 0; j < pages[i].fields.length; j++) {
        if (pages[i].fields[j]['setting'] && pages[i].fields[j]['setting']['options'] &&
          pages[i].fields[j]['setting']['options'].length > 0 && (pages[i].fields[j]['type'] === 'checkbox_group') ||
          pages[i].fields[j]['type'] === 'radio_button_group') {
          const groupFields = constructGroupFields(pages, i, j, roles, pdfPages, fieldPages, browserType);
          fieldPages[i].fields.concat(groupFields);
        } else {
          const fieldCopy = { ...pages[i].fields[j] };
          const copyIndex = findIndex(fieldPages[i].fields, { name: fieldCopy.name });
          fieldCopy['originalIndex'] = j;
          if (fieldCopy.type !== 'checkbox_group' && fieldCopy.type !== 'radio_button_group') {
            fieldCopy['initialStyle'] = generateInitialStyle(fieldCopy, roles, browserType);
            fieldCopy['style'] = generateStyle(fieldCopy, pdfPages);
          }
          if (fieldCopy.type === 'checkbox' || fieldCopy.type === 'checkbox_group' || fieldCopy.type === 'radio_button_group') {
            fieldCopy['checkboxStyle'] = generateGroupLabel(i, fieldCopy.role_name, roles, pdfPages);
          }
          if (copyIndex < 0) {
            fieldPages[i].fields[fieldPages[i].fields.length] = fieldCopy;
          }
        }
      }
    }
    return fieldPages;
  } else {
    return [];
  }
}

export function constructGroupFields(pages, i, j, roles, pdfPages, fieldPages, browserType) {
  let k = 0;
  const optionsLength = pages[i].fields[j]['setting']['options'].length
  while (k < optionsLength) {
    const fieldCopy = { ...pages[i].fields[j] };
    const options = pages[i].fields[j]['setting']['options'][k];
    fieldCopy.setting['x'] = options.x;
    fieldCopy.setting['y'] = options.y;
    if (fieldCopy.type === 'checkbox_group') {
      fieldCopy.setting['checked'] = options.checked;
    } else {
      fieldCopy.setting['selected'] = options.selected;
    }
    fieldCopy['initialStyle'] = generateInitialStyle(fieldCopy, roles, browserType);
    fieldCopy['style'] = generateStyle(fieldCopy, pdfPages);
    fieldCopy['checkboxStyle'] = generateGroupLabel(i, fieldCopy.role_name, roles, pdfPages);
    fieldCopy['originalIndex'] = j;
    fieldCopy['optionIndex'] = k;
    fieldCopy['optionId'] = options.id;
    const copyIndex = findIndex(fieldPages[i].fields, { optionIndex: fieldCopy.optionIndex, name: fieldCopy.name });
    if (copyIndex < 0) {
      fieldPages[i].fields[fieldPages[i].fields.length] = fieldCopy;
    }
    k++;
  }
  return fieldPages;
}

export function generateInitialStyle(field, roles, browserType) {
  const fontSize = 9.5;
  const setting = field.setting;
  const role_name = field.role_name;
  const initialStyle = {
    height: '100%',
    width: '100%',
    backgroundColor: getRoleColor(role_name, roles),
    letterSpacing: null,
    fontSize: null
  };
  field['initialStyle'] = initialStyle;
  switch (field.type) {
    case 'textbox':
    case 'textarea':
      field['initialStyle']['letterSpacing'] = convertToUIRatio(getLetterSpacing(browserType), field['ratio'].x) + 'px';
    case 'signature':
    case 'initial':
    case 'date':
    case 'dropdown':
      field['initialStyle']['fontSize'] = convertToUIRatio(fontSize, field['ratio'].x) + 'px';
      break;
    case 'timestamp':
        field['initialStyle']['fontSize'] = convertToUIRatio(8.5, field['ratio'].x) + 'px';
      break;
    case 'attachment':
    case 'payment':
      field['initialStyle']['height'] = '24px';
      field['initialStyle']['mat-icon'] = {
        position: 'absolute',
        top: 0,
        left: 0,
        height: '24px',
        width: '24px',
        lineHeight: '24px',
        fontSize: '18px'
      }
      break;
    default:
      break;
  }

  if (setting.leading && setting.leading > 0) {
    field.initialStyle['line-height'] = convertToUIRatio(setting.leading + .11395, field['ratio'].y) + 'px';
  }
  return field.initialStyle;
}

export function generateStyle(field, pdfPages) {
  return getUIFieldStyling(field);
}

export function generateGroupLabel(i, role_name, roles, pdfPages) {
  return {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '13.5px',
    width: '13.5px',
    backgroundColor: getRoleColor(role_name, roles),
    border: '2px solid #777'
  }
}

export function getRoleColor(name, roles, index?) {
  if (index) {
    return getRGBA(index);
  } else if (roles && roles.length > 0) {
    index = findIndex(roles, { name: name });
    if (index >= 0) {
      return roles[index].rgba ? roles[index].rgba : getRGBA(index);
    } else {
      return nameToRGBA(name);
    }
  } else {
    return nameToRGBA(name);
  }
}

export function convertToUIRatio(value: number, ratio) {
  return value * ratio;
}
