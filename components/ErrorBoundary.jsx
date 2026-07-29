import { Component } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { error as logError, describeError } from '../lib/log';

/**
 * Catches render-phase crashes below it and shows a recoverable screen.
 *
 * Without this, a single thrown render anywhere in the tree unmounts the whole
 * app to a blank screen with no way back — and, because there is no crash
 * reporter wired up either, no record that it happened. `onReset` lets the
 * user retry without killing the process.
 *
 * Note this is a render-phase net only: React error boundaries do not catch
 * errors thrown inside event handlers or async callbacks. Those still need
 * their own try/catch at the call site.
 */
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logError('Unhandled render error', {
      ...describeError(error),
      componentStack: info?.componentStack,
    });
  }

  handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <View style={styles.screen}>
        <View style={styles.logoWrap}>
          <View style={[styles.circle, { backgroundColor: '#335CFF', left: 0 }]} />
          <View style={[styles.circle, { backgroundColor: '#8A5BFF', right: 0, opacity: 0.9 }]} />
        </View>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          That&apos;s on us. Try again — if it keeps happening, restarting the app usually clears
          it.
        </Text>
        <TouchableOpacity style={styles.button} onPress={this.handleReset} activeOpacity={0.85}>
          <Text style={styles.buttonText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

// Deliberately not themed: this renders when the tree below has failed, which
// may include the theme provider itself. Hardcoded neutrals always render.
const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 10,
    backgroundColor: '#FFFFFF',
  },
  logoWrap: { width: 52, height: 34, position: 'relative', marginBottom: 6 },
  circle: { position: 'absolute', top: 0, width: 34, height: 34, borderRadius: 17 },
  title: { fontSize: 20, fontWeight: '700', color: '#12141A', textAlign: 'center' },
  body: { fontSize: 14, color: '#5B6172', textAlign: 'center', lineHeight: 20 },
  button: {
    marginTop: 14,
    backgroundColor: '#335CFF',
    borderRadius: 50,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  buttonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
