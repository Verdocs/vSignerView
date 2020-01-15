import { Component } from '@angular/core';
import { TemplatesService } from '../../../core/services/templates.service';
import { MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-template-delete-dialog',
  templateUrl: './template-delete.dialog.html',
  styleUrls: ['./template-delete.dialog.scss']
})
export class TemplateDeleteDialogComponent {
  public template;
  public activeIndex: any;

  constructor(
    private dialogRef: MatDialogRef<TemplateDeleteDialogComponent>,
    private templatesService: TemplatesService,
    private snackbar: MatSnackBar
  ) {
  }

  deleteTemplate() {
    if (this.template) {
      this.templatesService.deleteTemplate(this.template.id).subscribe(() => {
        this.templatesService.getTemplates().subscribe();
        this.close();
      });
    } else {
      this.close();
    }
  }

  close() {
    this.dialogRef.close()
  }

  cancel() {
    this.dialogRef.close('canceled');
  }
}
