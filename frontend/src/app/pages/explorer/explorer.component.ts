import {AfterViewInit, ChangeDetectorRef, Component, OnInit, ViewChild} from '@angular/core'
import {CommonModule} from '@angular/common'
import {RendererComponent} from "src/app/components/renderer/renderer.component"
import {ActivatedRoute} from "@angular/router"
import {ExplorerSidebarComponent} from "src/app/components/explorer-sidebar/explorer-sidebar.component"
import {BackendService} from "src/app/services/backend.service"
import {Model} from "src/app/types"

@Component({
  selector: 'app-explorer',
  standalone: true,
  imports: [CommonModule, RendererComponent, ExplorerSidebarComponent],
  templateUrl: './explorer.component.html',
  styleUrls: ['./explorer.component.scss']
})
export class ExplorerComponent implements OnInit, AfterViewInit {

  modelId!: string

  @ViewChild(RendererComponent)
  rendererComponent!: RendererComponent

  model!: Model

  constructor(private route: ActivatedRoute, private changeDetector: ChangeDetectorRef, private backend: BackendService) {
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.modelId = params['id']

      this.backend.getModel(this.modelId).subscribe({
        next: (model) => {
          this.model = model
        },
        complete: () => this.changeDetector.detectChanges()
      })
    })
  }

  ngAfterViewInit(): void {
    // https://hackernoon.com/everything-you-need-to-know-about-the-expressionchangedafterithasbeencheckederror-error-e3fd9ce7dbb4
    this.changeDetector.detectChanges()
  }

}
