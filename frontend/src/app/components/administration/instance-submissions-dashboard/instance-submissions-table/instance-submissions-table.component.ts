import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {
  Page,
  PageArgs,
  QuizInstanceSubmission,
} from "src/app/types"
import {BackendService} from "src/app/services/backend.service"
import {KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {environment} from "src/environments/environment"
import {NgbPaginationModule} from "@ng-bootstrap/ng-bootstrap"
import {RouterLink} from "@angular/router"

@Component({
  selector: 'app-instance-submissions-table',
  standalone: true,
  imports: [CommonModule, NgbPaginationModule, RouterLink],
  templateUrl: './instance-submissions-table.component.html',
  styleUrls: ['./instance-submissions-table.component.scss']
})
export class InstanceSubmissionsTableComponent implements OnInit {

  tableData: QuizInstanceSubmission[] = []
  totalTableDataItems = 0

  @Input()
  currentPage = 1
  lastPage = 1

  @Input()
  studentSearchQuery: string | undefined

  @Input()
  modelId!: string

  @Input()
  quizId!: string

  @Input()
  quizInstanceId!: string

  @Output()
  deleteData = new EventEmitter<string>()

  constructor(private backend: BackendService, public auth: KeycloakService, public role: RoleService) {
  }

  ngOnInit(): void {
  }

  /**
   * Handle pagination arrows
   * @param pageNumber
   */
  pageChangeEventHandler(pageNumber: any): void {
    this.currentPage = pageNumber

    this.refreshData(this.studentSearchQuery)
  }

  /**
   * Handle pagination typing input
   * @param input
   */
  inputPageEventHandler(input: HTMLInputElement): void {
    this.currentPage = parseInt(input.value, 10) || 1
    // Replace input value with currentPage, this makes sure that a NaN value will be replaced with a 1 in the input field
    input.value = this.currentPage.toString()

    this.refreshData(this.studentSearchQuery)
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
   * @param studentSearchQuery Filter by student name
   */
  public refreshData(studentSearchQuery: string | undefined = undefined): void {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    let filterStr = ''

    if (studentSearchQuery) {
      filterStr = `ownerUserId eq '${studentSearchQuery}'`
    }

    if (filterStr.length > 0) {
      args.filter = filterStr
    }

    this.backend.getQuizInstanceSubmissions(this.modelId, this.quizId, this.quizInstanceId, args).subscribe({
        next: (res: Page<QuizInstanceSubmission>) => {
          this.tableData = res.items

          this.totalTableDataItems = res.count || 0

          // Assuming DEFAULT_PAGE_SIZE items per page, this is defined in HttpCrudHandlers.kt of the backend
          this.lastPage = Math.ceil(this.totalTableDataItems / environment.DEFAULT_PAGE_SIZE)
        }
      }
    )
  }
}
