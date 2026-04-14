// Three.js scene setup
let scene, camera, renderer, orbLayers = [], audioContext, analyser, microphone, dataArray;
let isActive = false;
let currentState = 'idle';
let manualOverride = true;
let targetScale = 1.0;
let currentScale = 1.0;
let speakingCadence = { time: 0, intensity: 0, nextChange: 0 };
let listeningDemo = { time: 0, intensity: 0, nextChange: 0, pattern: [] };

// Speech synthesis
let speechSynthesis = window.speechSynthesis;
let isSpeaking = false;
let speakingAudioContext = null;
let speakingAnalyser = null;
let speakingDataArray = null;
let currentUtterance = null;

// State configurations - Layered sphere theme with colors that work in light/dark mode
const states = {
    idle: {
        layers: [
            { 
                color: 0x434FCF,  // Light purple
                opacity: 0.2,
                scale: 1.0,
                rotationSpeed: { x: 0.001, y: 0.002, z: 0 }
            },
            { 
                color: 0x434FCF,  // Medium purple
                opacity: 0.2,
                scale: 0.85,
                rotationSpeed: { x: -0.002, y: 0.003, z: 0.001 }
            },
            { 
                color: 0x434FCF,  // Light purple
                opacity: 0.4,
                scale: 0.70,
                rotationSpeed: { x: 0.003, y: -0.002, z: -0.001 }
            }
        ],
        audioLevel: 0.15,
        audioFrequency: 0.2,
        timeSpeed: 0.015,
        pulsate: false,
        chromaticAberration: 0.8,
        description: 'Calm and ready'
    },
    listening: {
        layers: [
            { 
                color: 0x434FCF,  // Soft blue
                opacity: 0.2,
                scale: 1.0,
                rotationSpeed: { x: 0.002, y: 0.004, z: 0 }
            },
            { 
                color: 0x434FCF,  // Medium blue
                opacity: 0.2,
                scale: 0.85,
                rotationSpeed: { x: -0.003, y: 0.005, z: 0.002 }
            },
            { 
                color: 0x434FCF,  // Light blue
                opacity: 0.4,
                scale: 0.70,
                rotationSpeed: { x: 0.004, y: -0.003, z: -0.001 }
            }
        ],
        audioLevel: 0.6,
        audioFrequency: 0.7,
        timeSpeed: 0.022,
        pulsate: true,
        pulsateMode: 'audio-reactive',
        pulsateMin: 0.02,
        pulsateMax: 0.25,
        chromaticAberration: 1.2,
        description: 'Actively listening'
    },
    thinking: {
        layers: [
            { 
                color: 0x8747F7,  // Soft purple
                opacity: 0.2,
                scale: 0.85,
                rotationSpeed: { x: 0.003, y: 0.003, z: 0 }
            },
            { 
                color: 0x8747F7,  // Medium purple
                opacity: 0.2,
                scale: 0.72,
                rotationSpeed: { x: -0.004, y: 0.004, z: 0.002 }
            },
            { 
                color: 0x8747F7,  // Light purple
                opacity: 0.4,
                scale: 0.60,
                rotationSpeed: { x: 0.005, y: -0.004, z: -0.002 }
            }
        ],
        audioLevel: 0.45,
        audioFrequency: 0.5,
        timeSpeed: 0.02,
        pulsate: true,
        pulsateMode: 'thinking',
        pulsateMin: 0.0,
        pulsateMax: 0.15,
        chromaticAberration: 0.8,
        description: 'Processing...'
    },
    speaking: {
        layers: [
            { 
                color: 0xFF1893,  // Soft pink
                opacity: 0.2,
                scale: 1.0,
                rotationSpeed: { x: 0.004, y: 0.005, z: 0 }
            },
            { 
                color: 0xFF1893,  // Medium pink-red
                opacity: 0.2,
                scale: 0.85,
                rotationSpeed: { x: -0.005, y: 0.006, z: 0.003 }
            },
            { 
                color: 0xFF1893,  // Bright pink
                opacity: 0.4,
                scale: 0.70,
                rotationSpeed: { x: 0.006, y: -0.005, z: -0.002 }
            }
        ],
        audioLevel: 0.8,
        audioFrequency: 0.9,
        timeSpeed: 0.027,
        pulsate: true,
        pulsateMode: 'cadence',
        pulsateMin: 0.05,
        pulsateMax: 0.22,
        chromaticAberration: 1.5,
        description: 'Speaking...'
    }
};

