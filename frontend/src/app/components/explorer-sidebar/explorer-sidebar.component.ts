import {Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {RendererComponent} from "src/app/components/renderer/renderer.component"
import {Label, Model, Page, PageArgs} from "src/app/types"
import {KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {BackendService} from "src/app/services/backend.service"
import {environment} from "src/environments/environment"

@Component({
  selector: 'app-explorer-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './explorer-sidebar.component.html',
  styleUrls: ['./explorer-sidebar.component.scss']
})
export class ExplorerSidebarComponent implements OnInit {

  @Input()
  modelId!: string

  @Input()
  renderer!: RendererComponent

  modelLoadingError = false

  model!: Model
  labels: ToggleableLabel[] = []

  labelsCurrentVisible: ToggleableLabel[] = []

  totalLabels = 0
  currentPage = 1
  totalPageCount = 0

  get environment() {
    return environment
  }

  constructor(public auth: KeycloakService, public role: RoleService, private backend: BackendService) {
  }

  ngOnInit(): void {
    this.backend.getModel(this.modelId).subscribe({
      next: (model: Model) => {
        this.model = model
      },
      error: () => this.modelLoadingError = true
    })

    this.loadLabels()
  }

  /**
   * Load labels list of current page
   */
  loadLabels() {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    this.backend.getModelLabels(this.modelId, args).subscribe({
      next: (res: Page<Label>) => {
        this.totalLabels = res.count || 0
        this.totalPageCount = Math.ceil(this.totalLabels / environment.DEFAULT_PAGE_SIZE)

        this.labels = res.items.map(label => {
          return {
            isVisible: false,
            labelVertices: undefined,
            label
          } as ToggleableLabel
        })
      },
      error: () => this.modelLoadingError = true
    })
  }

  /**
   * Update page and refresh the list
   * @param next when `true`: go to next page, when `false`: go to previous page
   */
  paginationChange(next: boolean) {
    if (next) {
      if (this.currentPage !== this.totalPageCount) {
        this.currentPage++
      }
    } else {
      if (this.currentPage !== 1) {
        this.currentPage--
      }
    }

    this.loadLabels()
  }

  /**
   * Toggle the visibility of the label. Lazy load the vertices
   * @param label
   */
  toggleLabel(label: ToggleableLabel) {
    label.isVisible = !label.isVisible

    if (label.isVisible) {
      // Show label

      this.labelsCurrentVisible.push(label)

      // Lazy loading vertices
      if (label.labelVertices !== undefined) {
        this.renderLabel(label)
      } else {
        this.backend.getModelLabelVertices(this.modelId, label.label.id).subscribe({
          next: (vertices) => {
            label.labelVertices = vertices
            this.renderLabel(label)
          }
        })
      }
    } else {
      // Hide label

      this.labelsCurrentVisible.splice(this.labelsCurrentVisible.indexOf(label), 1)

      this.renderer.resetColorForVertices(label.labelVertices!)

      // Make sure labels overlapping with the hidden label are complete
      for (const labelVis of this.labelsCurrentVisible) {
        this.renderLabel(labelVis)
      }
    }
  }

  /**
   * Render the label. This function assumes that label.labelVertices is defined.
   * @param label
   */
  renderLabel(label: ToggleableLabel) {
    this.renderer.setColorForVertices(label.labelVertices!, RendererComponent.colorStringToVector4(label.label.colour))
  }
}

interface ToggleableLabel {
  isVisible: boolean,
  label: Label,
  labelVertices: number[] | undefined
}
