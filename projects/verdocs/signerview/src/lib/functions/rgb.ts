export function getRGB(rgba) {
  const rgbNumbers = rgba.replace('rgba(', '').replace(')', '').split(',');
  const rgbObject = {
    red: rgbNumbers[0],
    green: rgbNumbers[1],
    blue: rgbNumbers[2],
    alpha: rgbNumbers[3]
  };
  const alpha = 1 - rgbObject.alpha;
  const red = Math.round((rgbObject.alpha * (rgbObject.red / 255) + alpha) * 255);
  const green = Math.round((rgbObject.alpha * (rgbObject.green / 255) + alpha) * 255);
  const blue = Math.round((rgbObject.alpha * (rgbObject.blue / 255) + alpha) * 255);
  return ('#' + rgbToHex(red) + rgbToHex(green) + rgbToHex(blue));
}

function rgbToHex(rgb: number) {
  const hex = rgb.toString(16);
  if (hex.length < 2) {
    return '0' + hex;
  }
  return hex;
}

export function getRGBA(index) {
  switch (index % 10) {
    case 0:
      return index === 0 ? 'rgba(255, 193, 7, 0.4)' : 'rgba(134, 134, 134, 0.3)'; //#FFE69C
    case 1:
      return 'rgba(156, 39, 176, .4)'; //'#E3C3E9'
    case 2:
      return 'rgba(33, 150, 243, .4)'; //'#C1E1FB'
    case 3:
      return 'rgba(220, 231, 117, 0.3)';
    case 4:
      return 'rgba(121, 134, 203, 0.3)';
    case 5:
      return 'rgba(77, 182, 172, 0.3)';
    case 6:
      return 'rgba(255, 202, 165, 0.3)';
    case 7:
      return 'rgba(2, 247, 190, 0.3)';
    case 8:
      return 'rgba(255, 138, 101, 0.3)';
    case 9:
      return 'rgba(82, 255, 79, 0.3)';
    default:
      return 'rgba(229, 115, 155, 0.3)';
  }
}

export function nameToRGBA(str) {
  if (!!str) {
    const validNum = parseInt(str.slice(-1), 10);
    if (!isNaN(validNum)) {
      str += (validNum * 99).toString();
    }
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    hash = Math.round(hash / 1.3);
    const c = (hash & 0x00FFFF08)
      .toString(16)
      .toUpperCase();
    const hex = '#' + '00000'.substring(0, 6 - c.length) + c;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    const color = {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    };
    return `rgba(${color.r}, ${color.g}, ${color.b}, 0.2)`;
  }
}