export function getDefaultHeight(field) {
  let height = 0;
  switch (field.type) {
    case 'signature':
    case 'initial':
      height = 36;
      break;
    case 'checkbox':
    case 'checkbox_group':
    case 'radio_button_group':
      height = 13.5;
      break;
    case 'attachment':
    case 'payment':
      height = 24;
      break;
    default:
      height = field.setting['height'] || 0;
      break;
  }
  return height;
}

export function getDefaultWidth(field) {
  let width = 0;
  switch (field.type) {
    case 'signature':
    case 'initial':
      width = 82.63636363636;
      break;
    case 'checkbox':
    case 'checkbox_group':
    case 'radio_button_group':
      width = 13.5;
      break;
    case 'attachment':
    case 'payment':
      width = 24;
      break;
    case 'date':
      width = 64;
      break;
    case 'dropdown':
      width = field.setting['width'] || 64;
      break;
    default:
      width = field.setting['width'] || 0;
      break;
  }
  return width;
}

export function getRTop(y, fieldHeight, iTextHeight, yRatio) {
  return iTextHeight - ((y + fieldHeight) * yRatio);
}

export function getRLeft(x, ratio) {
  return x * ratio;
}

export function getRValue(y, ratio) {
  return y * ratio;
}

export function getUIFieldStyling(field) {
  const height = getDefaultHeight(field);
  const style = {
    left: field.setting.x + 'px',
    bottom: field.setting.y + 'px',
    height: '100%',
    width: '100%'
  };

  switch (field.type) {
    case 'textbox':
    case 'date':
    case 'timestamp':
    case 'placeholder':
    case 'dropdown':
      style['maxHeight'] = height + 'px';
      style['maxWidth'] = field.setting.width + 'px';
      break;
    case 'checkbox':
    case 'checkbox_group':
    case 'radio_button_group':
      style['maxHeight'] = 13.5 + 'px';
      style['maxWidth'] = 13.5 + 'px';
      break;
    case 'attachment':
    case 'payment':
      style['maxHeight'] = 24 + 'px';
      style['maxWidth'] = 24 + 'px';
      break;
    case 'signature':
    case 'initial':
      style['maxHeight'] = 36 + 'px';
      style['maxWidth'] = 82.63636363636 + 'px';
      style['line-height'] = 36 + 'px';
      break;
    default:
      break;
  }
  return style;
}
export function blobToBase64(image: Blob) {
  const fileReader = new FileReader();
  return new Promise((resolve, reject) => {
    fileReader.onerror = () => {
      reject(new DOMException("Problem reading blob."));
    }

    fileReader.onload = () => {
      resolve(fileReader.result);
    }

    fileReader.readAsDataURL(image);
  })
}
