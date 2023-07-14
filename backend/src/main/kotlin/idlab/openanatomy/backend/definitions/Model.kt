package idlab.openanatomy.backend.definitions

import com.fasterxml.jackson.annotation.JsonIgnore
import idlab.openanatomy.backend.annotations.GenerateNoArgConstructor
import io.quarkus.mongodb.panache.common.MongoEntity
import io.quarkus.mongodb.panache.kotlin.reactive.ReactivePanacheMongoCompanion
import io.quarkus.mongodb.panache.kotlin.reactive.ReactivePanacheMongoEntity
import java.time.Instant

abstract class OpenAnatomyEntity : ReactivePanacheMongoEntity() {
    lateinit var ownerUserId: String
    var createdAt: Instant = Instant.now()
    var lastModifiedAt: Instant? = null
}

enum class ModelAssetType {

    OBJECT, MATERIAL, TEXTURE;

    companion object {

        fun valueOfOrNull(stringVal: String): ModelAssetType? {
            return try {
                ModelAssetType.valueOf(stringVal)
            } catch (err: IllegalArgumentException) {
                null
            }
        }

    }
}

@MongoEntity
data class Model(
    var name: String,
    var category: String? = null,
    var cameraPosition: List<Double>? = null,
    var cameraTarget: List<Double>? = null,
    var modelRotation: List<Double>? = null,
    @JsonIgnore
    // Ideally we could use ModelAssetType enum values as key here, but the BSON codec does not support this
    var storageKeys: MutableMap<String, String> = mutableMapOf()
) :
    OpenAnatomyEntity() {

    companion object : ReactivePanacheMongoCompanion<Model>
}

@MongoEntity
data class Label(
    @JsonIgnore
    var modelId: String,
    var name: String,
    var colour: String,
) : OpenAnatomyEntity() {
    companion object : ReactivePanacheMongoCompanion<Label>
}

@MongoEntity
data class LabelVertices(var labelId: String, var data: List<Int>) : ReactivePanacheMongoEntity() {
    companion object : ReactivePanacheMongoCompanion<LabelVertices>
}

@MongoEntity
data class Quiz(
    @JsonIgnore
    var modelId: String,
    var name: String,
    var shuffle: Boolean
) : OpenAnatomyEntity() {
    companion object : ReactivePanacheMongoCompanion<Quiz>
}

@MongoEntity
data class Question(
    @JsonIgnore
    var quizId: String,
    var questionType: QuestionType,
    var textPrompt: String,
    var textAnswer: String? = null,
    var labelId: String? = null,
    // TODO: What was/is the purpose of this field?
    var showRegions: Boolean? = null
) : OpenAnatomyEntity() {
    companion object : ReactivePanacheMongoCompanion<Question>
}

// TODO: What question types do we need to support?
enum class QuestionType {
    LOCATE,
    NAME,
    FREE_FORM
}

@MongoEntity
data class QuizInstance(
    var modelId: String,
    var quizId: String,
    var name: String,
    var questionsSnapshot: List<Question>
) : OpenAnatomyEntity() {
    companion object : ReactivePanacheMongoCompanion<QuizInstance>
}

@MongoEntity
data class QuizInstanceSubmission(
    @JsonIgnore
    var quizInstanceId: String,
    var responses: List<QuestionResponse>
) : OpenAnatomyEntity() {
    companion object : ReactivePanacheMongoCompanion<QuizInstanceSubmission>
}

@GenerateNoArgConstructor
data class QuestionResponse(var questionId: String, var textAnswer: String? = null, var verticesData: List<Int>? = null)
