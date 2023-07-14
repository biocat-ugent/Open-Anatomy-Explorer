import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {BackendService} from "src/app/services/backend.service"
import {Label, PageArgs} from "src/app/types"
import {environment} from "src/environments/environment"
import {NgbModule} from "@ng-bootstrap/ng-bootstrap"
import {FormsModule} from "@angular/forms"
import {RouterLinkWithHref} from "@angular/router"
import {RoleService} from "src/app/services/role.service"

@Component({
  selector: 'app-label-selector',
  standalone: true,
  imports: [CommonModule, NgbModule, FormsModule, RouterLinkWithHref],
  templateUrl: './label-selector.component.html',
  styleUrls: ['./label-selector.component.scss']
})
export class LabelSelectorComponent implements OnInit {

  @Input()
  modelId!: string

  @Input()
  selectedLabel: string | undefined

  @Input()
  userIsModelOwner = false

  @Output()
  selectedLabelChange = new EventEmitter<string>()

  currentPage = 1
  lastPage = 1
  totalLabelItems = 0

  labels: Label[] = []

  constructor(private backend: BackendService, protected role: RoleService) {
  }

  ngOnInit(): void {
    this.getLabelList()
  }

  /**
   * Fetch the labels associated with this model, taking pagination into account
   */
  getLabelList(): void {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    this.backend.getModelLabels(this.modelId, args).subscribe(labelRes => {
      this.labels = labelRes.items
      this.totalLabelItems = labelRes.count || 0

      // Assuming DEFAULT_PAGE_SIZE items per page, this is defined in HttpCrudHandlers.kt of the backend
      this.lastPage = Math.ceil(this.totalLabelItems / environment.DEFAULT_PAGE_SIZE)
    })
  }

  /**
   * Handles label selection
   */
  labelSelectionEventHandler(): void {
    this.selectedLabelChange.emit(this.selectedLabel)
  }

  /**
   * Handle pagination arrows
   * @param pageNumber
   */
  pageChangeEventHandler(pageNumber: any): void {
    this.currentPage = pageNumber

    this.getLabelList()
  }

}
