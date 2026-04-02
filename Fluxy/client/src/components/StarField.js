import { useEffect, useRef } from 'react';

export default function StarField() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animId;
    let W, H;

    const stars = [];
    const STAR_COUNT = 120;

    function resize() {
      W = canvas.width = window.innerWidth;
      H = canvas.height = window.innerHeight;
    }

    function initStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.5 + 0.3,
          speed: Math.random() * 0.3 + 0.08,
          opacity: Math.random() * 0.6 + 0.2,
          twinkle: Math.random() * Math.PI * 2,
          twinkleSpeed: Math.random() * 0.02 + 0.005,
        });
      }
    }

    function getStarColor() {
      const theme = document.documentElement.getAttribute('data-theme') || 'glassy';
      const colors = {
        glassy: 'rgba(180,160,255,',
        moonlight: 'rgba(160,196,255,',
        haze: 'rgba(190,120,255,',
        steel: 'rgba(80,160,220,',
        blossom: 'rgba(255,100,160,',
        obsidian: 'rgba(200,160,80,',
        neongrid: 'rgba(0,255,180,',
        aurora: 'rgba(80,200,160,',
        carbon: 'rgba(255,60,30,',
        solar: 'rgba(255,180,30,',
      };
      return colors[theme] || colors.glassy;
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      const baseColor = getStarColor();
      stars.forEach(s => {
        s.y += s.speed;
        s.twinkle += s.twinkleSpeed;
        if (s.y > H + 4) { s.y = -4; s.x = Math.random() * W; }
        const op = s.opacity * (0.7 + 0.3 * Math.sin(s.twinkle));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = baseColor + op + ')';
        ctx.fill();
      });
      animId = requestAnimationFrame(draw);
    }

    resize();
    initStars();
    draw();

    const onResize = () => { resize(); initStars(); };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="stars-canvas" />;
}
