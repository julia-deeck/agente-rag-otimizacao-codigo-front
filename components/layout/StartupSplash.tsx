"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export default function StartupSplash() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const hideTimer = window.setTimeout(() => setIsVisible(false), 3200);
    return () => window.clearTimeout(hideTimer);
  }, []);

  if (!isVisible) return null;

  return (
    <div className="startup-splash" role="status" aria-label="Iniciando QuantumOne">
      <div className="startup-emerging-aura" aria-hidden="true" />

      <div className="startup-content">
        <div className="startup-mark-shell">
          <div className="startup-mark-halo" aria-hidden="true" />
          <Image
            src="/images/quantumone-icon.png"
            alt=""
            width={104}
            height={104}
            priority
            className="startup-mark"
          />
        </div>
      </div>
    </div>
  );
}
