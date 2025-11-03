import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

type NavigationProps = {
  isNavigating: boolean;
  setIsNavigation: (isNavigating: boolean) => void;
};

export const useIsNavigating = create<NavigationProps>((set) => ({
  isNavigating: false,
  setIsNavigation: (isNavigating) => set({ isNavigating }),
}));

interface DashboardStore {
  entityDetails: any;
  userDetails: any;
  setEntityDetails: (data: any) => void;
  setUserDetails: (data: any) => void;
  allEntityDetails: any;
  setAllEntityDetails: (data: any) => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  entityDetails: null,
  userDetails: {
    me: {
      id: 'user-123',
      name: 'John Doe',
      email: 'john.doe@example.com',
      image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face',
      role: 'user',
    }
  },
  setEntityDetails: (data) => set({ entityDetails: data }),
  setUserDetails: (data) => set({ userDetails: data }),
  allEntityDetails: null,
  setAllEntityDetails: (data) => set({ allEntityDetails: data }),
}));

export { shallow };