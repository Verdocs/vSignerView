import { Injectable } from '@angular/core';

@Injectable()
export class BrowserToiTextService {
  detectBrowser() {
    //noinspection TypeScriptUnresolvedVariable
    let isFirefox = false;
    if ('InstallTrigger' in window) {
      isFirefox = true;
    }

    const isOpera = (!!window['opr'] && !!window['opr'].addons) || !!window['opera'] || navigator.userAgent.indexOf(' OPR/') >= 0;

    const isSafari = /constructor/i.test(window['HTMLElement']) || (function (p) { return p.toString() === "[object SafariRemoteNotification]"; })(!window['safari'] || (window['safari'] && window['safari'].pushNotification));

    const isIE = /*@cc_on!@*/false || !!document['documentMode'];

    const isEdge = !isIE && !!window['StyleMedia'];

    const isChrome = !!window['chrome'] && !!window['chrome'].webstore;

    const isBlink = (isChrome || isOpera) && !!window['CSS'];


    if (isOpera) {
      return 'opera';
    } else if (isFirefox) {
      return 'firefox';
    } else if (isIE) {
      return 'ie';
    } else if (isEdge) {
      return 'edge';
    } else if (isChrome) {
      return 'chrome';
    } else if (isBlink) {
      return 'blink'
    } else if (isSafari) {
      return 'safari'
    }
    return 'unknown';
  }

  getLetterSpacing() {
    const browserType = this.detectBrowser();
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
}
