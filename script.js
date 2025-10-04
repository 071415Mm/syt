(function () {
  const doc = document;
  const body = doc.body;
  const heroSelector = doc.querySelector("[data-hero-selector]");
  const heroStage = doc.querySelector("[data-hero-stage]");
  const heroData = {
    syt: {
      name: "SYT",
      desc: "吉隆坡的天气总是翻云又覆雨",
      location: "Malaysia",
      image: "assets/syt.jpg"
    },
    ws: {
      name: "WS",
      desc: "You have to grow up sometime. You can’t keep blaming everyone else forever --Fiona",
      location: "Hanchuan, China",
      image: "assets/ws.jpg"
    }
  };
  const heroAliasMap = new Map([
    ["hero2", "ws"]
  ]);
  const tiltRafMap = new WeakMap();
  const tiltResetMap = new WeakMap();
  let activeHeroId = null;

  if (heroStage) {
    heroStage.classList.add("hero--hidden");
    heroStage.setAttribute("hidden", "");
  }

  const resolveHeroId = (rawHeroId) => {
    if (!rawHeroId) {
      return null;
    }
    if (heroData[rawHeroId]) {
      return rawHeroId;
    }
    return heroAliasMap.get(rawHeroId) || null;
  };

  const syncBodyHero = (heroId) => {
    if (heroId) {
      body.setAttribute("data-hero-active", heroId);
    } else {
      body.removeAttribute("data-hero-active");
    }
  };

  const updateHistory = (heroId) => {
    if (!window.history || typeof window.history.replaceState !== "function") {
      return;
    }
    try {
      const url = new URL(window.location.href);
      url.hash = heroId ? heroId : "";
      window.history.replaceState(null, "", url);
    } catch (error) {
      console.warn("Failed to update hero hash in history.", error);
    }
  };

  const updateHeroContent = (heroId) => {
    if (!heroStage || !heroData[heroId]) {
      return;
    }

    const data = heroData[heroId];
    const img = heroStage.querySelector("[data-hero-img]");
    const name = heroStage.querySelector("[data-hero-name]");
    const desc = heroStage.querySelector("[data-hero-desc]");
    const location = heroStage.querySelector("[data-hero-location]");

    if (img) {
      img.src = data.image;
      img.alt = data.name;
    }
    if (name) name.textContent = data.name;
    if (desc) desc.textContent = data.desc;
    if (location) location.textContent = data.location;

    heroStage.removeAttribute("hidden");
    heroStage.setAttribute("aria-hidden", "false");
    heroStage.classList.add("hero--active");
    heroStage.classList.remove("hero--hidden");
  };

  const activateHero = (heroId, options = {}) => {
    const resolvedHeroId = resolveHeroId(heroId);
    if (!resolvedHeroId) {
      console.warn("Unknown hero id:", heroId);
      return;
    }
    if (activeHeroId === resolvedHeroId && !options.force) {
      return;
    }

    const img = heroStage ? heroStage.querySelector("[data-hero-img]") : null;
    const showStage = () => {
      updateHeroContent(resolvedHeroId);
      activeHeroId = resolvedHeroId;
      syncBodyHero(resolvedHeroId);
      updateHistory(resolvedHeroId);

      document.dispatchEvent(
        new CustomEvent("hero:activated", { detail: { heroId: resolvedHeroId } })
      );
    };

    if (img && heroData[resolvedHeroId]) {
      const targetSrc = heroData[resolvedHeroId].image;
      if (img.src.endsWith(targetSrc) && img.complete) {
        showStage();
      } else {
        const preloadImg = new Image();
        preloadImg.onload = showStage;
        preloadImg.onerror = showStage;
        preloadImg.src = targetSrc;
      }
    } else {
      showStage();
    }
  };

  const findHeroFromUrl = () => {
    const hash = window.location.hash ? window.location.hash.slice(1) : "";
    const hashHero = resolveHeroId(hash);
    if (hashHero) {
      return hashHero;
    }
    try {
      const params = new URLSearchParams(window.location.search);
      const queryHero = resolveHeroId(params.get("hero"));
      if (queryHero) {
        return queryHero;
      }
    } catch (error) {
      console.warn("Failed to parse hero id from URL.", error);
    }
    return null;
  };

  const initialHeroId = findHeroFromUrl();
  if (initialHeroId) {
    activateHero(initialHeroId, { force: true });
    if (heroSelector) {
      heroSelector.classList.add("hero-selector--closing");
      heroSelector.setAttribute("aria-hidden", "true");
      window.setTimeout(() => heroSelector.remove(), 0);
    }
  } else {
    syncBodyHero(null);
  }

  if (heroSelector) {
    const options = heroSelector.querySelectorAll("[data-hero-option]");
    options.forEach((option) => {
      option.addEventListener("click", () => {
        const heroId = option.getAttribute("data-hero-option");
        const resolvedHeroId = resolveHeroId(heroId);
        if (!resolvedHeroId) {
          console.warn("Unknown hero option:", heroId);
          return;
        }
        activateHero(resolvedHeroId);
        heroSelector.classList.add("hero-selector--closing");
        heroSelector.setAttribute("aria-hidden", "true");
        window.setTimeout(() => heroSelector.remove(), 820);
      });
    });
  }

  const heroCard = document.querySelector("[data-hero-card]");

  if (heroCard) {
    const scheduleTransform = (transform) => {
      const rafId = tiltRafMap.get(heroCard);
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      const nextRafId = window.requestAnimationFrame(() => {
        heroCard.style.transform = transform;
      });
      tiltRafMap.set(heroCard, nextRafId);
    };

    const dampening = Number(heroCard.getAttribute("data-tilt-dampening")) || 18;

    const handleTilt = (event) => {
      const rect = heroCard.getBoundingClientRect();
      const offsetX = event.clientX - rect.left;
      const offsetY = event.clientY - rect.top;
      const rotateY = ((offsetX / rect.width) - 0.5) * dampening;
      const rotateX = (0.5 - (offsetY / rect.height)) * dampening;
      scheduleTransform(
        "rotateX(" + rotateX + "deg) rotateY(" + rotateY + "deg)"
      );
    };

    const resetTilt = () => {
      scheduleTransform("rotateX(0deg) rotateY(0deg)");
    };

    heroCard.addEventListener("pointermove", handleTilt);
    heroCard.addEventListener("pointerenter", handleTilt);
    heroCard.addEventListener("pointerleave", resetTilt);
    heroCard.addEventListener("touchend", resetTilt, { passive: true });
  }

  const canvas = document.getElementById("hero-canvas");
  if (canvas) {
    const context = canvas.getContext("2d");
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      canvas.remove();
    } else {
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
        context.setTransform(1, 0, 0, 1, 0, 0);
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
          this.x = initial
            ? Math.random() * state.width
            : Math.random() < 0.5
              ? -20
              : state.width + 20;
          this.y = Math.random() * state.height;
          this.vx =
            (Math.random() - 0.5) *
            config.maxVelocity *
            (Math.random() * 2 + 0.6);
          this.vy =
            (Math.random() - 0.5) *
            config.maxVelocity *
            (Math.random() * 2 + 0.6);
          this.size =
            config.minSize + Math.random() * (config.maxSize - config.minSize);
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
              const strength =
                (config.pointerInfluence - distance) / config.pointerInfluence;
              this.vx -= (dx / distance || 0) * strength * 0.02;
              this.vy -= (dy / distance || 0) * strength * 0.02;
            }
          }

          if (
            this.x < -40 ||
            this.x > state.width + 40 ||
            this.y < -40 ||
            this.y > state.height + 40
          ) {
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
        state.particles = Array.from(
          { length: targetCount },
          () => new Particle()
        );
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
        state.animationId = window.requestAnimationFrame(render);
      }

      function handlePointerMove(event) {
        const rect = canvas.getBoundingClientRect();
        state.pointer.x = event.clientX - rect.left;
        state.pointer.y = event.clientY - rect.top;
      }

      window.addEventListener("resize", resizeCanvas);
      resizeCanvas();
      render();

      canvas.addEventListener("pointermove", handlePointerMove);
      canvas.addEventListener("pointerdown", (event) => {
        state.pointer.active = true;
        handlePointerMove(event);
      });
      canvas.addEventListener("pointerup", () => {
        state.pointer.active = false;
      });
      canvas.addEventListener("pointerleave", () => {
        state.pointer.active = false;
      });

      window.addEventListener("blur", () => {
        state.pointer.active = false;
      });
    }
  }

  const backgroundAudio = document.getElementById("background-audio");
  const audioToggleButton = document.querySelector("[data-audio-toggle]");
  if (backgroundAudio) {
    let isUnlocked = false;
    let hasAutoTriggered = false;

    const setButtonState = () => {
      if (!audioToggleButton) {
        return;
      }
      const isPlaying = !backgroundAudio.paused && !backgroundAudio.ended;
      audioToggleButton.setAttribute("aria-pressed", isPlaying ? "true" : "false");
      audioToggleButton.textContent = isPlaying
        ? "暂停背景音乐"
        : "开启背景音乐";
    };

    const attemptAudioPlay = () => {
      if (!isUnlocked) {
        backgroundAudio.muted = true;
      }
      const playPromise = backgroundAudio.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise
          .then(setButtonState)
          .catch((error) => {
            console.warn("Background audio autoplay was blocked.", error);
          });
      }
    };

    const unlockAudio = () => {
      if (isUnlocked) {
        return;
      }
      isUnlocked = true;
      backgroundAudio.muted = false;
      backgroundAudio.removeAttribute("muted");
      backgroundAudio.volume = 1;
    };

    const triggerAudioOnce = () => {
      if (hasAutoTriggered) {
        return;
      }
      hasAutoTriggered = true;
      unlockAudio();
      attemptAudioPlay();
      setButtonState();
    };

    if (audioToggleButton) {
      audioToggleButton.addEventListener("click", () => {
        unlockAudio();
        if (backgroundAudio.paused) {
          backgroundAudio.play().catch(() => {});
        } else {
          backgroundAudio.pause();
        }
        setButtonState();
      });
      setButtonState();
    }

    window.addEventListener("pointerdown", triggerAudioOnce, { once: true });
    window.addEventListener("keydown", triggerAudioOnce, { once: true });

    document.addEventListener(
      "hero:activated",
      () => {
        triggerAudioOnce();
      },
      { once: true }
    );

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && backgroundAudio.paused) {
        attemptAudioPlay();
      }
    });

    backgroundAudio.addEventListener("play", setButtonState);
    backgroundAudio.addEventListener("pause", setButtonState);
    backgroundAudio.addEventListener("error", () => {
      console.error("Background audio failed to load.", backgroundAudio.error);
    });
  }
})();
