import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { DiscordanceCard } from '@/components/discordance-card';
import { EcoFields, EMPTY_ECO } from '@/components/eco-fields';
import { KeyDatesCard } from '@/components/key-dates-card';
import { useContentGutter } from '@/hooks/use-content-gutter';
import { datingReference, discordance, ecoGaDaysFrom, fumError, keyDates } from '@/lib/gestation';
import { useToast } from '@/providers/toast-provider';
import { colors, fonts } from '@/theme';
import { useToday } from '@/providers/today-provider';

export default function QuickCalcScreen() {
  const gutter = useContentGutter(16);
  const [fum, setFum] = useState<string | null>(null);
  const [eco, setEco] = useState(EMPTY_ECO);
  const showToast = useToast();
  const today = useToday();

  const ecoResult = eco.on ? ecoGaDaysFrom(eco.date, eco.weeks, eco.days, today) : null;
  const dating = {
    fum,
    ecoDate: ecoResult?.gaDays ? eco.date : null,
    ecoGaDays: ecoResult?.gaDays ?? null,
  };
  const reference = datingReference(dating, today);
  const comparison = discordance(dating, today);
  const dirty = Boolean(fum || eco.on || eco.date || eco.weeks || eco.days);

  const reset = () => {
    const previous = { fum, eco };
    setFum(null);
    setEco(EMPTY_ECO);
    showToast({
      message: 'Datos borrados',
      placement: 'tabBar',
      onUndo: () => {
        setFum(previous.fum);
        setEco(previous.eco);
      },
    });
  };

  const saveAsPatient = () =>
    router.push({
      pathname: '/paciente/nueva',
      params: {
        ...(fum ? { fum } : {}),
        ...(dating.ecoDate ? { ecoDate: dating.ecoDate, ecoWeeks: eco.weeks, ecoDays: eco.days } : {}),
      },
    });

  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingHorizontal: gutter }]}
      keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">
          Cálculo rápido
        </Text>
        {dirty ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Nuevo cálculo"
            accessibilityHint="Borra la FUM y la ecografía cargadas"
            onPress={reset}
            hitSlop={4}
            style={({ pressed }) => [styles.reset, pressed && styles.resetPressed]}>
            <Text style={styles.resetIcon}>↺</Text>
            <Text style={styles.resetLabel}>Nuevo cálculo</Text>
          </Pressable>
        ) : null}
      </View>
      <DateField
        label="FUM"
        hint="fecha de última menstruación"
        error={reference?.source === 'eco' ? null : fumError(fum, today)}
        value={fum}
        onChange={setFum}
      />
      <EcoFields
        label="¿Tiene ecografía?"
        value={eco}
        onChange={setEco}
        message={ecoResult?.message}
      />

      {reference ? (
        <>
          {comparison ? <DiscordanceCard discordance={comparison} /> : null}
          <KeyDatesCard dates={keyDates(reference)} />
          <Button
            label="¿Guardar como nueva paciente?"
            variant="link"
            size="sm"
            onPress={saveAsPatient}
          />
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 4,
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 16,
  },
  header: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 17,
    color: colors.ink,
  },
  reset: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resetPressed: {
    backgroundColor: colors.sunken,
  },
  resetIcon: {
    fontFamily: fonts.semibold,
    fontSize: 16,
    lineHeight: 18,
    color: colors.ink,
  },
  resetLabel: {
    fontFamily: fonts.semibold,
    fontSize: 14,
    color: colors.ink,
  },
});
