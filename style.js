// CarGame - Complete Enhanced Version with Sound, Timer, and Smooth Physics
// ============================================================================
// Features:
// - F1 car model with detailed graphics
// - Procedural sound system (engine, nitro, collisions, wind)
// - Race timing system with lap tracking
// - Multiplayer sync via Firebase
// - Slipstream/drafting mechanics
// - Nitro boost with lockout system
// - Smooth physics with improved grip model
// ============================================================================

(function () {
  "use strict";

  // ==========================================================================
  // AUDIO SYSTEM - Complete sound management
  // ==========================================================================
  
  const SoundManager = {
    // Audio context (initialized on first user interaction)
    ctx: null,
    
    // Sound state
    muted: false,
    initialized: false,
    
    // Audio buffers storage
    buffers: {},
    
    // Active sound instances for continuous sounds
    activeSounds: {
      engine: null,
      nitro: null,
      wind: null
    },
    
    // Sound gain nodes for volume control
    gains: {
      master: null,
      engine: null,
      effects: null,
      music: null
    },
    
    /**
     * Initialize the audio system
     * Must be called after user interaction (browser policy)
     */
    init: function() {
      if (this.initialized) return;
      
      try {
        // Create audio context (suspended until user interaction)
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create master gain node (overall volume control)
        this.gains.master = this.ctx.createGain();
        this.gains.master.gain.value = 0.7; // 70% master volume
        this.gains.master.connect(this.ctx.destination);
        
        // Create engine gain node (for engine sound volume)
        this.gains.engine = this.ctx.createGain();
        this.gains.engine.gain.value = 0.4;
        this.gains.engine.connect(this.gains.master);
        
        // Create effects gain node (collisions, nitro, etc.)
        this.gains.effects = this.ctx.createGain();
        this.gains.effects.gain.value = 0.5;
        this.gains.effects.connect(this.gains.master);
        
        // Create music gain node (background music)
        this.gains.music = this.ctx.createGain();
        this.gains.music.gain.value = 0.3;
        this.gains.music.connect(this.gains.master);
        
        // Generate procedural sounds (no external files needed)
        this.generateEngineSound();
        this.generateNitroSound();
        this.generateCollisionSound();
        this.generateWindSound();
        this.generateBackgroundMusic();
        
        this.initialized = true;
        console.log("Sound system initialized");
        
        // Start ambient sounds if not muted
        if (!this.muted) {
          this.startAmbientSounds();
        }
      } catch (e) {
        console.warn("Web Audio API not supported:", e);
      }
    },
    
    /**
     * Generate engine sound using oscillators
     * Creates a realistic engine sound that varies with RPM
     */
    generateEngineSound: function() {
      if (!this.ctx) return;
      
      // Engine sound is a combination of multiple oscillators
      const duration = 2.0; // Buffer duration
      const sampleRate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate engine waveform with harmonics
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        
        // Fundamental frequency (varies with RPM) - we'll modulate in real-time
        // Base frequency around 100Hz (idle) to 400Hz (high RPM)
        const baseFreq = 100;
        
        // Create engine sound using multiple sine waves with harmonics
        // This creates a rich engine-like tone
        let sample = 0;
        
        // Fundamental
        sample += Math.sin(2 * Math.PI * baseFreq * t) * 0.3;
        
        // 2nd harmonic (octave)
        sample += Math.sin(2 * Math.PI * baseFreq * 2 * t) * 0.2;
        
        // 3rd harmonic (fifth)
        sample += Math.sin(2 * Math.PI * baseFreq * 3 * t) * 0.15;
        
        // 4th harmonic
        sample += Math.sin(2 * Math.PI * baseFreq * 4 * t) * 0.1;
        
        // Add some noise for texture (exhaust rumble)
        sample += (Math.random() * 2 - 1) * 0.05;
        
        // Apply envelope (slight fade in/out to avoid clicks)
        const envelope = Math.min(1, t * 0.01) * Math.min(1, (duration - t) * 10);
        data[i] = sample * envelope;
      }
      
      this.buffers.engine = buffer;
    },
    
    /**
     * Generate nitro boost sound
     * High-pitched jet-like sound
     */
    generateNitroSound: function() {
      if (!this.ctx) return;
      
      const duration = 1.0;
      const sampleRate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        
        // Nitro sound is a high-frequency tone with modulation
        const freq = 800 + 200 * Math.sin(2 * Math.PI * 5 * t); // Modulating frequency
        
        // Combine sine wave with some noise for jet-like sound
        let sample = Math.sin(2 * Math.PI * freq * t) * 0.4;
        sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.2; // Harmonic
        
        // Add filtered noise
        sample += (Math.random() * 2 - 1) * 0.1;
        
        // Envelope
        const envelope = Math.min(1, t * 10) * Math.max(0, 1 - t * 5);
        data[i] = sample * envelope;
      }
      
      this.buffers.nitro = buffer;
    },
    
    /**
     * Generate collision impact sound
     * Short thud/crash sound
     */
    generateCollisionSound: function() {
      if (!this.ctx) return;
      
      const duration = 0.3;
      const sampleRate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        
        // Collision sound is mostly noise with a low-frequency thud
        let sample = 0;
        
        // Low frequency thud
        sample += Math.sin(2 * Math.PI * 60 * t) * Math.max(0, 1 - t * 10);
        
        // Impact noise
        sample += (Math.random() * 2 - 1) * Math.max(0, 1 - t * 15);
        
        // Envelope
        const envelope = Math.exp(-t * 15);
        data[i] = sample * envelope * 0.5;
      }
      
      this.buffers.collision = buffer;
    },
    
    /**
     * Generate wind/air sound for high speed
     */
    generateWindSound: function() {
      if (!this.ctx) return;
      
      const duration = 2.0;
      const sampleRate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        
        // Wind is filtered noise
        // Use multiple noise sources with different frequencies
        let sample = 0;
        
        // Low rumble
        for (let f = 1; f <= 3; f++) {
          sample += Math.sin(2 * Math.PI * 30 * f * t + Math.random()) * 0.03;
        }
        
        // High-frequency wind noise
        sample += (Math.random() * 2 - 1) * 0.2;
        
        // Apply low-pass filter effect (smoothing)
        data[i] = sample * 0.3;
      }
      
      this.buffers.wind = buffer;
    },
    
    /**
     * Generate simple background music/ambiance
     * Creates a racing-style background track
     */
    generateBackgroundMusic: function() {
      if (!this.ctx) return;
      
      const duration = 8.0; // Loop length
      const sampleRate = this.ctx.sampleRate;
      const buffer = this.ctx.createBuffer(1, duration * sampleRate, sampleRate);
      const data = buffer.getChannelData(0);
      
      // Simple chord progression for background music
      const notes = [60, 64, 67, 72]; // C, E, G, C (C major chord)
      
      for (let i = 0; i < buffer.length; i++) {
        const t = i / sampleRate;
        
        // Create arpeggiated chord pattern
        let sample = 0;
        const noteIndex = Math.floor(t * 2) % notes.length;
        const freq = 440 * Math.pow(2, (notes[noteIndex] - 69) / 12);
        
        // Add the note
        sample += Math.sin(2 * Math.PI * freq * t) * 0.1;
        
        // Add harmonics
        sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.05;
        
        // Add some bass drum effect
        if (t % 2 < 0.1) {
          sample += Math.sin(2 * Math.PI * 60 * (t % 2)) * Math.exp(-(t % 2) * 20) * 0.2;
        }
        
        data[i] = sample;
      }
      
      this.buffers.music = buffer;
    },
    
    /**
     * Start playing a sound with given parameters
     * @param {string} name - Sound name (engine, nitro, collision, wind, music)
     * @param {Object} options - Playback options (loop, volume, pitch, etc.)
     * @returns {AudioBufferSourceNode|null} - The sound source or null
     */
    playSound: function(name, options = {}) {
      if (!this.ctx || this.muted || !this.buffers[name]) return null;
      
      try {
        // Resume audio context if suspended (browser policy)
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        
        const source = this.ctx.createBufferSource();
        source.buffer = this.buffers[name];
        
        // Connect to appropriate gain node based on sound type
        let gainNode;
        if (name === 'engine') {
          gainNode = this.gains.engine;
        } else if (name === 'music') {
          gainNode = this.gains.music;
        } else {
          gainNode = this.gains.effects;
        }
        
        source.connect(gainNode);
        
        // Apply options
        if (options.loop) source.loop = true;
        if (options.pitch) source.playbackRate.value = options.pitch;
        
        source.start(0, options.offset || 0);
        
        return source;
      } catch (e) {
        console.warn("Error playing sound:", e);
        return null;
      }
    },
    
    /**
     * Start ambient continuous sounds (engine, wind)
     */
    startAmbientSounds: function() {
      if (!this.ctx || this.muted) return;
      
      // Start engine sound (looping)
      if (!this.activeSounds.engine) {
        this.activeSounds.engine = this.playSound('engine', { loop: true });
      }
      
      // Start wind sound (looping, initially quiet)
      if (!this.activeSounds.wind) {
        this.activeSounds.wind = this.playSound('wind', { loop: true });
        if (this.activeSounds.wind) {
          // Store wind source for volume control
          this.activeSounds.wind.gain = this.ctx.createGain();
          this.activeSounds.wind.connect(this.activeSounds.wind.gain);
          this.activeSounds.wind.gain.connect(this.gains.effects);
          this.activeSounds.wind.gain.gain.value = 0; // Start silent
        }
      }
      
      // Start background music (looping)
      if (!this.activeSounds.music) {
        this.activeSounds.music = this.playSound('music', { loop: true });
      }
    },
    
    /**
     * Update engine sound based on car speed and RPM
     * @param {number} speed - Current car speed (0-1 normalized)
     * @param {number} rpm - Engine RPM (for pitch variation)
     */
    updateEngineSound: function(speed, rpm) {
      if (!this.ctx || this.muted || !this.activeSounds.engine) return;
      
      // Adjust engine pitch based on speed/RPM
      // Speed range: 0-0.3 (max speed) -> pitch range: 0.5-1.5
      const basePitch = 0.5 + speed * 3.0;
      this.activeSounds.engine.playbackRate.value = basePitch;
      
      // Adjust engine volume based on speed
      this.gains.engine.gain.value = 0.2 + speed * 0.4;
      
      // Update wind sound volume based on speed
      if (this.activeSounds.wind && this.activeSounds.wind.gain) {
        this.activeSounds.wind.gain.gain.value = speed * 0.5;
      }
    },
    
    /**
     * Play nitro boost sound
     */
    playNitroSound: function() {
      if (!this.ctx || this.muted) return;
      
      // Create a one-shot nitro sound
      const nitro = this.playSound('nitro', { loop: false });
      if (nitro) {
        nitro.playbackRate.value = 1.0 + Math.random() * 0.2; // Slight random pitch variation
      }
    },
    
    /**
     * Play collision sound with intensity based on impact force
     * @param {number} intensity - Collision force (0-1)
     */
    playCollisionSound: function(intensity) {
      if (!this.ctx || this.muted) return;
      
      const collision = this.playSound('collision', { loop: false });
      if (collision) {
        // Adjust volume based on intensity
        const gainNode = this.ctx.createGain();
        collision.connect(gainNode);
        gainNode.connect(this.gains.effects);
        gainNode.gain.value = Math.min(1, intensity * 1.5);
        
        // Adjust pitch based on intensity (harder hit = lower pitch)
        collision.playbackRate.value = 0.8 + intensity * 0.4;
      }
    },
    
    /**
     * Toggle mute for all sounds
     * @returns {boolean} New mute state
     */
    toggleMute: function() {
      this.muted = !this.muted;
      
      if (this.gains.master) {
        this.gains.master.gain.value = this.muted ? 0 : 0.7;
      }
      
      // Update UI mute button if exists
      const muteBtn = document.getElementById('soundToggle');
      if (muteBtn) {
        muteBtn.textContent = this.muted ? '🔇' : '🔊';
        muteBtn.style.opacity = this.muted ? '0.5' : '1';
      }
      
      return this.muted;
    },
    
    /**
     * Set master volume
     * @param {number} vol - Volume level (0-1)
     */
    setVolume: function(vol) {
      if (this.gains.master) {
        this.gains.master.gain.value = this.muted ? 0 : Math.max(0, Math.min(1, vol));
      }
    }
  };

  // ==========================================================================
  // GAME CONSTANTS AND TUNING - Improved for smoother movement
  // ==========================================================================
  
  // Speed and acceleration - ADJUSTED FOR SMOOTHER MOVEMENT
  var SPEED = 0.018;           // Base acceleration (slightly reduced for smoother control)
  var MAX_SPEED = 0.32;        // Maximum forward speed (increased slightly)
  var MAX_REVERSE = 0.12;      // Maximum reverse speed
  var BRAKE_FORCE = 0.86;      // Braking force multiplier
  
  // Steering - SMOOTHER STEERING RESPONSE
  var STEER_MIN = 0.04;        // Minimum steering at low speed
  var STEER_SPEED = 0.10;      // Steering increases with speed
  var STEER_SMOOTHING = 0.15;  // Steering smoothing factor
  
  // Physics - IMPROVED FRICTION MODEL
  var FRICTION = 0.975;        // Base friction (higher = less friction)
  var DRAG = 0.990;            // Air resistance
  var GRIP_FACTOR = 0.85;      // Tire grip (higher = more grip)
  var DRIFT_GRIP = 0.65;       // Grip when drifting (lower = more slide)
  
  // Camera - SMOOTHER CAMERA FOLLOW
  var CAMERA_LAG = 0.88;       // Camera follow lag (higher = smoother)
  var CAM_HEIGHT = 4.2;        // Camera height
  var CAM_DISTANCE = 7.0;      // Camera distance behind car
  
  // Car hitbox (rectangle dimensions)
  var CAR_HALF_WIDTH = 1.08;   // Half width (wheel to wheel)
  var CAR_HALF_LENGTH = 2.25;  // Half length (nose to tail)
  
  // Collision tuning
  var COLLISION = 1.1;
  var BOUNCE = 1.25;
  var WALL_SIZE = 0.35;        // Wall collision margin
  
  // Nitro system
  var NITRO_MAX = 100;          // Maximum nitro fuel
  var NITRO_DRAIN = 38;         // Drain rate per second (reduced for longer boost)
  var NITRO_REGEN = 12;         // Regen rate per second
  var NITRO_SPEED_MULT = 1.5;   // Speed multiplier when nitro active
  
  // Slipstream tuning
  var SLIP_DIST = 12.0;         // Maximum distance for slipstream
  var SLIP_WIDTH = 2.5;         // Width of slipstream zone
  var SLIP_ACCEL_BONUS = 0.5;   // Acceleration bonus multiplier
  var SLIP_TOPSPEED_BONUS = 0.15; // Top speed bonus multiplier
  var SLIP_DRAG_REDUCE = 0.007;
  var SLIP_PUSH = 0.90;
  
  // Map and environment
  var mapscale = 500;
  var OOB_DIST = 2000;          // Out of bounds reset distance
  var LAPS = 3;                 // Number of laps to win
  
  // Visual effects
  var BASE_FOV = 85;            // Base field of view
  var BOOST_FOV = 95;           // Field of view when boosting
  
  // VR setting (unused but kept for compatibility)
  var VR = false;

  // ==========================================================================
  // TIMER SYSTEM - Race timing and lap tracking
  // ==========================================================================
  
  var raceTimer = {
    startTime: 0,           // When the race started (performance.now)
    currentTime: 0,         // Current race time
    lapTimes: [],           // Array to store individual lap times
    bestLapTime: Infinity,  // Best lap time
    lastLapTime: 0,         // Last completed lap time
    raceFinished: false,    // Whether race is complete
    finalTime: 0,           // Final race completion time
    lastCheckpointTime: 0,  // Time when last checkpoint was crossed
    running: false          // Whether timer is active
  };

  // Lap timing thresholds (in milliseconds)
  var LAP_START_DELAY = 1000;  // Delay before timer starts (avoid counting countdown)

  /**
   * Start the race timer
   * Called when car first starts moving after countdown
   */
  function startRaceTimer() {
    if (!raceTimer.running && !raceTimer.raceFinished) {
      raceTimer.startTime = performance.now();
      raceTimer.lastCheckpointTime = raceTimer.startTime;
      raceTimer.running = true;
      raceTimer.lapTimes = [];
      raceTimer.bestLapTime = Infinity;
      console.log("Race timer started");
    }
  }

  /**
   * Record a lap time
   * Called when crossing start/finish line
   */
  function recordLapTime() {
    if (!raceTimer.running || raceTimer.raceFinished) return;
    
    var now = performance.now();
    var lapTime = now - raceTimer.lastCheckpointTime;
    
    // Store lap time
    raceTimer.lapTimes.push(lapTime);
    raceTimer.lastLapTime = lapTime;
    
    // Update best lap
    if (lapTime < raceTimer.bestLapTime) {
      raceTimer.bestLapTime = lapTime;
    }
    
    raceTimer.lastCheckpointTime = now;
    
    // Visual feedback for lap completion
    showLapTimeNotification(lapTime);
    
    console.log("Lap completed: " + formatTime(lapTime));
  }

  /**
   * Stop the race timer (race finished)
   */
  function stopRaceTimer() {
    if (raceTimer.running) {
      raceTimer.finalTime = performance.now() - raceTimer.startTime;
      raceTimer.running = false;
      raceTimer.raceFinished = true;
      console.log("Race finished! Time: " + formatTime(raceTimer.finalTime));
      
      // Show final time notification
      showRaceFinishNotification();
    }
  }

  /**
   * Format time from milliseconds to MM:SS.ms
   */
  function formatTime(ms) {
    if (!ms || ms === Infinity) return "--:--.--";
    
    var totalSeconds = Math.floor(ms / 1000);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    var milliseconds = Math.floor(ms % 1000);
    
    // Pad with zeros
    var minutesStr = minutes.toString().padStart(2, '0');
    var secondsStr = seconds.toString().padStart(2, '0');
    var msStr = milliseconds.toString().padStart(3, '0').substring(0, 2); // Show only 2 digits
    
    return minutesStr + ":" + secondsStr + "." + msStr;
  }

  /**
   * Format time for lap display (just seconds.ms)
   */
  function formatLapTime(ms) {
    if (!ms || ms === Infinity) return "--:--";
    
    var seconds = Math.floor(ms / 1000);
    var milliseconds = Math.floor((ms % 1000) / 10); // Show 2 digits
    
    return seconds + "." + milliseconds.toString().padStart(2, '0');
  }

  /**
   * Show temporary lap time notification
   */
  function showLapTimeNotification(lapTime) {
    var lapNotif = document.getElementById("lapNotification");
    if (!lapNotif) {
      lapNotif = document.createElement("div");
      lapNotif.id = "lapNotification";
      lapNotif.style.position = "fixed";
      lapNotif.style.top = "80px";
      lapNotif.style.left = "50%";
      lapNotif.style.transform = "translateX(-50%)";
      lapNotif.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
      lapNotif.style.color = "#ffaa00";
      lapNotif.style.padding = "10px 20px";
      lapNotif.style.borderRadius = "30px";
      lapNotif.style.fontFamily = "'Press Start 2P', monospace";
      lapNotif.style.fontSize = "14px";
      lapNotif.style.zIndex = "1000";
      lapNotif.style.border = "2px solid #ffaa00";
      lapNotif.style.boxShadow = "0 0 20px rgba(255, 170, 0, 0.5)";
      lapNotif.style.transition = "opacity 0.5s ease";
      document.body.appendChild(lapNotif);
    }
    
    var lapNumber = raceTimer.lapTimes.length;
    var formattedTime = formatLapTime(lapTime);
    
    lapNotif.innerHTML = "LAP " + lapNumber + " &nbsp;&nbsp; " + formattedTime;
    lapNotif.style.opacity = "1";
    
    // Fade out after 2 seconds
    setTimeout(function() {
      lapNotif.style.opacity = "0";
    }, 2000);
  }

  /**
   * Show race finish notification with final time
   */
  function showRaceFinishNotification() {
    var finishNotif = document.getElementById("finishNotification");
    if (!finishNotif) {
      finishNotif = document.createElement("div");
      finishNotif.id = "finishNotification";
      finishNotif.style.position = "fixed";
      finishNotif.style.top = "50%";
      finishNotif.style.left = "50%";
      finishNotif.style.transform = "translate(-50%, -50%)";
      finishNotif.style.backgroundColor = "rgba(0, 0, 0, 0.9)";
      finishNotif.style.color = "gold";
      finishNotif.style.padding = "30px 50px";
      finishNotif.style.borderRadius = "20px";
      finishNotif.style.fontFamily = "'Press Start 2P', monospace";
      finishNotif.style.fontSize = "24px";
      finishNotif.style.zIndex = "2000";
      finishNotif.style.border = "4px solid gold";
      finishNotif.style.boxShadow = "0 0 50px rgba(255, 215, 0, 0.7)";
      finishNotif.style.textAlign = "center";
      finishNotif.style.lineHeight = "1.5";
      document.body.appendChild(finishNotif);
    }
    
    var formattedTime = formatTime(raceTimer.finalTime);
    var bestLapFormatted = raceTimer.bestLapTime < Infinity ? 
                          formatLapTime(raceTimer.bestLapTime) : "--:--";
    
    finishNotif.innerHTML = "🏁 RACE COMPLETE! 🏁<br><br>" +
                          "TOTAL TIME: " + formattedTime + "<br>" +
                          "BEST LAP: " + bestLapFormatted + "<br><br>" +
                          "🎉 YOU WIN! 🎉";
    
    finishNotif.style.display = "block";
    
    // Add restart button
    var restartBtn = document.createElement("div");
    restartBtn.innerHTML = "PLAY AGAIN";
    restartBtn.style.marginTop = "30px";
    restartBtn.style.padding = "15px 30px";
    restartBtn.style.backgroundColor = "#ffaa00";
    restartBtn.style.color = "black";
    restartBtn.style.borderRadius = "10px";
    restartBtn.style.fontSize = "16px";
    restartBtn.style.cursor = "pointer";
    restartBtn.style.border = "2px solid white";
    restartBtn.onclick = function() {
      finishNotif.style.display = "none";
      resetRace();
      showModeMenu(); // Return to menu
    };
    finishNotif.appendChild(restartBtn);
  }

  /**
   * Reset timer for new race
   */
  function resetRace() {
    raceTimer = {
      startTime: 0,
      currentTime: 0,
      lapTimes: [],
      bestLapTime: Infinity,
      lastLapTime: 0,
      raceFinished: false,
      finalTime: 0,
      lastCheckpointTime: 0,
      running: false
    };
    
    // Remove notifications
    var lapNotif = document.getElementById("lapNotification");
    if (lapNotif) lapNotif.remove();
    
    var finishNotif = document.getElementById("finishNotification");
    if (finishNotif) finishNotif.remove();
  }

  // ==========================================================================
  // GLOBAL VARIABLES
  // ==========================================================================
  
  // Three.js objects
  var scene, renderer, camera;
  var mapGroup, cpGroup, decoGroup;
  var ground;
  
  // Map physics data
  var wallSegs = [];  // Array of wall segments {a:V2, b:V2, dir:V2, len2:number, mesh:Mesh}
  var cpSegs = [];    // Checkpoint segments
  var spawnX = 0, spawnY = 0, spawnDir = 0; // Spawn position and direction
  
  // Multiplayer state
  var database = null;
  var firebaseOK = false;
  var ROOM = null;
  var isHost = false;
  var roomRef = null;
  var playersRef = null;
  var startRef = null;
  var players = {};   // All players in the game
  var meKey = null;   // Local player's key
  var me = null;      // Local player object
  
  // Game state
  var gameStarted = false;
  var gameSortaStarted = false;
  var playerCollisionEnabled = false;
  
  // Input state
  var left = false;
  var right = false;
  var up = false;
  var down = false;
  var mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  
  // Nitro state
  var nitroFuel = NITRO_MAX;
  var nitro = false;          // Shift currently held
  var nitroArmed = false;     // Set true on fresh Shift press
  var nitroLock = false;      // Locks after fuel hits 0 until Shift released
  var nitroActive = false;    // True while boost actually applies
  
  // Slipstream state
  var slipTargetKey = null;
  var slipFactor = 0;
  
  // UI elements
  var foreEl, titleEl, startEl, nameEl, pickerEl, sliderEl;
  var countdownEl, lapEl, settingsEl, toolbarEl;
  var modeWrapEl = null;
  var overlayMsgEl = null;
  var soundToggleBtn = null;   // Sound toggle button
  
  // Player color
  var color = "#ff3030";
  
  // Smooth steering
  var targetSteer = 0;
  var currentSteer = 0;

  // Firebase configuration
  var firebaseConfig = {
    apiKey: "AIzaSyAbvjrx9Nvu2_xRFTN-AEN8dJgRUDdb410",
    authDomain: "car-game67.firebaseapp.com",
    databaseURL: "https://car-game67-default-rtdb.firebaseio.com/",
    projectId: "car-game67",
    storageBucket: "car-game67.appspot.com",
    messagingSenderId: "211052611005",
    appId: "1:211052611005:web:bd456d81c7be8825e1fed4"
  };

  // ==========================================================================
  // UTILITY FUNCTIONS
  // ==========================================================================
  
  /**
   * Clamp a value between min and max
   */
  function clamp(v, a, b) { 
    return Math.max(a, Math.min(b, v)); 
  }
  
  /**
   * Safely remove an element from DOM
   */
  function safeRemove(el) { 
    if (!el) return; 
    try { el.remove(); } catch (e) {} 
  }

  /**
   * Create a div element with optional properties
   */
  function makeDiv(id, className, text) {
    var d = document.createElement("div");
    if (id) d.id = id;
    if (className) d.className = className;
    if (typeof text === "string") d.innerHTML = text;
    return d;
  }

  /**
   * Create a 2D vector (using Three.Vector2 for consistency)
   */
  function vec2(x, y) { 
    return new THREE.Vector2(x, y); 
  }

  /**
   * Reflect a vector across a normal
   */
  function reflect2(v, n) {
    var d = v.dot(n);
    return v.clone().sub(n.clone().multiplyScalar(2 * d));
  }

  /**
   * Get the current track code from the DOM
   */
  function getTrackCode() {
    var el = document.getElementById("trackcode");
    if (!el) return "";
    return (el.textContent || "").trim();
  }

  /**
   * Set track code and rebuild the map
   */
  function setTrackCode(str) {
    var el = document.getElementById("trackcode");
    if (!el) return;
    el.textContent = (str || "").trim();
    buildMapFromTrackCode(getTrackCode());
  }
  window.setTrackCode = setTrackCode;

  // ==========================================================================
  // MAP PARSING AND CONSTRUCTION
  // ==========================================================================
  
  var MIRROR_X = false;

  /**
   * Parse a "x,y" token into a Vector2
   * Editor coordinates are transformed to game coordinates
   */
  function parseV2(tok) {
    var parts = tok.split(",");
    if (parts.length !== 2) return null;

    var x = parseFloat(parts[0]);
    var y = parseFloat(parts[1]);
    if (!isFinite(x) || !isFinite(y)) return null;

    if (MIRROR_X) x = -x;
    return vec2(x, -y); // editor y -> game z (negated)
  }

  /**
   * Parse a "a/b" segment token into two points
   */
  function parseSeg(tok) {
    var p = tok.split("/");
    if (p.length !== 2) return null;
    var a = parseV2(p[0]);
    var b = parseV2(p[1]);
    if (!a || !b) return null;
    return { a: a, b: b };
  }

  /**
   * Hide lobby UI elements
   */
  function hideLobbyUI() {
    setDisplay("name", "none");
    setDisplay("colorpicker", "none");
    setDisplay("start", "none");
    setDisplay("divider", "none");
    setDisplay("mywebsitelink", "none");
  }

  /**
   * Set display property of an element by ID
   */
  function setDisplay(id, val) {
    var el = document.getElementById(id);
    if (el) el.style.display = val;
  }

  /**
   * Clear mode selection UI
   */
  function clearModeUI() {
    safeRemove(modeWrapEl);
    modeWrapEl = null;
    safeRemove(overlayMsgEl);
    overlayMsgEl = null;

    safeRemove(document.getElementById("startgame"));
    safeRemove(document.getElementById("code"));
    safeRemove(document.getElementById("incode"));
  }

  /**
   * Hide all menus when gameplay starts
   */
  function hideAllMenusForGameplay() {
    clearModeUI();

    safeRemove(document.getElementById("modewrap"));

    setDisplay("title", "none");
    hideLobbyUI();

    if (foreEl) {
      foreEl.style.pointerEvents = "none";
      foreEl.style.display = "none";
    }
    if (settingsEl) settingsEl.style.display = "none";
    if (toolbarEl) toolbarEl.classList.remove("sel");
  }

  /**
   * Show an overlay message
   */
  function showOverlayMsg(html) {
    if (!foreEl) return;
    if (!overlayMsgEl) {
      overlayMsgEl = makeDiv(null, "info", "");
      overlayMsgEl.style.top = "0";
      overlayMsgEl.style.left = "0";
      overlayMsgEl.style.width = "100%";
      overlayMsgEl.style.zIndex = "100000";
      foreEl.appendChild(overlayMsgEl);
    }
    overlayMsgEl.innerHTML = html || "";
  }

  // ==========================================================================
  // THREE.JS ENGINE INITIALIZATION
  // ==========================================================================
  
  /**
   * Ensure Three.js engine is initialized
   */
  function ensureEngine() {
    if (scene && renderer && mapGroup && cpGroup && camera) return;

    if (typeof THREE === "undefined") {
      throw new Error("THREE is not loaded. Make sure three.js is included before script.js");
    }

    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x7fb0ff); // Sky blue

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    renderer.domElement.style.position = "fixed";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.zIndex = "0";
    renderer.domElement.style.pointerEvents = "none";
    document.body.appendChild(renderer.domElement);

    // Create groups for different map elements
    mapGroup = new THREE.Group();   // Walls
    cpGroup = new THREE.Group();    // Checkpoints
    decoGroup = new THREE.Group();  // Trees/decorations
    scene.add(mapGroup);
    scene.add(cpGroup);
    scene.add(decoGroup);

    // Create ground plane
    var gGeo = new THREE.PlaneGeometry(300, 300);
    gGeo.rotateX(-Math.PI / 2);
    var gMat = new THREE.MeshStandardMaterial({ color: 0x4aa85e, roughness: 1 });
    ground = new THREE.Mesh(gGeo, gMat);
    ground.receiveShadow = true;
    scene.add(ground);

    // Create camera
    camera = new THREE.PerspectiveCamera(BASE_FOV, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, CAM_HEIGHT, 10);
    scene.add(camera);

    // Lighting
    var sun = new THREE.DirectionalLight(0xffffff, 0.75);
    sun.position.set(3000, 2000, -2000);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 1500;
    sun.shadow.camera.far = 6000;
    sun.shadow.camera.top = 400;
    sun.shadow.camera.bottom = -400;
    sun.shadow.camera.left = -400;
    sun.shadow.camera.right = 400;
    sun.shadow.bias = 0.00002;
    scene.add(sun);

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.55));

    // Get UI elements
    foreEl = document.getElementById("fore");
    titleEl = document.getElementById("title");
    startEl = document.getElementById("start");
    nameEl = document.getElementById("name");
    pickerEl = document.getElementById("colorpicker");
    sliderEl = document.getElementById("slider");
    settingsEl = document.getElementById("settings");
    toolbarEl = document.getElementById("toolbar");

    countdownEl = document.getElementById("countdown");
    lapEl = document.getElementById("lap");

    // Create missing elements if needed
    if (!countdownEl) {
      countdownEl = makeDiv("countdown", "", "");
      countdownEl.style.pointerEvents = "none";
      countdownEl.style.display = "none";
      document.body.appendChild(countdownEl);
    }
    if (!lapEl) {
      lapEl = makeDiv("lap", "", "");
      document.body.appendChild(lapEl);
    }

    // Add sound toggle button
    addSoundToggle();

    // Add player label style
    if (!document.getElementById("pLabelStyle")) {
      var st = document.createElement("style");
      st.id = "pLabelStyle";
      st.textContent =
        ".pLabel{position:fixed;transform:translate(-50%,-100%);color:#fff;font-family:'Press Start 2P',monospace;font-size:12px;pointer-events:none;text-shadow:0 2px 0 rgba(0,0,0,.55);z-index:4;white-space:nowrap;}";
      document.head.appendChild(st);
    }

    // Add nitro UI styles
    if (!document.getElementById("nitroStyle")) {
      var ns = document.createElement("style");
      ns.id = "nitroStyle";
      ns.textContent =
        "#nitrobar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);width:300px;height:14px;" +
        "background:rgba(0,0,0,.35);border:2px solid rgba(255,255,255,.95);border-radius:999px;z-index:5;" +
        "opacity:1;pointer-events:none;transition:filter .15s ease, transform .15s ease;display:none;}" +
        "#nitrobar.active{transform:translateX(-50%) scale(1.02);filter:drop-shadow(0 0 12px rgba(0,229,255,.65))}" +
        "#nitrofill{height:100%;width:0%;border-radius:999px;" +
        "background:linear-gradient(90deg, rgba(0,229,255,1) 0%, rgba(57,255,136,1) 55%, rgba(255,255,255,1) 100%);" +
        "box-shadow:0 0 8px rgba(0,229,255,.28);transition:width .08s linear}" +
        "#nitrolabel{position:fixed;bottom:38px;left:50%;transform:translateX(-50%);" +
        "font-family:'Press Start 2P',monospace;font-size:10px;color:rgba(255,255,255,.9);z-index:5;" +
        "text-shadow:0 2px 0 rgba(0,0,0,.45);pointer-events:none;opacity:.85;display:none;}";
      document.head.appendChild(ns);
    }

    // Create nitro bar if missing
    if (!document.getElementById("nitrobar")) {
      var nb = makeDiv("nitrobar", "", "");
      var fill = makeDiv("nitrofill", "", "");
      nb.appendChild(fill);
      document.body.appendChild(nb);

      var lbl = makeDiv("nitrolabel", "", "NITRO");
      document.body.appendChild(lbl);
    }

    // Add window resize handler
    window.addEventListener("resize", onResize, false);
    window.addEventListener("orientationchange", onResize, false);
  }

  /**
   * Add sound toggle button to the UI
   */
  function addSoundToggle() {
    // Create sound toggle button if it doesn't exist
    if (!document.getElementById('soundToggle')) {
      const soundBtn = document.createElement('div');
      soundBtn.id = 'soundToggle';
      soundBtn.className = 'sound-toggle';
      soundBtn.textContent = '🔊';
      soundBtn.style.position = 'fixed';
      soundBtn.style.bottom = '20px';
      soundBtn.style.right = '20px';
      soundBtn.style.zIndex = '10000';
      soundBtn.style.fontSize = '24px';
      soundBtn.style.cursor = 'pointer';
      soundBtn.style.background = 'rgba(0,0,0,0.5)';
      soundBtn.style.color = 'white';
      soundBtn.style.width = '50px';
      soundBtn.style.height = '50px';
      soundBtn.style.borderRadius = '50%';
      soundBtn.style.display = 'flex';
      soundBtn.style.alignItems = 'center';
      soundBtn.style.justifyContent = 'center';
      soundBtn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
      soundBtn.style.transition = 'all 0.2s ease';
      
      soundBtn.onclick = function() {
        const muted = SoundManager.toggleMute();
        this.textContent = muted ? '🔇' : '🔊';
        this.style.opacity = muted ? '0.5' : '1';
      };
      
      document.body.appendChild(soundBtn);
      soundToggleBtn = soundBtn;
    }
  }

  /**
   * Window resize handler
   */
  function onResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ==========================================================================
  // MAP CONSTRUCTION
  // ==========================================================================
  
  /**
   * Clear all children from a Three.js group
   */
  function clearGroup(g) {
    if (!g) return;
    while (g.children.length) g.remove(g.children[0]);
  }

  /**
   * Build the entire map from track code
   * Track format: "walls|checkpoints|trees|?|spawn"
   */
  function buildMapFromTrackCode(track) {
    ensureEngine();

    clearGroup(mapGroup);
    clearGroup(cpGroup);
    clearGroup(decoGroup);
    wallSegs = [];
    cpSegs = [];

    track = (track || "").trim();
    if (!track) {
      spawnX = 0; spawnY = 0; spawnDir = 0;
      return;
    }

    var parts = track.split("|");

    // Parse spawn point (5th section: parts[4])
    var hasSpawn = false;
    var spawnText = (parts[4] || "").trim();
    if (spawnText.length) {
      var sp = spawnText.split("/");
      var posTok = (sp[0] || "").trim();
      var p = parseV2(posTok);
      if (p) {
        spawnX = p.x;
        spawnY = p.y;
        hasSpawn = true;
      }

      var deg = parseFloat(sp[1] || "0");
      if (isFinite(deg)) {
        // Convert degrees to radians for game direction
        spawnDir = deg * Math.PI / 180;
        hasSpawn = true;
      }

      // Offset spawn slightly to avoid starting inside walls
      spawnX -= Math.sin(spawnDir) * 0.8;
      spawnY -= Math.cos(spawnDir) * 0.8;
    }

    // Parse walls
    var wallsPart = (parts[0] || "").trim();
    var checkPart = (parts[1] || "").trim();
    var treesPart = (parts[2] || "").trim();

    var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    function includePt(p2) {
      minX = Math.min(minX, p2.x);
      minY = Math.min(minY, p2.y);
      maxX = Math.max(maxX, p2.x);
      maxY = Math.max(maxY, p2.y);
    }

    // Add walls
    var wallTokens = wallsPart.split(/\s+/).filter(Boolean);
    for (var i = 0; i < wallTokens.length; i++) {
      var seg = parseSeg(wallTokens[i]);
      if (!seg) continue;
      includePt(seg.a); includePt(seg.b);
      addWall(seg.a, seg.b);
    }

    // Add checkpoints
    var cpTokens = checkPart.split(/\s+/).filter(Boolean);
    for (var j = 0; j < cpTokens.length; j++) {
      var cseg = parseSeg(cpTokens[j]);
      if (!cseg) continue;
      includePt(cseg.a); includePt(cseg.b);
      addCheckpoint(cseg.a, cseg.b, j === 0);
    }

    // Add trees/decorations
    var treeTokens = treesPart.split(/\s+/).filter(Boolean);
    for (var t = 0; t < treeTokens.length; t++) {
      var tp = parseV2(treeTokens[t]);
      if (!tp) continue;
      includePt(tp);
      addTree(tp.x, tp.y);
    }

    // Resize ground to fit the map
    if (minX < 1e8) {
      var pad = 2000;
      var w = (maxX - minX) + pad;
      var h = (maxY - minY) + pad;
      w = Math.max(w, 120);
      h = Math.max(h, 120);

      if (ground && ground.geometry) ground.geometry.dispose();
      var ng = new THREE.PlaneGeometry(w, h);
      ng.rotateX(-Math.PI / 2);
      ground.geometry = ng;
      ground.position.set((minX + maxX) / 2, 0, (minY + maxY) / 2);
    } else {
      ground.position.set(0, 0, 0);
    }

    if (!hasSpawn) computeSpawn();
  }

  /**
   * Add a wall segment to the map
   */
  function addWall(a2, b2) {
    var a = a2.clone(), b = b2.clone();
    var ab = b.clone().sub(a);
    var len2 = ab.lengthSq();
    if (len2 < 1e-6) return;

    var mid = a.clone().add(b).multiplyScalar(0.5);
    var width = Math.sqrt(len2);

    // Create wall mesh
    var geo = new THREE.BoxGeometry(width, 3, 0.6);
    var mat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.95 });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    var ang = Math.atan2((b.y - a.y), (b.x - a.x));
    mesh.rotation.y = -ang;
    mesh.position.set(mid.x, 1.5, mid.y);

    mapGroup.add(mesh);

    // Store wall data for collision detection
    wallSegs.push({ a: a, b: b, dir: ab, len2: len2, mesh: mesh });
  }

  /**
   * Add a checkpoint segment
   */
  function addCheckpoint(a2, b2, isStart) {
    var a = a2.clone(), b = b2.clone();
    var ab = b.clone().sub(a);
    var len2 = ab.lengthSq();
    if (len2 < 1e-6) return;

    var mid = a.clone().add(b).multiplyScalar(0.5);
    var width = Math.sqrt(len2);

    // Calculate normal (perpendicular direction)
    var n = vec2(ab.y, -ab.x);
    if (n.lengthSq() < 1e-9) n = vec2(0, 1);
    n.normalize();

    // Create checkpoint mesh (semi-transparent)
    var geo = new THREE.BoxGeometry(width, 0.1, 2.0);
    var mat = new THREE.MeshStandardMaterial({ 
      color: isStart ? 0xffffff : 0xffe100, 
      roughness: 0.8,
      transparent: true,
      opacity: 0.6
    });
    var mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;

    var ang = Math.atan2((b.y - a.y), (b.x - a.x));
    mesh.rotation.y = -ang;
    mesh.position.set(mid.x, 0.05, mid.y);

    cpGroup.add(mesh);

    cpSegs.push({ a: a, b: b, dir: ab, len2: len2, normal: n, mid: mid, mesh: mesh });
  }

  /**
   * Add a tree decoration
   */
  function addTree(x, y) {
    // Tree trunk
    var trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 1.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a3b1e, roughness: 1 })
    );
    trunk.position.set(x, 0.6, y);
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    // Tree top (leaves)
    var top = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 1.8, 10),
      new THREE.MeshStandardMaterial({ color: 0x1f7a3a, roughness: 1 })
    );
    top.position.set(x, 2.0, y);
    top.castShadow = true;

    decoGroup.add(trunk);
    decoGroup.add(top);
  }

  /**
   * Compute spawn point if not defined
   */
  function computeSpawn() {
    if (!cpSegs.length) {
      spawnX = 0; spawnY = 0; spawnDir = 0;
      return;
    }

    var start = cpSegs[0];
    var forward = start.normal.clone();

    // Use next checkpoint to determine forward direction
    if (cpSegs.length > 1) {
      var chk = cpSegs[1];
      var v = chk.mid.clone().sub(start.mid);
      if (v.dot(forward) < 0) forward.multiplyScalar(-1);
    }

    spawnX = start.mid.x + forward.x * 5;
    spawnY = start.mid.y + forward.y * 5;
    spawnDir = Math.atan2(forward.x, forward.y);
  }

  // ==========================================================================
  // CAR MODEL CONSTRUCTION
  // ==========================================================================
  
  /**
   * Create a detailed F1-style car model
   * @param {number} hexColor - Car body color in hex
   * @returns {THREE.Group} The car model group
   */
  function makeCar(hexColor) {
    var car = new THREE.Object3D();

    // Material definitions
    var bodyMat = new THREE.MeshStandardMaterial({ color: hexColor, roughness: 0.5, metalness: 0.12 });
    var carbonMat = new THREE.MeshStandardMaterial({ color: 0x0f0f10, roughness: 0.9, metalness: 0.05 });
    var darkMat = new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.85, metalness: 0.05 });
    var metalMat = new THREE.MeshStandardMaterial({ color: 0x6b6b6b, roughness: 0.45, metalness: 0.5 });
    var glassMat = new THREE.MeshStandardMaterial({ color: 0x1b1b1b, roughness: 0.25, metalness: 0.05, transparent: true, opacity: 0.9 });
    var whiteMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0.02 });

    /**
     * Helper to add a mesh with position and rotation
     */
    function addMesh(parent, mesh, x, y, z, rx, ry, rz) {
      if (x != null) mesh.position.x = x;
      if (y != null) mesh.position.y = y;
      if (z != null) mesh.position.z = z;
      if (rx != null) mesh.rotation.x = rx;
      if (ry != null) mesh.rotation.y = ry;
      if (rz != null) mesh.rotation.z = rz;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    }

    function box(parent, w, h, l, mat, x, y, z, rx, ry, rz) {
      return addMesh(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, l), mat), x, y, z, rx, ry, rz);
    }

    function cyl(parent, rTop, rBot, h, seg, mat, x, y, z, rx, ry, rz) {
      return addMesh(parent, new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat), x, y, z, rx, ry, rz);
    }

    function sphere(parent, r, seg, mat, x, y, z) {
      return addMesh(parent, new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), mat), x, y, z);
    }

    function torus(parent, r, tube, segR, segT, mat, x, y, z, rx, ry, rz) {
      return addMesh(parent, new THREE.Mesh(new THREE.TorusGeometry(r, tube, segR, segT), mat), x, y, z, rx, ry, rz);
    }

    /**
     * Create a strut (cylinder between two points)
     */
    function strut(parent, ax, ay, az, bx, by, bz, radius, mat) {
      var a = new THREE.Vector3(ax, ay, az);
      var b = new THREE.Vector3(bx, by, bz);
      var dir = b.clone().sub(a);
      var len = dir.length();
      if (len < 1e-6) return null;

      var m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, 10), mat);
      m.castShadow = true;
      m.receiveShadow = true;

      var mid = a.clone().add(b).multiplyScalar(0.5);
      m.position.copy(mid);

      dir.normalize();
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

      parent.add(m);
      return m;
    }

    // MAIN BODY (CHILD 0)
    var body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.30, 2.85), bodyMat);
    body.castShadow = true;
    body.receiveShadow = true;
    body.position.y = 0.55;
    car.add(body);

    // Body details
    box(body, 1.28, 0.06, 3.55, carbonMat, 0, -0.19, 0);
    box(body, 0.22, 0.10, 0.95, carbonMat, 0, -0.11, 1.55);

    cyl(body, 0.12, 0.22, 1.25, 12, bodyMat, 0, -0.02, 1.65, Math.PI / 2, 0, 0);
    cyl(body, 0.06, 0.12, 0.30, 10, darkMat, 0, -0.03, 2.25, Math.PI / 2, 0, 0);

    // Rear wing
    box(body, 2.35, 0.06, 0.42, carbonMat, 0, -0.16, 2.18);
    box(body, 2.10, 0.05, 0.26, darkMat, 0, -0.08, 2.30);

    // Side pods
    box(body, 0.58, 0.22, 1.45, bodyMat, -0.82, -0.02, -0.15);
    box(body, 0.58, 0.22, 1.45, bodyMat,  0.82, -0.02, -0.15);

    // Front wing
    box(body, 1.55, 0.09, 0.42, carbonMat, 0, 0.22, -1.92);
    box(body, 1.35, 0.06, 0.28, darkMat, 0, 0.30, -1.98);

    // Slipstream FX (visual effect for drafting)
    (function addSlipFX() {
      var slip = new THREE.Group();
      slip.name = "slipfx";
      slip.visible = false;

      var geo = new THREE.PlaneGeometry(0.10, 6.0);
      geo.rotateX(-Math.PI / 2);

      function lineMesh(x) {
        var mat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });

        var mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, -0.52, -3.8);
        mesh.renderOrder = 9999;
        return mesh;
      }

      slip.add(lineMesh(-0.35));
      slip.add(lineMesh(0.35));
      body.add(slip);
    })();

    // CABIN (CHILD 1)
    var cabin = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.20, 0.90), glassMat);
    cabin.castShadow = true;
    cabin.receiveShadow = true;
    cabin.position.set(0, 0.78, 0.25);
    car.add(cabin);

    // Cabin details
    torus(cabin, 0.28, 0.04, 10, 18, carbonMat, 0, 0.10, -0.06, Math.PI / 2, 0, 0);
    sphere(cabin, 0.13, 12, whiteMat, 0, 0.08, 0.10);

    // WHEELS (CHILDREN 2-5)
    function wheelMesh(radius, thickness) {
      var g = new THREE.CylinderGeometry(radius, radius, thickness, 18);
      var m = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 1, metalness: 0.02 });
      var w = new THREE.Mesh(g, m);
      w.rotation.z = Math.PI / 2;
      w.castShadow = true;
      w.receiveShadow = true;

      // Rim
      var rim = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, thickness + 0.02, 14),
        new THREE.MeshStandardMaterial({ color: 0x303030, roughness: 0.55, metalness: 0.25 })
      );
      rim.rotation.z = Math.PI / 2;
      w.add(rim);

      // Disc
      var disc = new THREE.Mesh(
        new THREE.CylinderGeometry(radius * 0.35, radius * 0.35, thickness + 0.03, 12),
        metalMat
      );
      disc.rotation.z = Math.PI / 2;
      w.add(disc);

      return w;
    }

    // Wheel positions
    var FL = { x: -1.08, y: 0.36, z: 1.52 };
    var FR = { x:  1.08, y: 0.36, z: 1.52 };
    var BL = { x: -1.08, y: 0.40, z: -1.32 };
    var BR = { x:  1.08, y: 0.40, z: -1.32 };

    // Front wheels (slightly smaller)
    var frontLeft = wheelMesh(0.36, 0.30);
    frontLeft.position.set(FL.x, FL.y, FL.z);
    car.add(frontLeft);

    var frontRight = wheelMesh(0.36, 0.30);
    frontRight.position.set(FR.x, FR.y, FR.z);
    car.add(frontRight);

    // Rear wheels (larger)
    var backLeft = wheelMesh(0.42, 0.34);
    backLeft.position.set(BL.x, BL.y, BL.z);
    car.add(backLeft);

    var backRight = wheelMesh(0.42, 0.34);
    backRight.position.set(BR.x, BR.y, BR.z);
    car.add(backRight);

    // Suspension struts
    function toBodyLocal(p) { return { x: p.x, y: p.y - 0.55, z: p.z }; }
    var fl = toBodyLocal(FL), fr = toBodyLocal(FR), bl = toBodyLocal(BL), br = toBodyLocal(BR);

    strut(body, -0.38, 0.02,  1.10, fl.x * 0.92, fl.y + 0.02, fl.z - 0.05, 0.03, carbonMat);
    strut(body, -0.30, -0.08, 1.10, fl.x * 0.92, fl.y - 0.06, fl.z - 0.05, 0.03, carbonMat);
    strut(body,  0.38, 0.02,  1.10, fr.x * 0.92, fr.y + 0.02, fr.z - 0.05, 0.03, carbonMat);
    strut(body,  0.30, -0.08, 1.10, fr.x * 0.92, fr.y - 0.06, fr.z - 0.05, 0.03, carbonMat);

    strut(body, -0.40, 0.00, -1.05, bl.x * 0.92, bl.y + 0.02, bl.z + 0.05, 0.03, carbonMat);
    strut(body, -0.32, -0.10, -1.05, bl.x * 0.92, bl.y - 0.06, bl.z + 0.05, 0.03, carbonMat);
    strut(body,  0.40, 0.00, -1.05, br.x * 0.92, br.y + 0.02, br.z + 0.05, 0.03, carbonMat);
    strut(body,  0.32, -0.10, -1.05, br.x * 0.92, br.y - 0.06, br.z + 0.05, 0.03, carbonMat);

    return car;
  }

  /**
   * Create a player name label (DOM element)
   */
  function makeLabel(name) {
    var el = document.createElement("div");
    el.className = "pLabel";
    el.textContent = name || "Player";
    document.body.appendChild(el);
    return el;
  }

  /**
   * Project a 3D world position to 2D screen coordinates
   * Used for positioning player name labels
   */
  function projectToScreen(pos3) {
    var v = pos3.clone();
    v.y += 0.8; // Offset above car
    v.project(camera);
    var x = (v.x + 1) / 2 * window.innerWidth;
    var y = (-v.y + 1) / 2 * window.innerHeight;
    var visible = (v.z >= -1 && v.z <= 1);
    return { x: x, y: y, visible: visible };
  }

  // ==========================================================================
  // SLIPSTREAM (DRAFTING) SYSTEM
  // ==========================================================================
  
  /**
   * Get the slipstream FX group from a car model
   */
  function getSlipFX(model) {
    if (!model) return null;
    if (model._slipfxCached !== undefined) return model._slipfxCached;

    var body = model.children && model.children[0];
    if (!body) { model._slipfxCached = null; return null; }

    var fx = body.getObjectByName("slipfx");
    model._slipfxCached = fx || null;
    return model._slipfxCached;
  }

  /**
   * Update slipstream visual effect
   */
  function setSlipFX(model, factor, ts) {
    var fx = getSlipFX(model);
    if (!fx) return;

    if (factor <= 0.02) {
      fx.visible = false;
      return;
    }

    fx.visible = true;

    // Animate the slipstream lines
    var pulse = 0.70 + 0.30 * Math.sin(ts * 0.02);
    var op = clamp((0.20 + 0.65 * factor) * pulse, 0, 0.90);
    var stretch = 0.85 + factor * 0.65;

    for (var i = 0; i < fx.children.length; i++) {
      var m = fx.children[i];
      if (!m || !m.material) continue;
      m.material.opacity = op;
      m.scale.z = stretch;
    }
  }

  /**
   * Calculate slipstream effect for current player
   * Determines if player is in another car's draft
   */
  function computeSlipstreamForMe() {
    var bestKey = null;
    var best = 0;

    if (!me || !me.data) return { key: null, factor: 0 };

    var myPos = vec2(me.data.x, me.data.y);

    for (var k in players) {
      if (!players.hasOwnProperty(k)) continue;
      if (k === meKey) continue;

      var p = players[k];
      if (!p || !p.data) continue;

      var ox = p.data.x || 0;
      var oy = p.data.y || 0;
      var od = p.data.dir || 0;

      var oPos = vec2(ox, oy);
      var dVec = myPos.clone().sub(oPos); // Vector from other to me
      var dist = dVec.length();
      if (dist < 0.001 || dist > SLIP_DIST) continue;

      var fwd = vec2(Math.sin(od), Math.cos(od)); // Their forward direction
      var along = dVec.dot(fwd); // Distance along their forward axis
      if (along > -0.25) continue; // Must be behind them

      var proj = fwd.clone().multiplyScalar(along);
      var lateral = dVec.clone().sub(proj).length(); // Lateral distance
      if (lateral > SLIP_WIDTH) continue;

      // Calculate slip factor based on distance and lateral offset
      var distFactor = clamp((SLIP_DIST - dist) / SLIP_DIST, 0, 1);
      var latFactor = clamp((SLIP_WIDTH - lateral) / SLIP_WIDTH, 0, 1);

      var factor = distFactor * (latFactor * latFactor);

      if (factor > best) {
        best = factor;
        bestKey = k;
      }
    }

    return { key: bestKey, factor: best };
  }

  /**
   * Update slipstream visuals for all cars
   */
  function updateSlipstreamVisuals(ts) {
    for (var k in players) {
      if (!players.hasOwnProperty(k)) continue;
      var p = players[k];
      if (!p || !p.model) continue;

      if (k === slipTargetKey) setSlipFX(p.model, slipFactor, ts);
      else setSlipFX(p.model, 0, ts);
    }
  }

  // ==========================================================================
  // INPUT HANDLING
  // ==========================================================================
  
  /**
   * Set up keyboard and touch input
   */
  function setupInputOnce() {
    if (setupInputOnce._did) return;
    setupInputOnce._did = true;

    // Keyboard controls
    window.addEventListener("keydown", function (e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") left = true;
      if (k === "ArrowRight" || k === "d" || k === "D") right = true;
      if (k === "ArrowUp" || k === "w" || k === "W") up = true;
      if (k === "ArrowDown" || k === "s" || k === "S") down = true;

      // Nitro (Shift key)
      if (k === "Shift") {
        if (!nitro) {
          if (!nitroLock && nitroFuel > 0.5) {
            nitroArmed = true;
            SoundManager.playNitroSound(); // Play nitro sound on activation
          }
        }
        nitro = true;
      }
    });

    window.addEventListener("keyup", function (e) {
      var k = e.key;
      if (k === "ArrowLeft" || k === "a" || k === "A") left = false;
      if (k === "ArrowRight" || k === "d" || k === "D") right = false;
      if (k === "ArrowUp" || k === "w" || k === "W") up = false;
      if (k === "ArrowDown" || k === "s" || k === "S") down = false;

      if (k === "Shift") {
        nitro = false;
        nitroArmed = false;
        nitroLock = false;
        nitroActive = false;
      }
    });

    // Touch controls for mobile
    function updateTouch(touches) {
      left = right = up = down = false;
      if (!touches || touches.length === 0) return;
      for (var i = 0; i < touches.length; i++) {
        var tx = touches[i].clientX;
        var ty = touches[i].clientY;
        // Split screen: left half = steer left, right half = steer right
        if (tx < window.innerWidth / 2) left = true; else right = true;
        // Top half = accelerate
        if (ty < window.innerHeight / 2) up = true;
      }
    }

    window.addEventListener("touchstart", function (e) { updateTouch(e.touches); }, { passive: true });
    window.addEventListener("touchmove", function (e) { updateTouch(e.touches); }, { passive: true });
    window.addEventListener("touchend", function () { left = right = up = down = false; }, { passive: true });
  }

  // ==========================================================================
  // COLOR PICKER
  // ==========================================================================
  
  /**
   * Convert HSV color to HEX string
   */
  function hsvToHex(h, s, v) {
    var c = v * s;
    var x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    var m = v - c;
    var r = 0, g = 0, b = 0;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    var R = Math.round((r + m) * 255);
    var G = Math.round((g + m) * 255);
    var B = Math.round((b + m) * 255);

    function to2(n) { var t = n.toString(16); return t.length === 1 ? "0" + t : t; }
    return "#" + to2(R) + to2(G) + to2(B);
  }

  /**
   * Set color picker slider position from 0-1 value
   */
  function setSliderFrom01(x01) {
    x01 = clamp(x01, 0, 1);
    var hue = x01 * 360;
    color = hsvToHex(hue, 0.85, 1);

    if (sliderEl && pickerEl) {
      var rect = pickerEl.getBoundingClientRect();
      var sw = sliderEl.offsetWidth || (rect.width * 0.09);
      var x = x01 * rect.width;
      sliderEl.style.transform = "translate(" + (x - sw / 2) + "px, -2vmin)";
      sliderEl.style.background = color;
    }
  }

  /**
   * Set up color picker interactions
   */
  function setupColorPickerOnce() {
    if (setupColorPickerOnce._did) return;
    setupColorPickerOnce._did = true;
    if (!pickerEl || !sliderEl) return;

    // Set initial color
    requestAnimationFrame(function () { setSliderFrom01(0.02); });

    var dragging = false;

    function setFromEvent(e) {
      var rect = pickerEl.getBoundingClientRect();
      var cx = (e.touches && e.touches[0]) ? e.touches[0].clientX : e.clientX;
      var x01 = (cx - rect.left) / rect.width;
      setSliderFrom01(x01);
    }

    pickerEl.addEventListener("mousedown", function (e) { dragging = true; setFromEvent(e); });
    window.addEventListener("mousemove", function (e) { if (dragging) setFromEvent(e); });
    window.addEventListener("mouseup", function () { dragging = false; });

    pickerEl.addEventListener("touchstart", function (e) { dragging = true; setFromEvent(e); }, { passive: true });
    pickerEl.addEventListener("touchmove", function (e) { if (dragging) setFromEvent(e); }, { passive: true });
    pickerEl.addEventListener("touchend", function () { dragging = false; }, { passive: true });
  }

  // ==========================================================================
  // MENU AND GAME FLOW
  // ==========================================================================
  
  /**
   * Animate menu elements sliding in
   */
  function animateMenuIn() {
    if (titleEl) setTimeout(function () { titleEl.style.transform = "translate3d(0, 0, 0)"; }, 10);
    var items = document.getElementsByClassName("menuitem");
    for (var i = 0; i < items.length; i++) {
      (function (idx) {
        setTimeout(function () { items[idx].style.transform = "translate3d(0, 0, 0)"; }, 120 + idx * 90);
      })(i);
    }
    if (settingsEl) setTimeout(function () { settingsEl.style.transform = "translate3d(0, 0, 0)"; }, 500);
  }

  /**
   * Show mode selection menu (Host/Join/Solo)
   */
  function showModeMenu() {
    ensureEngine();
    setupInputOnce();
    setupColorPickerOnce();

    // Initialize sound system on first user interaction
    if (!SoundManager.initialized) {
      SoundManager.init();
    }

    clearModeUI();
    hideLobbyUI();

    if (nameEl && !nameEl.value.trim()) nameEl.value = "Player";

    if (titleEl) {
      titleEl.style.display = "";
      titleEl.innerHTML = "";
    }

    modeWrapEl = document.createElement("div");
    modeWrapEl.id = "modewrap";
    if (foreEl) foreEl.appendChild(modeWrapEl);

    function mkButton(text, topVh, onClick) {
      var b = makeDiv(null, "button", text);
      b.style.top = "calc(" + topVh + "vh - 8vmin)";
      b.onclick = onClick;
      modeWrapEl.appendChild(b);
      setTimeout(function () { b.style.transform = "translate3d(0,0,0)"; }, 20);
      return b;
    }

    mkButton("HOST", 30, function () { hostFlow(); });
    mkButton("JOIN", 55, function () { joinFlow(); });
    mkButton("SOLO", 80, function () { soloFlow(); });
  }

  // ==========================================================================
  // TOOLBAR SETUP
  // ==========================================================================
  
  /**
   * Set up the toolbar with map editing tools
   */
  function setupToolbarOnce() {
    if (setupToolbarOnce._did) return;
    setupToolbarOnce._did = true;

    if (!settingsEl || !toolbarEl) return;

    settingsEl.onclick = function () {
      if (toolbarEl.classList.contains("sel")) toolbarEl.classList.remove("sel");
      else toolbarEl.classList.add("sel");
    };

    toolbarEl.innerHTML = "";

    function toolButton(title, bg, onClick) {
      var t = document.createElement("div");
      t.className = "tools";
      if (bg) t.style.backgroundColor = bg;
      t.title = title;
      t.onclick = function (e) { e.stopPropagation(); onClick(); };
      toolbarEl.appendChild(t);
      return t;
    }

    toolButton("Open editor", "#55db8f", function () {
      window.open("./editor/", "_blank");
    });

    toolButton("Import map code", "#db6262", function () {
      var cur = getTrackCode();
      var str = prompt("Paste trackcode here (exported from /editor).", cur);
      if (typeof str === "string" && str.trim()) {
        setTrackCode(str);
        showOverlayMsg("Map imported.");
        setTimeout(function () { showOverlayMsg(""); }, 1200);
      }
    });

    toolButton("Export map code", "#9a55db", function () {
      var str = getTrackCode();
      if (!str) return;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(str).then(function () {
          showOverlayMsg("Map code copied to clipboard.");
          setTimeout(function () { showOverlayMsg(""); }, 1200);
        }).catch(function () {
          prompt("Copy trackcode:", str);
        });
      } else {
        prompt("Copy trackcode:", str);
      }
    });
  }

  // ==========================================================================
  // FIREBASE MULTIPLAYER
  // ==========================================================================
  
  // Initialize Firebase
  try {
    if (typeof firebase !== "undefined" && firebase.apps && firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase !== "undefined") {
      database = firebase.database();
      firebaseOK = true;
      firebase.auth().signInAnonymously().catch(function (e) {
        console.warn("Firebase auth failed (solo still works):", e);
      });
    }
  } catch (e) {
    console.warn("Firebase init failed (solo still works):", e);
  }

  /**
   * Generate a random room code
   */
  function randomCode(len) {
    var s = "";
    var chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    for (var i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  /**
   * Detach Firebase listeners
   */
  function detachRoomListeners() {
    try {
      if (playersRef) playersRef.off();
      if (startRef) startRef.off();
    } catch (e) {}
  }

  /**
   * Remove all players from the scene
   */
  function clearPlayers() {
    for (var k in players) {
      if (!players.hasOwnProperty(k)) continue;
      var p = players[k];
      if (p && p.model) scene.remove(p.model);
      if (p && p.label) safeRemove(p.label);
    }
    players = {};
    meKey = null;
    me = null;
  }

  /**
   * Connect to a multiplayer room
   */
  function connectToRoom(code, hostFlag) {
    if (meKey) return;
    ensureEngine();

    detachRoomListeners();
    clearPlayers();

    ROOM = (code || "").toUpperCase();
    isHost = !!hostFlag;

    if (!database) {
      showOverlayMsg("Firebase unavailable. Running SOLO.");
      setTimeout(function () { showOverlayMsg(""); }, 1500);
      soloFlow();
      return;
    }

    roomRef = database.ref("rooms/" + ROOM);
    playersRef = roomRef.child("players");
    startRef = roomRef.child("startedAt");

    createLocalPlayerFirebase();

    // Listen for new players
    playersRef.on("child_added", function (snap) {
      var key = snap.key;
      var data = snap.val();
      if (!data) return;
      upsertPlayer(key, data);
    });

    // Listen for player updates
    playersRef.on("child_changed", function (snap) {
      var key = snap.key;
      var data = snap.val();
      if (!data) return;
      upsertPlayer(key, data);
    });

    // Listen for player disconnects
    playersRef.on("child_removed", function (snap) {
      removePlayer(snap.key);
    });

    // Listen for game start
    startRef.on("value", function (snap) {
      var startedAt = snap.val();
      if (!startedAt) {
        if (!gameStarted) {
          showOverlayMsg(isHost ? "Share code <b>" + ROOM + "</b> — then press START GAME." : "Joined <b>" + ROOM + "</b>. Waiting for host...");
        }
        return;
      }
      startGame();
    });
  }

  /**
   * Create local player in Firebase
   */
  function createLocalPlayerFirebase() {
    var nm = (nameEl && nameEl.value ? nameEl.value : "Player").trim() || "Player";

    var ref = playersRef.push();
    meKey = ref.key;

    var data = {
      name: nm,
      color: color,
      x: spawnX,
      y: spawnY,
      xv: 0,
      yv: 0,
      dir: spawnDir,
      steer: 0,
      lap: 1,
      checkpoint: 0,
      lastSeen: Date.now()
    };

    var hex = parseInt(color.replace("#", "0x"), 16);
    var model = makeCar(hex);
    model.position.set(data.x, 0, data.y);
    model.rotation.y = data.dir;
    scene.add(model);

    var label = makeLabel(nm);

    me = { key: meKey, ref: ref, data: data, model: model, label: label, isMe: true, lastSend: 0 };
    players[meKey] = me;

    // Remove player data on disconnect
    ref.onDisconnect().remove();
    ref.set(data);
  }

  /**
   * Add or update a remote player
   */
  function upsertPlayer(key, data) {
    if (!data) return;

    if (meKey && key === meKey && me) {
      me.data.name = data.name || me.data.name;
      me.data.color = data.color || me.data.color;
      if (me.label) me.label.textContent = me.data.name;
      return;
    }

    var p = players[key];
    if (!p) {
      var hex = parseInt(((data.color || "#ff3030").replace("#", "0x")), 16);
      var model = makeCar(hex);
      model.position.set(data.x || 0, 0, data.y || 0);
      model.rotation.y = data.dir || 0;
      scene.add(model);

      var label = makeLabel(data.name || "Player");
      p = { key: key, ref: playersRef.child(key), data: data, model: model, label: label, isMe: false };
      players[key] = p;
    } else {
      p.data = data;
      if (p.label && p.label.textContent !== (data.name || "Player")) p.label.textContent = data.name || "Player";
    }
  }

  /**
   * Remove a player
   */
  function removePlayer(key) {
    var p = players[key];
    if (!p) return;
    if (p.model) scene.remove(p.model);
    if (p.label) safeRemove(p.label);
    delete players[key];
  }

  // ==========================================================================
  // GAME FLOWS (Host/Join/Solo)
  // ==========================================================================
  
  /**
   * Host a multiplayer game
   */
  function hostFlow() {
    clearModeUI();
    var code = randomCode(4);

    var codeEl = makeDiv("code", "info", code);
    codeEl.style.fontSize = "20vmin";
    codeEl.style.textAlign = "center";
    codeEl.style.position = "absolute";
    codeEl.style.top = "20vh";
    codeEl.style.left = "0";
    codeEl.style.width = "100%";
    if (foreEl) foreEl.appendChild(codeEl);

    var sg = makeDiv("startgame", "", "START GAME");
    sg.style.position = "fixed";
    sg.style.bottom = "20px";
    sg.style.left = "50%";
    sg.style.transform = "translateX(-50%)";
    sg.style.width = "420px";
    sg.style.textAlign = "center";
    sg.style.zIndex = "99999";
    document.body.appendChild(sg);

    sg.onclick = function () {
      if (!roomRef) return;
      roomRef.child("startedAt").set(firebase.database.ServerValue.TIMESTAMP);
    };

    connectToRoom(code, true);
  }

  /**
   * Join a multiplayer game
   */
  function joinFlow() {
    clearModeUI();

    var inEl = document.createElement("input");
    inEl.id = "incode";
    inEl.maxLength = 8;
    inEl.placeholder = "CODE";
    inEl.autocomplete = "off";
    inEl.spellcheck = false;
    inEl.value = "";

    if (foreEl) foreEl.appendChild(inEl);
    inEl.focus();

    var joinBtn = makeDiv("startgame", "", "JOIN");
    joinBtn.style.position = "fixed";
    joinBtn.style.bottom = "20px";
    joinBtn.style.left = "50%";
    joinBtn.style.transform = "translateX(-50%)";
    joinBtn.style.width = "420px";
    joinBtn.style.textAlign = "center";
    joinBtn.style.zIndex = "99999";
    document.body.appendChild(joinBtn);

    function doJoin() {
      var code = (inEl.value || "").trim().toUpperCase();
      if (!code) return;
      connectToRoom(code, false);
    }

    inEl.addEventListener("input", function () { inEl.value = inEl.value.toUpperCase(); });
    inEl.addEventListener("keydown", function (e) { if (e.key === "Enter") doJoin(); });
    joinBtn.onclick = doJoin;
  }

  /**
   * Start a solo game
   */
  function soloFlow() {
    ensureEngine();
    clearPlayers();
    detachRoomListeners();
    ROOM = null;
    isHost = false;

    var nm = (nameEl && nameEl.value ? nameEl.value : "Player").trim() || "Player";
    meKey = "solo";

    var data = {
      name: nm,
      color: color,
      x: spawnX,
      y: spawnY,
      xv: 0,
      yv: 0,
      dir: spawnDir,
      steer: 0,
      lap: 1,
      checkpoint: 0
    };

    var hex = parseInt(color.replace("#", "0x"), 16);
    var model = makeCar(hex);
    model.position.set(data.x, 0, data.y);
    model.rotation.y = data.dir;
    scene.add(model);

    var label = makeLabel(nm);

    me = { key: meKey, ref: null, data: data, model: model, label: label, isMe: true, lastSend: 0 };
    players[meKey] = me;

    startGame();
  }

  /**
   * Start the actual race
   */
  function startGame() {
    if (gameStarted) return;

    gameStarted = true;
    playerCollisionEnabled = false;
    
    // Reset timer
    resetRace();

    hideAllMenusForGameplay();

    safeRemove(document.getElementById("incode"));
    safeRemove(document.getElementById("startgame"));

    showOverlayMsg("");
    startCountdown(function() {
      // Timer will start when car moves
    });

    // Enable collisions after a delay to avoid start pile-ups
    setTimeout(function() { playerCollisionEnabled = true; }, 5000);
  }

  /**
   * Display countdown before race start
   */
  function startCountdown(done) {
    gameSortaStarted = true;
    var t = 3;

    if (countdownEl) {
      countdownEl.style.fontSize = "40vmin";
      countdownEl.style.display = "block";
      countdownEl.innerHTML = String(t);
    }

    var iv = setInterval(function () {
      t--;
      if (t <= 0) {
        clearInterval(iv);
        if (countdownEl) {
          countdownEl.innerHTML = "";
          countdownEl.style.display = "none";
        }
        gameSortaStarted = false;
        if (done) done();
        return;
      }
      if (countdownEl) {
        countdownEl.style.display = "block";
        countdownEl.innerHTML = String(t);
      }
    }, 1000);
  }

  // ==========================================================================
  // COLLISION DETECTION (Rectangle/Rectangle)
  // ==========================================================================
  
  /**
   * Get forward and right axes from a direction angle
   */
  function axesFromDir(dir) {
    var fwd = vec2(Math.sin(dir), Math.cos(dir));
    var right = vec2(Math.cos(dir), -Math.sin(dir));
    return { fwd: fwd, right: right };
  }

  /**
   * Convert world coordinates to local car coordinates
   */
  function worldToLocal(pWorld, centerWorld, axes) {
    var v = pWorld.clone().sub(centerWorld);
    return vec2(v.dot(axes.right), v.dot(axes.fwd));
  }

  /**
   * Convert local car coordinates to world coordinates
   */
  function localToWorld(pLocal, axes) {
    return vec2(
      axes.right.x * pLocal.x + axes.fwd.x * pLocal.y,
      axes.right.y * pLocal.x + axes.fwd.y * pLocal.y
    );
  }

  /**
   * Find closest point on a segment to a point
   */
  function pointSegDistSq(p, a, b) {
    var ab = b.clone().sub(a);
    var t = 0;
    var len2 = ab.lengthSq();
    if (len2 > 1e-9) t = clamp(p.clone().sub(a).dot(ab) / len2, 0, 1);
    var q = a.clone().add(ab.multiplyScalar(t));
    return { d2: p.distanceToSquared(q), q: q, t: t };
  }

  /**
   * Find closest point in a rectangle to a point
   */
  function pointRectClosest(p, hx, hy) {
    return vec2(clamp(p.x, -hx, hx), clamp(p.y, -hy, hy));
  }

  /**
   * Check if a line segment intersects an axis-aligned rectangle
   */
  function segIntersectsAABB(a, b, hx, hy) {
    var t0 = 0, t1 = 1;
    var dx = b.x - a.x;
    var dy = b.y - a.y;

    function clip(p, q) {
      if (Math.abs(p) < 1e-9) return q >= 0;
      var r = q / p;
      if (p < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
      return true;
    }

    if (
      clip(-dx, a.x + hx) &&
      clip( dx, hx - a.x) &&
      clip(-dy, a.y + hy) &&
      clip( dy, hy - a.y)
    ) {
      return t0 <= t1;
    }
    return false;
  }

  /**
   * Calculate distance and normal between a line segment and a rectangle
   * (in local coordinates where rectangle is axis-aligned at origin)
   */
  function segRectDistanceLocal(a, b, hx, hy) {
    if (segIntersectsAABB(a, b, hx, hy)) {
      var mid = a.clone().add(b).multiplyScalar(0.5);
      var ax = hx - Math.abs(mid.x);
      var ay = hy - Math.abs(mid.y);
      if (ax < ay) return { dist: 0, n: vec2(mid.x >= 0 ? 1 : -1, 0) };
      return { dist: 0, n: vec2(0, mid.y >= 0 ? 1 : -1) };
    }

    function pointRectDist(p) {
      var dx = Math.max(Math.abs(p.x) - hx, 0);
      var dy = Math.max(Math.abs(p.y) - hy, 0);
      return Math.sqrt(dx * dx + dy * dy);
    }

    var bestDist = 1e9;
    var bestN = vec2(0, 1);

    // Check distance from segment endpoints to rectangle
    var da = pointRectDist(a);
    if (da < bestDist) {
      var ca = pointRectClosest(a, hx, hy);
      var n = ca.clone().sub(a);
      if (n.lengthSq() > 1e-9) n.normalize();
      bestDist = da;
      bestN = n;
    }
    var db = pointRectDist(b);
    if (db < bestDist) {
      var cb = pointRectClosest(b, hx, hy);
      var n2 = cb.clone().sub(b);
      if (n2.lengthSq() > 1e-9) n2.normalize();
      bestDist = db;
      bestN = n2;
    }

    // Check distance from rectangle corners to segment
    var corners = [
      vec2(-hx, -hy),
      vec2(-hx,  hy),
      vec2( hx, -hy),
      vec2( hx,  hy)
    ];
    for (var i = 0; i < corners.length; i++) {
      var c = corners[i];
      var r = pointSegDistSq(c, a, b);
      var d = Math.sqrt(r.d2);
      if (d < bestDist) {
        var n3 = c.clone().sub(r.q);
        if (n3.lengthSq() > 1e-9) n3.normalize();
        bestDist = d;
        bestN = n3;
      }
    }

    return { dist: bestDist, n: bestN };
  }

  /**
   * OBB (Oriented Bounding Box) overlap test with MTV (Minimum Translation Vector)
   * Uses Separating Axis Theorem
   */
  function obbOverlapMTV(aCenter, aDir, aHx, aHy, bCenter, bDir, bHx, bHy) {
    var aAxes = axesFromDir(aDir);
    var bAxes = axesFromDir(bDir);

    var axes = [aAxes.right, aAxes.fwd, bAxes.right, bAxes.fwd];

    var bestOverlap = 1e9;
    var bestAxis = null;

    var d = bCenter.clone().sub(aCenter);

    for (var i = 0; i < axes.length; i++) {
      var axis = axes[i].clone();
      var len = axis.length();
      if (len < 1e-9) continue;
      axis.multiplyScalar(1 / len);

      var dist = Math.abs(d.dot(axis));

      var ra =
        Math.abs(axis.dot(aAxes.right)) * aHx +
        Math.abs(axis.dot(aAxes.fwd)) * aHy;

      var rb =
        Math.abs(axis.dot(bAxes.right)) * bHx +
        Math.abs(axis.dot(bAxes.fwd)) * bHy;

      var overlap = (ra + rb) - dist;
      if (overlap <= 0) return { hit: false };

      if (overlap < bestOverlap) {
        bestOverlap = overlap;
        bestAxis = axis;
        if (d.dot(axis) < 0) bestAxis = axis.clone().multiplyScalar(-1);
      }
    }

    return { hit: true, mtv: bestAxis.clone().multiplyScalar(bestOverlap) };
  }

  // ==========================================================================
  // PLAYER COLLISIONS
  // ==========================================================================
  
  /**
   * Handle collisions between players
   */
  function collideWithPlayers() {
    if (!playerCollisionEnabled || !me) return;

    var aCenter = vec2(me.data.x, me.data.y);
    var aDir = me.data.dir;
    var aHx = CAR_HALF_WIDTH;
    var aHy = CAR_HALF_LENGTH;

    var v = vec2(me.data.xv, me.data.yv);
    var collisionOccurred = false;

    for (var k in players) {
      if (!players.hasOwnProperty(k)) continue;
      if (k === meKey) continue;

      var p = players[k];
      if (!p || !p.data) continue;

      var bCenter = vec2(p.data.x || 0, p.data.y || 0);
      var bDir = p.data.dir || 0;
      var bHx = CAR_HALF_WIDTH;
      var bHy = CAR_HALF_LENGTH;

      var res = obbOverlapMTV(aCenter, aDir, aHx, aHy, bCenter, bDir, bHx, bHy);
      if (!res.hit) continue;

      collisionOccurred = true;
      aCenter.sub(res.mtv);

      var n = res.mtv.clone();
      if (n.lengthSq() > 1e-9) n.normalize();
      if (v.dot(n) < 0) v = reflect2(v, n).multiplyScalar(BOUNCE * 0.8);

      // Nudge the other player slightly
      p.data.x += n.x * 0.08;
      p.data.y += n.y * 0.08;
      p.data.xv = (p.data.xv || 0) + n.x * 0.06;
      p.data.yv = (p.data.yv || 0) + n.y * 0.06;
    }

    // Play collision sound if collision occurred with significant force
    if (collisionOccurred) {
      var impactSpeed = Math.abs(v.length() - me.data.xv); // Simplified impact force
      SoundManager.playCollisionSound(Math.min(1, impactSpeed * 5));
    }

    me.data.x = aCenter.x;
    me.data.y = aCenter.y;
    me.data.xv = v.x;
    me.data.yv = v.y;
  }

  // ==========================================================================
  // WALL COLLISIONS (IMPROVED)
  // ==========================================================================
  
  /**
   * Handle collisions between player and walls using rectangle hitbox
   */
  function collideMeWithWallsRect() {
    if (!me) return;

    var pWorld = vec2(me.data.x, me.data.y);
    var vWorld = vec2(me.data.xv, me.data.yv);
    var collisionCount = 0;

    var axes = axesFromDir(me.data.dir);

    // Multiple collision passes for better resolution
    for (var pass = 0; pass < 3; pass++) {
      var anyCollision = false;

      for (var i = 0; i < wallSegs.length; i++) {
        var w = wallSegs[i];

        var aL = worldToLocal(w.a, pWorld, axes);
        var bL = worldToLocal(w.b, pWorld, axes);

        var res = segRectDistanceLocal(aL, bL, CAR_HALF_WIDTH, CAR_HALF_LENGTH);

        if (res.dist < WALL_SIZE) {
          anyCollision = true;
          collisionCount++;

          var nL = res.n.clone();
          if (nL.lengthSq() < 1e-9) continue;
          nL.normalize();

          // Calculate push vector
          var push = (WALL_SIZE - res.dist) * 0.8 + 0.02;

          var pushWorld = localToWorld(nL.multiplyScalar(push), axes);
          pWorld.add(pushWorld);

          var nW = pushWorld.clone().normalize();

          // Reflect velocity with energy loss
          if (vWorld.dot(nW) < 0) {
            vWorld = reflect2(vWorld, nW).multiplyScalar(0.65);
          }

          // Small random component to prevent sticking
          vWorld.x += (Math.random() - 0.5) * 0.01;
          vWorld.y += (Math.random() - 0.5) * 0.01;
        }
      }

      if (!anyCollision) break;
    }

    // Play collision sound if we hit walls hard
    if (collisionCount > 0) {
      var impactSpeed = Math.abs(vWorld.length());
      if (impactSpeed > 0.05) {
        SoundManager.playCollisionSound(Math.min(1, impactSpeed * 3));
      }
    }

    me.data.x = pWorld.x;
    me.data.y = pWorld.y;
    me.data.xv = vWorld.x;
    me.data.yv = vWorld.y;
  }

  // ==========================================================================
  // CHECKPOINT HANDLING
  // ==========================================================================
  
  /**
   * Check checkpoint crossings and update lap count
   */
  function handleCheckpoints() {
    if (!cpSegs.length || !me) return;
    if (cpSegs.length < 2) return;

    var pos = vec2(me.data.x, me.data.y);

    for (var i = 0; i < cpSegs.length; i++) {
      var cp = cpSegs[i];

      var ab = cp.b.clone().sub(cp.a);
      var t = 0;
      if (cp.len2 > 1e-9) t = clamp(pos.clone().sub(cp.a).dot(ab) / cp.len2, 0, 1);
      var closest = cp.a.clone().add(ab.multiplyScalar(t));

      var dist = pos.distanceTo(closest);
      if (dist > 1.1) continue;

      if (i === 0) {
        // Start/finish line
        if (me.data.checkpoint === 1) {
          me.data.checkpoint = 0;
          me.data.lap++;
          
          // Record lap time (but not on first crossing)
          if (me.data.lap > 1 && me.data.lap <= LAPS + 1) {
            recordLapTime();
          }
          
          // Check if race is complete
          if (me.data.lap > LAPS) {
            stopRaceTimer();
          }
          
          // Play checkpoint sound
          SoundManager.playSound('collision', { pitch: 1.5 });
        }
      } else {
        me.data.checkpoint = 1;
      }
    }

    // Check for win condition
    if (me.data.lap > LAPS && countdownEl) {
      gameSortaStarted = true;
      countdownEl.style.display = "block";
      countdownEl.style.fontSize = "18vmin";
      countdownEl.innerHTML =
        (me.data.name || "Player").replace(/</g, "&lt;") + "<br>WINS!";

      me.data.xv = 0;
      me.data.yv = 0;
    }
  }

  // ==========================================================================
  // PHYSICS UPDATE (IMPROVED FOR SMOOTHER MOVEMENT)
  // ==========================================================================
  
  /**
   * Update player physics with improved smoothness
   */
  function updateMePhysics(warp, dtSec) {
    if (!me || !me.data || !me.model) return;

    // ===== Slipstream calculation =====
    var slip = computeSlipstreamForMe();
    slipTargetKey = slip.key;
    slipFactor = slip.factor;

    // ===== Steering (smooth steering) =====
    // Target steering based on input
    if (!mobile) {
      if (left) targetSteer = Math.PI / 5;
      else if (right) targetSteer = -Math.PI / 5;
      else targetSteer = 0;
    }

    // Smoothly interpolate steering
    currentSteer += (targetSteer - currentSteer) * STEER_SMOOTHING * warp;
    me.data.steer = currentSteer;

    // ===== Nitro system =====
    var usingNitro = (nitro && nitroArmed && !nitroLock && nitroFuel > 0.01);
    nitroActive = usingNitro;

    if (usingNitro) {
      nitroFuel -= NITRO_DRAIN * dtSec;
      if (nitroFuel <= 0) {
        nitroFuel = 0;
        nitroArmed = false;
        nitroLock = true;
        nitroActive = false;
        usingNitro = false;
      }
    } else {
      nitroFuel += NITRO_REGEN * dtSec;
    }
    nitroFuel = clamp(nitroFuel, 0, NITRO_MAX);

    // ===== Acceleration and friction =====
    var brake = down ? BRAKE_FORCE : 1.0;
    
    // Base acceleration (increased with nitro)
    var ACCEL = SPEED * (usingNitro ? NITRO_SPEED_MULT : 1.0);
    
    // Slipstream bonuses
    if (slipFactor > 0.001) {
      ACCEL *= (1.0 + SLIP_ACCEL_BONUS * slipFactor);
    }

    // Forward/backward acceleration
    if (up) {
      me.data.xv += Math.sin(me.data.dir) * ACCEL * warp;
      me.data.yv += Math.cos(me.data.dir) * ACCEL * warp;
    }
    if (down) {
      me.data.xv -= Math.sin(me.data.dir) * ACCEL * 1.5 * warp;
      me.data.yv -= Math.cos(me.data.dir) * ACCEL * 1.5 * warp;
    }

    // Apply friction and drag
    me.data.xv *= FRICTION * brake;
    me.data.yv *= FRICTION * brake;

    // ===== Improved tire grip model =====
    var forwardSpeed =
      me.data.xv * Math.sin(me.data.dir) +
      me.data.yv * Math.cos(me.data.dir);

    var drifting = (Math.abs(me.data.steer) > 0.12 && Math.abs(forwardSpeed) > 0.08);

    var fwd = vec2(Math.sin(me.data.dir), Math.cos(me.data.dir));
    var rightVec = vec2(fwd.y, -fwd.x);

    var vel = vec2(me.data.xv, me.data.yv);

    // Split velocity into forward and lateral components
    var forwardVel = fwd.clone().multiplyScalar(vel.dot(fwd));
    var sideVel = rightVec.clone().multiplyScalar(vel.dot(rightVec));

    // Apply grip - lateral friction is much higher (tires grip sideways)
    var gripFactor = drifting ? DRIFT_GRIP : GRIP_FACTOR;
    
    forwardVel.multiplyScalar(Math.pow(0.99, warp)); // Minimal forward friction
    sideVel.multiplyScalar(Math.pow(gripFactor, warp)); // Strong lateral grip

    // Steering induces lateral slip when drifting
    if (drifting) {
      sideVel.add(rightVec.clone().multiplyScalar(me.data.steer * Math.abs(forwardSpeed) * 0.4));
    }

    // Recombine velocity
    vel = forwardVel.add(sideVel);
    me.data.xv = vel.x;
    me.data.yv = vel.y;

    // ===== Steering affects direction =====
    var speedMag = Math.sqrt(me.data.xv * me.data.xv + me.data.yv * me.data.yv);
    var steerSign = forwardSpeed >= 0 ? 1 : -1;
    
    me.data.dir += steerSign * me.data.steer *
      (STEER_MIN + speedMag * STEER_SPEED) * warp;

    // ===== Speed limiting =====
    var topSpeed = usingNitro ? MAX_SPEED * 1.6 : MAX_SPEED;
    if (slipFactor > 0.001) {
      topSpeed *= (1.0 + SLIP_TOPSPEED_BONUS * slipFactor);
    }

    if (forwardSpeed > topSpeed) {
      var s1 = topSpeed / forwardSpeed;
      me.data.xv *= s1;
      me.data.yv *= s1;
    }

    if (forwardSpeed < -MAX_REVERSE) {
      var s2 = MAX_REVERSE / Math.abs(forwardSpeed);
      me.data.xv *= s2;
      me.data.yv *= s2;
    }

    // ===== Start timer when car first moves =====
    if (!raceTimer.running && !raceTimer.raceFinished && !gameSortaStarted) {
      // Check if car is actually moving (speed > threshold)
      var speed = Math.sqrt(me.data.xv * me.data.xv + me.data.yv * me.data.yv);
      if (speed > 0.01) {
        // Small delay to ensure countdown is really over
        setTimeout(function() {
          if (!raceTimer.running && !raceTimer.raceFinished) {
            startRaceTimer();
          }
        }, LAP_START_DELAY);
      }
    }

    // ===== Update engine sound based on speed =====
    var normalizedSpeed = Math.min(1, speedMag / MAX_SPEED);
    SoundManager.updateEngineSound(normalizedSpeed, normalizedSpeed * 2 + 0.5);

    // ===== Position update with sub-stepping for smoother collisions =====
    var steps = Math.ceil(Math.max(Math.abs(me.data.xv), Math.abs(me.data.yv)) * 6);
    steps = Math.max(3, Math.min(steps, 10)); // At least 3 steps, at most 10

    for (var s = 0; s < steps; s++) {
      me.data.x += (me.data.xv * warp) / steps;
      me.data.y += (me.data.yv * warp) / steps;

      collideMeWithWallsRect();
      collideWithPlayers();
    }

    handleCheckpoints();

    // ===== Out of bounds reset =====
    if (Math.sqrt(me.data.x * me.data.x + me.data.y * me.data.y) > OOB_DIST) {
      me.data.x = spawnX;
      me.data.y = spawnY;
      me.data.xv = 0;
      me.data.yv = 0;
      me.data.dir = spawnDir;

      nitroArmed = false;
      nitroLock = false;
      nitroActive = false;
      
      // Play out of bounds sound
      SoundManager.playCollisionSound(0.8);
    }

    // ===== Update model position and rotation =====
    me.model.position.x = me.data.x;
    me.model.position.z = me.data.y;
    me.model.rotation.y = me.data.dir;

    // Animate front wheels steering
    if (me.model.children[2]) me.model.children[2].rotation.z = Math.PI / 2 - me.data.steer * 0.8;
    if (me.model.children[3]) me.model.children[3].rotation.z = Math.PI / 2 - me.data.steer * 0.8;
  }

  // ==========================================================================
  // CAMERA UPDATE (SMOOTHER)
  // ==========================================================================
  
  /**
   * Update camera position with smooth following
   */
  function updateCamera(warp) {
    if (!me || !me.model) return;

    // Field of view effect for speed/nitro
    var targetFov = nitroActive ? BOOST_FOV : BASE_FOV;
    camera.fov = camera.fov * 0.9 + targetFov * 0.1;
    camera.updateProjectionMatrix();

    // Calculate target camera position (behind the car)
    var target = new THREE.Vector3(
      me.model.position.x + Math.sin(-me.model.rotation.y) * CAM_DISTANCE,
      CAM_HEIGHT,
      me.model.position.z + -Math.cos(-me.model.rotation.y) * CAM_DISTANCE
    );

    // Smooth camera movement with lag
    var lagPow = Math.pow(CAMERA_LAG, warp);
    camera.position.set(
      camera.position.x * lagPow + target.x * (1 - lagPow),
      CAM_HEIGHT,
      camera.position.z * lagPow + target.z * (1 - lagPow)
    );

    camera.lookAt(me.model.position);
  }

  // ==========================================================================
  // REMOTE PLAYER INTERPOLATION
  // ==========================================================================
  
  /**
   * Smoothly interpolate remote player positions
   */
  function updateRemoteVisuals(warp) {
    for (var k in players) {
      if (!players.hasOwnProperty(k)) continue;
      var p = players[k];
      if (!p || p.isMe || !p.model || !p.data) continue;

      var tx = p.data.x || 0;
      var ty = p.data.y || 0;
      var tdir = p.data.dir || 0;

      // Smooth position interpolation
      p.model.position.x += (tx - p.model.position.x) * clamp(0.2 * warp, 0, 1);
      p.model.position.z += (ty - p.model.position.z) * clamp(0.2 * warp, 0, 1);

      // Smooth rotation interpolation
      var cur = p.model.rotation.y;
      var diff = ((tdir - cur + Math.PI) % (2 * Math.PI)) - Math.PI;
      p.model.rotation.y = cur + diff * clamp(0.25 * warp, 0, 1);
    }
  }

  // ==========================================================================
  // UI UPDATES
  // ==========================================================================
  
  /**
   * Update player name labels on screen
   */
  function updateLabels() {
    if (!camera) return;
    for (var k in players) {
      if (!players.hasOwnProperty(k)) continue;
      var p = players[k];
      if (!p || !p.model || !p.label) continue;

      var s = projectToScreen(p.model.position);
      if (s.visible) {
        p.label.style.display = "block";
        p.label.style.left = s.x + "px";
        p.label.style.top = s.y + "px";
      } else {
        p.label.style.display = "none";
      }
    }
  }

  /**
   * Update HUD (lap counter, speed, room code, and TIME)
   */
  function updateHud() {
    if (!lapEl || !me || !me.data) return;
    
    var spd = Math.sqrt(me.data.xv * me.data.xv + me.data.yv * me.data.yv);
    var roomText = ROOM ? (" | " + ROOM) : "";
    
    // Format speed with 2 decimal places for better readability
    var speedFormatted = (spd * 100).toFixed(1);
    
    // Format current race time
    var timeDisplay = "";
    if (raceTimer.running) {
      raceTimer.currentTime = performance.now() - raceTimer.startTime;
      timeDisplay = formatTime(raceTimer.currentTime) + " | ";
    } else if (raceTimer.raceFinished) {
      timeDisplay = formatTime(raceTimer.finalTime) + " (FIN) | ";
    }
    
    // Format best lap if available
    var bestLapDisplay = raceTimer.bestLapTime < Infinity ? 
                        " BEST: " + formatLapTime(raceTimer.bestLapTime) : "";
    
    lapEl.style.fontSize = "20px"; // Slightly smaller to accommodate time
    lapEl.style.lineHeight = "24px";
    lapEl.innerHTML = timeDisplay + 
                      "Lap " + (me.data.lap <= LAPS ? (me.data.lap + "/" + LAPS) : "FINISHED") + 
                      " | " + speedFormatted + " km/h" + 
                      bestLapDisplay +
                      roomText;
  }

  /**
   * Send player data to Firebase (for multiplayer)
   */
  function maybeSendToFirebase(ts) {
    if (!me || !me.ref) return;
    if (ts - me.lastSend < 60) return;
    me.lastSend = ts;

    me.data.lastSeen = Date.now();
    me.ref.set(me.data);
  }

  // ==========================================================================
  // NITRO UI
  // ==========================================================================
  
  /**
   * Update nitro bar UI
   */
  function updateNitroUI() {
    var barEl = document.getElementById("nitrobar");
    var fillEl = document.getElementById("nitrofill");
    var lblEl = document.getElementById("nitrolabel");
    if (!barEl || !fillEl || !lblEl) return;

    // Only visible while in game
    if (gameStarted) {
      barEl.style.display = "block";
      lblEl.style.display = "block";
    } else {
      barEl.style.display = "none";
      lblEl.style.display = "none";
    }

    if (nitroActive) barEl.classList.add("active");
    else barEl.classList.remove("active");

    fillEl.style.width = ((nitroFuel / NITRO_MAX) * 100) + "%";
  }

  // ==========================================================================
  // MAIN RENDER LOOP
  // ==========================================================================
  
  var lastTime = 0;

  /**
   * Main game loop
   */
  function renderLoop(ts) {
    requestAnimationFrame(renderLoop);
    if (!lastTime) lastTime = ts;

    var timepassed = ts - lastTime;
    lastTime = ts;

    // Cap timepassed to avoid large jumps
    timepassed = Math.min(timepassed, 50);
    var warp = timepassed / 16; // Normalized to 60fps
    var dtSec = timepassed / 1000;

    if (gameStarted && me) {
      if (!gameSortaStarted) {
        updateMePhysics(warp, dtSec);
      }
      updateRemoteVisuals(warp);
      updateSlipstreamVisuals(ts);
      updateCamera(warp);
      updateHud();
      updateNitroUI();
      maybeSendToFirebase(ts);
    } else {
      // Menu camera animation
      var a = ts * 0.0004;
      camera.position.set(50 * Math.sin(a), 20, 50 * Math.cos(a));
      camera.lookAt(new THREE.Vector3(0, 0, 0));

      slipTargetKey = null;
      slipFactor = 0;
      updateSlipstreamVisuals(ts);
      updateNitroUI();
    }

    updateLabels();
    renderer.render(scene, camera);
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================
  
  /**
   * Initialize the game
   */
  function init() {
    ensureEngine();

    if (foreEl) foreEl.style.pointerEvents = "auto";
    if (foreEl && foreEl.style.display === "none") foreEl.style.display = "";

    setupToolbarOnce();
    setupInputOnce();
    setupColorPickerOnce();

    // Initialize sound system on first user interaction
    document.addEventListener('click', function initSound() {
      if (!SoundManager.initialized) {
        SoundManager.init();
      }
      document.removeEventListener('click', initSound);
    }, { once: true });

    buildMapFromTrackCode(getTrackCode());

    if (startEl) startEl.onclick = showModeMenu;

    animateMenuIn();
    requestAnimationFrame(renderLoop);
  }

  // Start when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // ==========================================================================
  // EXPOSE FUNCTIONS TO WINDOW (for HTML onclick handlers)
  // ==========================================================================
  
  window.menu2 = showModeMenu;
  window.host = hostFlow;
  window.joinGame = joinFlow;
  window.codeCheck = function () {};
  window.updateColor = function (x01) { setSliderFrom01(x01); };
  window.toggleSound = function() { SoundManager.toggleMute(); };

  // Clean up Firebase presence on page unload
  window.addEventListener("beforeunload", function () {
    try {
      if (me && me.ref) me.ref.remove();
    } catch (e) {}
  });
})();