import { useTransitionValue } from '@motionstudies/web/use-transition-value'

export function useParisLayout(heart: boolean) {
  const { value: mix, transitioning } = useTransitionValue(heart ? 1 : 0)
  return { mix, transitioning }
}
