import colors from "@/constants/colors";

/**
 * Returns the dark design tokens. Podwise is a dark-first app so we
 * always use the dark palette regardless of the OS color scheme.
 */
export function useColors() {
  return { ...colors.dark, radius: colors.radius };
}
