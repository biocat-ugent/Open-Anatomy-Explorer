package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.Label
import idlab.openanatomy.backend.definitions.LabelVertices
import idlab.openanatomy.backend.http.util.*
import io.quarkus.security.identity.SecurityIdentity
import io.quarkus.vertx.http.Compressed
import io.smallrye.mutiny.coroutines.awaitSuspending
import org.eclipse.microprofile.openapi.annotations.Operation
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import javax.annotation.security.RolesAllowed
import javax.ws.rs.*
import javax.ws.rs.core.Context
import javax.ws.rs.core.MediaType
import javax.ws.rs.core.Response

@Path("/models/{modelId}/labels")
class LabelResource {

    @Context
    lateinit var securityIdentity: SecurityIdentity

    @GET
    @Operation(summary = "Query the Label instances associated with a specific model.")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun list(
        @PathParam("modelId") modelId: String,
        @QueryParam("filter") @DefaultValue("") filter: String,
        @QueryParam("cursor") @DefaultValue("") cursor: String
    ) = Label.handleHttpList(parseFilter(statement = filter, baseFilter = Eq("modelId", modelId)), cursor)

    @POST
    @Operation(summary = "Create a new Label and associate it with a specific model.")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "201", description = "The Label was created successfully")
    suspend fun create(@PathParam("modelId") modelId: String, input: LabelInput) =
        Label.handleHttpCreate(securityIdentity) {
            Label(modelId, input.name, input.colour)
        }

    @GET
    @Path("{labelId}")
    @Operation(summary = "Get a specific Label instance.")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun get(@PathParam("modelId") modelId: String, @PathParam("labelId") labelId: String) =
        Label.handleHttpGet(labelId).takeIf { it.modelId == modelId } ?: throw NotFoundException()

    @PUT
    @Path("{labelId}")
    @Operation(summary = "Update a specific Label instance.")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Label was updated successfully")
    suspend fun update(
        @PathParam("modelId") modelId: String,
        @PathParam("labelId") labelId: String,
        input: LabelInput
    ) = Label.handleHttpUpdate(securityIdentity, labelId) { labelState ->
        if (labelState.modelId != modelId) {
            throw NotFoundException()
        }
        labelState.name = input.name
        labelState.colour = input.colour
        labelState
    }

    @DELETE
    @Operation(summary = "Remove a specific Label instance.")
    @Path("{labelId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The Label was removed successfully")
    suspend fun remove(@PathParam("modelId") modelId: String, @PathParam("labelId") labelId: String) =
        Label.handleHttpDelete(securityIdentity, labelId)

    @GET
    @Path("{labelId}/vertices")
    @Operation(summary = "Get the vertices data for a specific Label instance.")
    @Produces(MediaType.APPLICATION_JSON)
    @Compressed
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun getVertices(
        @PathParam("modelId") modelId: String,
        @PathParam("labelId") labelId: String
    ): List<Int> {
        return LabelVertices.find(Eq("labelId", labelId).toQueryDocument()).firstResult().awaitSuspending()?.data
            ?: throw NotFoundException()

    }

    @PUT
    @Path("{labelId}/vertices")
    @Operation(summary = "Set the vertices data for a specific Label instance.")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The vertices were set successfully")
    suspend fun setVertices(
        @PathParam("modelId") modelId: String,
        @PathParam("labelId") labelId: String,
        input: List<Int>
    ): Response {
        val vertices =
            LabelVertices.find(Eq("labelId", labelId).toQueryDocument()).firstResult().awaitSuspending()
                ?.copy(data = input)
                ?: LabelVertices(labelId, input)

        LabelVertices.persistOrUpdate(vertices).awaitSuspending()
        return Response.noContent().build()
    }
}
