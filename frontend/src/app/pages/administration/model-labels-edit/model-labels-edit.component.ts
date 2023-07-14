import {Component, OnInit, ViewChild} from '@angular/core'
import {CommonModule} from '@angular/common'
import {ActivatedRoute, RouterLink} from "@angular/router"
import {BackendService} from "src/app/services/backend.service"
import {Label, Model, PageArgs} from "src/app/types"
import {RendererComponent} from "src/app/components/renderer/renderer.component"
import {NgbModule} from "@ng-bootstrap/ng-bootstrap"
import {environment} from "src/environments/environment"
import * as THREE from "three"
import {
  EditableFieldComponent
} from "src/app/components/administration/editable-field/editable-field.component"
import {FormsModule} from "@angular/forms"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {HttpErrorResponse} from "@angular/common/http"

@Component({
  selector: 'app-model-labels-edit',
  standalone: true,
  imports: [CommonModule, RendererComponent, NgbModule, EditableFieldComponent, FormsModule, RouterLink, BackHeaderComponent],
  templateUrl: './model-labels-edit.component.html',
  styleUrls: ['./model-labels-edit.component.scss']
})
export class ModelLabelsEditComponent implements OnInit {

  @ViewChild(RendererComponent)
  private rendererComponent!: RendererComponent

  modelId!: string
  model!: Model

  // Pagination and table view
  currentPage = 1
  lastPage = 1
  totalLabelItems = 0
  currentLabels!: Label[]

  // Only one label can be edited at a time
  isEditingLabel = false

  // Edited label data
  editingLabelVertices: number[] = []
  editingLabelColor: THREE.Vector4 = new THREE.Vector4(1, 0, 0, 1)

  // Alert variables
  infoMessages: { message: string, type: string }[] = []
  showSuccess: boolean = false
  errorMessage: string | undefined

  // Adding label variables
  isAddingLabel = false
  newLabel: Label = {id: '', ownerUserId: '', createdAt: '', lastModifiedAt: '', edited: true}

  // Rotation of model
  isChangingModelRotation = false

