package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.*
import idlab.openanatomy.backend.http.util.*
import io.quarkus.security.identity.SecurityIdentity
import io.smallrye.mutiny.coroutines.awaitSuspending
import org.bson.types.ObjectId
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse
import javax.annotation.security.RolesAllowed
import javax.ws.rs.*
import javax.ws.rs.core.Context
import javax.ws.rs.core.Response

@Path("/models/{modelId}/quizzes/{quizId}/instances")
class QuizInstanceResource {

    @Context
    lateinit var securityIdentity: SecurityIdentity

    @GET
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun list(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @QueryParam("filter") @DefaultValue("") filter: String,
        @QueryParam("cursor") @DefaultValue("") cursor: String
    ) = QuizInstance.handleHttpList(parseFilter(filter, Eq(QuizInstance::quizId.name, quizId)), cursor)

    @POST
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "201", description = "The QuizInstance was created successfully")
    suspend fun create(@PathParam("modelId") modelId: String, @PathParam("quizId") quizId: String) =
        QuizInstance.handleHttpCreate(securityIdentity) {
            val quiz = Quiz.findById(ObjectId(quizId)).awaitSuspending() ?: throw NotFoundException()
            val questions =
                Question.find(Eq(QuizInstance::quizId.name, quizId).toQueryDocument()).list().awaitSuspending()
            QuizInstance(modelId, quizId, quiz.name, if (quiz.shuffle) questions.shuffled() else questions)
        }

    @GET
    @Path("{instanceId}")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun get(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("instanceId") instanceId: String
    ) =
        QuizInstance.handleHttpGet(instanceId).takeIf { it.quizId == quizId } ?: throw NotFoundException()

    @DELETE
    @Path("{instanceId}")
    @RolesAllowed(Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The QuizInstance was removed successfully")
    suspend fun remove(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("instanceId") instanceId: String
    ) =
        QuizInstance.handleHttpDelete(securityIdentity, instanceId) {
            cleanQuizInstanceChildren(it)
        }


    @GET
    @Path("{instanceId}/submissions")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun listSubmissions(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("instanceId") instanceId: String,
        @QueryParam("filter") @DefaultValue("") filter: String,
        @QueryParam("cursor") @DefaultValue("") cursor: String
    ): PagedResult<QuizInstanceSubmission> {
        // Additional filter: Student can only access his/her own submission
        val instanceFilter = Eq(QuizInstanceSubmission::quizInstanceId.name, instanceId)
        val addFilter =
            if (!(securityIdentity.roles.contains(Roles.ADMIN) || securityIdentity.roles.contains(Roles.TEACHER))) And(
                Eq(OpenAnatomyEntity::ownerUserId.name, securityIdentity.principal.name), instanceFilter
            ) else instanceFilter
        return QuizInstanceSubmission.handleHttpList(parseFilter(filter, addFilter), cursor)
    }

    @POST
    @Path("{instanceId}/submissions")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "201", description = "The QuizInstanceSubmission was created successfully")
    suspend fun createSubmission(
        @PathParam("modelId") modelId: String, @PathParam("quizId") quizId: String,
        @PathParam("instanceId") instanceId: String,
        input: List<QuestionResponse>
    ): Response {
        // Check if the user already created a submission for this instance (only 1 submission per person per instance allowed!)
        return if (QuizInstanceSubmission.find(
                And(
                    Eq(QuizInstanceSubmission::quizInstanceId.name, instanceId),
                    Eq(QuizInstanceSubmission::ownerUserId.name, securityIdentity.principal.name)
                ).toQueryDocument()
            ).count().awaitSuspending() == 0L
        ) {
            QuizInstanceSubmission.handleHttpCreate(securityIdentity) {
                QuizInstanceSubmission(instanceId, input)
            }
        } else {
            Response.status(Response.Status.CONFLICT).build()
        }
    }

    @GET
    @Path("{instanceId}/submissions/{submissionId}")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    suspend fun getSubmission(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("instanceId") instanceId: String,
        @PathParam("submissionId") submissionId: String
    ): QuizInstanceSubmission {
        val instance = QuizInstanceSubmission.handleHttpGet(submissionId)
        // Additional check: Student can only access his/her own submission
        securityIdentity.checkStudentCanOnlyViewAndModifyOwnSubmission(instance)
        return instance
    }

    @PUT
    @Path("{instanceId}/submissions/{submissionId}")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The QuizInstanceSubmission was updated successfully")
    suspend fun updateSubmission(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("instanceId") instanceId: String,
        @PathParam("submissionId") submissionId: String,
        input: List<QuestionResponse>
    ): Response {
        val instance = QuizInstanceSubmission.handleHttpGet(submissionId)
        // Additional check: Student can only access his/her own submission
        securityIdentity.checkStudentCanOnlyViewAndModifyOwnSubmission(instance)
        QuizInstanceSubmission.handleHttpUpdate(securityIdentity, instanceId) { submission ->
            submission.responses = input
            submission
        }
        return Response.noContent().build()
    }

    @DELETE
    @Path("{instanceId}/submissions/{submissionId}")
    @RolesAllowed(Roles.STUDENT, Roles.TEACHER, Roles.ADMIN)
    @APIResponse(responseCode = "204", description = "The QuizInstanceSubmission was deleted successfully")
    suspend fun deleteSubmission(
        @PathParam("modelId") modelId: String,
        @PathParam("quizId") quizId: String,
        @PathParam("instanceId") instanceId: String,
        @PathParam("submissionId") submissionId: String,
    ): Response {
        val instance = QuizInstanceSubmission.handleHttpGet(submissionId)
        // Additional check: Student can only access his/her own submission
        securityIdentity.checkStudentCanOnlyViewAndModifyOwnSubmission(instance)
        QuizInstanceSubmission.deleteById(instance.id!!).awaitSuspending()
        return Response.noContent().build()
    }


}

private fun SecurityIdentity.checkStudentCanOnlyViewAndModifyOwnSubmission(submission: QuizInstanceSubmission) {
    if (!(this.roles.contains(Roles.ADMIN) || this.roles.contains(Roles.TEACHER)) && submission.ownerUserId != this.principal.name) {
        throw ForbiddenException()
    }
}