// Shader code for layered spheres with distortion
const vertexShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    uniform float time;
    uniform float audioLevel;
    uniform float layerOffset;
    
    // Simple noise function for organic distortion
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
    
    float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        
        i = mod289(i);
        vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x;
        p1 *= norm.y;
        p2 *= norm.z;
        p3 *= norm.w;
        
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }
    
    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        
        vec3 pos = position;
        
        // Wave distortion - flowing patterns
        float wave1 = sin(pos.y * 2.5 + time * 1.5 + layerOffset) * cos(pos.x * 2.0 - time * 1.2);
        float wave2 = sin(pos.x * 3.0 - time * 1.8 + layerOffset) * cos(pos.z * 2.5 + time * 1.5);
        float wave3 = sin(pos.z * 2.8 + time * 1.6 + layerOffset) * cos(pos.y * 2.3 - time * 1.3);
        
        // Noise-based organic distortion
        float noise1 = snoise(pos * 1.2 + time * 0.3 + layerOffset);
        float noise2 = snoise(pos * 2.0 - time * 0.2 + layerOffset * 0.5);
        
        // Combine distortions - reduced intensity
        float distortion = (wave1 + wave2 + wave3) * 0.008;
        distortion += (noise1 * 0.008 + noise2 * 0.007);
        
        // Audio reactivity
        distortion *= (0.3 + audioLevel * 0.6);
        
        // Apply distortion along normal
        pos = pos + normal * distortion;
        
        vPosition = pos;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
`;

const fragmentShader = `
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    
    uniform vec3 sphereColor;
    uniform float opacity;
    uniform float time;
    uniform float chromaticAberration;
    
    // RGB to HSV conversion
    vec3 rgb2hsv(vec3 c) {
        vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
        vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
        vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
        float d = q.x - min(q.w, q.y);
        float e = 1.0e-10;
        return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
    }
    
    // HSV to RGB conversion
    vec3 hsv2rgb(vec3 c) {
        vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
        vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
        return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
    }
    
    void main() {
        // Calculate fresnel-like effect based on view angle
        vec3 viewDirection = normalize(cameraPosition - vPosition);
        float fresnel = pow(1.0 - abs(dot(viewDirection, normalize(vNormal))), 2.0);
        
        // Holographic rainbow effect based on surface normal and view angle
        vec3 normalWorld = normalize(vNormal);
        
        // Create rainbow gradient based on normal direction and position
        float rainbowShift = normalWorld.x * 0.5 + normalWorld.y * 0.2 + normalWorld.z * 0.1;
        rainbowShift += sin(vPosition.x * 5.0 + time * 0.5) * 0.01;
        rainbowShift += cos(vPosition.y * 4.0 - time * 0.3) * 0.01;
        rainbowShift = fract(rainbowShift);
        
        // Generate holographic rainbow colors
        vec3 rainbow = hsv2rgb(vec3(rainbowShift, 0.8, 1.0));
        
        // Convert base color to HSV
        vec3 hsv = rgb2hsv(sphereColor);
        
        // Create chromatic aberration by shifting hue based on position
        float aberrationAmount = chromaticAberration * fresnel;
        
        // Shift red channel
        vec3 hsvR = hsv;
        hsvR.x = fract(hsv.x + aberrationAmount * 0.15);
        vec3 colorR = hsv2rgb(hsvR);
        
        // Keep green as base
        vec3 colorG = sphereColor;
        
        // Shift blue channel opposite direction
        vec3 hsvB = hsv;
        hsvB.x = fract(hsv.x - aberrationAmount * 0.15);
        vec3 colorB = hsv2rgb(hsvB);
        
        // Mix channels for chromatic aberration effect
        vec3 color = vec3(colorR.r, colorG.g, colorB.b);
        
        // Blend in holographic rainbow effect, stronger at edges (fresnel)
        float holographicIntensity = fresnel * 0.6 + 0.2; // 0.2 to 0.8 range
        color = mix(color, rainbow, holographicIntensity * 0.6);
        
        // Add edge emphasis where aberration is strongest
        color += fresnel * chromaticAberration * 0.15;
        
        // Add subtle brightness variation based on position
        float brightness = 1.0 + sin(vPosition.x * 3.0 + time) * 0.1;
        brightness += sin(vPosition.y * 2.5 - time * 0.8) * 0.1;
        
        // Add extra shimmer for holographic effect
        float shimmer = sin(vPosition.x * 8.0 + vPosition.y * 6.0 + time * 2.0) * 0.04 + 0.96;
        brightness *= shimmer;
        
        color *= brightness;
        
        gl_FragColor = vec4(color, opacity);
    }