  constructor(private route: ActivatedRoute, private backend: BackendService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']

      this.backend.getModel(this.modelId).subscribe((model) => this.model = model)

      // Fetch current model labels
      this.refreshLabelList()
    })
  }

  /**
   * Fetch the labels associated with this model, taking pagination into account
   */
  refreshLabelList(): void {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    this.backend.getModelLabels(this.modelId, args).subscribe(labelRes => {
      this.currentLabels = labelRes.items
      this.totalLabelItems = labelRes.count || 0

      // Assuming DEFAULT_PAGE_SIZE items per page, this is defined in HttpCrudHandlers.kt of the backend
      this.lastPage = Math.ceil(this.totalLabelItems / environment.DEFAULT_PAGE_SIZE)
    })
  }

  /**
   * Handle vertices changes emitted by renderer
   * @param vertices
   */
  editedVerticesChangeEventHandler(vertices: number[]): void {
    this.editingLabelVertices = vertices
  }

  /**
   * Handle label color changes emitted by renderer
   * @param color
   */
  editedColorChangeEventHandler(color: THREE.Vector4): void {
    this.editingLabelColor = color
  }

  /**
   * Handle pagination typing input
   * @param input
   */
  inputPageEventHandler(input: HTMLInputElement): void {
    this.currentPage = parseInt(input.value, 10) || 1
    // Replace input value with currentPage, this makes sure that a NaN value will be replaced with a 1 in the input field
    input.value = this.currentPage.toString()

    this.refreshLabelList()
  }

  /**
   * Handle pagination arrows
   * @param pageNumber
   */
  pageChangeEventHandler(pageNumber: any): void {
    this.currentPage = pageNumber

    this.refreshLabelList()
  }

  /**
   * Handle pagination typing changes to prevent illegal input
   * @param input
   */
  formatPageInput(input: HTMLInputElement) {
    input.value = input.value.replace(/[^0-9]/g, '')

    let parsedInput = parseInt(input.value, 10)
    parsedInput = isNaN(parsedInput) ? 1 : parsedInput

    input.value = parsedInput === 0 ? "1" : (parsedInput > this.lastPage ? this.lastPage.toString() : input.value)
  }

  /**
   * Start editing label
   * After this function is called, a user can change the label vertices and color
   * @param label
   */
  editLabel(label: Label): void {
    if (label.edited && this.isEditingLabel) {
      return
    }

    this.infoMessages.push({message: `Currently editing Label: ${label.id}`, type: "label"})

    // Mark this label as being edited and set the editing state to true so only one label can be edited at once
    label.edited = true
    this.isEditingLabel = true

    /*
    Reset label on renderer -> remove vertices from object and clear vertices array
    Clearing the vertices array emits a labelVerticesChangeEvent which will also clear this.editingLabelVertices
     */
    this.rendererComponent.resetLabel()

    /*
    Setting the label color to the saved color
    Setting the label color emits a labelVerticesColorChangeEvent which will also set this.editingLabelColor
     */
    this.rendererComponent.setLabelColor(label.colour)

    /*
    Get current label vertices and apply them to the object model
     */
    this.backend.getModelLabelVertices(this.modelId, label.id).subscribe(vertices => {
      // renderer.setVertices emits a vertices change event, setting this.editingLabelVertices
      this.rendererComponent.setVertices(vertices)
      this.rendererComponent.drawVertices()
    })
  }

  /**
   * Cancel the editing of a label
   */
  cancelLabelEdit(): void {
    // Reset drawn vertices on model
    this.rendererComponent.resetLabel()
    // Clear edit state
    this.isEditingLabel = false
    // Remove message
    const infoIdx = this.infoMessages.findIndex((element) => element.type === "label")
    this.infoMessages.splice(infoIdx, 1)
    // Fetch the saved labels (source of truth)
    this.refreshLabelList()
  }

  /**
   * Update the edited label
   * This will first update any name or color changes. Then will update the vertices.
   * @param label
   */
  updateLabel(label: Label): void {
    if (label.name !== undefined && label.name.length < 1) {
      this.showError("Name can't be empty.", 3000)

      return
    }

    this.backend.updateModelLabel(this.modelId, label.id, {
      name: label.name,
      colour: RendererComponent.vector4ToColorString(this.editingLabelColor)
    }).subscribe({
      next: () => {
        this.updateVertices(label)
      },
      error: (err: HttpErrorResponse) => {
        this.showError(`Error updating Label: ${err.message}`)
      }
    })
  }

  /**
   * Save the newly created label
   * First create a label, then save it's associated labels
   */
  saveNewLabel(): void {
    if (this.newLabel.name !== undefined && this.newLabel.name.length < 1) {
      this.showError("Name can't be empty.", 3000)

      return
    }

    this.backend.createModelLabel(this.modelId, {
      name: this.newLabel.name,
      colour: RendererComponent.vector4ToColorString(this.editingLabelColor)
    }).subscribe({
      next: newLabelId => {
        this.newLabel.id = newLabelId

        this.updateVertices(this.newLabel)
      },
      error: (err: HttpErrorResponse) => {
        this.showError(`Error saving Label: ${err.message}`)
      }
    })
  }

  /**
   * Enable model rotation mode
   */
  editModelRotation(): void {
    this.infoMessages.push({message: "Move the camera and model in the desired position.", type: "rotation"})
    this.isChangingModelRotation = true
    this.rendererComponent.enableRotationControls()
  }

  /**
   * Save the new model rotation and camera position
   */
  saveModelRotation(): void {
    const positionAndTarget = this.rendererComponent.getCameraPositionAndTarget()
    const posArr = [positionAndTarget.pos.x, positionAndTarget.pos.y, positionAndTarget.pos.z]
    const tarArr = [positionAndTarget.tar.x, positionAndTarget.tar.y, positionAndTarget.tar.z]

    const modelRotation = this.rendererComponent.getModelRotation()
    const modelRotationArr = [modelRotation.x, modelRotation.y, modelRotation.z]

    this.backend.updateModel(this.modelId, {
      name: this.model.name,
      category: this.model.category,
      cameraPosition: posArr,
      cameraTarget: tarArr,
      modelRotation: modelRotationArr
    }).subscribe({
      next: () => {
        this.showSuccess = true
        setTimeout(() => this.showSuccess = false, 3000)
      },
      error: (err: HttpErrorResponse) => {
        this.showError(`Error saving camera position: ${err.message}`)
      },
      complete: () => {
        this.isChangingModelRotation = false

        const infoIdx = this.infoMessages.findIndex((element) => element.type === "rotation")
        this.infoMessages.splice(infoIdx, 1)

        this.rendererComponent.disableRotationControls()
      }
    })
  }

  /**
   * Cancel the creation of a new label
   */
  cancelNewLabel(): void {
    // Clear editing state
    this.isEditingLabel = false
    this.isAddingLabel = false
    // Undo any changes
    this.newLabel = {id: '', ownerUserId: '', createdAt: '', lastModifiedAt: '', edited: true}
    // Remove message
    const infoIdx = this.infoMessages.findIndex((element) => element.type === "label")
    this.infoMessages.splice(infoIdx, 1)
    // Reset drawn vertices
    this.rendererComponent.resetLabel()
  }

  /**
   * Update the vertices of a label
   * @param label
   */
  updateVertices(label: Label): void {
    this.backend.updateModelLabelVertices(this.modelId, label.id, this.editingLabelVertices).subscribe({
      next: () => {
        // Clear editing state
        label.edited = false
        this.isEditingLabel = false

        if (this.isAddingLabel) {
          this.newLabel = {id: '', ownerUserId: '', createdAt: '', lastModifiedAt: '', edited: true}
          this.isAddingLabel = false
        }

        // Remove info message
        const infoIdx = this.infoMessages.findIndex((element) => element.type === "label")
        this.infoMessages.splice(infoIdx, 1)

        // Remove label from model
        this.rendererComponent.resetLabel()

        // Show success message
        this.showSuccess = true
        setTimeout(() => this.showSuccess = false, 3000)

        // Refresh the label list
        this.refreshLabelList()
      },
      error: (err: HttpErrorResponse) => {
        this.showError(`Error saving Label vertices: ${err.message}`)
      }
    })
  }

  /**
   * Deletes label
   * @param label
   */
  deleteLabel(label: Label): void {
    this.backend.deleteModelLabel(this.modelId, label.id).subscribe(() => {
      this.refreshLabelList()
    })
  }

  /**
   * Function to start creation of new label
   */
  addLabelBtnHandler(): void {
    this.isEditingLabel = true
    this.isAddingLabel = true

    this.infoMessages.push({
      message: "Currently creating new Label. Give a name, draw the label on the model and click save.",
      type: "label"
    })
  }


  /**
   * Display an error alert when something went wrong
   * @param message error message
   * @param visibleDelay time in ms how long the message will be visible
   * @private
   */
  private showError(message: string, visibleDelay: number = 5000): void {
    this.errorMessage = message
    setTimeout(() => this.errorMessage = undefined, visibleDelay)
  }

}
