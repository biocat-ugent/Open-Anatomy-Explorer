import {Injectable} from '@angular/core'
import {ActivatedRouteSnapshot, CanActivateChild, Router, RouterStateSnapshot, UrlTree} from '@angular/router'
import {KeycloakAuthGuard, KeycloakService} from "keycloak-angular"
import {RoleService} from "src/app/services/role.service"
import {Observable} from "rxjs"

export const REQUIRED_ROLE = 'requiredRole'

@Injectable({
  providedIn: 'root'
})
export class AuthGuard extends KeycloakAuthGuard implements CanActivateChild {
  constructor(protected readonly _router: Router, protected readonly keycloak: KeycloakService, private role: RoleService) {
    super(_router, keycloak)
  }


  public async isAccessAllowed(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Promise<boolean | UrlTree> {
    if (!this.authenticated) {
      await this.keycloak.login({
        redirectUri: window.location.origin + state.url
      })
    }

    if (this.role.userHasRole(route.data[REQUIRED_ROLE])) {
      return true
    } else {
      // Redirect to a 404 page to give the sense that a page is non-existent for unauthorized persons
      return this._router.createUrlTree(['/404'])
    }
  }

  canActivateChild(childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return this.isAccessAllowed(childRoute, state)
  }

}
