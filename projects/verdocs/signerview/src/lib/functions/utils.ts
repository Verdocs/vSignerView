import printJS from 'print-js';


export function regParse(string: string) {
  return JSON.parse(string, function (key, value) {
    let prefix;
    if (typeof value !== 'string') {
      return value;
    }
    if (value.length < 8) {
      return value;
    }
    prefix = value.substring(0, 8);

    if (prefix === 'function') {
      return eval('(' + value + ')');
    }
    if (prefix === '_PxEgEr_') {
      return eval(value.slice(8));
    }
    if (prefix === '_NuFrRa_') {
      return eval(value.slice(8));
    }
    return value;
  });
}

export function dataURLtoBlob(dataUrl, type: string = 'image/png') {
  const arr = dataUrl.split(','),
    // mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]);
    let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: type });
}

export function printPdfUrl(pdfUrl) {
  if (typeof (pdfUrl) === 'string') {
    printJS(pdfUrl);
  } else {
    console.error('pdfUrl should be provided, instead received: ', pdfUrl );
  }
}
