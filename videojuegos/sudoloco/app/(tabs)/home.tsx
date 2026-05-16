import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type ModeKey = 'sudoloco' | 'versus' | 'historia' | 'biblio';

const BUTTONS: { key: ModeKey; source: ReturnType<typeof require> }[] = [
  { key: 'sudoloco', source: require('../../assets/buttons/sudoloco.png') },
  { key: 'versus', source: require('../../assets/buttons/versus.png') },
  { key: 'historia', source: require('../../assets/buttons/history.png') },
  { key: 'biblio', source: require('../../assets/buttons/library.png') },
];

const BUTTON_ASPECT = 583 / 236;
const H_PADDING = 16;

export default function HomeScreen() {
  const { width } = useWindowDimensions();
  const btnWidth = width - H_PADDING * 2;
  const btnHeight = btnWidth / BUTTON_ASPECT;

  const handlePress = (key: ModeKey) => {
    console.log('mode pressed:', key);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617' }} edges={['top', 'bottom']}>
      <View style={{ flex: 1, paddingHorizontal: H_PADDING, paddingVertical: 24 }}>
        <Text
          style={{
            fontSize: 44,
            fontWeight: '900',
            letterSpacing: 4,
            color: '#fcd34d',
            textShadowColor: '#7c3aed',
            textShadowOffset: { width: 0, height: 3 },
            textShadowRadius: 0,
            marginBottom: 24,
            textAlign: 'center',
          }}
        >
          SUDOLOCO
        </Text>

        <View style={{ gap: 12 }}>
          {BUTTONS.map(({ key, source }) => (
            <Pressable
              key={key}
              onPress={() => handlePress(key)}
              android_ripple={{ color: '#ffffff22' }}
              style={({ pressed }) => ({
                width: btnWidth,
                height: btnHeight,
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
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
    </SafeAreaView>
  );
}
