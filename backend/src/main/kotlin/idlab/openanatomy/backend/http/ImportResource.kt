package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.export.ModelExporter
import idlab.openanatomy.backend.http.util.FormData
import idlab.openanatomy.backend.http.util.Roles
import io.quarkus.security.identity.SecurityIdentity
import org.jboss.resteasy.reactive.MultipartForm
import javax.annotation.security.RolesAllowed
import javax.ws.rs.Consumes
import javax.ws.rs.POST
import javax.ws.rs.Path
import javax.ws.rs.Produces
import javax.ws.rs.core.Context
import javax.ws.rs.core.MediaType

@Path("/model-import")
class ImportResource(private val modelExporter: ModelExporter) {

    @Consumes(MediaType.MULTIPART_FORM_DATA)
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @POST
    suspend fun requestImport(
        @MultipartForm formData: FormData,
        @Context securityIdentity: SecurityIdentity
    ): List<String> {
        return modelExporter.importFrom(securityIdentity, formData.file.filePath())
    }

}
