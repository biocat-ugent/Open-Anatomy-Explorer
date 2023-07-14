import {Component, ContentChild, EventEmitter, Input, OnInit, Output, TemplateRef} from '@angular/core'
import {CommonModule} from '@angular/common'
import {Model, Page, PageArgs, Quiz} from "src/app/types"
import {KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {NgbModule} from "@ng-bootstrap/ng-bootstrap"
import {RouterLink} from "@angular/router"
import {environment} from "src/environments/environment"
import {Observable} from "rxjs"


/**
 * Component to display a table of elements which have a name (i.e. Model or Quiz)
 */
@Component({
  selector: 'app-name-table',
  standalone: true,
  imports: [CommonModule, NgbModule, RouterLink],
  templateUrl: './name-table.component.html',
  styleUrls: ['./name-table.component.scss']
})
export class NameTableComponent<T extends Model | Quiz> implements OnInit {

  tableData: T[] = []
  totalTableDataItems = 0

  @Input()
  backendGetModelsFunc!: (args?: PageArgs) => Observable<Page<T>>

  @Input()
  backendGetQuizzesFunc!: (modelId: string, args?: PageArgs) => Observable<Page<T>>

  @Input()
  currentPage = 1
  lastPage = 1

  @Input()
  getFromAllUsers = false

  @Input()
  nameSearchQuery: string | undefined

  @Input()
  modelId: string | undefined

  @Output()
  deleteData = new EventEmitter<string>()

  @ContentChild('customActionsTemplate')
  customActionsTemplate: TemplateRef<any> | undefined

  constructor(public auth: KeycloakService, public role: RoleService) {
  }

  ngOnInit(): void {
  }

  /**
   * Handle pagination arrows
   * @param pageNumber
   */
  pageChangeEventHandler(pageNumber: any): void {
    this.currentPage = pageNumber

    this.refreshData(this.getFromAllUsers, this.nameSearchQuery)
  }

  /**
   * Handle pagination typing input
   * @param input
   */
  inputPageEventHandler(input: HTMLInputElement): void {
    this.currentPage = parseInt(input.value, 10) || 1
    // Replace input value with currentPage, this makes sure that a NaN value will be replaced with a 1 in the input field
    input.value = this.currentPage.toString()

    this.refreshData(this.getFromAllUsers, this.nameSearchQuery)
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
   * Refresh the data displayed inside the table
   * @param getFromAllUsers Show all the data, including data owned by other users
   * @param nameFilter Filter by name
   */
  public refreshData(getFromAllUsers = false, nameFilter: string | undefined = undefined): void {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    let filterStr = ''

    if (!getFromAllUsers) {
      filterStr = `ownerUserId eq '${this.auth.getUsername()}'`
    }

    if (nameFilter) {
      const nameFilterQuery = `name eq '${nameFilter}'`

      if (filterStr.length > 0) {
        filterStr += ` and ${nameFilterQuery}`
      } else {
        filterStr = nameFilterQuery
      }
    }

    if (filterStr.length > 0) {
      args.filter = filterStr
    }

    this.getBackendFunc(args).subscribe({
      next: (res: Page<T>) => {
        this.tableData = res.items
        this.totalTableDataItems = res.count || 0

        // Assuming DEFAULT_PAGE_SIZE items per page, this is defined in HttpCrudHandlers.kt of the backend
        this.lastPage = Math.ceil(this.totalTableDataItems / environment.DEFAULT_PAGE_SIZE)
      }
    })
  }

  getBackendFunc(args: PageArgs): Observable<Page<T>> {
    if (this.modelId === undefined) {
      return this.backendGetModelsFunc(args)
    }

    return this.backendGetQuizzesFunc(this.modelId, args)
  }

}
