import {Component, EventEmitter, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {NgbPaginationModule} from "@ng-bootstrap/ng-bootstrap"
import {Model, PageArgs} from "src/app/types"
import {BackendService} from "src/app/services/backend.service"
import {environment} from "src/environments/environment"
import {FormsModule} from "@angular/forms"

@Component({
  selector: 'app-model-selector',
  standalone: true,
  imports: [CommonModule, NgbPaginationModule, FormsModule],
  templateUrl: './model-selector.component.html',
  styleUrls: ['./model-selector.component.scss']
})
export class ModelSelectorComponent implements OnInit {

  currentPage = 1
  lastPage = 1
  totalItems = 0

  items: Model[] = []

  selectedModelId!: string

  @Output()
  selectedModelChange = new EventEmitter<string>()

  constructor(private backend: BackendService) {
  }

  ngOnInit(): void {
    this.getModelInstancesList()
  }

  /**
   * Fetch the items associated with this model, taking pagination into account
   */
  getModelInstancesList(): void {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    this.backend.getModels(args).subscribe(modelRes => {
      this.items = modelRes.items
      this.totalItems = modelRes.count || 0

      // Assuming DEFAULT_PAGE_SIZE items per page, this is defined in HttpCrudHandlers.kt of the backend
      this.lastPage = Math.ceil(this.totalItems / environment.DEFAULT_PAGE_SIZE)
    })
  }

  /**
   * Handles item selection
   */
  itemSelectionEventHandler(): void {
    this.selectedModelChange.emit(this.selectedModelId)
  }

  /**
   * Handle pagination arrows
   * @param pageNumber
   */
  pageChangeEventHandler(pageNumber: any): void {
    this.currentPage = pageNumber

    this.getModelInstancesList()
  }

}
