import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import light from 'expo-symbols/androidWeights/light';
import { TabList, Tabs, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { greeting } from '@/db/profile';
import { formatLongDay } from '@/lib/dates';
import { useProfile } from '@/providers/profile-provider';
import { colors, fonts } from '@/theme';
import { useToday } from '@/providers/today-provider';

/** Inicio con barra de 2 pestañas (variante 2b del diseño, con acciones en oscuro sólido). */
export default function HomeTabsLayout() {
  const { profile } = useProfile();
  const today = useToday();

  return (
    <Tabs style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.date}>{formatLongDay(today)}</Text>
          {/* Tocar el saludo abre el perfil (opción 4a del diseño). */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={greeting(profile)}
            accessibilityHint="Editar tus datos"
            onPress={() => router.push('/perfil')}
            style={({ pressed }) => [styles.greetingButton, pressed && styles.greetingPressed]}>
            <Text style={styles.greeting}>{greeting(profile)}</Text>
            <Text style={styles.greetingChevron}>›</Text>
          </Pressable>
        </View>
        {/* Configuración a la derecha del saludo (opción 7a del diseño). */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Configuración"
          onPress={() => router.push('/configuracion')}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.greetingPressed]}>
          <SymbolView
            name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
            weight={{ ios: 'light', android: light }}
            tintColor={colors.ink}
            size={30}
          />
        </Pressable>
      </SafeAreaView>
      <View style={styles.slot}>
        <TabSlot />
      </View>
      <TabList asChild>
        <SafeAreaView edges={['bottom']} style={styles.tabBar}>
          {/* Cálculo rápido va primero y es la pestaña con la que abre la app («/»). */}
          <TabTrigger name="index" href="/" asChild>
            <TabButton label="Cálculo rápido" />
          </TabTrigger>
          <TabTrigger name="pacientes" href="/pacientes" asChild>
            <TabButton label="Pacientes" />
          </TabTrigger>
        </SafeAreaView>
      </TabList>
    </Tabs>
  );
}

// Sin el `ref` de TabTriggerSlotProps: lo tipa con el componente View y no con la instancia, como
// pide la API estricta de React Native. El ref sigue llegando en las props y pasa al Pressable.
type TabButtonProps = Omit<TabTriggerSlotProps, 'ref'> & {
  label: string;
};

function TabButton({ label, isFocused, ...props }: TabButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      style={styles.tab}>
      <View style={[styles.tabIndicator, isFocused && styles.tabIndicatorActive]} />
      <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flexShrink: 1,
    gap: 2,
  },
  settingsButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  date: {
    fontFamily: fonts.regular,
    fontSize: 13,
    color: colors.textMuted,
  },
  greetingButton: {
    alignSelf: 'flex-start',
    minHeight: 44,
    marginVertical: -7,
    marginHorizontal: -8,
    paddingHorizontal: 8,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greetingPressed: {
    backgroundColor: colors.sunken,
  },
  greeting: {
    flexShrink: 1,
    fontFamily: fonts.bold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.24,
    color: colors.ink,
  },
  greetingChevron: {
    fontFamily: fonts.regular,
    fontSize: 24,
    lineHeight: 30,
    color: colors.textMuted,
  },
  slot: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  tab: {
    flex: 1,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  tabIndicator: {
    width: 28,
    height: 4,
    borderRadius: 2,
  },
  tabIndicatorActive: {
    backgroundColor: colors.ink,
  },
  tabLabel: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textMuted,
  },
  tabLabelActive: {
    fontFamily: fonts.bold,
    color: colors.ink,
  },
});
