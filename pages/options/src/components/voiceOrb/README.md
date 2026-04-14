# AI Voice Mode - Reactive Orb POC

A proof of concept for an AI conversation mode feedback UI featuring a beautiful 3D orb that reacts to user voice input using Three.js and custom GLSL shaders.

## Features

- **Manual State Controls**: Four distinct visual states (Idle, Listening, Thinking, Speaking)
- **Text-to-Speech Integration**: Speaking mode produces actual voice output using Web Speech API
- **Real-Time Audio Reactivity**: Orb reacts to both microphone input and TTS output
- **Custom Shaders**: Beautiful vertex and fragment shaders creating an organic, pulsating orb
- **Perlin Noise**: Organic displacement based on simplex noise for natural movement
- **Dynamic Colors**: Each state has unique color schemes with smooth transitions
- **Fresnel Effects**: Glowing edges that intensify with voice input
- **Smooth Animations**: Interpolated audio levels for fluid visual transitions
- **State-Specific Properties**: Different rotation speeds, animation speeds, and intensities per state

## How to Use

### Manual State Control
1. Open `index.html` in a modern web browser
2. Click any of the state buttons to see different visual modes:
   - **💤 Idle**: Calm, gentle pulsing with purple colors
   - **👂 Listening**: Active, green colors - simulates voice input with realistic patterns
   - **🤔 Thinking**: Processing state with amber/yellow colors
   - **💬 Speaking**: High energy with pink colors - **features real text-to-speech output!**

### Voice Mode (Real Audio Input)
1. Click the "Start Voice Mode" button
2. Grant microphone permissions when prompted
3. Speak or make sounds to see the orb react to your voice in real-time!
4. Click state buttons anytime to override and manually control the visual state

## Technical Details

### Audio Analysis
- Uses Web Audio API to capture microphone input
- FFT analysis with 256 samples
- Focuses on mid-range frequencies (10-40 bins) for better voice detection
- Smooth interpolation prevents jarring visual changes

### Shaders
- **Vertex Shader**: Implements simplex noise for organic displacement based on audio levels
- **Fragment Shader**: Creates dynamic color gradients and fresnel effects
- Audio data drives both displacement amount and color intensity

### Visual Effects
- Displacement mapping that reacts to overall audio level
- Frequency-based color mixing
- Pulsating animation synchronized with voice amplitude
- Fresnel glow that intensifies during speech
- Subtle idle animation when no voice input is detected

## Browser Requirements

- Modern browser with WebGL support
- Microphone access
- Web Audio API support (Chrome, Firefox, Safari, Edge)

## Customization

You can easily customize the colors by modifying the `color1`, `color2`, and `color3` uniforms in `app.js`:

```javascript
color1: { value: new THREE.Color(0x667eea) }, // Purple
color2: { value: new THREE.Color(0x764ba2) }, // Deep purple
color3: { value: new THREE.Color(0xf093fb) }  // Pink
```

## License

MIT License - Feel free to use this in your projects!

