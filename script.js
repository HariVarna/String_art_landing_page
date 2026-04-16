gsap.registerPlugin(ScrollTrigger);

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
const TOTAL_NAILS = 120;
const nails = [];
for (let i = 0; i < TOTAL_NAILS; i++) {
    const angle = (i / TOTAL_NAILS) * Math.PI * 2 - Math.PI / 2;
    nails.push({
        x: Math.cos(angle), 
        y: Math.sin(angle),
        angle: angle
    });
}

// Generate Random "Fake" Active Threads for the timelapse visualization
const fakeThreads = [];
const NUM_FAKE_THREADS = 1500;
for (let i = 0; i < NUM_FAKE_THREADS; i++) {
    fakeThreads.push({
        n1: Math.floor(Math.random() * TOTAL_NAILS),
        n2: Math.floor(Math.random() * TOTAL_NAILS)
    });
}

// GSAP State Object
const state = {
    // Board
    boardY: -height * 1.5,
    boardX: 0,
    boardScale: 1.2,
    boardAlpha: 0,
    cameraZoom: 1,
    cameraY: 0,
    
    // Nailing
    nailAlpha: 0,
    nailProgress: 0, 
    
    // Timelapse & Threads
    threadProgress: 0, 
    stringArtImageFade: 0,
    
    // Reference Image DOM Object
    refWrapperOpacity: 0,
    refWrapperX: 0,
    refContainerRadius: 0, 
    refGreyOpacity: 0,
    
    heroOpacity: 1
};

const COLOR_NAIL = "#d4a373";
const COLOR_THREAD_ACTIVE = "rgba(255, 255, 255, 0.4)";

