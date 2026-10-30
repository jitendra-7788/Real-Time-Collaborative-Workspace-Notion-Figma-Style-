import React, { useState } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext.tsx';
import { TopBar } from './TopBar.tsx';
import { Sidebar } from './Sidebar.tsx';
import { DashboardView } from '../dashboard/DashboardView.tsx';
import { RichDocumentEditor } from '../editor/RichDocumentEditor.tsx';
import { TaskBoardView } from '../tasks/TaskBoardView.tsx';
import { WorkspaceTeamView } from '../team/WorkspaceTeamView.tsx';
import { SettingsView } from '../settings/SettingsView.tsx';
import { GlobalSearchModal } from '../search/GlobalSearchModal.tsx';
import { AuthModal } from '../auth/AuthModal.tsx';
import { CreateWorkspaceModal } from '../modals/CreateWorkspaceModal.tsx';
import { CreateDocumentModal } from '../modals/CreateDocumentModal.tsx';

export const AppLayout: React.FC = () => {
  const { activeView, activeDocId } = useWorkspace();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isCreateDocOpen, setIsCreateDocOpen] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans antialiased selection:bg-blue-600/30 selection:text-blue-200">
      {/* Top Header */}
      <TopBar
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenCreateWorkspace={() => setIsCreateWsOpen(true)}
      />

      {/* Main Workspace Frame: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenCreateDoc={() => setIsCreateDocOpen(true)} />

        <main className="flex-1 overflow-y-auto bg-neutral-950">
          {activeView === 'dashboard' && (
            <DashboardView
              onOpenCreateDoc={() => setIsCreateDocOpen(true)}
              onOpenCreateTask={() => {}}
              onOpenInviteMember={() => {}}
            />
          )}

          {activeView === 'document' && <RichDocumentEditor />}

          {activeView === 'tasks' && <TaskBoardView />}

          {activeView === 'team' && <WorkspaceTeamView />}

          {activeView === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Global Modals & Dialogs */}
      <GlobalSearchModal />
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      <CreateWorkspaceModal isOpen={isCreateWsOpen} onClose={() => setIsCreateWsOpen(false)} />
      <CreateDocumentModal isOpen={isCreateDocOpen} onClose={() => setIsCreateDocOpen(false)} />
    </div>
  );
};
