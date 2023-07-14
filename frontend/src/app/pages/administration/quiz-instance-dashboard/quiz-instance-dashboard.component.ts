import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core'
import {CommonModule} from '@angular/common'
import {
  FilterHeaderComponent
} from "src/app/components/administration/filter-header/filter-header.component"
import {
  NameTableComponent
} from "src/app/components/administration/name-table/name-table.component"
import {BackendService} from "src/app/services/backend.service"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {ActivatedRoute} from "@angular/router"
import {
  QuizInstanceTableComponent
} from "src/app/components/administration/quiz-instance-dashboard/quiz-instance-table/quiz-instance-table.component"

@Component({
  selector: 'app-quiz-instance-dashboard',
  standalone: true,
  imports: [CommonModule, FilterHeaderComponent, NameTableComponent, BackHeaderComponent, QuizInstanceTableComponent],
  templateUrl: './quiz-instance-dashboard.component.html',
  styleUrls: ['./quiz-instance-dashboard.component.scss']
})
export class QuizInstanceDashboardComponent implements OnInit, AfterViewInit {

  modelId !: string
  quizId !: string

  quizName!: string

  currentPage = 1

  inviteCodeSearchQuery: string | undefined

  @ViewChild(QuizInstanceTableComponent)
  quizInstanceTable!: QuizInstanceTableComponent

  constructor(private backend: BackendService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']
      this.quizId = params['quizId']

      this.backend.getModelQuiz(this.modelId, this.quizId).subscribe((quiz) => this.quizName = quiz.name!)
    })
  }

  ngAfterViewInit(): void {
    this.quizInstanceTable.refreshData(this.inviteCodeSearchQuery)
  }

  /**
   * Handle search query change and update table accordingly
   * @param searchQuery
   */
  searchQueryChange(searchQuery: string): void {
    this.inviteCodeSearchQuery = searchQuery
    if (this.inviteCodeSearchQuery?.length === 0) {
      this.inviteCodeSearchQuery = undefined
    }

    this.currentPage = 1

    this.quizInstanceTable.refreshData(this.inviteCodeSearchQuery)
  }

  /**
   * Create a new quiz instance
   */
  createQuizInstance = (): void => {
    this.backend.createQuizInstance(this.modelId, this.quizId).subscribe({
      complete: () => this.quizInstanceTable.refreshData(this.inviteCodeSearchQuery)
    })
  }

  /**
   * Delete a quiz instance
   * @param quizInstanceId
   */
  deleteQuizInstanceEventHandler(quizInstanceId: string): void {
    this.backend.deleteQuizInstance(this.modelId, this.quizId, quizInstanceId).subscribe({
      complete: () => this.quizInstanceTable.refreshData(this.inviteCodeSearchQuery)
    })
  }
}
