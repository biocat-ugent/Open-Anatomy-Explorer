attribute vec3 color;
attribute vec4 labelColorIn;
varying vec3 vertexColor;
varying vec4 labelColor;
varying vec3 fragPosition;
varying vec3 fragNormal;
varying vec2 fragTexCoord;

void main() {
    vec4 pos = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    fragPosition = position;
    fragNormal = normal;
    fragTexCoord = uv;
    labelColor = labelColorIn;
    vertexColor = color;

    gl_Position = pos;
}
