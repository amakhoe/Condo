import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Taxa normal de IVA em Moçambique: 16% (Código do IVA da República de Moçambique)
 */
export const MOZ_IVA_RATE = 0.16;

/**
 * Formata um valor numérico para Metical moçambicano (MT)
 * Ex: formatMZN(25000) => "25.000,00 MT"
 */
export function formatMZN(value?: number | null, includeDecimals: boolean = true): string {
  if (value === undefined || value === null || isNaN(Number(value))) {
    return `0${includeDecimals ? ',00' : ''} MT`;
  }
  const num = Number(value);
  return new Intl.NumberFormat('pt-MZ', {
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(num) + ' MT';
}

/**
 * Calcula o IVA (16%) a partir do valor base (quota/renda)
 */
export function calculateMozIva(base: number, rate: number = MOZ_IVA_RATE) {
  const baseNum = Number(base) || 0;
  const taxAmount = Math.round(baseNum * rate * 100) / 100;
  const totalAmount = Math.round((baseNum + taxAmount) * 100) / 100;
  return {
    baseAmount: baseNum,
    taxRate: Math.round(rate * 100),
    taxAmount,
    totalAmount,
  };
}

/**
 * Métodos de pagamento habituais em Moçambique
 */
export const MOZ_PAYMENT_METHODS = [
  'M-Pesa (Vodacom)',
  'e-Mola (Movitel)',
  'mKesh (Tmcel)',
  'Transferência Bancária - Millennium BIM',
  'Transferência Bancária - BCI',
  'Transferência Bancária - Standard Bank',
  'Transferência Bancária - Moza Banco',
  'POS / Cartão SIMOrede',
  'Numerário / Dinheiro (Meticais)',
] as const;

export const DEFAULT_CONDO_MOZ = {
  name: 'Condomínio Residencial Baía de Maputo',
  address: 'Av. Julius Nyerere, nº 1420, Sommerschield, Maputo - Moçambique',
  nuit: '400 892 104',
  phone: '+258 84 321 0987',
  email: 'gestao@baiademaputo.co.mz',
};

