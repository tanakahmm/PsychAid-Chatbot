import React, { createContext, useContext, ReactNode } from 'react';

interface Resource {
  id: string;
  title: string;
  description: string;
  type: 'meditation' | 'breathing' | 'article';
  duration?: number;
  content?: string;
}

interface ResourceContextType {
  getResourceById: (id: string) => Resource | undefined;
}

const ResourceContext = createContext<ResourceContextType | undefined>(undefined);

// Sample data
const resources: Resource[] = [
  {
    id: '1',
    title: 'Basic Meditation',
    description: 'A simple meditation exercise for beginners',
    type: 'meditation',
    duration: 10,
  },
  {
    id: '2',
    title: 'Deep Breathing',
    description: 'Learn deep breathing techniques for stress relief',
    type: 'breathing',
    duration: 5,
  },
  {
    id: '3',
    title: 'Understanding Anxiety',
    description: 'Learn about what causes anxiety and how to manage it',
    type: 'article',
    content: 'Anxiety is a natural response to stress...',
  },
];

export function ResourceProvider({ children }: { children: ReactNode }) {
  const getResourceById = (id: string) => {
    return resources.find(resource => resource.id === id);
  };

  return (
    <ResourceContext.Provider value={{ getResourceById }}>
      {children}
    </ResourceContext.Provider>
  );
}

export function useResources() {
  const context = useContext(ResourceContext);
  if (!context) {
    throw new Error('useResources must be used within a ResourceProvider');
  }
  return context;
} 