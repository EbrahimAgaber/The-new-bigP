/**
 * Bioscience & Bioprocess Control Service
 * Integrates biochemical kinetic models (Monod growth, Michaelis-Menten, DO mass transfer)
 * with PubChem compound data (Glucose CID 5793, Oxygen CID 977, L-Lactate CID 10768)
 */

export interface BiologicalCompound {
  cid: number;
  name: string;
  formula: string;
  molecularWeight: number;
  role: string;
  iupacName: string;
  smiles: string;
}

export const BIOPROCESS_COMPOUNDS: Record<string, BiologicalCompound> = {
  glucose: {
    cid: 5793,
    name: 'D-Glucose',
    formula: 'C6H12O6',
    molecularWeight: 180.16,
    role: 'Primary carbon substrate & growth-limiting nutrient in cell culture',
    iupacName: '(2R,3S,4R,5R)-2,3,4,5,6-pentahydroxyhexanal',
    smiles: 'C(C1C(C(C(C(O1)O)O)O)O)O',
  },
  oxygen: {
    cid: 977,
    name: 'Molecular Oxygen (O₂)',
    formula: 'O2',
    molecularWeight: 31.998,
    role: 'Terminal electron acceptor in aerobic respiration & dissolved oxygen (DO) control',
    iupacName: 'molecular oxygen',
    smiles: 'O=O',
  },
  lactate: {
    cid: 10768,
    name: 'L-Lactic Acid',
    formula: 'C3H6O3',
    molecularWeight: 90.08,
    role: 'Metabolic byproduct indicating anaerobic drift or glycolytic overflow',
    iupacName: '(2S)-2-hydroxypropanoic acid',
    smiles: 'CC(C(=O)O)O',
  },
};

/**
 * Calculates specific cell growth rate using Monod kinetics with temperature penalty
 * @param S Substrate concentration (g/L)
 * @param DO Dissolved oxygen saturation (%)
 * @param temp Temperature (°C)
 */
export function calculateMonodGrowthRate(
  S: number,
  DO: number,
  temp: number
): { mu: number; limitingFactor: string } {
  const muMax = 0.08; // 1/h or relative rate
  const Ks = 0.5; // g/L half-saturation constant
  const optimalTemp = 37.0; // deg C

  // Substrate limitation
  const substrateFactor = S / (Ks + S);

  // Oxygen limitation (below 20% saturation, growth slows)
  const doFactor = Math.min(1.0, Math.max(0, DO / 20.0));

  // Temperature Arrhenius-type Bell curve
  const tempDeviation = Math.abs(temp - optimalTemp);
  const tempFactor = Math.max(0.05, Math.exp(-0.5 * Math.pow(tempDeviation / 3.0, 2)));

  const mu = muMax * substrateFactor * doFactor * tempFactor;

  let limitingFactor = 'Optimal Nutrient Supply';
  if (doFactor < 0.6) limitingFactor = 'Hypoxia (Oxygen Depletion)';
  else if (substrateFactor < 0.5) limitingFactor = 'Glucose Starvation';
  else if (tempDeviation > 2.0) limitingFactor = 'Thermal Stress';

  return { mu: +mu.toFixed(4), limitingFactor };
}
