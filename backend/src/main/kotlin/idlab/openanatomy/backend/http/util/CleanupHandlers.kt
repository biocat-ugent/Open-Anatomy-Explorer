package idlab.openanatomy.backend.http.util

import idlab.openanatomy.backend.definitions.*
import io.smallrye.mutiny.coroutines.awaitSuspending
import kotlinx.coroutines.flow.asFlow
import kotlinx.coroutines.flow.collect
import kotlinx.coroutines.flow.onEach

suspend fun cleanModelChildren(model: Model, modelAssetManager: ModelAssetManager) {
    // Delete labels
    Label.delete(Eq("modelId", model.id.toString()).toQueryDocument()).awaitSuspending()

    // Delete quizzes
    Quiz.find(Eq("modelId", model.id.toString()).toQueryDocument()).list().awaitSuspending().forEach { quiz ->
        cleanQuizChildren(quiz)
        Quiz.deleteById(quiz.id!!).awaitSuspending()
    }

    // Remove associated object, material & texture
    model.storageKeys.entries.asFlow().onEach { (assetType, assetId) ->
        modelAssetManager.removeAssetRaw(
            assetId,
            ModelAssetType.valueOf(assetType)
        )
    }.collect()
}

suspend fun cleanQuizChildren(quiz: Quiz) {
    Question.delete(Eq("quizId", quiz.id.toString()).toQueryDocument()).awaitSuspending()
    QuizInstance.find(Eq(QuizInstance::quizId.name, quiz.id.toString()).toQueryDocument()).list().awaitSuspending()
        .forEach { quizInstance ->
            cleanQuizInstanceChildren(quizInstance)
            QuizInstance.deleteById(quizInstance.id!!).awaitSuspending()
        }
}

suspend fun cleanQuizInstanceChildren(quizInstance: QuizInstance) {
    QuizInstanceSubmission.delete(
        Eq(
            QuizInstanceSubmission::quizInstanceId.name,
            quizInstance.id.toString()
        ).toQueryDocument()
    ).awaitSuspending()
}
