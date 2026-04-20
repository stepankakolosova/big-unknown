import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './App.css'

function App() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const container = canvasRef.current

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog('#020202', 3, 10)

    const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 5)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const vertexShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform float time;

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
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
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
        vec3 p0 = vec3(a0.xy,h.x);
        vec3 p1 = vec3(a0.zw,h.y);
        vec3 p2 = vec3(a1.xy,h.z);
        vec3 p3 = vec3(a1.zw,h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);
        float noise = snoise(vec3(position.x * 2.0 + time * 0.2, position.y * 2.0, position.z * 2.0));
        vec3 newPosition = position + normal * (noise * 0.15);
        vPosition = (modelViewMatrix * vec4(newPosition, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
      }
    `

    const fragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPosition;

      vec3 palette(in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d) {
        return a + b*cos(6.28318*(c*t+d));
      }

      void main() {
        vec3 viewDirection = normalize(-vPosition);
        float fresnel = dot(viewDirection, vNormal);
        fresnel = clamp(1.0 - fresnel, 0.0, 1.0);
        fresnel = pow(fresnel, 3.0);
        float colorFactor = vNormal.x * 0.5 + vNormal.y * 0.5 + 0.5;
        vec3 a = vec3(0.5, 0.5, 0.5);
        vec3 b = vec3(0.5, 0.5, 0.5);
        vec3 c = vec3(1.0, 1.0, 1.0);
        vec3 d = vec3(0.263, 0.416, 0.557);
        vec3 baseColor = palette(colorFactor + fresnel, a, b, c, d);
        vec3 finalColor = mix(vec3(0.01, 0.01, 0.05), baseColor, fresnel * 1.5);
        finalColor += vec3(0.5, 0.8, 1.0) * pow(fresnel, 5.0);
        gl_FragColor = vec4(finalColor, 0.85);
      }
    `

    const geometry = new THREE.SphereGeometry(1.2, 128, 128)
    geometry.scale(0.6, 1.2, 0.6)

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: { time: { value: 0.0 } },
      transparent: true,
    })

    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = 0.1
    scene.add(mesh)

    let mouseX = 0
    let mouseY = 0
    const windowHalfX = window.innerWidth / 2
    const windowHalfY = window.innerHeight / 2

    const onMouseMove = (e) => {
      mouseX = (e.clientX - windowHalfX) * 0.001
      mouseY = (e.clientY - windowHalfY) * 0.001
    }
    document.addEventListener('mousemove', onMouseMove)

    const timer = new THREE.Timer()
    let animId

    const animate = () => {
      animId = requestAnimationFrame(animate)
      timer.update()
      const elapsed = timer.getElapsed()
      material.uniforms.time.value = elapsed

      mesh.rotation.y += 0.01 + (mouseX * 0.5 - mesh.rotation.y) * 0.05
      mesh.rotation.x += 0.005 + (mouseY * 0.5 - mesh.rotation.x) * 0.05
      mesh.position.y = 0.1 + Math.sin(elapsed * 0.5) * 0.1

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(animId)
      document.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <>
      <div ref={canvasRef} className="canvas-container" />
      <main className="hero">
        <h1 className="hero-title">Big Unknown</h1>
        <p className="hero-tagline">
          <strong>the future is fluid.</strong><br />
          <br />
          the post-work era is here.<br />
          what you're afraid of losing was never really yours
        </p>
      </main>
      <section className="newsletter-section">
        <p className="newsletter-label">stay in the loop</p>
        <div className="iframe-wrapper">
          <iframe
            src="https://stepankakolosova.substack.com/embed"
            width="480"
            height="320"
            frameBorder="0"
            scrolling="no"
            title="Newsletter signup"
          />
        </div>
      </section>

      <section className="questions-section">
        <p className="questions-label">Six Questions</p>
        <ol className="questions-list">
          {[
            'What remains of us when work, as we knew it, disappears?',
            'Who do we become when machines can think faster than we can feel?',
            'What is worth doing, simply because we are alive?',
            'How do we find meaning when productivity is no longer the measure?',
            'What kind of community do we need in a world we no longer recognise?',
            'And if the future is fluid, who gets to shape it?',
          ].map((q, i) => (
            <li key={i} className="question-item">
              <span className="question-num">{String(i + 1).padStart(2, '0')}</span>
              <span className="question-text">{q}</span>
            </li>
          ))}
        </ol>
        <p className="questions-closing">
          They're building agents. We're building what happens after agents build everything.<br />Join us.
        </p>
      </section>
    </>
  )
}

export default App
