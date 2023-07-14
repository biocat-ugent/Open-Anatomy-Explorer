import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core'
import {CommonModule} from '@angular/common'
import {ActivatedRoute} from "@angular/router"
import {BackendService} from "src/app/services/backend.service"
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {
  InstanceSubmissionsTableComponent
} from "src/app/components/administration/instance-submissions-dashboard/instance-submissions-table/instance-submissions-table.component"
import {
  FilterHeaderComponent
} from "src/app/components/administration/filter-header/filter-header.component"

@Component({
  selector: 'app-instance-submissions',
  standalone: true,
  imports: [CommonModule, BackHeaderComponent, InstanceSubmissionsTableComponent, FilterHeaderComponent],
  templateUrl: './instance-submissions-dashboard.component.html',
  styleUrls: ['./instance-submissions-dashboard.component.scss']
})
export class InstanceSubmissionsDashboardComponent implements OnInit, AfterViewInit {

  modelId!: string
  quizId!: string
  quizInstanceId!: string

  currentPage = 1

  studentSearchQuery: string | undefined

  @ViewChild(InstanceSubmissionsTableComponent)
  submissionsTable!: InstanceSubmissionsTableComponent

  constructor(private backend: BackendService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']
      this.quizId = params['quizId']
      this.quizInstanceId = params['instanceId']
    })
  }

  ngAfterViewInit(): void {
    this.submissionsTable.refreshData(this.studentSearchQuery)
  }

  /**
   * Handle search query change and update table accordingly
   * @param searchQuery
   */
  searchQueryChange(searchQuery: string): void {
    this.studentSearchQuery = searchQuery
    if (this.studentSearchQuery?.length === 0) {
      this.studentSearchQuery = undefined
    }

    this.currentPage = 1

    this.submissionsTable.refreshData(this.studentSearchQuery)
  }

  /**
   * Delete submission
   * @param submissionId
   */
  deleteSubmission(submissionId: string): void {
    this.backend.deleteQuizInstanceSubmission(this.modelId, this.quizId, this.quizInstanceId, submissionId).subscribe({
      complete: () => this.submissionsTable.refreshData(this.studentSearchQuery)
    })
  }

}
