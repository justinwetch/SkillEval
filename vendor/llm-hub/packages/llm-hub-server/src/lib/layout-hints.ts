import type { HostMode } from '../contracts';

export function getLayoutHints(hostMode: HostMode) {
  switch (hostMode) {
    case 'compact':
      return {
        density: 'compact' as const,
        chrome: 'card' as const,
        actionsPlacement: 'inline' as const,
        defaultSectionState: 'collapsed' as const,
        emphasizeWarnings: true,
      };
    case 'sidebar':
      return {
        density: 'compact' as const,
        chrome: 'sidebar_panel' as const,
        actionsPlacement: 'sticky_footer' as const,
        defaultSectionState: 'expanded' as const,
        emphasizeWarnings: true,
      };
    case 'modal_only':
      return {
        density: 'comfortable' as const,
        chrome: 'modal' as const,
        actionsPlacement: 'footer' as const,
        defaultSectionState: 'expanded' as const,
        emphasizeWarnings: true,
      };
    case 'full_settings_page':
    default:
      return {
        density: 'comfortable' as const,
        chrome: 'page' as const,
        actionsPlacement: 'sticky_footer' as const,
        defaultSectionState: 'expanded' as const,
        emphasizeWarnings: false,
      };
  }
}
