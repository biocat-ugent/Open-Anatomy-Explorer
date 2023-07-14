import {Component, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {BackHeaderComponent} from "src/app/components/administration/back-header/back-header.component"
import {ActivatedRoute} from "@angular/router"
import {BackendService} from "src/app/services/backend.service"
import {Question, QuestionResponse, QuizInstance, QuizInstanceSubmission} from "src/app/types"
import {
  ResponseCardComponent
} from "src/app/components/administration/instance-submissions-dashboard/response-card/response-card.component"

@Component({
  selector: 'app-submission-details',
  standalone: true,
  imports: [CommonModule, BackHeaderComponent, ResponseCardComponent],
  templateUrl: './submission-details.component.html',
  styleUrls: ['./submission-details.component.scss']
})
export class SubmissionDetailsComponent implements OnInit {


  modelId!: string
  quizId!: string
  quizInstanceId!: string
  submissionId!: string
  ownerUserId!: string

  questionResponsePairs: { question: Question, response: QuestionResponse | undefined }[] = []

  constructor(private backend: BackendService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']
      this.quizId = params['quizId']
      this.quizInstanceId = params['instanceId']
      this.submissionId = params['submissionId']

      this.backend.getQuizInstanceSubmission(this.modelId, this.quizId, this.quizInstanceId, this.submissionId).subscribe({
        next: (quizInstanceSubmission: QuizInstanceSubmission) => {
          this.ownerUserId = quizInstanceSubmission.ownerUserId

          this.backend.getQuizInstance(this.modelId, this.quizId, this.quizInstanceId).subscribe({
            next: (quizInstance: QuizInstance) => {
              this.questionResponsePairs = quizInstance.questionsSnapshot.map((question) => {
                return {
                  question: question,
                  response: quizInstanceSubmission.responses.find(response => question.id === response.questionId)
                }
              })
            }
          })
        }
      })
    })
  }

}
