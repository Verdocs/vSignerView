import { Injectable } from '@angular/core';

@Injectable()
export class LazyService {

  getRenderableIndexes(scrollTop: number, pdfPages: any[]): number[] {
    const totalPages = pdfPages.length;
    if (window) {
      const windowWidth = window.innerWidth;
      const windowHeight = window.innerHeight;
      let headerHeight = 112;
      if (windowWidth > 600) {
        headerHeight = 128;
      }
      const pageHeight = windowHeight - headerHeight;
      const viewableIndex = [];
      let pageLength = 0;
      for (let x = 0; x < totalPages; x++) {
        pageLength += pdfPages[x].height;
        if (scrollTop < pageLength) {
          viewableIndex.push(x);
        } else if (scrollTop + pageHeight > pageLength ) {
          viewableIndex.push(x);
        }
      }
    }

    return [1, 0];
  }
}
