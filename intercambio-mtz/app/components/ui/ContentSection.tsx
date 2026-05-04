'use client';

import { motion, AnimatePresence } from 'framer-motion';
import React from 'react';

interface ContentSectionProps {
  sectionId: string | null;
  onClose: () => void;
}

// ─── Shared modal wrapper ────────────────────────────────────────────────────

interface ModalProps {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
}

function Modal({ title, subtitle, icon, onClose, children }: ModalProps) {
  return (
    <div
      className="w-full max-w-lg rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(180deg, #141e14 0%, #0f1923 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      {/* Modal header */}
      <div
        className="flex items-start justify-between px-7 py-6"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-4">
          <div
            className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-xl"
            style={{
              background: 'rgba(45,106,79,0.15)',
              border: '1px solid rgba(45,106,79,0.25)',
              color: 'rgba(45,106,79,0.9)',
            }}
          >
            {icon}
          </div>
          <div>
            <h2
              className="text-base font-semibold"
              style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.01em' }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg transition-colors ml-4"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.45)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)';
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Modal body */}
      <div className="px-7 py-6 overflow-y-auto" style={{ maxHeight: '70vh' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Section icons ───────────────────────────────────────────────────────────

const RulesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    <line x1="9" y1="7" x2="15" y2="7" />
    <line x1="9" y1="11" x2="15" y2="11" />
    <line x1="9" y1="15" x2="13" y2="15" />
  </svg>
);

const SecretFriendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
    <path d="M16 11h6M19 8v6" />
  </svg>
);

const CategoriesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
  </svg>
);

// ─── Section content components ──────────────────────────────────────────────

const RULES = [
  {
    number: '01',
    title: 'Inscripción',
    body: 'Todos los participantes deben registrarse antes de la fecha límite indicada por el organizador.',
  },
  {
    number: '02',
    title: 'Presupuesto',
    body: 'El monto máximo de regalo debe respetarse según lo establecido para el grupo.',
  },
  {
    number: '03',
    title: 'Confidencialidad',
    body: 'No reveles a quién le tocó hacer un regalo hasta el día del intercambio.',
  },
  {
    number: '04',
    title: 'Participación',
    body: 'Todos deben asistir o designar a alguien que reciba su regalo en su nombre.',
  },
];

function RulesContent() {
  return (
    <div className="space-y-1">
      {RULES.map((rule, i) => (
        <motion.div
          key={rule.number}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07, duration: 0.3 }}
          className="flex gap-4 py-4"
          style={{
            borderBottom: i < RULES.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
          }}
        >
          <span
            className="flex-shrink-0 text-xs font-mono pt-0.5"
            style={{ color: 'rgba(45,106,79,0.7)', letterSpacing: '0.04em' }}
          >
            {rule.number}
          </span>
          <div>
            <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>
              {rule.title}
            </p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {rule.body}
            </p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const STEPS = [
  'Inicia sesión en tu cuenta',
  'Ve a "Amigo secreto" en el menú',
  'Selecciona el evento de intercambio',
  'Descubre a quién le tocaste',
];

function SecretFriendContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Una vez que el organizador complete el sorteo, podrás ver a quién le tocó hacerle un regalo.
      </p>

      {/* Steps */}
      <div className="space-y-2">
        {STEPS.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex items-center gap-3"
          >
            <div
              className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium"
              style={{
                background: 'rgba(45,106,79,0.15)',
                color: 'rgba(45,106,79,0.85)',
                border: '1px solid rgba(45,106,79,0.2)',
              }}
            >
              {i + 1}
            </div>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.65)' }}>
              {step}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Tip */}
      <div
        className="flex gap-3 p-4 rounded-xl"
        style={{
          background: 'rgba(45,106,79,0.08)',
          border: '1px solid rgba(45,106,79,0.2)',
        }}
      >
        <div
          className="flex-shrink-0 mt-0.5"
          style={{ color: 'rgba(45,106,79,0.8)' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>
          Prepara el regalo con anticipación para que sea más especial. Considera las preferencias de la persona.
        </p>
      </div>
    </div>
  );
}

const CATEGORIES = [
  { label: 'Electrónica', note: 'Accesorios, gadgets' },
  { label: 'Libros', note: 'Novela, no-ficción' },
  { label: 'Ropa', note: 'Prendas, calzado' },
  { label: 'Accesorios', note: 'Bolsos, joyería' },
  { label: 'Hogar', note: 'Decoración, cocina' },
  { label: 'Otros', note: 'Experiencias, más' },
];

function CategoriesContent() {
  return (
    <div className="space-y-5">
      <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Los regalos se organizan por categorías para hacer el intercambio más equitativo. El organizador puede añadir categorías personalizadas.
      </p>

      {/* Grid de categorías */}
      <div className="grid grid-cols-2 gap-2">
        {CATEGORIES.map((cat, i) => (
          <motion.div
            key={cat.label}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.06 }}
            className="flex items-start gap-3 p-3 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div
              className="flex-shrink-0 w-1.5 h-1.5 rounded-full mt-1.5"
              style={{ background: 'rgba(45,106,79,0.7)' }}
            />
            <div>
              <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {cat.label}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                {cat.note}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Section config ───────────────────────────────────────────────────────────

const SECTION_CONFIG: Record<
  string,
  { title: string; subtitle: string; icon: React.ReactNode; content: React.ReactNode }
> = {
  rules: {
    title: 'Reglas',
    subtitle: 'Lineamientos del intercambio',
    icon: <RulesIcon />,
    content: <RulesContent />,
  },
  'secret-friend': {
    title: 'Amigo secreto',
    subtitle: 'Cómo ver a tu asignado',
    icon: <SecretFriendIcon />,
    content: <SecretFriendContent />,
  },
  categories: {
    title: 'Categorías',
    subtitle: 'Tipos de regalo sugeridos',
    icon: <CategoriesIcon />,
    content: <CategoriesContent />,
  },
};

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ContentSection({ sectionId, onClose }: ContentSectionProps) {
  const config = sectionId ? SECTION_CONFIG[sectionId] : null;

  return (
    <AnimatePresence>
      {sectionId && config && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-6 overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.97 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Modal
              title={config.title}
              subtitle={config.subtitle}
              icon={config.icon}
              onClose={onClose}
            >
              {config.content}
            </Modal>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}