'use client';

import { motion } from 'framer-motion';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';

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

// Datos estáticos para los copos (evita re-renders)
const SNOWFLAKES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  x: (i * 37 + 11) % 100,           // % horizontal fijo
  size: 10 + (i * 7) % 14,           // entre 10 y 24 px
  opacity: 0.04 + (i * 0.013) % 0.1, // entre 0.04 y 0.14
  duration: 12 + (i * 3.7) % 18,     // entre 12 y 30 s
  delay: -(i * 2.3) % 20,            // offset para que no arranquen juntos
  drift: ((i % 5) - 2) * 30,         // deriva horizontal suave
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
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<string | null>(null);

  const handleLogin = () => {
    router.push('/');
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-6 overflow-y-auto"
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
        <motion.div variants={itemVariants} className="mb-10 text-center">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-6"
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="1.5">
              <path d="M20 12V22H4V12" />
              <path d="M22 7H2v5h20V7z" />
              <path d="M12 22V7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </div>
          <h1
            className="text-2xl font-semibold tracking-tight mb-1"
            style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}
          >
            Intercambio de regalos
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Ingresa para ver a quién le tocas
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          variants={itemVariants}
          className="rounded-2xl p-8"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {/* Email */}
          <div className="mb-5">
            <label
              className="block text-xs font-medium mb-2 uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Correo electrónico
            </label>
            <motion.input
              type="email"
              placeholder="nombre@empresa.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setFocused('email')}
              onBlur={() => setFocused(null)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: focused === 'email' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                border: focused === 'email' ? '1px solid rgba(45,106,79,0.8)' : '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
              }}
            />
          </div>

          {/* Password */}
          <div className="mb-8">
            <label
              className="block text-xs font-medium mb-2 uppercase tracking-wider"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Contraseña
            </label>
            <motion.input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setFocused('password')}
              onBlur={() => setFocused(null)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all duration-200"
              style={{
                background: focused === 'password' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
                border: focused === 'password' ? '1px solid rgba(45,106,79,0.8)' : '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.85)',
              }}
            />
          </div>

          {/* Button */}
          <motion.button
            onClick={handleLogin}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
              color: 'rgba(255,255,255,0.92)',
              border: '1px solid rgba(45,106,79,0.4)',
            }}
            whileHover={{ scale: 1.02, filter: 'brightness(1.1)' }}
            whileTap={{ scale: 0.98 }}
          >
            Ingresar
          </motion.button>
        </motion.div>

        {/* Footer */}
        {/* Removed footer legend */}
      </motion.div>
    </div>
  );
}