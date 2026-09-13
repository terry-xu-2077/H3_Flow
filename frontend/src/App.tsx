import { useState } from "react";

import {
  CreateProjectDialog,
  ProjectHome,
  ProjectWorkspace,
} from "./features/projects/ProjectWorkspace";
import {
  makeEmptyProject,
  makeMockProjects,
  type DirectorProject,
} from "./mock/projects";

export function App() {
  const [projects, setProjects] = useState<DirectorProject[]>(() => makeMockProjects());
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const currentProject = projects.find((project) => project.id === currentProjectId);

  const updateProject = (projectId: string, updater: (project: DirectorProject) => DirectorProject) => {
    setProjects((current) => current.map((project) => project.id === projectId ? updater(project) : project));
  };

  if (!currentProject) {
    return (
      <>
        <ProjectHome
          projects={projects}
          onOpenProject={setCurrentProjectId}
          onCreateProject={() => setCreateProjectOpen(true)}
        />
        <CreateProjectDialog
          open={createProjectOpen}
          onClose={() => setCreateProjectOpen(false)}
          onCreate={(title) => {
            const project = makeEmptyProject(title);
            setProjects((current) => [...current, project]);
            setCurrentProjectId(project.id);
            setCreateProjectOpen(false);
          }}
        />
      </>
    );
  }

  return (
    <ProjectWorkspace
      project={currentProject}
      onBack={() => setCurrentProjectId(null)}
      onRenameProject={(title) => updateProject(currentProject.id, (project) => ({ ...project, title }))}
      onUpdateProjectSettings={(settings) => updateProject(currentProject.id, (project) => ({ ...project, ...settings }))}
      onSnapshotChange={(snapshot) => updateProject(currentProject.id, (project) => ({ ...project, snapshot }))}
    />
  );
}
