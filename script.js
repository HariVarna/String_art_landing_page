gsap.registerPlugin(ScrollTrigger);

// Initialize Lenis
const lenis = new Lenis()
lenis.on('scroll', ScrollTrigger.update)

gsap.ticker.add((time)=>{
  lenis.raf(time * 1000)
})

gsap.ticker.lagSmoothing(0)

const canvas = document.getElementById("string-art-canvas");
const ctx = canvas.getContext("2d");
let width, height, centerX, centerY, radius;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    centerX = width / 2;
    centerY = height / 2;
    
    // Scale board based on screen width for side-by-side mode later
    radius = Math.min(width, height) * 0.35; 
}
window.addEventListener("resize", resize);
resize();

// Images Loading
const imgStringArt = new Image();
imgStringArt.src = 'luffy3.png';

// Nails Setup
const TOTAL_NAILS = 200; // Increased density for ultra smooth realistic look
const nails = [];
for (let i = 0; i < TOTAL_NAILS; i++) {
    const angle = (i / TOTAL_NAILS) * Math.PI * 2 - Math.PI / 2;
    nails.push({
        x: Math.cos(angle), 
        y: Math.sin(angle),
        angle: angle
    });
}

// Generate Realistic Continuous Threads for String Art Timelapse
const fakeThreads = [];
const NUM_FAKE_THREADS = 1500;
let currentN = 0;
let currentJump = 67;

for (let i = 0; i < NUM_FAKE_THREADS; i++) {
    let nextN = (currentN + currentJump) % TOTAL_NAILS;
    fakeThreads.push({
        n1: currentN,
        n2: nextN
    });
    currentN = nextN;
    
    // Periodically shift the jump pattern to create complex mandala webs
    if (i % 250 === 0) {
        currentJump = Math.floor(Math.random() * 40) + 30; // 30 to 70 jump logic
    }
}

// Theme Logic for Board Color
let currentTheme = {
    c1: "#ffffff",
    c2: "#e8ebf0",
    c3: "#b0bac9",
    border: "#563215"
};

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    
    // Update active button
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.classList.remove('active');
        if(btn.getAttribute('data-theme') === themeName) {
            btn.classList.add('active');
        }
    });

    if (themeName === 'wood') {
        currentTheme = {
            c1: "#ffffff",
            c2: "#e8ebf0",
            c3: "#b0bac9",
            border: "#563215"
        };
    } else {
        // Marble
        currentTheme = {
            c1: "#ffffff",
            c2: "#e8ebf0",
            c3: "#b0bac9",
            border: "#808c9f"
        };
    }
}
// Default Theme
setTheme('marble');

// GSAP State Object
const state = {
    // Board Dynamics
    boardY: -height * 1.5,
    boardX: 0,
    boardScale: 1.2,
    boardAlpha: 0,
    
    // Camera Transform for Close up View
    cameraZoom: 1,
    cameraPanWeight: 0,
    
    // Nailing Sequence
    nailAlpha: 0,
    nailProgress: 0, 
    
    // Timelapse Threads
    threadProgress: 0, 
    stringArtImageFade: 0,
    
    // DOM States
    refWrapperOpacity: 0,
    refWrapperX: 0,
    refContainerRadius: 0, 
    refGreyOpacity: 0,
    
    heroOpacity: 1
};

const COLOR_NAIL = "#111111"; // Black nails for better visibility
const COLOR_THREAD = "rgba(0, 0, 0, 0.12)"; // Black delicate threads
const COLOR_ACTIVE_THREAD = "rgba(0, 0, 0, 0.9)"; // Black active threads

