import {Component, EventEmitter, OnInit, Output} from '@angular/core'
import {CommonModule} from '@angular/common'
import {PageArgs, QuizInstance, QuizInstanceInviteCode} from "src/app/types"
import {BackendService} from "src/app/services/backend.service"
import {environment} from "src/environments/environment"
import {NgbPaginationModule} from "@ng-bootstrap/ng-bootstrap"
import {FormsModule} from "@angular/forms"

@Component({
  selector: 'app-quiz-selector',
  standalone: true,
  imports: [CommonModule, NgbPaginationModule, FormsModule],
  templateUrl: './quiz-selector.component.html',
  styleUrls: ['./quiz-selector.component.scss']
})
export class QuizSelectorComponent implements OnInit {

  currentPage = 1
  lastPage = 1
  totalItems = 0

  items: QuizInstance[] = []

  selectedQuiz!: QuizInstance

  @Output()
  selectedQuizChange = new EventEmitter<string>()

  constructor(private backend: BackendService) {
  }

  ngOnInit(): void {
    this.getQuizInstancesList()
  }

  /**
   * Fetch the items associated with this model, taking pagination into account
   */
  getQuizInstancesList(): void {
    const args: PageArgs = {
      cursor: window.btoa(`${this.currentPage - 1}`)
    }

    this.backend.getAllQuizInstances(args).subscribe(quizRes => {
      this.items = quizRes.items
      this.totalItems = quizRes.count || 0

      // Assuming DEFAULT_PAGE_SIZE items per page, this is defined in HttpCrudHandlers.kt of the backend
      this.lastPage = Math.ceil(this.totalItems / environment.DEFAULT_PAGE_SIZE)
    })
  }

  /**
   * Handles item selection
   */
  itemSelectionEventHandler(): void {
    this.selectedQuizChange.emit(this.createInstanceInviteCode(this.selectedQuiz.modelId, this.selectedQuiz.quizId, this.selectedQuiz.id))
  }

  /**
   * Create an instance invite code, base64 encoded
   * @param modelId
   * @param quizId
   * @param quizInstanceId
   */
  createInstanceInviteCode(modelId: string, quizId: string, quizInstanceId: string): string {
    const inviteInstanceCode: QuizInstanceInviteCode = {
      m: modelId,
      q: quizId,
      i: quizInstanceId
    }

    return window.btoa(JSON.stringify(inviteInstanceCode))
  }

  /**
   * Handle pagination arrows
   * @param pageNumber
   */
  pageChangeEventHandler(pageNumber: any): void {
    this.currentPage = pageNumber

    this.getQuizInstancesList()
  }

}
