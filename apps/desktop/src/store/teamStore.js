import { create } from 'zustand';
import api from '@/lib/api';

export const useTeamStore = create((set, get) => ({
  teams: [],
  currentTeam: null,
  isLoading: false,

  fetchTeams: async () => {
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/team');
      set({ teams: data.teams, isLoading: false });
      // Auto-select first team if none selected
      if (!get().currentTeam && data.teams.length > 0) {
        set({ currentTeam: data.teams[0] });
      }
    } catch (err) {
      set({ isLoading: false });
    }
  },

  // Fetch a single team with fully populated members (name, email, avatar)
  fetchTeamDetails: async (teamId) => {
    try {
      const { data } = await api.get(`/api/team/${teamId}`);
      // Update both the list and currentTeam with the populated version
      set((state) => ({
        teams: state.teams.map((t) => (t._id === teamId ? data.team : t)),
        currentTeam: state.currentTeam?._id === teamId ? data.team : state.currentTeam,
      }));
      return { success: true, team: data.team };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to load team' };
    }
  },

  createTeam: async (name, description) => {
    try {
      const { data } = await api.post('/api/team', { name, description });
      set((state) => ({ teams: [...state.teams, data.team] }));
      return { success: true, team: data.team };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },

  setCurrentTeam: (team) => set({ currentTeam: team }),

  inviteMember: async (teamId, email, role = 'developer') => {
    try {
      const { data } = await api.post(`/api/team/${teamId}/invite`, { email, role });
      // Re-fetch populated team so member list updates
      await get().fetchTeamDetails(teamId);
      return { success: true, team: data.team };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Invite failed' };
    }
  },

  removeMember: async (teamId, userId) => {
    try {
      const { data } = await api.delete(`/api/team/${teamId}/members/${userId}`);
      set((state) => ({
        teams: state.teams.map((t) => (t._id === teamId ? data.team : t)),
        currentTeam: state.currentTeam?._id === teamId ? data.team : state.currentTeam,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Remove failed' };
    }
  },
}));
