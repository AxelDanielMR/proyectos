import { Pressable, Text, type PressableProps } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANT_STYLES: Record<Variant, string> = {
  primary: 'bg-indigo-500 active:bg-indigo-600',
  secondary: 'bg-slate-700 active:bg-slate-600',
  ghost: 'bg-transparent active:bg-slate-800',
};

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: Variant;
}

export function Button({ label, variant = 'primary', ...rest }: ButtonProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        scale.value = withSpring(0.95);
        rest.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1);
        rest.onPressOut?.(e);
      }}
      style={animatedStyle}
      className={`rounded-2xl px-6 py-3 ${VARIANT_STYLES[variant]}`}
    >
      <Text className="text-center text-base font-semibold text-white">
        {label}
      </Text>
    </AnimatedPressable>
  );
}
