import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { UacsCode } from "@/types/tables";

export function useUacsSearch(query: string) {
  const [results, setResults] = useState<UacsCode[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("uacs_codes")
          .select("id, uacs_code, description, created_at")
          .or(`uacs_code.ilike.%${query}%,description.ilike.%${query}%`)
          .limit(8);
        if (!error) setResults((data as UacsCode[]) ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  return { results, loading };
}
