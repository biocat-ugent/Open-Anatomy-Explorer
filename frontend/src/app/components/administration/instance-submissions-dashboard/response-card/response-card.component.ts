import {Component, Input, OnInit} from '@angular/core'
import {CommonModule} from '@angular/common'
import {Label, Question, QuestionResponse, QuestionType} from "src/app/types"
import {BackendService} from "src/app/services/backend.service"
import {RouterLinkWithHref} from "@angular/router"

@Component({
  selector: 'app-response-card',
  standalone: true,
  imports: [CommonModule, RouterLinkWithHref],
  templateUrl: './response-card.component.html',
  styleUrls: ['./response-card.component.scss']
})
export class ResponseCardComponent implements OnInit {

  @Input()
  modelId!: string

  @Input()
  questionResponsePair!: { question: Question, response: QuestionResponse | undefined }

  labelName!: string
  locateResponseVerticesCount = 0
  locateCorrectVerticesCount = 0

  // Intersection length = amount of response vertices which are correct
  intersectionLength = 0

  // Union length = amount of distinct(correct vertices + response vertices)
  unionLength = 0

  get QuestionType(): typeof QuestionType {
    return QuestionType
  }

  constructor(private backend: BackendService) {
  }

  ngOnInit(): void {
    if (this.questionResponsePair.question.labelId) {
      this.backend.getModelLabel(this.modelId, this.questionResponsePair.question.labelId).subscribe({
        next: (label: Label) => {
          this.labelName = label.name || 'error: no label name'
        }
      })
    }

    if (this.questionResponsePair.question.questionType === QuestionType.LOCATE) {
      // We need to calculate the overlap amount
      this.backend.getModelLabelVertices(this.modelId, this.questionResponsePair.question.labelId!).subscribe({
        next: (correctVertices) => {
          this.locateResponseVerticesCount = this.questionResponsePair.response?.verticesData?.length || 0
          this.locateCorrectVerticesCount = correctVertices.length

          const verticesUnionSet = new Set<number>()

          correctVertices.forEach((v: number) => {
            // Add correct vertex to set
            verticesUnionSet.add(v)

            // Increase intersection count if correct vertex is in response
            if (this.questionResponsePair.response?.verticesData?.includes(v)) {
              this.intersectionLength++
            }
          })

          this.questionResponsePair.response?.verticesData?.forEach((v: number) => {
            // Add response vertex to set
            verticesUnionSet.add(v)
          })

          this.unionLength = verticesUnionSet.size
        }
      })
    }
  }

  compareCorrectSelectedVertices() {
    console.log(this.questionResponsePair)
  }

}
