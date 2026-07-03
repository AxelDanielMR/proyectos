import { forwardRef, type ComponentRef } from 'react';
import {
  Text as RNText,
  TextInput as RNTextInput,
  StyleSheet,
  type TextProps,
  type TextInputProps,
  type TextStyle,
} from 'react-native';

// Fuente pixel-art por defecto en todo el texto de la app.
//
// En RN 0.81 (New Architecture) `Text` es un componente-función sin `.render`
// y el módulo se exporta con getters, así que no se puede parchear globalmente:
// se usa este envoltorio en lugar de `Text`/`TextInput` de 'react-native'.
//
// Además, las 4 caras de PixelifySans se cargan en runtime (useFonts) como
// familias SEPARADAS. En Android, si un estilo pide `fontWeight: '700'` sobre
// una familia sin cara bold registrada, el sistema DESCARTA la fuente y cae a
// la del sistema. Por eso mapeamos el peso a la familia concreta y ponemos
// `fontWeight: 'normal'` (el peso ya vive en la familia elegida).
function familyForWeight(weight: TextStyle['fontWeight']): string {
  switch (weight) {
    case '700':
    case '800':
    case '900':
    case 'bold':
      return 'PixelifySans-Bold';
    case '600':
      return 'PixelifySans-SemiBold';
    case '500':
      return 'PixelifySans-Medium';
    default:
      return 'PixelifySans';
  }
}

function withPixelFont(style: TextProps['style']): TextProps['style'] {
  const flat = (StyleSheet.flatten(style) ?? {}) as TextStyle;
  // Respeta un fontFamily explícito del caller (p. ej. 'PixelifySans-Bold').
  const fontFamily = flat.fontFamily ?? familyForWeight(flat.fontWeight);
  return [style, { fontFamily, fontWeight: 'normal' }];
}

export const Text = forwardRef<ComponentRef<typeof RNText>, TextProps>(function Text(
  { style, ...props },
  ref,
) {
  return <RNText ref={ref} style={withPixelFont(style)} {...props} />;
});

export const TextInput = forwardRef<ComponentRef<typeof RNTextInput>, TextInputProps>(
  function TextInput({ style, ...props }, ref) {
    return <RNTextInput ref={ref} style={withPixelFont(style)} {...props} />;
  },
);
