import { create } from 'zustand';
import api from '@/lib/api';
import { localStorageService } from '@/services/localStorageService';
import { syncService } from '@/services/syncService';
import { v4 as uuidv4 } from 'uuid';

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
        set({ projects: data.projects, isLoading: false });
        localStorageService.saveProjects(data.projects);
        localStorageService.updateLastSync();
        return { success: true, projects: data.projects, fromCache: false };
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
  syncWithServerData: (serverProjects) => {
    const currentProjects = get().projects;
    const serverProjectIds = new Set(serverProjects.map(p => p._id));
    const idMap = syncService.idMap;
    
    // Find projects that exist locally but not on server (unless they have temp IDs)
    const projectsToRemove = currentProjects.filter(project => {
      const isTempId = project._id?.includes('-');
      if (isTempId) return false;
      return !serverProjectIds.has(project._id) && !idMap[project._id];
    });
    
    const reconciledServerProjects = get().reconcileIds(serverProjects, idMap);
    const tempIdProjects = currentProjects.filter(p => p._id?.includes('-') && !idMap[p._id]);
    
    const merged = [...reconciledServerProjects];
    tempIdProjects.forEach(tempProject => {
      if (!merged.find(p => p._id === tempProject._id)) {
        merged.push(tempProject);
      }
    });
    
    return merged;
  },

  refreshProjects: async (teamId) => {
    if (!teamId) return;
    set({ isRefreshing: true });
    try {
      const { data } = await api.get('/api/project', { params: { teamId } });
      const serverProjects = data.projects || [];
      
      const syncedProjects = get().syncWithServerData(serverProjects);
      
      set({ projects: syncedProjects, isRefreshing: false });
      localStorageService.saveProjects(syncedProjects);
      localStorageService.updateLastSync();
      
      // Update current project if it was deleted
      const currentProject = get().currentProject;
      if (currentProject && !syncedProjects.find(p => p._id === currentProject._id)) {
        set({ currentProject: syncedProjects[0] || null });
        localStorageService.saveCurrentProject(syncedProjects[0] || null);
      }
      
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
    const tempId = uuidv4();
    const p = { name, teamId, description, color };
    
    const tempProject = { ...p, _id: tempId, members: [], isOffline: true };
    set((state) => {
      const updated = [tempProject, ...state.projects];
      localStorageService.saveProjects(updated);
      return { projects: updated };
    });
    
    try {
      const { data } = await api.post('/api/project', p, {
         offlineMock: { project: { ...p, _id: tempId }, tempId, resourceType: 'project' }
      });
      
      set((state) => {
        const updated = state.projects.map(proj => 
          proj._id === tempId ? data.project : proj
        );
        localStorageService.saveProjects(updated);
        return { projects: updated };
      });
      
      if (data.project?._id) {
        syncService.registerIdMapping(tempId, data.project._id);
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
      if (!navigator.onLine) {
        syncService.queueChange('create_project', { ...p, tempId }, tempId);
        return { success: true, project: tempProject, offline: true };
      }
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
    const existing = get().projects.find((p) => p._id === id);
    const isTempId = id?.includes('-');
    
    set((state) => {
      const updated = state.projects.map((p) => 
        p._id === id ? { ...p, name } : p
      );
      localStorageService.saveProjects(updated);
      return { projects: updated };
    });
    
    try {
      if (isTempId) {
        syncService.queueChange('update_project', { id, name }, id);
        return { success: true, project: { ...existing, name }, offline: true };
      }
      
      const { data } = await api.put(`/api/project/${id}`, { name }, {
        offlineMock: { project: { ...existing, name } }
      });
      
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
      if (!navigator.onLine) {
        syncService.queueChange('update_project', { id, name }, id);
        return { success: true, project: { ...existing, name }, offline: true };
      }
      return { success: false, error: err.response?.data?.error || 'Failed to update project' };
    }
  },

  deleteProject: async (id) => {
    const isTempId = id?.includes('-');
    
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
    
    try {
      if (isTempId) {
        return { success: true };
      }
      
      await api.delete(`/api/project/${id}`, { offlineMock: { success: true } });
      
      const { useSocketStore } = await import('@/store/socketStore');
      const { useAuthStore } = await import('@/store/authStore');
      const { useTeamStore } = await import('@/store/teamStore');
      useSocketStore.getState().emitProjectDeleted(
        useTeamStore.getState().currentTeam?._id, 
        id, 
        useAuthStore.getState().user?._id
      );
      
      return { success: true };
    } catch (err) {
      if (!navigator.onLine) {
        syncService.queueChange('delete_project', { id }, id);
        return { success: true, offline: true };
      }
      
      const existing = get().projects.find((p) => p._id === id);
      if (existing) {
        set((state) => {
          const updated = [...state.projects, existing];
          localStorageService.saveProjects(updated);
          return { projects: updated };
        });
      }
      return { success: false, error: err.response?.data?.error || 'Failed' };
    }
  },
}));
