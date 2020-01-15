export function isInView(scrollTop, pageTop, pageHeight) {
  if (typeof scrollTop === 'undefined') {
    return null
  }
  if (window) {
    let headerHeight = 112;
    const viewportWidth = window.innerWidth;
    if (viewportWidth > 600) {
      headerHeight = 128;
    }
    const viewportHeight = window.innerHeight - headerHeight;
    return topOfPageIsInView(scrollTop, pageTop, viewportHeight) ||
      middleOfPageIsInView(scrollTop, pageTop, pageHeight, viewportHeight) ||
      bottomOfPageIsInView(scrollTop, pageTop, pageHeight, viewportHeight);
  }
}

export function topOfPageIsInView(scrollTop, pageTop, viewportHeight): boolean {
  return pageTop > scrollTop && pageTop < scrollTop + viewportHeight
}

export function middleOfPageIsInView(scrollTop, pageTop, pageHeight, viewportHeight): boolean {
  const viewportBottom = scrollTop + viewportHeight;
  const pageBottom = pageTop + pageHeight
  return scrollTop > pageTop && viewportBottom < pageBottom;
}

export function bottomOfPageIsInView(scrollTop, pageTop, pageHeight, viewportHeight): boolean {
  const viewportBottom = scrollTop + viewportHeight;
  const pageBottom = pageTop + pageHeight
  return viewportBottom > pageBottom && scrollTop < pageBottom;
}