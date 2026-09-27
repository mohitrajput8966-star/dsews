// Fictional supplier roster for the demo organization. Deliberately spans
// reliable to unreliable performers so the Supplier Risk module (section 16)
// has something real to show.
export interface SupplierSeed {
  key: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  avgLeadTimeDays: number;
  onTimeDeliveryPct: number;
  reliabilityScore: number; // 0-100, illustrative demo score
  notes: string;
}

export const SUPPLIERS: SupplierSeed[] = [
  {
    key: "medsource",
    name: "MedSource Pharma Distributors",
    contactName: "Anita Rao",
    contactEmail: "anita.rao@medsource-demo.example",
    contactPhone: "+1-555-0101",
    avgLeadTimeDays: 5,
    onTimeDeliveryPct: 96,
    reliabilityScore: 92,
    notes: "Primary distributor for general antibiotics and analgesics. Consistently fast.",
  },
  {
    key: "apex",
    name: "Apex Healthcare Supplies",
    contactName: "Daniel Cho",
    contactEmail: "daniel.cho@apexhealthcare-demo.example",
    contactPhone: "+1-555-0102",
    avgLeadTimeDays: 7,
    onTimeDeliveryPct: 91,
    reliabilityScore: 85,
    notes: "Cardiovascular and chronic-disease generics supplier.",
  },
  {
    key: "globalmeditrade",
    name: "Global Meditrade Inc.",
    contactName: "Priya Nair",
    contactEmail: "priya.nair@globalmeditrade-demo.example",
    contactPhone: "+1-555-0103",
    avgLeadTimeDays: 10,
    onTimeDeliveryPct: 82,
    reliabilityScore: 74,
    notes: "Imports specialty injectables; moderate reliability.",
  },
  {
    key: "sunrise",
    name: "Sunrise Pharma Logistics",
    contactName: "Marcus Webb",
    contactEmail: "marcus.webb@sunrisepharma-demo.example",
    contactPhone: "+1-555-0104",
    avgLeadTimeDays: 6,
    onTimeDeliveryPct: 94,
    reliabilityScore: 88,
    notes: "GI and respiratory medicines. Reliable regional supplier.",
  },
  {
    key: "continental",
    name: "Continental Drug Wholesalers",
    contactName: "Grace Owusu",
    contactEmail: "grace.owusu@continentaldrug-demo.example",
    contactPhone: "+1-555-0105",
    avgLeadTimeDays: 12,
    onTimeDeliveryPct: 68,
    reliabilityScore: 55,
    notes: "Low-cost bulk wholesaler; frequent delays flagged by procurement team.",
  },
  {
    key: "novacare",
    name: "NovaCare Biologics Supply",
    contactName: "Elena Petrova",
    contactEmail: "elena.petrova@novacarebio-demo.example",
    contactPhone: "+1-555-0106",
    avgLeadTimeDays: 9,
    onTimeDeliveryPct: 88,
    reliabilityScore: 80,
    notes: "Cold-chain biologics: insulin, vaccines. Requires advance ordering.",
  },
  {
    key: "metroemergency",
    name: "Metro Emergency Meds Co.",
    contactName: "Sam Whitfield",
    contactEmail: "sam.whitfield@metroemergency-demo.example",
    contactPhone: "+1-555-0107",
    avgLeadTimeDays: 6,
    onTimeDeliveryPct: 97,
    reliabilityScore: 94,
    notes: "Priority courier network for critical-care and emergency drugs.",
  },
  {
    key: "valuegen",
    name: "ValueGen Pharmaceuticals",
    contactName: "Farah Idris",
    contactEmail: "farah.idris@valuegen-demo.example",
    contactPhone: "+1-555-0108",
    avgLeadTimeDays: 14,
    onTimeDeliveryPct: 60,
    reliabilityScore: 48,
    notes: "Cheapest generics; weakest on-time performance — flagged as high supplier risk.",
  },
];
