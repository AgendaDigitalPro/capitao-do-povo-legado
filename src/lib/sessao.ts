const KEY = "foto_camarada_session_id";
export const BUMPS_KEY = "foto_camarada_bumps";

/** Alguns navegadores bloqueiam o armazenamento (aba anonima, iframe). Guardamos em memoria nesses casos. */
const memoria = new Map<string, string>();

function ler(chave: string): string | null {
  try {
    const v = window.localStorage.getItem(chave);
    if (v !== null) return v;
  } catch {
    /* armazenamento bloqueado */
  }
  try {
    // Migracao: sessoes antigas ficaram no sessionStorage
    const antigo = window.sessionStorage.getItem(chave);
    if (antigo !== null) {
      try {
        window.localStorage.setItem(chave, antigo);
      } catch {
        /* ignora */
      }
      return antigo;
    }
  } catch {
    /* armazenamento bloqueado */
  }
  return memoria.get(chave) ?? null;
}

function gravar(chave: string, valor: string) {
  memoria.set(chave, valor);
  try {
    window.localStorage.setItem(chave, valor);
  } catch {
    /* armazenamento bloqueado */
  }
}

function novoId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* segue para o fallback */
  }
  // Fallback compativel com navegadores sem crypto.randomUUID
  const hex = "0123456789abcdef";
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) uuid += "-";
    else if (i === 14) uuid += "4";
    else if (i === 19) uuid += hex[(Math.floor(Math.random() * 16) & 0x3) | 0x8];
    else uuid += hex[Math.floor(Math.random() * 16)];
  }
  return uuid;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  const atual = ler(KEY);
  if (atual && UUID_RE.test(atual)) return atual;
  const id = novoId();
  gravar(KEY, id);
  return id;
}

/**
 * Restaura uma sessao vinda de um link (e-mail, WhatsApp).
 *
 * O pedido do cliente vive no localStorage do aparelho. Sem isto, quem abre o
 * link do e-mail em outro momento — ou em outro celular — cairia no inicio do
 * quiz e teria que refazer tudo, mesmo ja tendo pago.
 *
 * Ignora em silencio qualquer valor que nao seja um UUID valido, entao um link
 * adulterado nao consegue apontar a sessao para lugar nenhum.
 */
export function restaurarSessao(id: string | null | undefined): boolean {
  if (typeof window === "undefined") return false;
  if (!id || !UUID_RE.test(id)) return false;
  if (ler(KEY) === id) return true;
  gravar(KEY, id);
  return true;
}

export function getBumps(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = ler(BUMPS_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function setBumps(bumps: string[]) {
  if (typeof window === "undefined") return;
  gravar(BUMPS_KEY, JSON.stringify(bumps));
}

/* ---------------- UTMs / origem do trafego ---------------- */

const UTM_KEY = "foto_camarada_utms";
const CAMPOS_UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"] as const;

export type Utms = Partial<Record<(typeof CAMPOS_UTM)[number], string>>;

/** Le os UTMs da URL na chegada e guarda para usar na hora da venda. */
export function capturarUtms(): Utms {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const novos: Utms = {};
  for (const campo of CAMPOS_UTM) {
    const valor = params.get(campo);
    if (valor) novos[campo] = valor.slice(0, 200);
  }
  if (Object.keys(novos).length > 0) {
    gravar(UTM_KEY, JSON.stringify(novos));
    return novos;
  }
  return getUtms();
}

export function getUtms(): Utms {
  if (typeof window === "undefined") return {};
  try {
    const raw = ler(UTM_KEY);
    return raw ? (JSON.parse(raw) as Utms) : {};
  } catch {
    return {};
  }
}