function render() {
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    // Center transformation
    ctx.translate(centerX + state.boardX, centerY + state.boardY);
    ctx.scale(state.boardScale * state.cameraZoom, state.boardScale * state.cameraZoom);
    
    // Dynamic Pan to follow active nail
    let exactNailProgress = state.nailProgress * TOTAL_NAILS;
    let exactAngle = (exactNailProgress / TOTAL_NAILS) * Math.PI * 2 - Math.PI / 2;
    // We focus on the exact angle. The 0.85 multiplier keeps the nail slightly inwards on screen.
    let focusX = radius * Math.cos(exactAngle) * 0.85; 
    let focusY = radius * Math.sin(exactAngle) * 0.85;
    
    ctx.translate(-focusX * state.cameraPanWeight, -focusY * state.cameraPanWeight);
    
    // 1. Draw Wooden Board (Moonstone Theme)
    if (state.boardAlpha > 0) {
        ctx.globalAlpha = state.boardAlpha;
        
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;

        // Dynamic Board Colors
        const boardGrad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
        boardGrad.addColorStop(0, currentTheme.c1);
        boardGrad.addColorStop(0.7, currentTheme.c2);
        boardGrad.addColorStop(1, currentTheme.c3);
        
        ctx.beginPath();
        ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
        ctx.fillStyle = boardGrad;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Edge ring
        ctx.lineWidth = 4;
        ctx.strokeStyle = currentTheme.border;
        ctx.stroke();
    }

    // 2. Draw Threads (Organically weaves between nails)
    if (state.threadProgress > 0) {
        let drawCount = Math.floor(state.threadProgress);
        let partialDraw = state.threadProgress % 1;
        
        // --- Static solid threads ---
        ctx.lineWidth = 0.6;
        ctx.strokeStyle = COLOR_THREAD;
        ctx.beginPath();
        for (let i = 0; i < drawCount && i < NUM_FAKE_THREADS; i++) {
            let t = fakeThreads[i];
            let n1 = nails[t.n1];
            let n2 = nails[t.n2];
            ctx.moveTo(n1.x * radius, n1.y * radius);
            ctx.lineTo(n2.x * radius, n2.y * radius);
        }
        ctx.stroke();

        // --- Active flying thread ---
        if (drawCount < NUM_FAKE_THREADS && state.threadProgress > 0) {
            let t = fakeThreads[drawCount];
            let n1 = nails[t.n1];
            let n2 = nails[t.n2];
            
            let startX = n1.x * radius;
            let startY = n1.y * radius;
            let endX = n2.x * radius;
            let endY = n2.y * radius;

            let curX = startX + (endX - startX) * partialDraw;
            let curY = startY + (endY - startY) * partialDraw;

            ctx.lineWidth = 2.0;
            ctx.strokeStyle = COLOR_ACTIVE_THREAD;
            
            // Render active line with elastic tension (slight curve)
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            
            let pullOffset = Math.sin(partialDraw * Math.PI) * 15;
            let midX = (startX + curX) / 2 - pullOffset;
            let midY = (startY + curY) / 2 - pullOffset;
            
            ctx.quadraticCurveTo(midX, midY, curX, curY);
            ctx.stroke();

            // Glow around the actively drawn point
            ctx.beginPath();
            ctx.arc(curX, curY, 3, 0, Math.PI * 2);
            ctx.fillStyle = "#000000";
            ctx.fill();
        }
    }
    
    // 3. Target Final String Art Image Reveal (Fades in over threads to show final art)
    if (state.stringArtImageFade > 0 && imgStringArt.complete && imgStringArt.naturalHeight !== 0) {
        ctx.save();
        ctx.globalAlpha = state.stringArtImageFade * state.boardAlpha;
        
        // Clip slightly inner to our generated nails so our 3D pins frame the image perfectly
        ctx.beginPath();
        ctx.arc(0, 0, radius - 2, 0, Math.PI * 2);
        ctx.clip();
        
        // Scale image by roughly 16% to crop out the white background 
        // and perfectly align its internal circle with our board radius
        let imgDrawRadius = radius * 1.16;
        ctx.drawImage(imgStringArt, -imgDrawRadius, -imgDrawRadius, imgDrawRadius * 2, imgDrawRadius * 2);
        
        ctx.restore();
    }
    
    // 4. Draw Nails (Ultra smooth progressive drop)
    // Rendered LAST so the black pins sit on top of the image and strings!
    if (state.nailAlpha > 0) {
        ctx.globalAlpha = state.nailAlpha * state.boardAlpha;
        const activeFloat = state.nailProgress * TOTAL_NAILS;
        const nailsToDraw = Math.floor(activeFloat);
        const currentImpact = activeFloat % 1;
        
        for (let i = 0; i < TOTAL_NAILS; i++) {
            if (i < nailsToDraw) {
                // Completed nails
                drawNail(i, 1); 
            } else if (i === nailsToDraw && state.nailProgress < 1) {
                // The currently being hammered nail
                drawNail(i, currentImpact);
            }
        }
    }

    // Render complete
    
    ctx.restore();
    
    // Update DOM Overlays
    document.getElementById("hero-overlay").style.opacity = state.heroOpacity;
    
    const refWrapper = document.getElementById("reference-wrapper");
    refWrapper.style.opacity = state.refWrapperOpacity;
    refWrapper.style.transform = `translate(calc(-50% + ${state.refWrapperX}px), -50%)`;
    
    document.getElementById("reference-image-container").style.borderRadius = `${state.refContainerRadius}%`;
    document.getElementById("ref-grey").style.opacity = state.refGreyOpacity;
    
    const label = document.getElementById("timelapse-label");
    label.style.opacity = state.stringArtImageFade > 0 && state.stringArtImageFade < 1 ? 1 : 0;
}

