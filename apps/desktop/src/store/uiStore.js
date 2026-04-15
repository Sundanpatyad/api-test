import { create } from 'zustand';

export const useUIStore = create((set) => ({
  sidebarWidth: 260,
  responseHeight: 340,
  isSidebarCollapsed: false,
  showImportModal: false,
  showTeamModal: false,
  showProjectModal: false,
  showCollectionModal: false,
  showEnvironmentPanel: false,
  showInviteModal: false,
  isLoading: false,
  activeMainTab: 'request', // 'request' | 'history'

  setSidebarWidth: (w) => set({ sidebarWidth: Math.max(200, Math.min(400, w)) }),
  setResponseHeight: (h) => set({ responseHeight: Math.max(150, Math.min(600, h)) }),
  toggleSidebar: () => set((s) => ({ isSidebarCollapsed: !s.isSidebarCollapsed })),
  setShowImportModal:      (v) => set({ showImportModal: v }),
  setShowTeamModal:        (v) => set({ showTeamModal: v }),
  setShowProjectModal:     (v) => set({ showProjectModal: v }),
  setShowCollectionModal:  (v) => set({ showCollectionModal: v }),
  setShowEnvironmentPanel: (v) => set({ showEnvironmentPanel: v }),
  setShowInviteModal:      (v) => set({ showInviteModal: v }),
  setIsLoading:            (v) => set({ isLoading: v }),
  setActiveMainTab:        (v) => set({ activeMainTab: v }),
}));
