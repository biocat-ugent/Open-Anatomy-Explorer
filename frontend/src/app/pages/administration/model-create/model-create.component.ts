import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {BackendService} from "src/app/services/backend.service"
import {EditableFieldComponent} from "src/app/components/administration/editable-field/editable-field.component"
import {HttpErrorResponse, HttpEvent, HttpEventType, HttpStatusCode} from "@angular/common/http"
import {ActivatedRoute, Router, RouterLink} from "@angular/router"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {NgbAlertModule, NgbProgressbarModule} from "@ng-bootstrap/ng-bootstrap"

@Component({
  selector: 'app-model-create',
  standalone: true,
  imports: [CommonModule, EditableFieldComponent, RouterLink, BackHeaderComponent, NgbProgressbarModule, NgbAlertModule],
  templateUrl: './model-create.component.html',
  styleUrls: ['./model-create.component.scss']
})
export class ModelCreateComponent implements OnInit {

  fileSelected = false
  fileToUpload: File | undefined | null

  error = false
  errorMessage = ''

  modelName = ''
  modelCategory = ''

  uploadProgress = 0
  isUploading = false

  constructor(private router: Router, private activatedRoute: ActivatedRoute, private backend: BackendService) {
  }

  ngOnInit(): void {
  }

  /**
   * Form file change event handler
   * @param event
   */
  fileChange(event: Event): void {
    this.fileSelected = true
    this.fileToUpload = (event.target as HTMLInputElement).files?.item(0)
  }

  /**
   * Upload a selected file and associate it with a model
   * @param modelId
   */
  uploadSelectedFile(modelId: string): void {
    if (this.fileSelected && this.fileToUpload) {
      const formData = new FormData()
      formData.append('file', this.fileToUpload)

      this.isUploading = true

      this.backend.uploadModelObject(modelId, formData).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress = (event.loaded / (event.total || 1)) * 100
          } else if (event.type === HttpEventType.Response) {
            if (event.status === HttpStatusCode.NoContent) {
              this.router.navigate(['..'], {relativeTo: this.activatedRoute})
            } else {
              this.errorMessage = `Upload of object failed. ${event.status}: ${event.statusText}.`
              this.error = true
            }
          }
        },
        error: (err: HttpErrorResponse) => {
          this.errorMessage = `Upload of object failed. ${err.status}: ${err.message}.`
          this.error = true
        },
        complete: () => this.isUploading = false
      })
    } else {
      this.router.navigate(['..'], {relativeTo: this.activatedRoute})
    }
  }

  /**
   * Save the newly created model
   */
  saveModel(): void {
    if (this.modelName.length === 0 || this.modelCategory.length === 0) {
      this.errorMessage = 'Please fill in all the details.'
      this.error = true
      return
    }

    this.error = false

    this.backend.createModel({name: this.modelName, category: this.modelCategory}).subscribe({
      next: (modelId) => {
        this.uploadSelectedFile(modelId)
      },
      error: (err: HttpErrorResponse) => {
        this.errorMessage = `Something went wrong creating Model: ${err.status}: ${err.statusText} - ${err.message}.`
        this.error = true
      }
    })
  }

}
