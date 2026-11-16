"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, X } from "lucide-react";

const messages = [
  "Boa! Você deu mais um passo para suas metas.",
  "Seu futuro agradece por essa economia.",
  "Guardar um pouco também é progresso.",
  "Mais uma conquista para o seu planejamento!"
];

export function celebrateSaving(amount: number) {
  const index = Math.floor(Math.abs(amount * 100)) % messages.length;
  return messages[index];
}

export function celebrateMilestone(before: number, after: number, title: string) {
  const milestones = [100, 75, 50, 25];
  const reached = milestones.find(level => before < level && after >= level);
  return reached ? `${reached}% da meta “${title}” alcançados!` : null;
}

const pieces = Array.from({ length: 22 }, (_, index) => ({
  left: `${(index * 37 + 11) % 100}%`,
  delay: `${(index % 7) * 0.065}s`,
  duration: `${1.4 + (index % 5) * 0.13}s`,
  rotate: `${(index * 71) % 360}deg`
}));

export function SavingsCelebration({ celebration, onClose }: {
  celebration: { id: number; message: string } | null;
  onClose: () => void;
}) {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!celebration) return;
    const timeout = window.setTimeout(onClose, 3600);
    return () => window.clearTimeout(timeout);
  }, [celebration, onClose]);
  if (!celebration) return null;
  return <div className="savings-celebration" role="status" aria-live="polite" key={celebration.id}>
    {!reduceMotion && <div className="savings-confetti" aria-hidden="true">{pieces.map((piece, index) =>
      <span key={index} style={{
        left: piece.left, animationDelay: piece.delay, animationDuration: piece.duration,
        transform: `rotate(${piece.rotate})`, backgroundColor: ["var(--primary)", "#f0b94b", "#45bfa2", "#e58abb"][index % 4]
      }} />
    )}</div>}
    <div className="savings-celebration-message"><CheckCircle2 size={20} /><span>{celebration.message}</span><button type="button" aria-label="Fechar comemoração" onClick={onClose}><X size={16} /></button></div>
  </div>;
}