`;

// Initialize Three.js scene
function init() {
    // Scene
    scene = new THREE.Scene();
    
    // Camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;
    
    // Renderer
    const canvas = document.getElementById('canvas');
    renderer = new THREE.WebGLRenderer({ 
        canvas, 
        antialias: true, 
        alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Create layered concentric spheres with custom shaders
    const initialState = states.idle;
    initialState.layers.forEach((layerConfig, index) => {
        const geometry = new THREE.SphereGeometry(layerConfig.scale, 80, 80);
        
        // Create shader material with distortion
        const material = new THREE.ShaderMaterial({
            vertexShader,
            fragmentShader,
            uniforms: {
                time: { value: 0 },
                audioLevel: { value: 0 },
                layerOffset: { value: index * 2.0 },  // Offset each layer's distortion pattern
                sphereColor: { value: new THREE.Color(layerConfig.color) },
                opacity: { value: layerConfig.opacity },
                chromaticAberration: { value: initialState.chromaticAberration || 0.1 },
                cameraPosition: { value: camera.position }
            },
            transparent: true,
            side: THREE.DoubleSide,
            blending: THREE.NormalBlending,
            depthWrite: false
        });
        
        const sphere = new THREE.Mesh(geometry, material);
        sphere.userData = {
            baseScale: layerConfig.scale,
            rotationSpeed: layerConfig.rotationSpeed,
            layerIndex: index
        };
        
        scene.add(sphere);
        orbLayers.push(sphere);
    });
    
    // Ambient lighting - soft glow
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    // Point lights for depth
    const pointLight1 = new THREE.PointLight(0x667eea, 0.6, 100);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x764ba2, 0.4, 100);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
    
    // Start animation loop
    animate();
}

// Handle window resize
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Set state
function setState(stateName) {
    if (!states[stateName]) return;
    
    // Stop speaking when leaving speaking state
    if (currentState === 'speaking' && stateName !== 'speaking') {
        stopSpeaking();
    }
    
    currentState = stateName;
    const state = states[stateName];
    
    // Start speaking when entering speaking state (if not in active mic mode)
    if (stateName === 'speaking' && !isActive) {
        startSpeaking();
    }
    
    // Update UI
    document.querySelectorAll('.state-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.state === stateName);
    });
    
    // Update status text
    const status = document.getElementById('status');
    if (!isActive) {
        if (stateName === 'speaking') {
            status.textContent = '🔊 Speaking with voice synthesis...';
        } else {
            status.textContent = state.description;
        }
    }
    
    // Smoothly transition each layer's colors, opacity, and rotation
    orbLayers.forEach((layer, index) => {
        const layerConfig = state.layers[index];
        if (layerConfig) {
            // Update shader uniforms
            layer.material.uniforms.sphereColor.value.setHex(layerConfig.color);
            layer.material.uniforms.opacity.value = layerConfig.opacity;
            
            // Update rotation speed
            layer.userData.rotationSpeed = layerConfig.rotationSpeed;
            layer.userData.baseScale = layerConfig.scale;
        }
    });
}

// Generate realistic voice input simulation for listening demo
function updateListeningDemo() {
    const now = Date.now() * 0.001;
    
    if (now >= listeningDemo.nextChange) {
        const patternType = Math.random();
        
        if (patternType < 0.25) {
            // Quick word or syllable
            listeningDemo.intensity = 0.5 + Math.random() * 0.3;
            listeningDemo.nextChange = now + 0.1 + Math.random() * 0.1;
        } else if (patternType < 0.5) {
            // Medium intensity speech
            listeningDemo.intensity = 0.6 + Math.random() * 0.3;
            listeningDemo.nextChange = now + 0.2 + Math.random() * 0.2;
        } else if (patternType < 0.75) {
            // Louder speech
            listeningDemo.intensity = 0.7 + Math.random() * 0.3;
            listeningDemo.nextChange = now + 0.15 + Math.random() * 0.25;
        } else if (patternType < 0.9) {
            // Sustained sound (like holding a vowel)
            listeningDemo.intensity = 0.4 + Math.random() * 0.4;
            listeningDemo.nextChange = now + 0.3 + Math.random() * 0.3;
        } else {
            // Brief pause
            listeningDemo.intensity = 0.05 + Math.random() * 0.1;
            listeningDemo.nextChange = now + 0.1 + Math.random() * 0.15;
        }
    }
    
    // Add natural voice fluctuation (vibrato-like effect)
    const fluctuation = Math.sin(now * 8.0) * 0.1;
    return Math.max(0, listeningDemo.intensity + fluctuation);
}

// Speech content for TTS demo
const speechPhrases = [
    "Hello! I'm demonstrating real-time voice synthesis.",
    "Notice how the orb pulsates with my speech patterns.",
    "The visual feedback matches the audio output perfectly.",
    "I can speak different phrases with varying cadence and rhythm.",
    "This creates a natural and engaging voice interface.",
    "The orb grows and shrinks based on the audio amplitude.",
    "Technology like this can make AI conversations more intuitive.",
    "What do you think of this voice visualization?",
];

let currentPhraseIndex = 0;

// Start speaking with TTS
function startSpeaking() {
    if (isSpeaking) return;
    
    // Get next phrase
    const phrase = speechPhrases[currentPhraseIndex];
    currentPhraseIndex = (currentPhraseIndex + 1) % speechPhrases.length;
    
    currentUtterance = new SpeechSynthesisUtterance(phrase);
    currentUtterance.rate = 0.9;
    currentUtterance.pitch = 1.0;
    currentUtterance.volume = 1.0;
    
    currentUtterance.onstart = () => {
        isSpeaking = true;
        console.log('Speaking:', phrase);
    };
    
    currentUtterance.onend = () => {
        isSpeaking = false;
        // Wait a bit before next phrase
        setTimeout(() => {
            if (currentState === 'speaking' && !isActive) {
                startSpeaking();
            }
        }, 2000);
    };
    
    currentUtterance.onerror = (event) => {
        console.error('Speech synthesis error:', event);
        isSpeaking = false;
    };
    
    speechSynthesis.speak(currentUtterance);
}

// Stop speaking
function stopSpeaking() {
    speechSynthesis.cancel();
    isSpeaking = false;
    currentUtterance = null;
}

// Analyze audio from an audio element (for TTS)
function getSpeakingAudioLevel() {
    // Since Web Speech API doesn't provide direct audio stream access,
    // we'll use the speech events and timing to estimate audio level
    if (isSpeaking && currentUtterance) {
        // Create a more realistic pattern based on actual speech
        const now = Date.now() * 0.001;
        
        // Simulate speech envelope with varied patterns
        const baseIntensity = 0.6 + Math.sin(now * 3.0) * 0.2;
        const microPattern = Math.sin(now * 12.0) * 0.15; // Simulates phonemes
        const breathPattern = Math.sin(now * 0.5) * 0.1; // Simulates breathing
        
        return Math.max(0.2, Math.min(1.0, baseIntensity + microPattern + breathPattern));
    }
    return 0.1;
}

// Generate speech-like cadence for speaking state (fallback when not using TTS)
function updateSpeakingCadence() {
    const now = Date.now() * 0.001;
    
    if (now >= speakingCadence.nextChange) {
        // Create varied speech patterns
        // Sometimes short bursts, sometimes longer phrases
        const patternType = Math.random();
        
        if (patternType < 0.3) {
            // Quick burst (like a short word)
            speakingCadence.intensity = 0.7 + Math.random() * 0.3;
            speakingCadence.nextChange = now + 0.15 + Math.random() * 0.15;
        } else if (patternType < 0.6) {
            // Medium phrase
            speakingCadence.intensity = 0.5 + Math.random() * 0.4;
            speakingCadence.nextChange = now + 0.3 + Math.random() * 0.3;
        } else if (patternType < 0.85) {
            // Longer phrase
            speakingCadence.intensity = 0.6 + Math.random() * 0.4;
            speakingCadence.nextChange = now + 0.5 + Math.random() * 0.4;
        } else {
            // Pause (breath or thinking)
            speakingCadence.intensity = 0.1 + Math.random() * 0.2;
            speakingCadence.nextChange = now + 0.2 + Math.random() * 0.3;
        }
    }
    
    // Add natural speech fluctuation
    const fluctuation = Math.sin(Date.now() * 0.001 * 10.0) * 0.08;
    return Math.max(0, speakingCadence.intensity + fluctuation);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const state = states[currentState];
    
    let audioLevel = 0;
    let audioFrequency = 0;
    
    // Update audio data based on mode
    if (isActive && analyser && dataArray && !manualOverride) {
        // Real audio input mode
        analyser.getByteFrequencyData(dataArray);
        
        // Calculate average audio level
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
        }
        audioLevel = sum / dataArray.length / 255;
        
        // Get frequency data (focus on mid-range frequencies)
        audioFrequency = dataArray.slice(10, 40).reduce((a, b) => a + b, 0) / 30 / 255;
    } else {
        // Manual state mode - use predefined values
        audioLevel = state.audioLevel;
        audioFrequency = state.audioFrequency;
    }
    
    // Pulsating scale effect for conversation states
    if (state.pulsate) {
        if (state.pulsateMode === 'audio-reactive') {
            // LISTENING: React to actual audio input volume or simulate voice
            let volumeScale;
            if (isActive && analyser && dataArray) {
                // Use real microphone data when available
                volumeScale = Math.min(1.0, audioLevel * 2.5);
                
                // Add extra boost for very quiet sounds to make them visible
                if (volumeScale < 0.1) {
                    volumeScale = volumeScale * 2;
                }
            } else {
                // Demo mode: Simulate realistic voice input
                volumeScale = updateListeningDemo();
            }
            
            // Map volume to scale range
            targetScale = 1.0 + state.pulsateMin + (volumeScale * (state.pulsateMax - state.pulsateMin));
            
        } else if (state.pulsateMode === 'thinking') {
            // THINKING: Gentle rhythmic pulsation
            const time = Date.now() * 0.001;
            // Smooth sine wave for breathing effect
            const thinkingPulse = (Math.sin(time * 1.5) + 1.0) / 2.0; // 0 to 1
            
            // Map to scale range
            targetScale = 1.0 + state.pulsateMin + (thinkingPulse * (state.pulsateMax - state.pulsateMin));
            
        } else if (state.pulsateMode === 'cadence') {
            // SPEAKING: Use real TTS audio level or simulate
            let cadenceIntensity;
            if (isSpeaking) {
                // Get actual audio level from TTS
                cadenceIntensity = getSpeakingAudioLevel();
            } else {
                // Fallback to simulation
                cadenceIntensity = updateSpeakingCadence();
            }
            
            // Map cadence intensity to scale
            targetScale = 1.0 + state.pulsateMin + (cadenceIntensity * (state.pulsateMax - state.pulsateMin));
        }
        
        // Smooth interpolation for natural movement (faster for real audio)
        const smoothing = (isActive && analyser && state.pulsateMode === 'audio-reactive') ? 0.25 : 0.15;
        currentScale += (targetScale - currentScale) * smoothing;
        
    } else {
        // Smoothly return to normal scale for non-pulsating states
        targetScale = 1.0;
        currentScale += (targetScale - currentScale) * 0.1;
    }
    
    // Update each layer independently
    orbLayers.forEach((layer, index) => {
        const layerConfig = state.layers[index];
        if (layerConfig) {
            // Update shader uniforms
            layer.material.uniforms.time.value += state.timeSpeed;
            layer.material.uniforms.audioLevel.value = audioLevel;
            
            // Update chromatic aberration - can be audio-reactive
            let aberrationValue = state.chromaticAberration || 0.1;
            if (isActive && analyser && dataArray) {
                // Add subtle audio reactivity to chromatic aberration
                aberrationValue += audioLevel * 0.3;
            }
            layer.material.uniforms.chromaticAberration.value = aberrationValue;
            
            // Apply individual rotation speeds
            layer.rotation.x += layer.userData.rotationSpeed.x;
            layer.rotation.y += layer.userData.rotationSpeed.y;
            layer.rotation.z += layer.userData.rotationSpeed.z;
            
            // Apply pulsating scale
            const layerScale = layer.userData.baseScale * currentScale;
            layer.scale.set(layerScale, layerScale, layerScale);
        }
    });
    
    renderer.render(scene, camera);
}

// Setup audio capture
async function setupAudio() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        microphone = audioContext.createMediaStreamSource(stream);
        
        analyser.fftSize = 512;  // Higher resolution for better detection
        analyser.smoothingTimeConstant = 0.3;  // Less smoothing for more responsive reaction
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);
        
        microphone.connect(analyser);
        
        console.log('Microphone connected successfully');
        return true;
    } catch (error) {
        console.error('Error accessing microphone:', error);
        alert('Unable to access microphone. Please grant microphone permissions.');
        return false;
    }
}

// UI Controls
document.getElementById('startBtn').addEventListener('click', async function() {
    const btn = this;
    const status = document.getElementById('status');
    
    if (!isActive) {
        // Stop TTS if switching to mic mode
        stopSpeaking();
        
        const success = await setupAudio();
        if (success) {
            isActive = true;
            manualOverride = false;
            btn.textContent = 'Stop Voice Mode';
            btn.classList.add('active');
            status.textContent = '🎤 Listening to microphone - Speak to see reaction!';
            status.classList.add('active');
            setState('listening'); // Switch to listening state
        }
    } else {
        isActive = false;
        manualOverride = true;
        if (audioContext) {
            audioContext.close();
        }
        btn.textContent = 'Start Voice Mode';
        btn.classList.remove('active');
        
        // Restart TTS if in speaking mode
        if (currentState === 'speaking') {
            status.textContent = '🔊 Speaking with voice synthesis...';
            startSpeaking();
        } else {
            status.textContent = states[currentState].description;
        }
        status.classList.remove('active');
    }
});

// State button controls
document.querySelectorAll('.state-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const state = this.dataset.state;
        manualOverride = true;
        setState(state);
    });
});

// Theme Management
function initTheme() {
    // Check localStorage or default to dark theme
    const savedTheme = localStorage.getItem('voiceOrb-theme') || 'dark';
    setTheme(savedTheme);
}

function setTheme(theme) {
    if (theme === 'light') {
        document.body.setAttribute('data-theme', 'light');
    } else {
        document.body.removeAttribute('data-theme');
    }
    localStorage.setItem('voiceOrb-theme', theme);
}

function toggleTheme() {
    const currentTheme = document.body.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
}

// Theme toggle button
document.getElementById('themeBtn').addEventListener('click', toggleTheme);

// Initialize when page loads
window.addEventListener('DOMContentLoaded', () => {
    initTheme(); // Initialize theme first
    init();
    setState('idle'); // Set initial state
});