function drawNail(index, inProgress) {
    let n = nails[index];
    let nx = n.x * radius;
    let ny = n.y * radius;
    let scale = 1;
    let dropY = 0;
    
    // Animate Drop & Hammer
    if (inProgress < 1) {
        dropY = (1 - inProgress) * -20; // Comes down heavily
        scale = 1 + (1 - inProgress) * 0.8; // Larger when falling
    }
    
    // Add realistic 3D depth to nail based on angle
    let depthOffsetX = Math.cos(n.angle) * 1.5;
    let depthOffsetY = Math.sin(n.angle) * 1.5;

    // Body shadow
    ctx.beginPath();
    ctx.arc(nx + depthOffsetX, ny + depthOffsetY + dropY, 2.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fill();

    // Metallic head
    ctx.beginPath();
    ctx.arc(nx - depthOffsetX*0.5, ny - depthOffsetY*0.5 + dropY, 2.8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_NAIL;
    ctx.fill();
    
    // Highlight
    ctx.beginPath();
    ctx.arc(nx - depthOffsetX - 1 * scale, ny - depthOffsetY - 1 * scale + dropY, 0.8 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.fill();
}

gsap.ticker.add(render);

// ------------------------------------------------------------------
// Scroll Timeline Scripting
// ------------------------------------------------------------------
const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "#animation-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1.2 // very smooth dampening
    }
});

// Used for side-by-side transition
const sideOffset = window.innerWidth * 0.22;

// PHASE 1: Board drops & Hero fades
tl.to(state, { boardY: 0, boardScale: 1, boardAlpha: 1, duration: 1.5, ease: "power2.out" })
  .to(state, { heroOpacity: 0, duration: 0.5 }, "-=0.5");

// PHASE 2: Extreme Close-Up (Camera follows nail smoothly)
tl.to(state, { 
    cameraZoom: 3.5, 
    cameraPanWeight: 1, 
    duration: 1.5, 
    ease: "power2.inOut" 
});

// PHASE 3: Close-up Nailing Sequence for the first 15% of nails
tl.to(state, { nailAlpha: 1, duration: 0.1 });
tl.to(state, { nailProgress: 0.15, duration: 2, ease: "linear" });

// PHASE 4: Ultra Smooth Zoom Out WHILE the remaining nails finish
// The nails keep hammering while we pull out to see the whole board
tl.to(state, { 
    cameraZoom: 1, 
    cameraPanWeight: 0, 
    duration: 2.5, 
    ease: "power2.inOut" 
}, "zoomOut");
tl.to(state, { nailProgress: 1, duration: 3, ease: "power1.inOut" }, "zoomOut");

// PHASE 5: Split Screen Setup for Luffy Images
tl.to(state, { boardX: sideOffset, duration: 1.5, ease: "power2.inOut" }, "split");
tl.to(state, { refWrapperOpacity: 1, duration: 0.5 }, "split");
tl.to(state, { refWrapperX: -sideOffset, duration: 1.5, ease: "power2.inOut" }, "split");

// PHASE 6: Luffy Transition -> Greyscale & Crop
tl.to(state, { refGreyOpacity: 1, duration: 1 }, "transform");
tl.to(state, { refContainerRadius: 50, duration: 1.5, ease: "power1.inOut" }, "transform+=0.5");

// PHASE 7: The Masterpiece Timelapse
// Ultra smooth string weaving. Thousands of calculated string lines forming an intricate base
tl.to(state, { threadProgress: NUM_FAKE_THREADS, duration: 5, ease: "power1.inOut" }, "timelapse");
// Slowly blending the perfect source String Art image into the active weaves
tl.to(state, { stringArtImageFade: 1, duration: 5, ease: "power2.inOut" }, "timelapse");

// PHASE 8: Polish & Presentation
tl.to(state, { boardScale: 1.05, duration: 0.5 }, "finish");

// PHASE 9: Scroll into Site Content
tl.to(state, { boardY: -height * 0.4, boardAlpha: 0, duration: 1.5, ease: "power1.inOut" }, "exit");
tl.to("#reference-wrapper", { top: "20%", opacity: 0, duration: 1.5, ease: "power1.inOut" }, "exit");

// Reveal Sticky Title Bar after the scroll animation sequence
ScrollTrigger.create({
    trigger: "#main-content",
    start: "top top+=100",
    onEnter: () => document.getElementById("site-header").classList.add("visible"),
    onLeaveBack: () => document.getElementById("site-header").classList.remove("visible")
});

// ------------------------------------------------------------------
// Modal Logic
// ------------------------------------------------------------------
function openOrderModal() {
    document.getElementById('order-modal').classList.add('active');
    showOptionsView(); // reset to default view
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('active');
}

function showEmailOption() {
    document.getElementById('modal-options').style.display = 'none';
    document.getElementById('modal-email-view').style.display = 'block';
    document.getElementById('copy-feedback').textContent = '';
}

function showOptionsView() {
    document.getElementById('modal-options').style.display = 'block';
    document.getElementById('modal-email-view').style.display = 'none';
}

function copyEmail() {
    const email = document.getElementById('email-text').textContent;
    navigator.clipboard.writeText(email).then(() => {
        document.getElementById('copy-feedback').textContent = 'Email copied to clipboard!';
    }).catch(err => {
        console.error('Failed to copy: ', err);
        document.getElementById('copy-feedback').textContent = 'Failed to copy. Please select and copy manually.';
    });
}
