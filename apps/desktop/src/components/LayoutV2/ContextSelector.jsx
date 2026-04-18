import { useState, useRef, useEffect } from 'react';
import { useTeamStore } from '@/store/teamStore';
import { useProjectStore } from '@/store/projectStore';
import { useCollectionStore } from '@/store/collectionStore';
import { useRequestStore } from '@/store/requestStore';
import { useUIStore } from '@/store/uiStore';
import toast from 'react-hot-toast';
import RefreshButton from '@/components/RefreshButton/RefreshButton';

export default function ContextSelector() {
  const { teams, currentTeam, setCurrentTeam, refreshTeams, isRefreshing: isRefreshingTeams } = useTeamStore();
  const { projects, currentProject, setCurrentProject, getFilteredProjects, refreshProjects, isRefreshing: isRefreshingProjects } = useProjectStore();
  const { setCurrentCollection } = useCollectionStore();
  const { setCurrentRequest, setNoActiveRequest } = useRequestStore();
  const { setShowTeamModal, setShowProjectModal } = useUIStore();

  const [teamOpen, setTeamOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);

  const teamRef = useRef(null);
  const projRef = useRef(null);

  const handleTeamChange = (team) => {
    if (currentTeam?._id !== team._id) {
      setCurrentTeam(team);
      setCurrentProject(null);
      setCurrentCollection(null);
      setCurrentRequest(null);
      setNoActiveRequest(true);
    }
    setTeamOpen(false);
  };

  const handleProjectChange = (proj) => {
    if (currentProject?._id !== proj._id) {
      setCurrentProject(proj);
      setCurrentCollection(null);
      setCurrentRequest(null);
      setNoActiveRequest(true);
    }
    setProjectOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (teamRef.current && !teamRef.current.contains(e.target)) setTeamOpen(false);
      if (projRef.current && !projRef.current.contains(e.target)) setProjectOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filteredProjects = currentTeam ? getFilteredProjects(currentTeam._id) : [];

  return (
    <div className="flex items-center gap-1 ml-2">
      {/* Team Dropdown */}
      <div className="relative" style={{ zIndex: teamOpen ? 50 : 10 }} ref={teamRef}>
        <button
          onClick={() => { setTeamOpen(!teamOpen); setProjectOpen(false); }}
          className="flex items-center gap-1.5 px-2 py-1 rounded border border-transparent text-xs font-semibold text-tx-secondary hover:bg-[color:var(--surface-2)] hover:text-tx-primary transition-all"
        >
          <div className="w-4 h-4 rounded bg-[color:var(--surface-3)] text-[8px] flex items-center justify-center flex-shrink-0 border border-[color:var(--border-1)] text-tx-primary">
            {currentTeam?.name?.[0]?.toUpperCase() || 'T'}
          </div>
          <span className="max-w-[100px] truncate">{currentTeam?.name || 'Select Team'}</span>
          <svg className={`w-3 h-3 opacity-60 transition-transform ${teamOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {teamOpen && (
          <div className="absolute left-0 top-full mt-1 w-56 bg-[color:var(--surface-1)] border border-[color:var(--border-1)] rounded-xl shadow-glass animate-in py-1">
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-[color:var(--border-1)] mb-1">
              <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Teams</span>
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={async () => {
                    const result = await refreshTeams();
                    if (result.fromCache) toast(result.error, { icon: '📦', style: { background: '#E3B341', color: '#000' } });
                    else if (result.success) toast.success('Teams synced');
                    else toast.error(result.error || 'Refresh failed');
                  }}
                  loading={isRefreshingTeams}
                  tooltip="Refresh teams"
                  size={12}
                />
                <button onClick={() => { setShowTeamModal(true); setTeamOpen(false); }} className="text-[10px] text-tx-secondary hover:text-tx-primary transition-colors">+ New</button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto w-full">
              {teams.length === 0 && <p className="text-tx-muted text-xs p-3 text-center">No teams available</p>}
              {teams.map(team => (
                <button
                  key={team._id}
                  onClick={() => handleTeamChange(team)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-all ${currentTeam?._id === team._id ? 'text-tx-primary bg-[color:var(--surface-3)]' : 'text-surface-400 hover:text-tx-primary hover:bg-[color:var(--surface-2)]'}`}
                >
                  <span className="truncate flex-1 text-left">{team.name}</span>
                  {currentTeam?._id === team._id && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <span className="text-tx-muted opacity-50 text-xs" style={{ zIndex: teamOpen || projectOpen ? 0 : 10 }}>/</span>

      {/* Project Dropdown */}
      <div className="relative" style={{ zIndex: projectOpen ? 50 : 10 }} ref={projRef}>

        <button
          onClick={() => { if (currentTeam) { setProjectOpen(!projectOpen); setTeamOpen(false); } else { toast.error("Select a team first"); } }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border border-transparent text-xs font-semibold transition-all ${currentTeam ? 'text-tx-secondary hover:bg-[color:var(--surface-2)] hover:text-tx-primary cursor-pointer' : 'text-tx-muted opacity-50 cursor-not-allowed'}`}
        >
          {currentProject && (
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: currentProject.color || '#6366f1' }} />
          )}
          <span className="max-w-[100px] truncate">{currentProject?.name || 'Select Project'}</span>
          <svg className={`w-3 h-3 opacity-60 transition-transform ${projectOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        {projectOpen && (
          <div className="absolute left-0 top-full mt-1 w-56 bg-[color:var(--surface-1)] border border-[color:var(--border-1)] rounded-xl shadow-glass animate-in py-1">
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-[color:var(--border-1)] mb-1">
              <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Projects</span>
              <div className="flex items-center gap-2">
                <RefreshButton
                  onRefresh={async () => {
                    const result = await refreshProjects(currentTeam._id);
                    if (result.fromCache) toast(result.error, { icon: '📦', style: { background: '#E3B341', color: '#000' } });
                    else if (result.success) toast.success('Projects synced');
                    else toast.error(result.error || 'Refresh failed');
                  }}
                  loading={isRefreshingProjects}
                  tooltip="Refresh projects"
                  size={12}
                />
                <button onClick={() => { setShowProjectModal(true); setProjectOpen(false); }} className="text-[10px] text-tx-secondary hover:text-tx-primary transition-colors">+ New</button>
              </div>
            </div>
            <div className="max-h-60 overflow-y-auto w-full">
              {filteredProjects.length === 0 && <p className="text-tx-muted text-xs p-3 text-center">No projects in this team</p>}
              {filteredProjects.map(proj => (
                <button
                  key={proj._id}
                  onClick={() => handleProjectChange(proj)}
                  className={`flex items-center gap-2 w-full px-3 py-2 text-xs transition-all ${currentProject?._id === proj._id ? 'text-tx-primary bg-[color:var(--surface-3)]' : 'text-surface-400 hover:text-tx-primary hover:bg-[color:var(--surface-2)]'}`}
                >
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: proj.color || '#6366f1' }} />
                  <span className="truncate flex-1 text-left">{proj.name}</span>
                  {currentProject?._id === proj._id && <span className="w-1.5 h-1.5 rounded-full bg-accent flex-shrink-0" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
