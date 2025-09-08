// Lightweight, dependency-free confetti fallback (no canvas-confetti)
export function burstConfetti() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  // Inject keyframes once
  const id = 'scribsy-confetti-keyframes';
  if (!document.getElementById(id)) {
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @keyframes scribsy-fall { to { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
    `;
    document.head.appendChild(style);
  }

  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '0';
  container.style.top = '0';
  container.style.width = '100%';
  container.style.height = '0';
  container.style.pointerEvents = 'none';
  container.style.zIndex = '9999';
  document.body.appendChild(container);

  const colors = ['#10b981', '#34d399', '#06b6d4', '#f59e0b', '#ef4444', '#6366f1'];
  const count = 60;
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    const size = 6 + Math.random() * 6;
    piece.style.position = 'absolute';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.top = '0';
    piece.style.width = `${size}px`;
    piece.style.height = `${size}px`;
    piece.style.borderRadius = '2px';
    piece.style.background = colors[i % colors.length];
    piece.style.opacity = '0.9';
    piece.style.transform = `translateY(-10px) rotate(${Math.random() * 360}deg)`;
    piece.style.animation = `scribsy-fall ${0.9 + Math.random() * 0.8}s ease-out forwards`;
    piece.style.animationDelay = `${Math.random() * 0.1}s`;
    container.appendChild(piece);
  }

  setTimeout(() => {
    if (container.parentNode) container.parentNode.removeChild(container);
  }, 2000);
}
