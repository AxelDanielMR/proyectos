import {
  Image,
  type ImageSourcePropType,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { SudokuBackground } from '@ui/SudokuBackground';

type ModeKey = 'sudoloco' | 'versus' | 'historia' | 'biblio';
type SmallKey = 'config' | 'profile' | 'store';

const BUTTON_ASPECT = 583 / 236;
const H_PADDING = 16;
const SMALL_SIZE = 48;
const INK = '#2a1a0a';
const RED_ACCENT = '#b8302a';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const usable = width - H_PADDING * 2;
  const primaryW = usable - SMALL_SIZE - 16;
  const primaryH = primaryW / BUTTON_ASPECT;

  const handlePress = (key: ModeKey) => {
    if (key === 'sudoloco') router.push('/sudoloco');
  };

  const primaryButtons: { key: ModeKey; source: ImageSourcePropType }[] = [
    { key: 'sudoloco', source: require('../../assets/buttons/sudoloco.png') },
    { key: 'versus', source: require('../../assets/buttons/versus.png') },
    { key: 'historia', source: require('../../assets/buttons/history_buttonV1.png') },
    { key: 'biblio', source: require('../../assets/buttons/library_buttonV1.png') },
  ];

  const smallButtons: { key: SmallKey; source: ImageSourcePropType }[] = [
    { key: 'profile', source: require('../../assets/buttons/profile.png') },
    { key: 'store', source: require('../../assets/buttons/store.png') },
    { key: 'config', source: require('../../assets/buttons/config.png') },
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
      <SudokuBackground>
        <View
          style={{
            flex: 1,
            paddingHorizontal: H_PADDING,
            paddingTop: 28,
            paddingBottom: 24,
          }}
        >
          {/* Title */}
          <Text
            style={{
              fontSize: 42,
              fontWeight: '900',
              letterSpacing: 6,
              color: INK,
              textShadowColor: 'rgba(184, 48, 42, 0.35)',
              textShadowOffset: { width: 2, height: 2 },
              textShadowRadius: 0,
              alignSelf: 'center',
            }}
          >
            SUDOLOCO
          </Text>
          <View
            style={{
              marginTop: 8,
              marginBottom: 24,
              height: 2,
              width: 80,
              backgroundColor: RED_ACCENT,
              opacity: 0.7,
              alignSelf: 'center',
            }}
          />

          {/* Main layout: 4 primary buttons (left) + 3 small icons (right) */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            {/* Left column: 4 primary buttons stacked */}
            <View style={{ gap: 16, flex: 1 }}>
              {primaryButtons.map(({ key, source }) => (
                <Pressable
                  key={key}
                  onPress={() => handlePress(key)}
                  android_ripple={{ color: '#00000018' }}
                  style={({ pressed }) => ({
                    width: primaryW,
                    height: primaryH,
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Image
                    source={source}
                    resizeMode="contain"
                    style={{ width: primaryW, height: primaryH }}
                  />
                </Pressable>
              ))}
            </View>

            {/* Right column: 3 small icons vertically stacked */}
            <View style={{ gap: 14, width: SMALL_SIZE, alignItems: 'center', alignSelf: 'flex-end', paddingBottom: 8 }}>
              {smallButtons.map(({ key, source }) => (
                <Pressable
                  key={key}
                  android_ripple={{ color: '#00000018' }}
                  style={({ pressed }) => ({
                    width: SMALL_SIZE,
                    height: SMALL_SIZE,
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  })}
                >
                  <Image
                    source={source}
                    resizeMode="contain"
                    style={{ width: SMALL_SIZE, height: SMALL_SIZE }}
                  />
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </SudokuBackground>
    </SafeAreaView>
  );
}
