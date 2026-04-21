import { create } from 'zustand';
import api from '@/lib/api';
import { localStorageService } from '@/services/localStorageService';
import { syncService } from '@/services/syncService';
import { v4 as uuidv4 } from 'uuid';
import toast from 'react-hot-toast';

export const useProjectStore = create((set, get) => ({
  projects: localStorageService.get(localStorageService.KEYS.PROJECTS) || [],
  currentProject: localStorageService.get(localStorageService.KEYS.CURRENT_PROJECT) || null,
  isLoading: false,
  isRefreshing: false,

  initFromStorage: () => {
    const stored = localStorageService.get(localStorageService.KEYS.PROJECTS);
    const current = localStorageService.get(localStorageService.KEYS.CURRENT_PROJECT);
    if (stored) set({ projects: stored });
    if (current) set({ currentProject: current });
  },

  fetchProjects: async (teamId, forceRefresh = false) => {
    if (!teamId) return;
    
    // If not forcing refresh and we already have projects, just return
    if (!forceRefresh && get().projects.length > 0) {
      // Basic check: do these projects belong to the current team? 
      // (Assuming store projects are always for the current team)
      return { success: true, projects: get().projects, fromCache: true };
    }

    set({ isLoading: true });
    try {
      const { data } = await api.get('/api/project', { params: { teamId } });
      if (data?.projects) {
        
        const syncedProjects = get().syncWithServerData(data.projects, teamId);
        
        set({ projects: syncedProjects, isLoading: false });
        localStorageService.saveProjects(syncedProjects);
        localStorageService.updateLastSync();
        return { success: true, projects: syncedProjects, fromCache: false };
      }
      throw new Error('No projects returned from API');
    } catch (err) {
      // Fallback to localStorage on API failure
      const cachedProjects = localStorageService.get(localStorageService.KEYS.PROJECTS) || [];
      set({ projects: cachedProjects, isLoading: false });
      return { 
        success: cachedProjects.length > 0, 
        projects: cachedProjects, 
        fromCache: true,
        error: err.response?.data?.error || err.message || 'Failed to fetch projects. Using cached data.' 
      };
    }
  },

  // Helper to reconcile IDs after sync
  reconcileIds: (projects, idMap) => {
    return projects.map(project => {
      const realId = idMap[project._id];
      if (realId) {
        return { ...project, _id: realId };
      }
      return project;
    });
  },

  // Check if server data has items we don't have locally (or deleted items)
  // Preserves projects from OTHER teams while syncing THIS team.
  syncWithServerData: (serverProjects, teamId) => {
    const currentProjects = get().projects;
    const serverProjectIds = new Set(serverProjects.map(p => p._id));
    const idMap = syncService.idMap;
    
    // Separate current projects into "this team" and "other teams"
    const otherProjects = currentProjects.filter(p => String(p.teamId) !== String(teamId));
    const thisTeamProjects = currentProjects.filter(p => String(p.teamId) === String(teamId));
    
    // Reconcile IDs for the returned server projects
    const reconciledServerProjects = get().reconcileIds(serverProjects, idMap);
    
    // Keep local projects for THIS team that haven't been synced to server yet (have temp ids)
    const tempIdProjects = thisTeamProjects.filter(p => p._id?.includes('-') && !idMap[p._id]);
    
    const mergedForThisTeam = [...reconciledServerProjects];
    tempIdProjects.forEach(tempProject => {
      if (!mergedForThisTeam.find(p => p._id === tempProject._id)) {
        mergedForThisTeam.push(tempProject);
      }
    });
    
    // Fully merged array = preserved other teams + newly synced this team
    return [...otherProjects, ...mergedForThisTeam];
  },

  refreshProjects: async (teamId) => {
    if (!teamId) return;
    set({ isRefreshing: true });
    try {
      const { data } = await api.get('/api/project', { params: { teamId } });
      const serverProjects = data.projects || [];
      
      const syncedProjects = get().syncWithServerData(serverProjects, teamId);
      
      set({ projects: syncedProjects, isRefreshing: false });
      localStorageService.saveProjects(syncedProjects);
      localStorageService.updateLastSync();
      
      return { success: true, projects: syncedProjects, fromCache: false };
    } catch (err) {
      set({ isRefreshing: false });
      const cachedProjects = get().projects.length > 0 
        ? get().projects 
        : (localStorageService.get(localStorageService.KEYS.PROJECTS) || []);
        
      if (get().projects.length === 0 && cachedProjects.length > 0) {
        set({ projects: cachedProjects });
      }
      return { 
        success: cachedProjects.length > 0, 
        projects: cachedProjects, 
        fromCache: true,
        error: err.response?.data?.error || 'Failed to refresh. Using existing data.' 
      };
    }
  },

  // Register store for global refresh
  refresh: () => {
    // Refresh called by syncService after sync
    const teamId = get().currentProject?.teamId;
    if (teamId) {
      get().refreshProjects(teamId);
    }
  },

  createProject: async (name, teamId, description, color) => {
    // Enforce max 10 projects per team check
    const currentTeamProjects = get().getFilteredProjects(teamId);
    if (currentTeamProjects.length >= 10) {
      toast.error('Maximum limit of 10 projects per team reached.');
      return { success: false, error: 'Limit reached' };
    }

    if (!navigator.onLine) {
      toast.error('You are offline. Cannot create project.');
      return { success: false, error: 'Offline' };
    }

    const tempId = uuidv4();
    const p = { name, teamId, description, color };
    
    set({ isLoading: true });
    try {
      const { data } = await api.post('/api/project', p);
      
      set((state) => {
        const updated = [data.project, ...state.projects];
        localStorageService.saveProjects(updated);
        return { projects: updated, isLoading: false };
      });
      
      if (data.project?._id) {
        const { useSocketStore } = await import('@/store/socketStore');
        const { useAuthStore } = await import('@/store/authStore');
        useSocketStore.getState().emitProjectCreated(
          data.project.teamId, 
          data.project, 
          useAuthStore.getState().user?._id
        );
      }
      
      return { success: true, project: data.project };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },

  setCurrentProject: (project) => {
    set({ currentProject: project });
    localStorageService.saveCurrentProject(project);
  },

  // Get projects filtered by team ID
  getFilteredProjects: (teamId) => {
    if (!teamId) return [];
    return get().projects.filter(p => String(p.teamId) === String(teamId));
  },

  updateProjectName: async (id, name) => {
    if (!navigator.onLine) {
      toast.error('You are offline. Cannot update project.');
      return { success: false, error: 'Offline' };
    }

    try {
      const { data } = await api.put(`/api/project/${id}`, { name });
      
      set((state) => {
        const updated = state.projects.map((p) => (p._id === id ? data.project : p));
        const updatedCurrent = state.currentProject?._id === id ? data.project : state.currentProject;
        localStorageService.saveProjects(updated);
        localStorageService.saveCurrentProject(updatedCurrent);
        return {
          projects: updated,
          currentProject: updatedCurrent,
        };
      });
      
      const { useSocketStore } = await import('@/store/socketStore');
      const { useAuthStore } = await import('@/store/authStore');
      useSocketStore.getState().emitProjectUpdated(
        data.project.teamId, 
        data.project, 
        useAuthStore.getState().user?._id
      );
      
      return { success: true, project: data.project };
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update project' };
    }
  },

  deleteProject: async (id) => {
    if (!navigator.onLine) {
      toast.error('You are offline. Cannot delete project.');
      return { success: false, error: 'Offline' };
    }

    const isNotFound = (err) => err.response?.status === 404 || err.response?.data?.error?.includes('not found');

    try {
      await api.delete(`/api/project/${id}`);
      
      const { useSocketStore } = await import('@/store/socketStore');
      const { useAuthStore } = await import('@/store/authStore');
      const { useTeamStore } = await import('@/store/teamStore');

      useSocketStore.getState().emitProjectDeleted(
        useTeamStore.getState().currentTeam?._id, 
        id, 
        useAuthStore.getState().user?._id
      );
    } catch (err) {
      // If not found on server, still clean up locally
      if (!isNotFound(err)) {
        return { success: false, error: err.response?.data?.error || 'Failed to delete project' };
      }
      // Continue to local cleanup for 404 errors
    }

    // Clean up local state regardless of server response (for 404 or success)
    set((state) => {
      const updated = state.projects.filter((p) => p._id !== id);
      const updatedCurrent = state.currentProject?._id === id ? null : state.currentProject;
      localStorageService.saveProjects(updated);
      localStorageService.saveCurrentProject(updatedCurrent);
      return {
        projects: updated,
        currentProject: updatedCurrent,
      };
    });
    
    return { success: true };
  },

  reset: () => {
    set({
      projects: [],
      currentProject: null,
      isLoading: false,
      isRefreshing: false
    });
  }
}));
