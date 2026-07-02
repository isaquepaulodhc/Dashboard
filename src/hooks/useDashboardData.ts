"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData } from "@/types/dashboard";

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    try {
      const response = await fetch("/api/dashboard", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Não foi possível carregar o dashboard.");
      }

      const payload = (await response.json()) as DashboardData;

      setData(payload);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro desconhecido."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);

    try {
      const response = await fetch("/api/refresh", {
        method: "POST",
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Não foi possível atualizar os dados.");
      }

      /**
       * Após limpar o cache no backend, carregamos novamente o dashboard.
       * Isso garante que os dados exibidos venham da leitura atualizada das planilhas.
       */
      await loadDashboard();

      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Erro desconhecido."
      );
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadDashboard]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    const seconds = data?.refreshSeconds ?? 60;

    const intervalId = window.setInterval(() => {
      void loadDashboard();
    }, seconds * 1000);

    return () => window.clearInterval(intervalId);
  }, [data?.refreshSeconds, loadDashboard]);

  return {
    data,
    loading,
    refreshing,
    error,
    refresh
  };
}