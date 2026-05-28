/**
 * Serviço centralizado de API
 * Todas as chamadas ao backend passam por aqui
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000";

class APIService {
  /**
   * Faz uma requisição genérica
   */
  static async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultOptions = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const config = { ...defaultOptions, ...options };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  /**
   * GET - Obter dados
   */
  static get(endpoint) {
    return this.request(endpoint, { method: "GET" });
  }

  /**
   * POST - Enviar dados
   */
  static post(endpoint, data) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /**
   * PUT - Atualizar dados
   */
  static put(endpoint, data) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  /**
   * DELETE - Deletar dados
   */
  static delete(endpoint) {
    return this.request(endpoint, { method: "DELETE" });
  }

  // ==================== ENDPOINTS DO PIPELINE ====================

  /**
   * Verifica saúde da API
   */
  static healthCheck() {
    return this.get("/status");
  }

  /**
   * Executa o pipeline completo
   */
  static executarPipeline(usarIa = true, maxAlertasPorRegiao = 10) {
    return this.post("/pipeline/rodar", {
      usar_ia: usarIa,
      max_alertas_por_regiao: maxAlertasPorRegiao,
    });
  }

  /**
   * Obtém status do pipeline
   */
  static statusPipeline() {
    return this.get("/status");
  }

  /**
   * Obtém resultados completos
   */
  static resultados() {
    return this.get("/resultados");
  }

  /**
   * Obtém métricas gerais (KPIs)
   */
  static resumo() {
    return this.get("/resultados/resumo");
  }

  /**
   * Obtém alertas com filtros opcionais
   */
  static alertas({ severidade, regiao, limite } = {}) {
    const params = new URLSearchParams();
    if (severidade) params.append("severidade", severidade);
    if (regiao) params.append("regiao", regiao);
    if (limite) params.append("limite", limite);
    const query = params.toString() ? `?${params}` : "";
    return this.get(`/resultados/alertas${query}`);
  }

  /**
   * Obtém estatísticas por região
   */
  static porRegiao(regiao = null) {
    const query = regiao ? `?regiao=${encodeURIComponent(regiao)}` : "";
    return this.get(`/resultados/regioes${query}`);
  }

  /**
   * Obtém série temporal para gráficos de linha
   */
  static serieTemporal(regiao = null) {
    const query = regiao ? `?regiao=${encodeURIComponent(regiao)}` : "";
    return this.get(`/resultados/serie-temporal${query}`);
  }

  /**
   * Obtém informações da API
   */
  static getInfo() {
    return this.get("/");
  }
}

export default APIService;
