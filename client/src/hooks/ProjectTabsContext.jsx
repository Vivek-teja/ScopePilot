import { createContext, useContext, useState } from 'react';

const ProjectTabsContext = createContext({
  activeTab: 'overview',
  setActiveTab: () => {},
  isProjectDetail: false,
  setIsProjectDetail: () => {},
});

export function ProjectTabsProvider({ children }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isProjectDetail, setIsProjectDetail] = useState(false);

  return (
    <ProjectTabsContext.Provider value={{ activeTab, setActiveTab, isProjectDetail, setIsProjectDetail }}>
      {children}
    </ProjectTabsContext.Provider>
  );
}

export function useProjectTabs() {
  return useContext(ProjectTabsContext);
}
