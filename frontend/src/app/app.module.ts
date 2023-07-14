import {APP_INITIALIZER, NgModule} from '@angular/core'
import {BrowserModule} from '@angular/platform-browser'

import {AppRoutingModule} from './app-routing.module'
import {AppComponent} from './app.component'
import {NgbModule} from '@ng-bootstrap/ng-bootstrap'
import {KeycloakAngularModule, KeycloakEventType, KeycloakService} from "keycloak-angular"
import {environment} from "src/environments/environment"
import {HttpClientModule} from "@angular/common/http"


function initializeKeycloak(keycloak: KeycloakService) {
  return async () => {
    const fulfilled = await keycloak.init({
      config: {
        url: `${environment.keycloak_url}/auth`,
        realm: `${environment.keycloak_realm}`,
        clientId: `${environment.keycloak_clientId}`
      },
      initOptions: {
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
        pkceMethod: 'S256'
      }
    })

    if (fulfilled) {
      await keycloak.loadUserProfile()

      keycloak.keycloakEvents$.subscribe({
        next: (e) => {
          if (e.type == KeycloakEventType.OnTokenExpired) {
            keycloak.updateToken()
          }
        }
      })
    }

    return fulfilled
  }
}


@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    NgbModule,
    KeycloakAngularModule,
    HttpClientModule
  ],
  providers: [{
    provide: APP_INITIALIZER,
    useFactory: initializeKeycloak,
    multi: true,
    deps: [KeycloakService]
  }],
  bootstrap: [AppComponent]
})
export class AppModule {
}
