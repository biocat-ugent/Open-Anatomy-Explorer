import {AfterViewInit, Component, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core'
import {CommonModule} from '@angular/common'
import {BackendService} from "src/app/services/backend.service"
import {ActivatedRoute} from "@angular/router"
import {Model, QuizInstanceSubmission} from "src/app/types"
import {RendererComponent} from "src/app/components/renderer/renderer.component"
import {NgbAlertModule} from "@ng-bootstrap/ng-bootstrap"
import {HttpErrorResponse} from "@angular/common/http"

@Component({
  selector: 'app-submission-vertices-comparison',
  standalone: true,
  imports: [CommonModule, RendererComponent, NgbAlertModule],
  templateUrl: './submission-vertices-comparison.component.html',
  styleUrls: ['./submission-vertices-comparison.component.scss']
})
export class SubmissionVerticesComparisonComponent implements OnInit, AfterViewInit {


  modelId!: string
  quizId!: string
  quizInstanceId!: string
  submissionId!: string
  questionId!: string
  labelId !: string
  ownerUserId!: string

  correctVertices!: number[]
  submittedVertices!: number[]

  isSolutionVisible = false
  isSubmissionVisible = false

  isModelLoaded = false

  error: string | undefined

  model!: Model


  @ViewChildren(RendererComponent)
  rendererComponents!: QueryList<RendererComponent>

  rendererComponent!: RendererComponent

  constructor(private backend: BackendService, private route: ActivatedRoute) {
  }

  ngAfterViewInit(): void {
    this.rendererComponents.changes.subscribe((renderComponents: QueryList<RendererComponent>) => {
      this.rendererComponent = renderComponents.first

      // Listen for model loaded event
      this.rendererComponent.modelLoadingStatus$.subscribe(() => {
        this.isModelLoaded = true
      })
    })
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']
      this.quizId = params['quizId']
      this.quizInstanceId = params['instanceId']
      this.submissionId = params['submissionId']
      this.questionId = params['questionId']
      this.labelId = params['labelId']

      this.backend.getModel(this.modelId).subscribe((model) => this.model = model)

      // Get submitted vertices
      this.backend.getQuizInstanceSubmission(this.modelId, this.quizId, this.quizInstanceId, this.submissionId).subscribe({
        next: (submission: QuizInstanceSubmission) => {
          this.submittedVertices = submission.responses.find((response) => {
            return response.questionId === this.questionId
          })?.verticesData || []

          this.ownerUserId = submission.ownerUserId
        },
        error: (err: HttpErrorResponse) => {
          if (this.error) {
            this.error += `    ${err.message}`
          } else {
            this.error = err.message
          }
        }
      })

      // Get solution vertices
      this.backend.getModelLabelVertices(this.modelId, this.labelId).subscribe({
        next: (correctVertices: number[]) => {
          this.correctVertices = correctVertices
        },
        error: (err: HttpErrorResponse) => {
          if (this.error) {
            this.error += `    ${err.message}`
          } else {
            this.error = err.message
          }
        }
      })
    })
  }

  toggleSolution(): void {
    this.isSolutionVisible = !this.isSolutionVisible

    if (!this.isSolutionVisible) {
      this.rendererComponent.resetColorForVertices(this.correctVertices)

      // Make sure that the submission is completely visible (overlapped vertices were reset)
      if (this.isSubmissionVisible) {
        this.renderSubmission()
      }
    } else {
      this.renderSolution()
    }
  }

  toggleSubmission(): void {
    this.isSubmissionVisible = !this.isSubmissionVisible

    if (!this.isSubmissionVisible) {
      this.rendererComponent.resetColorForVertices(this.submittedVertices)

      // Make sure that the solution is completely visible (overlapped vertices were reset)
      if (this.isSolutionVisible) {
        this.renderSolution()
      }
    } else {
      this.renderSubmission()
    }
  }

  private renderSolution(): void {
    this.rendererComponent.setColorForVertices(this.correctVertices, RendererComponent.colorStringToVector4("#41FF41CC"))
  }

  private renderSubmission(): void {
    this.rendererComponent.setColorForVertices(this.submittedVertices, RendererComponent.colorStringToVector4("#FF4141CC"))
  }

}
