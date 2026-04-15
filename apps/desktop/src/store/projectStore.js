import { create } from 'zustand';
import api from '@/lib/api';

export const useProjectStore = create((set, get) => ({
  projects: [],
  currentProject: null,
  isLoading: false,

  fetchProjects: async (teamId) => {
    if (!teamId) return;
    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/project', { params: { teamId } });
      set({ projects: data.projects, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createProject: async (name, teamId, description, color) => {
    try {
      const { data } = await api.post('/api/project', { name, teamId, description, color });
      set((state) => ({ projects: [data.project, ...state.projects] }));
      return { success: true, project: data.project };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },

  setCurrentProject: (project) => set({ currentProject: project }),

  deleteProject: async (id) => {
    try {
      await api.delete(`/api/project/${id}`);
      set((state) => ({
        projects: state.projects.filter((p) => p._id !== id),
        currentProject: state.currentProject?._id === id ? null : state.currentProject,
      }));
      return { success: true };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },
}));
