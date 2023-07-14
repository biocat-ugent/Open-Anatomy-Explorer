import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core'
import {CommonModule} from '@angular/common'
import {
  FilterHeaderComponent
} from "src/app/components/administration/filter-header/filter-header.component"
import {
  NameTableComponent
} from "src/app/components/administration/name-table/name-table.component"
import {Quiz} from "src/app/types"
import {BackendService} from "src/app/services/backend.service"
import {ActivatedRoute, RouterLink} from "@angular/router"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"

@Component({
  selector: 'app-quizzes-dashboard',
  standalone: true,
  imports: [CommonModule, FilterHeaderComponent, NameTableComponent, RouterLink, BackHeaderComponent],
  templateUrl: './quizzes-dashboard.component.html',
  styleUrls: ['./quizzes-dashboard.component.scss']
})
export class QuizzesDashboardComponent implements OnInit, AfterViewInit {

  modelId!: string
  modelName!: string

  currentPage = 1

  showFromAllUsers = true
  nameSearchQuery: string | undefined

  @ViewChild(NameTableComponent)
  dashboardTable!: NameTableComponent<Quiz>

  constructor(private route: ActivatedRoute, public backend: BackendService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']

      this.backend.getModel(this.modelId).subscribe((model) => this.modelName = model.name || this.modelId)
    })
  }

  ngAfterViewInit(): void {
    // Fetch model quizzes
    this.dashboardTable.refreshData(this.showFromAllUsers, this.nameSearchQuery)
  }

  /**
   * Handle quiz deletion
   * @param quizId
   */
  deleteQuizEventHandler(quizId: string): void {
    this.backend.deleteModelQuiz(this.modelId, quizId).subscribe(() => {
      this.dashboardTable.refreshData(this.showFromAllUsers, this.nameSearchQuery)
    })
  }

  /**
   * Handle show all quizzes change.
   * @param showAllQuizzes - when false: only show owned quizzes, when true: show all quizzes
   */
  showAllQuizzesSwitchEventHandler(showAllQuizzes: boolean): void {
    this.showFromAllUsers = showAllQuizzes

    this.dashboardTable.refreshData(this.showFromAllUsers, this.nameSearchQuery)
  }

  /**
   * Handle search query change and update table accordingly
   * @param searchQuery
   */
  nameSearchQueryChangeEventHandler(searchQuery: string): void {
    this.nameSearchQuery = searchQuery
    if (this.nameSearchQuery?.length === 0) {
      this.nameSearchQuery = undefined
    }

    this.currentPage = 1

    this.dashboardTable.refreshData(this.showFromAllUsers, this.nameSearchQuery)
  }

}
