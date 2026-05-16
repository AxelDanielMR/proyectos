import {
  Image,
  type ImageSourcePropType,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SudokuBackground } from '@ui/SudokuBackground';

type ModeKey = 'sudoloco' | 'versus' | 'historia' | 'biblio';

const BUTTONS: { key: ModeKey; source: ImageSourcePropType }[] = [
  { key: 'sudoloco', source: require('../../assets/buttons/sudoloco.png') },
  { key: 'versus', source: require('../../assets/buttons/versus.png') },
  { key: 'historia', source: require('../../assets/buttons/history.png') },
  { key: 'biblio', source: require('../../assets/buttons/library.png') },
];

const BUTTON_ASPECT = 583 / 236;
const H_PADDING = 16;
const INK = '#2a1a0a';
const RED_ACCENT = '#b8302a';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const btnWidth = Math.min(width * 0.68, 340);
  const btnHeight = btnWidth / BUTTON_ASPECT;

  const handlePress = (key: ModeKey) => {
    console.log('mode pressed:', key);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <SudokuBackground>
        <View
          style={{
            flex: 1,
            paddingHorizontal: H_PADDING,
            paddingTop: 28,
            paddingBottom: 24,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              fontSize: 42,
              fontWeight: '900',
              letterSpacing: 6,
              color: INK,
              textShadowColor: 'rgba(184, 48, 42, 0.35)',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 0,
            }}
          >
            SUDOLOCO
          </Text>
          <View
            style={{
              marginTop: 8,
              height: 2,
              width: 80,
              backgroundColor: RED_ACCENT,
              opacity: 0.7,
            }}
          />

          <View style={{ flex: 1, width: '100%', justifyContent: 'center', gap: 22 }}>
            {BUTTONS.map(({ key, source }) => (
              <Pressable
                key={key}
                onPress={() => handlePress(key)}
                android_ripple={{ color: '#00000018' }}
                style={({ pressed }) => ({
                  alignSelf: 'center',
                  width: btnWidth,
                  height: btnHeight,
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                <Image
                  source={source}
                  resizeMode="contain"
                  style={{ width: btnWidth, height: btnHeight }}
                />
              </Pressable>
            ))}
          </View>
        </View>
      </SudokuBackground>
    </SafeAreaView>
  );
}
