import { useRef, useEffect } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import './App.css';

function App() {
  const { isPlaying, isCrazy, error, start, stop, toggleCrazy, analyser } = useAudioEngine();
  const titleRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | undefined>(undefined);

  // Drive the UI with the audio volume
  useEffect(() => {
    // Respect reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (!isPlaying || !analyser || !titleRef.current) {
      if (titleRef.current) {
        titleRef.current.style.transform = 'scale(1)';
        titleRef.current.style.textShadow = 'none';
      }
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const title = titleRef.current;

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);

      // Calculate average volume (0-255)
      let sum = 0;
      for (let i = 0; i < bufferLength; i++) {
        sum += dataArray[i];
      }
      const average = sum / bufferLength;
      const vol = average / 256; // 0.0 to 1.0

      // Apply to Title
      if (!prefersReducedMotion) {
        // Scale: 1.0 to 1.5
        const scale = 1 + (vol * 0.5);
        title.style.transform = `scale(${scale})`;

        // Color/Glow: Red based on volume
        if (average > 10) {
          title.style.textShadow = `0 0 ${average * 0.5}px rgba(255, 0, 0, ${vol * 0.8})`;
        } else {
          title.style.textShadow = 'none';
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, analyser]);

  const handleToggle = () => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div
      className={`container ${isPlaying ? 'active' : ''}`}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-pressed={isPlaying}
      aria-label={isPlaying ? "Stop Silencing" : "Start Silencing"}
    >
      <div className="content">
        <div className="emoji-container">
          {/* Minimal Status Dot instead of giant emoji */}
          <div className={`status-dot ${isPlaying ? 'pulse' : ''}`} aria-hidden="true"></div>
        </div>

        <h1 className="text" ref={titleRef}>STFU</h1>

        <div className="hint">
          {error ? (
            <span className="error">{error}</span>
          ) : (
            isPlaying ? 'TAP TO STOP' : 'TAP TO SILENCE'
          )}
        </div>

      </div>

      {isPlaying && (
        <div className="controls" onClick={(e) => e.stopPropagation()}>
          <button
            className={`crazy-btn ${isCrazy ? 'active' : ''}`}
            onClick={toggleCrazy}
            aria-pressed={isCrazy}
          >
            {isCrazy ? '😈 DEMON MODE' : '🤖 ACTIVATE CRAZY'}
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
