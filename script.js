(function () {
  const canvas = document.getElementById("hero-canvas");
  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (mediaQuery.matches) {
    canvas.remove();
    return;
  }

  const state = {
    particles: [],
    pointer: { x: 0, y: 0, active: false },
    width: 0,
    height: 0,
    animationId: null
  };

  const config = {
    baselineParticles: 80,
    densityFactor: 0.00008,
    maxParticles: 260,
    minSize: 0.6,
    maxSize: 1.9,
    maxVelocity: 0.45,
    connectDistance: 180,
    pointerInfluence: 160
  };

  function resizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { innerWidth, innerHeight } = window;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    canvas.style.width = `${innerWidth}px`;
    canvas.style.height = `${innerHeight}px`;
    context.scale(dpr, dpr);
    state.width = innerWidth;
    state.height = innerHeight;
    regenerateParticles();
  }

  class Particle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = initial ? Math.random() * state.width : Math.random() < 0.5 ? -20 : state.width + 20;
      this.y = Math.random() * state.height;
      this.vx = (Math.random() - 0.5) * config.maxVelocity * (Math.random() * 2 + 0.6);
      this.vy = (Math.random() - 0.5) * config.maxVelocity * (Math.random() * 2 + 0.6);
      this.size = config.minSize + Math.random() * (config.maxSize - config.minSize);
      this.energy = 0.35 + Math.random() * 0.65;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;

      if (state.pointer.active) {
        const dx = state.pointer.x - this.x;
        const dy = state.pointer.y - this.y;
        const distance = Math.hypot(dx, dy);
        if (distance < config.pointerInfluence) {
          const strength = (config.pointerInfluence - distance) / config.pointerInfluence;
          this.vx -= (dx / distance || 0) * strength * 0.02;
          this.vy -= (dy / distance || 0) * strength * 0.02;
        }
      }

      if (this.x < -40 || this.x > state.width + 40 || this.y < -40 || this.y > state.height + 40) {
        this.reset();
      }
    }

    draw() {
      context.beginPath();
      context.fillStyle = `rgba(115, 102, 255, ${0.18 + this.energy * 0.22})`;
      context.shadowColor = "rgba(115, 102, 255, 0.45)";
      context.shadowBlur = 22 * this.energy;
      context.arc(this.x, this.y, this.size * 2.2, 0, Math.PI * 2);
      context.fill();
      context.shadowBlur = 0;
    }
  }

  function regenerateParticles() {
    const area = state.width * state.height;
    const targetCount = Math.min(
      config.maxParticles,
      Math.round(config.baselineParticles + area * config.densityFactor)
    );
    state.particles = Array.from({ length: targetCount }, () => new Particle());
  }

  function drawConnections() {
    const length = state.particles.length;
    for (let i = 0; i < length; i += 1) {
      const particleA = state.particles[i];
      for (let j = i + 1; j < length; j += 1) {
        const particleB = state.particles[j];
        const dx = particleA.x - particleB.x;
        const dy = particleA.y - particleB.y;
        const distanceSquared = dx * dx + dy * dy;
        const maxDistance = config.connectDistance;
        if (distanceSquared < maxDistance * maxDistance) {
          const distance = Math.sqrt(distanceSquared);
          const alpha = 1 - distance / maxDistance;
          context.beginPath();
          context.strokeStyle = `rgba(115, 102, 255, ${alpha * 0.45})`;
          context.lineWidth = 1.1;
          context.moveTo(particleA.x, particleA.y);
          context.lineTo(particleB.x, particleB.y);
          context.stroke();
        }
      }
    }
  }

  function render() {
    context.clearRect(0, 0, state.width, state.height);
    for (const particle of state.particles) {
      particle.update();
      particle.draw();
    }
    drawConnections();
    state.animationId = requestAnimationFrame(render);
  }

  resizeCanvas();
  render();

  window.addEventListener("resize", () => {
    cancelAnimationFrame(state.animationId);
    resizeCanvas();
    render();
  });

  window.addEventListener("pointermove", (event) => {
    state.pointer.x = event.clientX;
    state.pointer.y = event.clientY;
    state.pointer.active = true;
  });

  window.addEventListener("pointerleave", () => {
    state.pointer.active = false;
  });

  const heroCard = document.querySelector(".hero__card");
  if (heroCard) {
    const dampening = 18;
    let rafId;

    function handleTilt(event) {
      const rect = heroCard.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const rotateY = ((offsetX / rect.width) - 0.5) * dampening;
      const rotateX = (0.5 - (offsetY / rect.height)) * dampening;

      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        heroCard.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
      });
    }

    function resetTilt() {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        heroCard.style.transform = "rotateX(0deg) rotateY(0deg)";
      });
    }

    heroCard.addEventListener("pointermove", handleTilt);
    heroCard.addEventListener("pointerenter", handleTilt);
    heroCard.addEventListener("pointerleave", resetTilt);
  }

  const backgroundAudio = document.getElementById("background-audio");
  if (backgroundAudio) {
    let isUnlocked = false;

    const attemptAudioPlay = () => {
      if (!isUnlocked) {
        backgroundAudio.muted = true;
      }
      const playPromise = backgroundAudio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            setTimeout(() => {
              if (!isUnlocked) {
                backgroundAudio.muted = false;
              }
            }, 150);
          })
          .catch(() => {});
      }
    };

    attemptAudioPlay();

    const unlockAudio = () => {
      isUnlocked = true;
      backgroundAudio.muted = false;
      backgroundAudio.volume = 1;
      if (backgroundAudio.paused) {
        backgroundAudio.play().catch(() => {});
      }
    };

    window.addEventListener("pointerdown", unlockAudio, { once: true });
    window.addEventListener("keydown", unlockAudio, { once: true });

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && backgroundAudio.paused) {
        attemptAudioPlay();
      }
    });
  }
})();



