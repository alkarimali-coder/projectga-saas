import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../hooks/useApi.js";

export default function Locations() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiFetch("/api/v1/locations"),
  });

  if (isLoading) return <div>Loading locations…</div>;
  if (isError) return <div className="text-danger">Failed to load locations.</div>;

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Locations</h1>
      <ul className="space-y-2">
        {data?.items?.map((l) => (
          <li key={l.id} className="border dark:border-slate-700 rounded p-3">
            <div className="font-semibold">{l.name}</div>
            <div className="text-sm opacity-70">{l.address}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
