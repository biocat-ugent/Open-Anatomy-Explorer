import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {Page, PageArgs, QuizInstance, QuizInstanceInviteCode, QuizInstanceTable} from "src/app/types"
import {KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {Clipboard} from "@angular/cdk/clipboard"
import {environment} from "src/environments/environment"
import {BackendService} from "src/app/services/backend.service"
import {NgbPaginationModule} from "@ng-bootstrap/ng-bootstrap"
import {RouterLink} from "@angular/router"

/**
 * Table to display quiz instances
 */
@Component({
  selector: 'app-quiz-instance-table',
  standalone: true,
  imports: [CommonModule, NgbPaginationModule, RouterLink],
  templateUrl: './quiz-instance-table.component.html',
  styleUrls: ['./quiz-instance-table.component.scss']
})
export class QuizInstanceTableComponent implements OnInit {
  tableData: QuizInstanceTable[] = []
  totalTableDataItems = 0

  @Input()
  currentPage = 1
  lastPage = 1

  @Input()
  inviteCodeSearchQuery: string | undefined

  @Input()
  modelId!: string

  @Input()
  quizId!: string

  @Output()
  deleteData = new EventEmitter<string>()

  constructor(private backend: BackendService, public auth: KeycloakService, public role: RoleService, private clipboard: Clipboard) {
  }

  ngOnInit(): void {
  }

  /**
   * Handle pagination arrows
   * @param pageNumber
   */
  pageChangeEventHandler(pageNumber: any): void {
    this.currentPage = pageNumber

    this.refreshData(this.inviteCodeSearchQuery)
  }

  /**
   * Handle pagination typing input
   * @param input
   */
  inputPageEventHandler(input: HTMLInputElement): void {
    this.currentPage = parseInt(input.value, 10) || 1
    // Replace input value with currentPage, this makes sure that a NaN value will be replaced with a 1 in the input field
    input.value = this.currentPage.toString()

    this.refreshData(this.inviteCodeSearchQuery)
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
   * @param quizInviteCodeFilter Filter by invite code
   */
  public refreshData(quizInviteCodeFilter: string | undefined = undefined): void {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    let filterStr = ''

    if (quizInviteCodeFilter) {
      const instanceId = this.parseInstanceInviteCode(quizInviteCodeFilter).i

      filterStr = `id eq '${instanceId}'`
    }

    if (filterStr.length > 0) {
      args.filter = filterStr
    }

    this.backend.getQuizInstances(this.modelId, this.quizId, args).subscribe({
      next: (res: Page<QuizInstance>) => {
        this.tableData = res.items.map((quizInstance: QuizInstance) => {
          const quizInstanceTable: QuizInstanceTable = {
            ...quizInstance,
            quizInviteCode: this.createInstanceInviteCode(quizInstance.id)
          }

          return quizInstanceTable
        })

        this.totalTableDataItems = res.count || 0

        // Assuming DEFAULT_PAGE_SIZE items per page, this is defined in HttpCrudHandlers.kt of the backend
        this.lastPage = Math.ceil(this.totalTableDataItems / environment.DEFAULT_PAGE_SIZE)
      }
    })
  }

  /**
   * Copy invite code of an instance to clipboard
   * @param quizInstanceId
   */
  copyInviteCode(quizInstanceId: string): void {
    this.clipboard.copy(this.createInstanceInviteCode(quizInstanceId))
  }

  /**
   * Create an instance invite code, base64 encoded
   * @param quizInstanceId
   */
  createInstanceInviteCode(quizInstanceId: string): string {
    const inviteInstanceCode: QuizInstanceInviteCode = {
      m: this.modelId!,
      q: this.quizId!,
      i: quizInstanceId
    }

    return window.btoa(JSON.stringify(inviteInstanceCode))
  }

  /**
   * Parse an instance invite code, base64 decode and return object
   * @param encodedCode
   */
  parseInstanceInviteCode(encodedCode: string): QuizInstanceInviteCode {
    const decodedCode = window.atob(encodedCode)

    let parsed: QuizInstanceInviteCode = {i: "", m: "", q: ""}

    try {
      parsed = JSON.parse(decodedCode)
    } catch (e) {
    }

    return parsed
  }
}
