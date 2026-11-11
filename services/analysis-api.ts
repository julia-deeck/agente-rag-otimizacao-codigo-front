
export type AnalysisRequest = {
  question: string;
  code: string;
  backend: string;
  top_k?: number;
};

export type AnalysisMetrics = {
  depth_before?: number;
  depth_after?: number;
};

export type AnalysisSource = {
  title: string;
  url?: string;
};

export type AnalysisResponse = {
  request_id: string;
  status: string;
  answer: string;
  metrics?: AnalysisMetrics;
  sources?: AnalysisSource[];
  warnings?: string[];
};


const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

export async function submitAnalysis(
  payload: AnalysisRequest
): Promise<AnalysisResponse> {
  if (!API_BASE_URL) {
    throw new Error(
      "A URL do backend não foi configurada."
    );
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/analyses`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      data?.detail ||
      data?.message ||
      `Erro na comunicação com o servidor (${response.status}).`;

    throw new Error(message);
  }

  return data as AnalysisResponse;
}