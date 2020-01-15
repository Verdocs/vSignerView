import { PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export class SSRService {

  constructor(
    @Inject(PLATFORM_ID) private platform
  ) {}

  isBrowser(): boolean {
    return isPlatformBrowser(this.platform);
  }
}