function render() {
    ctx.clearRect(0, 0, width, height);
    
    ctx.save();
    // Center transformation
    ctx.translate(centerX + state.boardX, centerY + state.boardY + state.cameraY);
    ctx.scale(state.boardScale * state.cameraZoom, state.boardScale * state.cameraZoom);
    
    // 1. Draw Wooden Board
    if (state.boardAlpha > 0) {
        ctx.globalAlpha = state.boardAlpha;
        
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetY = 20;

        const boardGrad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
        boardGrad.addColorStop(0, "#e8dcd0"); // White/creamy wood as requested
        boardGrad.addColorStop(1, "#c0b2a3");
        
        ctx.beginPath();
        ctx.arc(0, 0, radius + 20, 0, Math.PI * 2);
        ctx.fillStyle = boardGrad;
        ctx.fill();
        
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        
        // Edge ring
        ctx.lineWidth = 6;
        ctx.strokeStyle = "#a39585";
        ctx.stroke();
    }

    // 2. Draw Final Target Image Fading In (String Art Timelapse)
    if (state.stringArtImageFade > 0 && imgStringArt.complete && imgStringArt.naturalHeight !== 0) {
        ctx.save();
        ctx.globalAlpha = state.stringArtImageFade * state.boardAlpha;
        // Clip to inner circle so it maps perfectly
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.clip();
        
        // Draw the luffy3.png string art covering the board
        ctx.drawImage(imgStringArt, -radius, -radius, radius * 2, radius * 2);
        ctx.restore();
    }

    // 3. Draw Nails
    if (state.nailAlpha > 0) {
        ctx.globalAlpha = state.nailAlpha * state.boardAlpha;
        const nailsToDraw = Math.floor(state.nailProgress * TOTAL_NAILS);
        
        for (let i = 0; i < TOTAL_NAILS; i++) {
            if (i < nailsToDraw) {
                drawNail(i, 1); 
            } else if (i === nailsToDraw && state.nailProgress < 1) {
                let partial = (state.nailProgress * TOTAL_NAILS) % 1;
                drawNail(i, partial); // bouncing drop
            }
        }
    }

    // 4. Draw Active Messy Threads (Simulating Timelapse)
    if (state.threadProgress > 1 && state.stringArtImageFade < 1.0) {
        // Only draw the "latest" 20-30 threads to look like an active bustling hand weaving them.
        // The history is formed by the fading imgStringArt!
        ctx.lineWidth = 0.5;
        ctx.strokeStyle = COLOR_THREAD_ACTIVE;
        ctx.beginPath();
        
        let startIdx = Math.max(0, Math.floor(state.threadProgress) - 15);
        let endIdx = Math.floor(state.threadProgress);
        
        for (let i = startIdx; i < endIdx && i < NUM_FAKE_THREADS; i++) {
            let t = fakeThreads[i];
            let n1 = nails[t.n1];
            let n2 = nails[t.n2];
            ctx.moveTo(n1.x * radius, n1.y * radius);
            ctx.lineTo(n2.x * radius, n2.y * radius);
        }
        ctx.stroke();
    }
    
    ctx.restore();
    
    // Update DOM Overlays
    document.getElementById("hero-overlay").style.opacity = state.heroOpacity;
    
    const refWrapper = document.getElementById("reference-wrapper");
    refWrapper.style.opacity = state.refWrapperOpacity;
    // Base position is left:50%. Translate logic maps relative offset.
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
    
    if (inProgress < 1) {
        dropY = (1 - inProgress) * -15; // Comes down
        scale = 1 + (1 - inProgress) * 0.5; 
    }
    
    ctx.beginPath();
    ctx.arc(nx, ny + dropY, 2.5 * scale, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_NAIL;
    ctx.fill();
    
    // Add specular highlight to nail
    ctx.beginPath();
    ctx.arc(nx - 0.5 * scale, ny + dropY - 0.5 * scale, 1 * scale, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fill();
}

gsap.ticker.add(render);

// ------------------------------------------------------------------
// Scroll Timeline Math
// ------------------------------------------------------------------
const tl = gsap.timeline({
    scrollTrigger: {
        trigger: "#animation-container",
        start: "top top",
        end: "bottom bottom",
        scrub: 1
    }
});

// Calculate responsive offset for side-by-side view (approx 25vw shift)
const sideOffset = window.innerWidth * 0.22;

// Phase 1: Entry White Board Drops
tl.to(state, { boardY: 0, boardScale: 1, boardAlpha: 1, duration: 1.5, ease: "power2.out" })
  .to(state, { heroOpacity: 0, duration: 0.5 }, "-=0.5");

// Phase 2: Camera zooms in for realistic nail close up
// Shift camera to upper left edge of the board
tl.to(state, { cameraZoom: 2.2, cameraY: radius * 0.7, duration: 1, ease: "power2.inOut" });

// Phase 3: Nailing happens
tl.to(state, { nailAlpha: 1, duration: 0.1 });
tl.to(state, { nailProgress: 1, duration: 2, ease: "linear" });

// Phase 4: Zoom out to show full board
tl.to(state, { cameraZoom: 1, cameraY: 0, duration: 1, ease: "power2.inOut" });

// Phase 5: Move board aside, Bring Luffy Ref Image In
tl.to(state, { boardX: sideOffset, duration: 1.5, ease: "power2.inOut" }, "split");
tl.to(state, { refWrapperOpacity: 1, duration: 0.5 }, "split");
tl.to(state, { refWrapperX: -sideOffset, duration: 1.5, ease: "power2.inOut" }, "split");

// Phase 6: Transform Luffy (Color -> Greyscale -> Circle)
tl.to(state, { refGreyOpacity: 1, duration: 1 }, "transform");
tl.to(state, { refContainerRadius: 50, duration: 1.5, ease: "power1.inOut" }, "transform+=0.5");

// Phase 7: The Timelapse process
// Fake threads zip rapidly around while the real artwork fades in!
tl.to(state, { threadProgress: NUM_FAKE_THREADS, duration: 4, ease: "power1.inOut" }, "timelapse");
tl.to(state, { stringArtImageFade: 1, duration: 4, ease: "power1.inOut" }, "timelapse");

// Phase 8: Finished state settling
tl.to(state, { boardScale: 1.05, duration: 0.5 }, "finish");

// Phase 9: Exit transition (Sticky CTA pops up)
tl.to("#sticky-cta", { opacity: 1, pointerEvents: "auto", duration: 0.5 }, "+=0.2");

// Finally ease both upward softly into content
tl.to(state, { boardY: -height * 0.4, boardAlpha: 0, duration: 1.5, ease: "power1.inOut" }, "exit");
tl.to("#reference-wrapper", { top: "20%", opacity: 0, duration: 1.5, ease: "power1.inOut" }, "exit");
