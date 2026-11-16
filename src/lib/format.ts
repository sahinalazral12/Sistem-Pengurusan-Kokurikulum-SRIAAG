// Utiliti format tarikh & masa (ms-MY, Asia/Kuala_Lumpur)
export function formatTarikh(d: Date | string): string {
  const tarikh = typeof d === "string" ? new Date(d) : d;
  return tarikh.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

export function formatTarikhPendek(d: Date | string): string {
  const tarikh = typeof d === "string" ? new Date(d) : d;
  return tarikh.toLocaleDateString("ms-MY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

export function formatMasa(d: Date | string): string {
  const tarikh = typeof d === "string" ? new Date(d) : d;
  return tarikh.toLocaleTimeString("ms-MY", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Kuala_Lumpur",
  });
}

export function formatBulanTahun(d: Date | string): string {
  const tarikh = typeof d === "string" ? new Date(d) : d;
  const bulan = tarikh.toLocaleDateString("ms-MY", { month: "short", timeZone: "Asia/Kuala_Lumpur" });
  const tahun = tarikh.getFullYear();
  return `${bulan} ${tahun}`;
}

// Label kehadiran & status laporan dalam BM
export const labelStatusKehadiran: Record<string, string> = {
  HADIR: "Hadir",
  TIDAK_HADIR: "Tidak Hadir",
  LEWAT: "Lewat",
  SAKIT: "Sakit (MC)",
  URUSAN_RASMI: "Urusan Rasmi",
};

export const labelStatusLaporan: Record<string, string> = {
  DRAF: "Draf",
  DIHANTAR: "Dihantar",
  DIKEMBALIKAN: "Dikembalikan",
  DILULUSKAN: "Diluluskan",
};

export const labelStatusSesi: Record<string, string> = {
  DIRANCANG: "Dirancang",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
  DITANGGUH: "Ditangguh",
};

export const labelKategoriUnit: Record<string, string> = {
  BERUNIFORM: "Badan Beruniform",
  KELAB: "Kelab/Persatuan",
  SUKAN: "Sukan/Permainan",
};

export const labelTahapPenilaian: Record<string, string> = {
  CEMERLANG: "Cemerlang",
  BAIK: "Baik",
  MEMUASKAN: "Memuaskan",
  PERLU_PERHATIAN: "Perlu Perhatian",
};

export const labelJawatan: Record<string, string> = {
  PENGERUSI: "Pengerusi",
  NAIB: "Naib Pengerusi",
  SETIAUSAHA: "Setiausaha",
  BENDAHARI: "Bendahari",
  AHLI: "Ahli",
};

export const labelPeranan: Record<string, string> = {
  GURU: "Guru Penasihat",
  PK: "Penyelaras Kokurikulum",
  GB: "Guru Besar",
  ADMIN: "Pentadbir Sistem",
};

// Warna badge status
export const warnaStatusKehadiran: Record<string, string> = {
  HADIR: "status-hadir",
  TIDAK_HADIR: "status-tidak-hadir",
  LEWAT: "status-lewat",
  SAKIT: "status-sakit",
  URUSAN_RASMI: "status-urusan",
};

export const senaraiStatusKehadiran = ["HADIR", "TIDAK_HADIR", "LEWAT", "SAKIT", "URUSAN_RASMI"];

// Helper API fetch dengan kredensial + fallback header sesi
// Cookie HTTP-only adalah utama; jika cookie disekat oleh gateway/preview,
// header X-SPK-Session (dari localStorage) digunakan sebagai fallback.
export async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const sesiToken = typeof window !== "undefined" ? window.localStorage.getItem("spk_sesi_token") : null;
  const res = await fetch(url, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(sesiToken ? { "x-spk-session": sesiToken } : {}),
      ...(options?.headers ?? {}),
    },
    ...options,
  });
  if (!res.ok) {
    let msg = `Ralat ${res.status}`;
    try {
      const data = await res.json();
      msg = data.ralat ?? msg;
    } catch {}
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  return (await res.text()) as unknown as T;
}
