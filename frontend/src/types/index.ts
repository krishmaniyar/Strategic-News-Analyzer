export interface Article {
  id: string;
  title: string;
  content_raw: string | null;
  url: string;
  source_name: string;
  published_at: string | null;
  language: string;
  created_at: string;
  analysis?: ArticleAnalysis;
}

export interface ArticleAnalysis {
  sentiment_label: "Negative" | "Neutral" | "Positive" | null;
  sentiment_score: number | null;
  bias_label: "Biased" | "Non-biased" | null;
  bias_score: number | null;
  strategic_score: number | null;
  risk_level: "Low" | "Medium" | "High" | "Critical" | null;
  summary: string | null;
  key_drivers: string[];
  affected_regions: string[];
}

export interface Entity {
  id: string;
  name: string;
  type: "Person" | "Country" | "Organization" | "Treaty" | "Agreement" | "Concept";
  description: string | null;
  mention_count: number;
  global_risk_score: number;
}

export interface EntityGraphData {
  nodes: (Entity & { depth: number })[];
  edges: {
    from_entity_id: string;
    to_entity_id: string;
    relation_type: string;
    confidence: number;
  }[];
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  status: string;
  risk_level: "Low" | "Medium" | "High" | "Critical";
  involved_entity_ids: string[];
  affected_regions: string[];
  last_updated: string;
}

export interface Forecast {
  id: string;
  topic: string;
  prediction: string;
  confidence: number;
  timeframe: string;
  risk_level: string;
  key_scenarios: { scenario: string; probability: number; triggers: string[] }[];
  key_risks: string[];
  evidence_summary: string;
  brier_score: number | null;
  created_at: string;
}

// Risk level -> Tailwind color class mapping
export const RISK_COLORS: Record<string, string> = {
  Low: "text-green-600 bg-green-50",
  Medium: "text-yellow-600 bg-yellow-50",
  High: "text-orange-600 bg-orange-50",
  Critical: "text-red-600 bg-red-50",
};

export interface Alert {
  id: string;
  watchlist_id: string;
  article_id: string;
  trigger_reason: string;
  is_read: boolean;
  created_at: string;
}
