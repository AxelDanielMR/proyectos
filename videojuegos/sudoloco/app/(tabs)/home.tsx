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
const SMALL_GAP = 14;
const INK = '#2a1a0a';
const RED_ACCENT = '#b8302a';

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const router = useRouter();

  const usable = width - H_PADDING * 2;

  // Primary buttons (SUDOLOCO, VERSUS): nearly full usable width
  const primaryW = usable;
  const primaryH = primaryW / BUTTON_ASPECT;

  // Secondary buttons (BIBLIO, HISTORIA): fill the right side of the bottom row
  // Left side of bottom row = small column (SMALL_SIZE + gap)
  const secondaryW = usable - SMALL_SIZE - 16;
  const secondaryH = secondaryW / BUTTON_ASPECT;

  const handlePress = (key: ModeKey) => {
    if (key === 'sudoloco') router.push('/sudoloco');
  };

  const primaryButtons: { key: ModeKey; source: ImageSourcePropType }[] = [
    { key: 'sudoloco', source: require('../../assets/buttons/sudoloco.png') },
    { key: 'versus', source: require('../../assets/buttons/versus.png') },
  ];

  const secondaryButtons: { key: ModeKey; source: ImageSourcePropType }[] = [
    { key: 'historia', source: require('../../assets/buttons/history.png') },
    { key: 'biblio', source: require('../../assets/buttons/librar.png') },
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
              marginBottom: 32,
              height: 2,
              width: 80,
              backgroundColor: RED_ACCENT,
              opacity: 0.7,
              alignSelf: 'center',
            }}
          />

          {/* TOP SECTION: primary buttons — large, left-aligned */}
          <View style={{ gap: 22 }}>
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

          {/* BOTTOM SECTION: small buttons (left, vertical) + secondary buttons (right) */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              marginTop: 28,
            }}
          >
            {/* Small icons column — vertically stacked */}
            <View style={{ gap: SMALL_GAP, width: SMALL_SIZE }}>
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

            {/* Secondary buttons — vertically stacked, right-aligned */}
            <View
              style={{
                flex: 1,
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: 20,
              }}
            >
              {secondaryButtons.map(({ key, source }) => (
                <Pressable
                  key={key}
                  onPress={() => handlePress(key)}
                  android_ripple={{ color: '#00000018' }}
                  style={({ pressed }) => ({
                    width: secondaryW,
                    height: secondaryH,
                    opacity: pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  })}
                >
                  <Image
                    source={source}
                    resizeMode="contain"
                    style={{ width: secondaryW, height: secondaryH }}
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
