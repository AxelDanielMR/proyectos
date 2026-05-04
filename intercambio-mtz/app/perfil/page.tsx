import { motion } from "framer-motion";

export default function PerfilPage() {
  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center p-6 overflow-y-auto"
      style={{
        background: 'linear-gradient(135deg, #0f1923 0%, #1a2a1a 50%, #0f1923 100%)',
        fontFamily: "'DM Sans', sans-serif",
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
    >
      <motion.h1
        className="text-4xl font-bold mb-8 text-center"
        style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.02em' }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      >
        Perfil
      </motion.h1>
      <motion.p
        className="text-lg text-center"
        style={{ color: 'rgba(255,255,255,0.8)' }}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.2 }}
      >
        Aquí puedes ver y editar tu perfil con estilo.
      </motion.p>
    </motion.div>
  );
}