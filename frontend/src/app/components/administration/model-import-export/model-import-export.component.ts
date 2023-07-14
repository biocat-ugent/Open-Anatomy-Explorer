import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BackendService } from 'src/app/services/backend.service';
import { PageArgs } from 'src/app/types';
import { HttpEventType, HttpResponse } from '@angular/common/http';
import { NgbCollapseModule } from '@ng-bootstrap/ng-bootstrap';
import {RoleService} from "src/app/services/role.service"

@Component({
  selector: 'app-model-import-export',
  templateUrl: './model-import-export.component.html',
  styleUrls: ['./model-import-export.component.scss'],
  standalone: true,
  imports: [CommonModule, NgbCollapseModule]
})
export class ModelImportExportComponent implements OnInit {

  public isCollapsed = true;
  exportLoading = false;

  constructor(public backend: BackendService, public role: RoleService) { }

  ngOnInit(): void {
  }

  @Output()
  refreshModelsTable: EventEmitter<any> = new EventEmitter();

  /**
   * Handle model export
   * @param modelId
   */
    exportModelEventHandler(modelId: string): void {
      let args: PageArgs = {
        filter: `id eq '${modelId}'`
      }

      this.backend.getModelExport(args).subscribe(
        (response: any) => {
          let fn = decodeURI(response.headers.get('content-disposition')?.match(/(?<=filename(?:=|\*=(?:[\w\-]+'')))["']?(?<filename>[^"';\n]+)["']?/g)?.pop()?.replace(/\"/g, ''))
          var a = document.createElement("a");
          a.href = URL.createObjectURL(response.body);
          a.download = fn;
          a.click();
        }
      )
    }

  /**
   * Export all models
   */
  exportAllModels(): void {
    this.exportLoading = true;
    this.backend.getModelExport().subscribe(
      (response: any) => {
        let fn = decodeURI(response.headers.get('content-disposition')?.match(/(?<=filename(?:=|\*=(?:[\w\-]+'')))["']?(?<filename>[^"';\n]+)["']?/g)?.pop()?.replace(/\"/g, ''))
        var a = document.createElement("a");
        a.href = URL.createObjectURL(response.body);
        a.download = fn;
        a.click();
        this.exportLoading = false;
      }
    )
  }


  selectedFiles!: FileList;
  progressInfos: Record<any, any>[] = [];
  message = '';

  selectFiles(e: Event): void {
    const target = e.target as HTMLInputElement;
    const files = target.files as FileList;
    this.progressInfos = [];
    this.selectedFiles = files;
  }

  uploadFiles(): void {
    this.message = 'uploading files';

    for (let i = 0; i < this.selectedFiles.length; i++) {
      this.upload(i, this.selectedFiles[i]);
    }
  }

  upload(idx: number, file: File): void {
    this.progressInfos[idx] = { value: 0, fileName: file.name };

    this.backend.importModels(file).subscribe({
      next: (event) => {
        if (event.type === HttpEventType.UploadProgress) {
          this.progressInfos[idx]['value'] = Math.round(100 * event.loaded / event.total);
        } else if (event instanceof HttpResponse) {
          this.refreshModelsTable.emit();
          this.message = 'Upload finished';
        }
      },
      error: (e) => {
        console.log(e);
        this.progressInfos[idx]['value'] = 0;
        this.message = 'Could not upload the file: ' + file.name;
      }
    });
  }
}
