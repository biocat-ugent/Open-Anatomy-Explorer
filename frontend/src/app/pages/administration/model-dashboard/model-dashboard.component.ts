import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core'
import {CommonModule} from '@angular/common'
import {BackendService} from "src/app/services/backend.service"
import {Model, PageArgs} from "src/app/types"
import {NgbModule} from "@ng-bootstrap/ng-bootstrap"
import {RouterLink, RouterLinkWithHref} from "@angular/router"
import {KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {FormsModule} from "@angular/forms"
import {
  FilterHeaderComponent
} from "src/app/components/administration/filter-header/filter-header.component"
import {
  NameTableComponent
} from "src/app/components/administration/name-table/name-table.component"
import {
  ModelImportExportComponent
} from "src/app/components/administration/model-import-export/model-import-export.component"
import {Clipboard} from "@angular/cdk/clipboard"

@Component({
  selector: 'app-model-dashboard',
  standalone: true,
  imports: [CommonModule, NgbModule, RouterLink, FormsModule, FilterHeaderComponent, NameTableComponent, RouterLinkWithHref, ModelImportExportComponent],
  templateUrl: './model-dashboard.component.html',
  styleUrls: ['./model-dashboard.component.scss']
})
export class ModelDashboardComponent implements OnInit, AfterViewInit {

  currentPage = 1

  showFromAllUsers = true
  nameSearchQuery: string | undefined

  @ViewChild(NameTableComponent)
  dashboardTable!: NameTableComponent<Model>

  constructor(public backend: BackendService, public auth: KeycloakService, public role: RoleService, public clipboard: Clipboard) {
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.dashboardTable.refreshData(this.showFromAllUsers, this.nameSearchQuery)
  }

  /**
   * Handle model deletion
   * @param modelId
   */
  deleteModelEventHandler(modelId: string): void {
    this.backend.deleteModel(modelId).subscribe(() => {
      this.dashboardTable.refreshData(this.showFromAllUsers, this.nameSearchQuery)
    })
  }

  /**
   * Handle single model export
   * @param modelId
   */
  exportModelEventHandler(modelId: string): void {
    let args: PageArgs = {
      filter: `id eq '${modelId}'`
    }

    this.backend.getModelExport(args).subscribe(
      (response: any) => {
        let fn = decodeURI(response.headers.get('content-disposition')?.match(/(?<=filename(?:=|\*=(?:[\w\-]+'')))["']?(?<filename>[^"';\n]+)["']?/g)?.pop()?.replace(/\"/g, ''))
        var a = document.createElement("a");
        a.href = URL.createObjectURL(response.body);
        a.download = fn;
        a.click();
      }
    )
  }

  /**
   * Handle show all models change.
   * @param showAllModels - when false: only show owned models, when true: show all models
   */
  showAllModelsSwitchEventHandler(showAllModels: boolean): void {
    this.showFromAllUsers = showAllModels

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
