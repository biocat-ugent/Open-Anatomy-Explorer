package idlab.openanatomy.backend.http

import io.restassured.response.ResponseBodyExtractionOptions

// allows response.to<X>() -> X instance
internal inline fun <reified T> ResponseBodyExtractionOptions.to(): T {
    return this.`as`(T::class.java)
}
