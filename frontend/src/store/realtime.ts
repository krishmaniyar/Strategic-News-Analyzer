import { create } from "zustand"
import { Article, Alert } from "@/types"

interface RealtimeStore {
  liveArticles: Article[];
  activeAlerts: Alert[];
  connectionStatus: "connected" | "disconnected" | "connecting";
  addArticle: (article: Article) => void;
  addAlert: (alert: Alert) => void;
  markAlertRead: (id: string) => void;
  setConnectionStatus: (status: RealtimeStore["connectionStatus"]) => void;
}

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  liveArticles: [],
  activeAlerts: [],
  connectionStatus: "disconnected",
  addArticle: (article) => set((state) => ({
    liveArticles: [article, ...state.liveArticles].slice(0, 200) // Cap at 200
  })),
  addAlert: (alert) => set((state) => ({
    activeAlerts: [alert, ...state.activeAlerts]
  })),
  markAlertRead: (id) => set((state) => ({
    activeAlerts: state.activeAlerts.map(a => a.id === id ? { ...a, is_read: true } : a)
  })),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
}))
