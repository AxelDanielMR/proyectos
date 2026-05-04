'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface SectionCardProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  isOpen?: boolean;
}

export default function SectionCard({ title, icon, children, isOpen = true }: SectionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={isOpen ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full"
    >
      <div
        className="rounded-2xl p-8 backdrop-blur-md"
        style={{
          background: 'linear-gradient(135deg, rgba(45,106,79,0.1) 0%, rgba(27,67,50,0.1) 100%)',
          border: '1px solid rgba(45,106,79,0.3)',
          boxShadow: '0 8px 32px rgba(45,106,79,0.1)',
        }}
      >
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          {icon && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="inline-flex items-center justify-center w-14 h-14 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #2d6a4f 0%, #1b4332 100%)',
              }}
            >
              {icon}
            </motion.div>
          )}
          <motion.h2
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="text-3xl font-bold"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            {title}
          </motion.h2>
        </div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="space-y-4"
          style={{ color: 'rgba(255,255,255,0.7)' }}
        >
          {children}
        </motion.div>
      </div>
    </motion.div>
  );
}
