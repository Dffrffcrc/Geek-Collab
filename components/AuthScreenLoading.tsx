import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { COLORS } from '../lib/theme';

export function AuthScreenLoading() {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={COLORS.yellow} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bgDark,
  },
});
