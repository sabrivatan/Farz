try {
  console.log('Resolving react-native-reanimated/plugin:');
  console.log(require.resolve('react-native-reanimated/plugin'));
} catch (e) {
  console.error('Failed to resolve:');
  console.error(e.message);
}
