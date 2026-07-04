import React from 'react';
import { Pressable, StyleSheet } from 'react-native';

/** Área táctil absoluta dentro del stage. */
export function TapZone({
  x,
  y,
  width,
  height,
  onTap,
  disabled,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  onTap: () => void;
  disabled?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onTap}
      style={[styles.base, { left: x, top: y, width, height }]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
});
