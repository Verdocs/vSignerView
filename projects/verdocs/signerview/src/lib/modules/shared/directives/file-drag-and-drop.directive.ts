import { Directive, Output, EventEmitter, HostBinding, HostListener } from '@angular/core';

@Directive({
  selector: '[fileDragDrop]'
})
export class FileDragDropDirective {
  @Output() onFileDrop = new EventEmitter<any>();

  @HostBinding('style.background-color') public background = '#F5F5F5';
  @HostBinding('style.opacity') public opacity = '1';
  @HostBinding('style.border-color') public borderColor = "#979797"

  @HostListener('dragover', ['$event']) public onDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    this.background = '#d8efe2';
    this.borderColor = '#50BE80';
    this.opacity = '0.8';
  }

  @HostListener('dragleave', ['$event']) public onDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    this.background = '#F5F5F5';
    this.borderColor = '#979797';
    this.opacity = '1';
  }

  @HostListener('drop', ['$event']) public onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    this.background = '#F5F5F5';
    this.borderColor = '#979797';
    this.opacity = '1';
    let files = event.dataTransfer.files;
    if (files.length > 0) {
      this.onFileDrop.emit(files);
    }
  }
}
