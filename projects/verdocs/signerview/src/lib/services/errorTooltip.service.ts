import { Injectable } from '@angular/core';

@Injectable()
export class ErrorTooltipService {
  private activeElement = null;
  private fieldPage: number;
  private fieldIndex: number;
  private fieldType: string;

  setActiveElement(element) {
    this.activeElement = element;
  }

  getActiveElement() {
    return this.activeElement;
  }

  clearActiveElement() {
    this.activeElement = null;
  }

  setActiveField(pageNum, fieldIndex, type) {
    this.fieldPage = pageNum;
    this.fieldIndex = fieldIndex;
    this.fieldType = type;
  }

  getActiveField() {
    return {
      pageNum: this.fieldPage,
      fieldIndex: this.fieldIndex,
      type: this.fieldType
    }
  }

  clearActiveField() {
    this.fieldPage = null;
    this.fieldIndex = null;
    this.fieldType = null;
  }
}
