precision mediump float;
precision mediump sampler3D;

uniform sampler2D texture1;
uniform vec3 baseColor;

uniform bool useVertexColor;
uniform bool useTexture;
uniform vec3 worldLightPosition;
uniform float ambientIntensity;
uniform float specularIntensity;
uniform float diffuseIntensity;
uniform float specularReflection;
uniform float diffuseReflection;
uniform float ambientReflection;
uniform float shininess;

varying vec3 vertexColor;
varying vec4 labelColor;
varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec2 fragTexCoord;

void main() {
    vec3 color;
    if (useTexture) {
        color = texture(texture1, fragTexCoord).rgb;
    } else if (useVertexColor) {
        color = vertexColor;
    } else {
        color = baseColor;
    }

    vec3 pos = fragPosition;
    vec3 normal = normalize(fragNormal);

    // Vector to camera
    vec3 v = normalize(cameraPosition - pos);

    // Vector to light source
    vec3 lm = normalize(worldLightPosition - pos);

    // Reflected light vector
    vec3 np = 2.0 * dot(lm, normal) * normal;
    vec3 rm = normalize(np - lm);

    // Light intensity
    float ip = ambientReflection * ambientIntensity + (
    diffuseReflection * diffuseIntensity * dot(lm, normal) +
    specularReflection * specularIntensity * pow(max(0.0, min(1.0, dot(rm, v))), shininess)
    );

    color = mix(color.rgb, labelColor.rgb, labelColor.a);

    gl_FragColor = vec4(ip * color, 1.0);
}
