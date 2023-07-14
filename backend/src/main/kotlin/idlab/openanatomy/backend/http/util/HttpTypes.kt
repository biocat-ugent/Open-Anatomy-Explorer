package idlab.openanatomy.backend.http.util

import idlab.openanatomy.backend.annotations.GenerateNoArgConstructor
import idlab.openanatomy.backend.definitions.QuestionType
import org.jboss.resteasy.reactive.RestForm
import org.jboss.resteasy.reactive.multipart.FileUpload

@GenerateNoArgConstructor
data class LabelInput(
    val name: String,
    val colour: String
)

@GenerateNoArgConstructor
data class ModelInput(
    val name: String,
    val category: String? = null,
    val cameraPosition: List<Double>? = null,
    val cameraTarget: List<Double>? = null,
    val modelRotation: List<Double>? = null,
)

@GenerateNoArgConstructor
data class QuestionInput(
    val questionType: QuestionType,
    val textPrompt: String,
    val textAnswer: String? = null,
    val labelId: String? = null,
    val showRegions: Boolean? = null
)

@GenerateNoArgConstructor
data class QuizInput(
    val name: String,
    val shuffle: Boolean
)

object Roles {
    const val ADMIN = "admin"
    const val TEACHER = "teacher"
    const val STUDENT = "student"
}

data class PagedResult<T>(
    val items: List<T> = emptyList(),
    val nextCursor: String? = null,
    val count: Long? = null
)

class FormData {

    @RestForm("file")
    lateinit var file: FileUpload

}
