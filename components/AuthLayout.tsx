import { View, Image, StyleSheet, useWindowDimensions, ScrollView } from 'react-native';
import type { ReactNode } from 'react';
import { COLORS } from '../lib/theme';

export function AuthLayout({
  children,
  mobileCentered = false,
}: {
  children: ReactNode;
  mobileCentered?: boolean;
}) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const isMobile = width < 520;

  return (
    <View style={styles.container}>
      {isDesktop && (
        <View style={styles.leftPanel}>
          <Image
            source={require('../assets/login-deco.png')}
            style={styles.deco}
            resizeMode="contain"
          />
        </View>
      )}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.rightPanel,
          isMobile && styles.rightPanelMobile,
          isMobile && mobileCentered && styles.rightPanelMobileCentered,
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View
          style={[
            styles.formContainer,
            isMobile && styles.formContainerMobile,
            isMobile && mobileCentered && styles.formContainerMobileCentered,
          ]}
        >
          <Image
            source={require('../assets/forum-logo.png')}
            style={[
              styles.logo,
              isMobile && styles.logoMobile,
              isMobile && mobileCentered && styles.logoMobileCentered,
            ]}
            resizeMode="contain"
          />
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row', backgroundColor: COLORS.bgDark },
  leftPanel: {
    flex: 1,
    backgroundColor: COLORS.bgDark,
    overflow: 'hidden',
    borderRightWidth: 1,
    borderRightColor: COLORS.separator,
  },
  deco: {
    position: 'absolute',
    width: '145%',
    height: '145%',
    bottom: '-50%',
    left: '-35%',
  },
  rightPanel: {
    flexGrow: 1,
    backgroundColor: COLORS.bgPanel,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    paddingVertical: 48,
  },
  rightPanelMobile: {
    justifyContent: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  rightPanelMobileCentered: {
    justifyContent: 'center',
    paddingVertical: 40,
  },
  formContainer: { width: '100%', maxWidth: 520 },
  formContainerMobile: { maxWidth: 420 },
  formContainerMobileCentered: { maxWidth: 360 },
  logo: { width: 88, height: 88, alignSelf: 'center', marginBottom: 12 },
  logoMobile: { width: 72, height: 72, marginBottom: 18 },
  logoMobileCentered: { width: 132, height: 132, marginBottom: 36 },
});
