precision mediump float;

varying vec2 vTextureCoord;

uniform sampler2D uSampler;
uniform float whiteout;
uniform float invert;
uniform vec2 camPos;
#ifdef GL_FRAGMENT_PRECISION_HIGH
	uniform highp float curTime;
#else
	uniform float curTime;
#endif
uniform sampler2D ditherGridMap;
uniform vec3 bg;
uniform vec3 fg;
const vec2 ditherSize = vec2(64.0);
const float scale = 1.0;
const float posterize = 1.0;
const float brightness = 1.0;
const float contrast = 1.0;

void main(void) {
	// get pixels
	vec2 uv = vTextureCoord;
	// float t = mod(curTime,1.0);
	
	vec2 coord = gl_FragCoord.xy;
	coord -= mod(coord, scale);

	vec2 uvDither = fract((coord + vec2(0.5)) / (ditherSize.xy * scale));
	vec2 uvPreview = uv;
	vec3 orig = texture2D(uSampler, uvPreview).rgb;

	vec3 col = (orig - 0.5 + (brightness - 1.0)) * contrast + 0.5;
	vec3 limit = texture2D(ditherGridMap, uvDither).rgb;

	// posterization
	vec3 raw = col;
	vec3 posterized = raw - mod(raw, 1.0/posterize);
	// dithering
	vec3 dither = step(limit, (raw-posterized)*posterize)/posterize;
	// output
	col = posterized + dither;

	col = mix(col, vec3(1.0), whiteout);
	col = mix(col, vec3(1.0) - col, invert);

	vec3 rgb = mix(bg, fg, col) / 255.0;

	gl_FragColor = vec4(rgb, 1.0);
	// gl_FragColor = vec4(orig, 1.0);
}
