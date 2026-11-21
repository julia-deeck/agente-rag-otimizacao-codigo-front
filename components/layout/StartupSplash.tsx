"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";

export default function StartupSplash() {
  const [isVisible, setIsVisible] = useState(true);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const exitTimerRef = useRef<number | null>(null);

  const finishSplash = useCallback(() => {
    if (exitTimerRef.current !== null) return;
    setIsExiting(true);
    exitTimerRef.current = window.setTimeout(() => setIsVisible(false), 360);
  }, []);

  useEffect(() => {
    const fallbackTimer = window.setTimeout(finishSplash, 7000);
    return () => {
      window.clearTimeout(fallbackTimer);
      if (exitTimerRef.current !== null) window.clearTimeout(exitTimerRef.current);
    };
  }, [finishSplash]);

  useEffect(() => {
    if (!reduceMotion && !videoFailed) return;
    const fallbackTimer = window.setTimeout(finishSplash, 2200);
    return () => window.clearTimeout(fallbackTimer);
  }, [reduceMotion, videoFailed, finishSplash]);

  useEffect(() => {
    if (!isVisible) return;
    const video = videoRef.current;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const attemptPlaybackWithAudio = () => {
      if (!video || motionPreference.matches || video.ended) return;
      video.muted = false;
      const playback = video.play();
      void playback?.catch(() => {
        video.muted = true;
        if (video.paused) void video.play().catch(() => undefined);
      });
    };
    const syncMotionPreference = () => {
      setReduceMotion(motionPreference.matches);
      if (motionPreference.matches) video?.pause();
      else attemptPlaybackWithAudio();
    };

    syncMotionPreference();
    motionPreference.addEventListener("change", syncMotionPreference);
    window.addEventListener("pointerdown", attemptPlaybackWithAudio, { once: true, passive: true });
    window.addEventListener("keydown", attemptPlaybackWithAudio, { once: true });
    return () => {
      motionPreference.removeEventListener("change", syncMotionPreference);
      window.removeEventListener("pointerdown", attemptPlaybackWithAudio);
      window.removeEventListener("keydown", attemptPlaybackWithAudio);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <div className={`startup-splash${isExiting ? " is-exiting" : ""}`} role="status" aria-live="polite" aria-busy="true" aria-label="Iniciando QuantumOne">
      <div className="startup-emerging-aura" aria-hidden="true" />

      <div className="startup-content">
        <div className="startup-mark-shell">
          <div className="startup-mark-halo" aria-hidden="true" />
          {(reduceMotion || videoFailed) && (
            <Image
              src="/images/quantumone-logo-intro.jpg"
              alt=""
              width={500}
              height={500}
              priority
              className="startup-mark"
            />
          )}
          <video
            ref={videoRef}
            className={`startup-video${reduceMotion || videoFailed ? " is-hidden" : ""}`}
            autoPlay={!reduceMotion && !videoFailed}
            muted
            playsInline
            preload="auto"
            poster="/images/quantumone-logo-intro.jpg"
            aria-hidden="true"
            onEnded={finishSplash}
            onError={() => setVideoFailed(true)}
          >
            <source src="/videos/quantumone-splash.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </div>
  );
}
