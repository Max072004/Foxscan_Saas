import { create } from "zustand";

type ProjectState = {
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
};

export const useProjectStore = create<ProjectState>((set) => ({
  selectedProjectId: null,
  setSelectedProjectId: (id) => set({ selectedProjectId: id }),
}));
