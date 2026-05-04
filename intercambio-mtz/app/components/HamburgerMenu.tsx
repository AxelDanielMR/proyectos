'use client';

import { motion, AnimatePresence, type PanInfo } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type Section = {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
};

const ICON_PROPS = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const MENU_SECTIONS: Section[] = [
  {
    id: 'rules',
    label: 'Reglas',
    description: 'Lineamientos del intercambio',
    href: '/reglas',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        <line x1="9" y1="7" x2="15" y2="7" />
        <line x1="9" y1="11" x2="15" y2="11" />
        <line x1="9" y1="15" x2="13" y2="15" />
      </svg>
    ),
  },
  {
    id: 'secret-friend',
    label: 'Mi amigo secreto',
    description: 'Ver a quién le tocaste',
    href: '/mi-amigo-secreto',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 11h6M19 8v6" />
      </svg>
    ),
  },
  {
    id: 'categories',
    label: 'Categorías',
    description: 'Ideas para el regalo',
    href: '/categorias',
    icon: (
      <svg {...ICON_PROPS}>
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: 'profile',
    label: 'Mi perfil',
    description: 'Datos de tu cuenta',
    href: '/perfil',
    icon: (
      <svg {...ICON_PROPS}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const ACCENT = '#2d6a4f';
const DRAWER_BG = '#0d1a0e';

export default function HamburgerMenu() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > 80 || info.velocity.x > 500) close();
  };

  return (
    <>
      {/* Trigger */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed z-50 flex items-center justify-center rounded-full"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 16px)',
          right: 'calc(env(safe-area-inset-right, 0px) + 16px)',
          width: 44,
          height: 44,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          touchAction: 'manipulation',
        }}
        whileTap={{ scale: 0.92 }}
        aria-label="Abrir menú"
        aria-expanded={isOpen}
      >
        <div className="flex flex-col justify-between" style={{ width: 18, height: 12 }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                display: 'block',
                height: 1.5,
                background: 'rgba(255,255,255,0.85)',
                borderRadius: 2,
              }}
            />
          ))}
        </div>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40"
              style={{
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)',
              }}
              onClick={close}
              aria-hidden
            />

            {/* Drawer */}
            <motion.nav
              key="drawer"
              role="dialog"
              aria-modal="true"
              aria-label="Menú principal"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 320 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.6 }}
              onDragEnd={handleDragEnd}
              className="fixed top-0 right-0 bottom-0 z-50 flex flex-col"
              style={{
                width: '85vw',
                maxWidth: 360,
                background: DRAWER_BG,
                borderLeft: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 'env(safe-area-inset-top, 0px)',
                paddingBottom: 'env(safe-area-inset-bottom, 0px)',
                paddingRight: 'env(safe-area-inset-right, 0px)',
                boxShadow: '-20px 0 60px -20px rgba(0,0,0,0.6)',
                touchAction: 'pan-y',
              }}
            >
              {/* Drag handle */}
              <div
                className="absolute left-2 top-1/2 -translate-y-1/2"
                style={{
                  width: 3,
                  height: 44,
                  borderRadius: 2,
                  background: 'rgba(255,255,255,0.08)',
                }}
                aria-hidden
              />

              {/* Header */}
              <div
                className="flex items-center justify-between px-5"
                style={{
                  height: 64,
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `linear-gradient(135deg, ${ACCENT} 0%, #1b4332 100%)`,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="8" width="18" height="12" rx="1.5" />
                      <path d="M12 8V4" />
                      <rect x="9" y="2" width="6" height="4" rx="1" />
                      <line x1="3" y1="11" x2="21" y2="11" />
                    </svg>
                  </div>
                  <span
                    className="text-sm font-semibold tracking-tight"
                    style={{ color: 'rgba(255,255,255,0.92)' }}
                  >
                    Intercambio
                  </span>
                </div>

                <motion.button
                  onClick={close}
                  className="flex items-center justify-center rounded-full"
                  style={{
                    width: 40,
                    height: 40,
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.7)',
                    touchAction: 'manipulation',
                  }}
                  whileTap={{ scale: 0.9 }}
                  aria-label="Cerrar menú"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </motion.button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto py-3">
                {MENU_SECTIONS.map((section, index) => {
                  const isActive = pathname === section.href;
                  return (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.05 + index * 0.04, duration: 0.22 }}
                      className="px-3"
                    >
                      <Link
                        href={section.href}
                        onClick={close}
                        className="block"
                        style={{ touchAction: 'manipulation' }}
                      >
                        <motion.div
                          whileTap={{ scale: 0.98 }}
                          className="flex items-center gap-3 px-3 rounded-xl"
                          style={{
                            minHeight: 64,
                            background: isActive ? 'rgba(45,106,79,0.14)' : 'transparent',
                            border: `1px solid ${isActive ? 'rgba(45,106,79,0.3)' : 'transparent'}`,
                            transition: 'background 0.15s, border-color 0.15s',
                          }}
                        >
                          <div
                            className="shrink-0 flex items-center justify-center rounded-lg"
                            style={{
                              width: 40,
                              height: 40,
                              background: isActive ? `${ACCENT}` : 'rgba(45,106,79,0.12)',
                              color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(149,213,178,0.85)',
                              transition: 'background 0.15s, color 0.15s',
                            }}
                          >
                            {section.icon}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p
                              className="text-[15px] font-medium leading-tight"
                              style={{
                                color: isActive ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.85)',
                              }}
                            >
                              {section.label}
                            </p>
                            <p
                              className="text-xs mt-1 truncate"
                              style={{ color: 'rgba(255,255,255,0.4)' }}
                            >
                              {section.description}
                            </p>
                          </div>

                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke={isActive ? 'rgba(149,213,178,0.9)' : 'rgba(255,255,255,0.25)'}
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </motion.div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Footer */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-[11px] uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                  v0.1
                </span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Desliza para cerrar
                </span>
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
