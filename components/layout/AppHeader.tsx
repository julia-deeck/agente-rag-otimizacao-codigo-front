import Image from "next/image";

export default function AppHeader() {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <div className="brand">
          <Image
            src="/images/quantumone-logo.png"
            alt="QuantumOne"
            width={240}
            height={90}
            priority
            className="brand-logo"
          />
        </div>

      </div>
    </header>
  );
}
