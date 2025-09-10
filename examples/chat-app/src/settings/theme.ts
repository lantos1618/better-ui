import { Theme, Container } from './types';

const injectedTheme: string = '%INJECTED_THEME%';
const injectedContainer: string = '%INJECTED_CONTAINER%';

let theme: Theme = 'light';
let container: Container = 'none';

if (injectedTheme === 'light' || injectedTheme === 'dark') {
  theme = injectedTheme;
}
if (injectedContainer === 'centered' || injectedContainer === 'none') {
  container = injectedContainer;
}

export default {
  theme,
  container,
};
