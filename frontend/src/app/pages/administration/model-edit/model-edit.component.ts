import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {ActivatedRoute, RouterLink} from "@angular/router"
import {RendererComponent} from "src/app/components/renderer/renderer.component"
import {BackendService} from "src/app/services/backend.service"
import {Model} from "src/app/types"
import {EditableFieldComponent} from "src/app/components/administration/editable-field/editable-field.component"
import {HttpErrorResponse, HttpEvent, HttpEventType, HttpStatusCode} from "@angular/common/http"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {NgbAlertModule, NgbProgressbarModule} from "@ng-bootstrap/ng-bootstrap"

@Component({
  selector: 'app-model-edit',
  standalone: true,
  imports: [CommonModule, RendererComponent, EditableFieldComponent, RouterLink, BackHeaderComponent, NgbProgressbarModule, NgbAlertModule],
  templateUrl: './model-edit.component.html',
  styleUrls: ['./model-edit.component.scss']
})
export class ModelEditComponent implements OnInit {

  modelId!: string

  currentModel: Model | undefined
  hasObject = true

  fileSelected = false
  fileToUpload: File | undefined | null

  success = false
  uploadSuccess = false
  error = false
  errorMessage = ''

  showPreview = false

  uploadProgress = 0
  isUploading = false

  constructor(private route: ActivatedRoute, private backend: BackendService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']

      // Fetch current model details
      this.backend.getModel(this.modelId).subscribe({
        next: (model: Model) => this.currentModel = model,
        error: () => this.error = true
      })

      this.checkHasModelObject()
    })
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
   * Check if the current model already has a model object saved
   */
  checkHasModelObject(): void {
    this.backend.hasModelObject(this.modelId).subscribe(value => {
      this.hasObject = value
      this.fileSelected = false
    })
  }

  /**
   * Remove model object
   */
  deleteObjectEventHandler(): void {
    this.backend.deleteModelObject(this.modelId).subscribe(() => {
      this.showPreview = false
      this.checkHasModelObject()
    })
  }

  /**
   * Upload a selected file to the model
   */
  uploadSelectedFile(): void {
    if (this.fileSelected && this.fileToUpload) {
      const formData = new FormData()
      formData.append('file', this.fileToUpload)

      this.isUploading = true

      this.backend.uploadModelObject(this.modelId, formData).subscribe({
        next: (event: HttpEvent<any>) => {
          if (event.type === HttpEventType.UploadProgress) {
            this.uploadProgress = (event.loaded / (event.total || 1)) * 100
          } else if (event.type === HttpEventType.Response) {
            if (event.status === HttpStatusCode.NoContent) {
              this.checkHasModelObject()
              this.uploadSuccess = true
            } else {
              this.errorMessage = `Upload of object failed. ${event.status}: ${event.statusText} \n`
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
      // Set upload to success if nothing needs to be uploaded
      this.uploadSuccess = true
    }
  }

  /**
   * Persist changes
   */
  saveModelChanges(): void {
    if ((this.currentModel?.name?.length || 0) < 1 || (this.currentModel?.category?.length || 0) < 1) {
      this.errorMessage = 'Please correct input fields.'
      this.error = true
      return
    }

    this.error = false
    this.errorMessage = ''

    this.uploadSelectedFile()

    this.backend.updateModel(this.modelId, {
      name: this.currentModel?.name,
      category: this.currentModel?.category,
      cameraPosition: this.currentModel?.cameraPosition,
      cameraTarget: this.currentModel?.cameraTarget,
      modelRotation: this.currentModel?.modelRotation
    }).subscribe({
      next: () => {
        this.success = true

        // Periodically check if save was successful, stop this check when successful and set a timeout to remove the success message
        const successChecker = setInterval(() => {
          if (this.success && this.uploadSuccess) {
            setTimeout(() => {
              this.success = false
              this.uploadSuccess = false
            }, 5000)

            clearInterval(successChecker)
          }
        }, 100)
      },
      error: (err: HttpErrorResponse) => {
        if (err?.status === HttpStatusCode.Forbidden) {
          this.errorMessage += "You don't have the rights to edit this Model: 403 Forbidden"
        } else {
          this.errorMessage += 'Something went wrong saving changes.'
        }
        this.error = true
      }
    })
  }
}
