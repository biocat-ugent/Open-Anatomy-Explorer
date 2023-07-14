package idlab.openanatomy.backend.http

import idlab.openanatomy.backend.definitions.Model
import idlab.openanatomy.backend.http.util.ModelInput
import io.quarkus.test.junit.QuarkusTest
import io.vertx.core.json.Json
import org.junit.jupiter.api.Assertions
import org.junit.jupiter.api.Test
import java.time.Instant

@QuarkusTest
class SerdesTest : AbstractTest() {

    @Test
    fun testModel() {
        val model = Model(name = "test", category = "testers").apply {
            this.ownerUserId = "test-user"
            this.createdAt = Instant.now()
        }

        val json = Json.encode(model)
        val result = Json.decodeValue(json, Model::class.java)
        assertEqualsModel(model, result)
    }


    @Test
    fun testModelInput() {
        val model = ModelInput(name = "test", category = "testers")

        val json = Json.encode(model)
        val result = Json.decodeValue(json, ModelInput::class.java)

        Assertions.assertEquals(model, result)
    }

}
