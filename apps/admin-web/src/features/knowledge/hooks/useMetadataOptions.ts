import { useEffect, useState } from "react";
import type { MetadataOptions } from "../api/contracts";
import { knowledgeClient } from "../api/knowledgeClient";

export function useMetadataOptions() {
  const [values, setValues] = useState<MetadataOptions | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setValues(null); setError(null);
    void knowledgeClient.getMetadataOptions(controller.signal).then((next) => {
      if (!controller.signal.aborted) setValues(next);
    }).catch(() => { if (!controller.signal.aborted) setError("Metadata options are unavailable."); });
    return () => controller.abort();
  }, [revision]);
  return { values, error, retry: () => setRevision((value) => value + 1) };
}
