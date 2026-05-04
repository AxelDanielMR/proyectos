'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import HamburgerMenu from './components/HamburgerMenu';

// SVG snowflake path — geométrico y limpio
const SnowflakeSVG = ({ size, opacity }: { size: number; opacity: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke={`rgba(255,255,255,${opacity})`}
    strokeWidth="1"
    strokeLinecap="round"
  >
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
    <line x1="19.07" y1="4.93" x2="4.93" y2="19.07" />
    <line x1="12" y1="6" x2="9" y2="3" />
    <line x1="12" y1="6" x2="15" y2="3" />
    <line x1="12" y1="18" x2="9" y2="21" />
    <line x1="12" y1="18" x2="15" y2="21" />
    <line x1="6" y1="12" x2="3" y2="9" />
    <line x1="6" y1="12" x2="3" y2="15" />
    <line x1="18" y1="12" x2="21" y2="9" />
    <line x1="18" y1="12" x2="21" y2="15" />
  </svg>
);

// Icon components
const TreeIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round">
    <path d="M12 2l4 6h-8l4-6z" />
    <path d="M12 6l5 8h-10l5-8z" />
    <path d="M12 12l6 10h-12l6-10z" />
    <line x1="12" y1="22" x2="12" y2="24" />
  </svg>
);

const TargetIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const DiceIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8" cy="8" r="1" />
    <circle cx="16" cy="16" r="1" />
    <circle cx="12" cy="8" r="1" />
    <circle cx="8" cy="16" r="1" />
    <circle cx="12" cy="12" r="1" />
    <circle cx="16" cy="8" r="1" />
  </svg>
);

const PeopleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round">
    <circle cx="8" cy="7" r="2.5" />
    <path d="M5 12c0-2 1.5-3 3-3s3 1 3 3c0 2-1.5 3-3 3s-3-1-3-3z" />
    <circle cx="16" cy="7" r="2.5" />
    <path d="M13 12c0-2 1.5-3 3-3s3 1 3 3c0 2-1.5 3-3 3s-3-1-3-3z" />
    <path d="M6 20c0-2 2-4 6-4s6 2 6 4" />
  </svg>
);

const GiftIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.92)" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="8" width="18" height="12" rx="1" />
    <path d="M12 8V4" />
    <rect x="9" y="2" width="6" height="4" rx="1" />
    <line x1="12" y1="8" x2="12" y2="20" />
    <line x1="3" y1="11" x2="21" y2="11" />
  </svg>
);

// Datos estáticos para los copos
const SNOWFLAKES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,
  size: 10 + (i * 7) % 14,
  opacity: 0.04 + (i * 0.013) % 0.1,
  duration: 12 + (i * 3.7) % 18,
  delay: -(i * 2.3) % 20,
  drift: ((i % 5) - 2) * 30,
}));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

export default function Home() {
  return (
    <>
      <HamburgerMenu />
      <div
        className="fixed inset-0 flex flex-col items-center justify-center p-6 overflow-y-auto"
        style={{
          background: 'linear-gradient(135deg, #0f1923 0%, #1a2a1a 50%, #0f1923 100%)',
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        {/* Subtle background pattern */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: '32px 32px',
          }}
        />

        {/* Snowflakes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {SNOWFLAKES.map((flake) => (
            <motion.div
              key={flake.id}
              className="absolute"
              style={{ left: `${flake.x}%`, top: '-40px' }}
              animate={{
                y: ['0vh', '110vh'],
                x: [0, flake.drift, 0],
                rotate: [0, 360],
              }}
              transition={{
                duration: flake.duration,
                delay: flake.delay,
                repeat: Infinity,
                ease: 'linear',
                x: { duration: flake.duration, ease: 'easeInOut', repeat: Infinity },
                rotate: { duration: flake.duration * 0.8, ease: 'linear', repeat: Infinity },
              }}
            >
              <SnowflakeSVG size={flake.size} opacity={flake.opacity} />
            </motion.div>
          ))}
        </div>

        {/* Ambient glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-10 blur-3xl pointer-events-none"
          style={{ background: 'radial-gradient(circle, #2d6a4f, transparent)' }}
        />

        <motion.div
          className="relative w-full max-w-sm py-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Header */}
          <motion.div variants={itemVariants} className="mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-6" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <TreeIcon />
            </div>
            <h1
              className="text-4xl font-bold mb-2 tracking-tight"
              style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}
            >
              Intercambio Navideño
            </h1>
          </motion.div>
        </motion.div>

        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          <Link href="/reglas">
            <motion.button
              className="w-64 py-3 px-4 rounded-xl text-lg font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
                color: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(45,106,79,0.4)',
              }}
              whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.98 }}
            >
              Reglas
            </motion.button>
          </Link>

          <Link href="/mi-amigo-secreto">
            <motion.button
              className="w-64 py-3 px-4 rounded-xl text-lg font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
                color: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(45,106,79,0.4)',
              }}
              whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.98 }}
            >
              Mi amigo secreto
            </motion.button>
          </Link>

          <Link href="/categorias">
            <motion.button
              className="w-64 py-3 px-4 rounded-xl text-lg font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
                color: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(45,106,79,0.4)',
              }}
              whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.98 }}
            >
              Categorías
            </motion.button>
          </Link>

          <Link href="/perfil">
            <motion.button
              className="w-64 py-3 px-4 rounded-xl text-lg font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
                color: 'rgba(255,255,255,0.92)',
                border: '1px solid rgba(45,106,79,0.4)',
              }}
              whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
              whileTap={{ scale: 0.98 }}
            >
              Perfil
            </motion.button>
          </Link>
        </motion.div>
      </div>
    </>
  );
}
