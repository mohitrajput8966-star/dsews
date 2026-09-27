// ============================================================================
// DSEWS demo drug catalog — 83 medicines across 16 therapeutic categories.
//
// Each row is a compact tuple (see `DrugTuple` below). The `scenario` tag is
// the INTENDED outcome of the stock-out risk engine once seed.ts derives
// currentStock/leadTime/reorderLevel from it — i.e. numbers are engineered
// backwards from a target days-of-stock coverage, not randomly generated.
// seed.ts re-runs the real risk engine (packages/shared) against the
// generated data at the end and prints a distribution report so any drift
// is caught immediately (see docs/PROGRESS.md Phase 2 entry).
// ============================================================================

export type Criticality = "VITAL" | "ESSENTIAL" | "DESIRABLE";
export type PointOfUse = "IP_PHARMACY" | "OP_PHARMACY" | "EMERGENCY_PHARMACY" | "OT_STORE";
export type Scenario = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "OVERSTOCK";
export type FSN = "F" | "S" | "N";
export type Volatility = "LOW" | "MEDIUM" | "HIGH";
export type ExpiryTag = "EXPIRED" | "EXP_30" | "EXP_60" | "EXP_90" | "NORMAL";

/**
 * [code, genericName, brandName, strength, dosageForm, category, unit, unitCost,
 *  criticality, pointOfUse, supplierKey, scenario, fsn, volatility, trendPct, expiryTag]
 */
export type DrugTuple = [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  number,
  Criticality,
  PointOfUse,
  string,
  Scenario,
  FSN,
  Volatility,
  number,
  ExpiryTag
];

export const DRUG_TUPLES: DrugTuple[] = [
  // --- Antibiotics / Antimicrobials (12) ---
  ["AB-001", "Amoxicillin", "Amoxiclear 500", "500 mg", "CAPSULE", "Antibiotics", "CAPSULE", 0.08, "ESSENTIAL", "OP_PHARMACY", "medsource", "MEDIUM", "F", "LOW", 5, "NORMAL"],
  ["AB-002", "Azithromycin", "Azivance 500", "500 mg", "TABLET", "Antibiotics", "TABLET", 0.22, "ESSENTIAL", "OP_PHARMACY", "medsource", "LOW", "F", "LOW", 0, "NORMAL"],
  ["AB-003", "Ceftriaxone", "Ceftrigen 1g", "1 g", "INJECTION", "Antibiotics", "VIAL", 1.85, "VITAL", "IP_PHARMACY", "medsource", "CRITICAL", "F", "MEDIUM", 10, "NORMAL"],
  ["AB-004", "Ciprofloxacin", "Ciprovel 500", "500 mg", "TABLET", "Antibiotics", "TABLET", 0.10, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "F", "LOW", 0, "NORMAL"],
  ["AB-005", "Vancomycin", "Vancozen 500", "500 mg", "INJECTION", "Antibiotics", "VIAL", 4.50, "VITAL", "IP_PHARMACY", "globalmeditrade", "CRITICAL", "S", "HIGH", 15, "EXP_60"],
  ["AB-006", "Meropenem", "Meronex 1g", "1 g", "INJECTION", "Antibiotics", "VIAL", 6.20, "VITAL", "IP_PHARMACY", "globalmeditrade", "CRITICAL", "S", "HIGH", 20, "NORMAL"],
  ["AB-007", "Metronidazole", "Metrozole 400", "400 mg", "TABLET", "Antibiotics", "TABLET", 0.05, "ESSENTIAL", "OP_PHARMACY", "medsource", "LOW", "F", "LOW", 0, "NORMAL"],
  ["AB-008", "Doxycycline", "Doxyrin 100", "100 mg", "CAPSULE", "Antibiotics", "CAPSULE", 0.09, "ESSENTIAL", "OP_PHARMACY", "apex", "HIGH", "S", "MEDIUM", -5, "NORMAL"],
  ["AB-009", "Cefixime", "Cefiglow 200", "200 mg", "TABLET", "Antibiotics", "TABLET", 0.28, "ESSENTIAL", "OP_PHARMACY", "medsource", "LOW", "F", "LOW", 0, "NORMAL"],
  ["AB-010", "Piperacillin-Tazobactam", "Piptazen 4.5g", "4.5 g", "INJECTION", "Antibiotics", "VIAL", 8.75, "VITAL", "IP_PHARMACY", "globalmeditrade", "HIGH", "S", "HIGH", 10, "NORMAL"],
  ["AB-011", "Clindamycin", "Clindawel 300", "300 mg", "CAPSULE", "Antibiotics", "CAPSULE", 0.18, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "S", "MEDIUM", 0, "EXP_90"],
  ["AB-012", "Amoxicillin-Clavulanate", "Amoxiclear Plus 625", "625 mg", "TABLET", "Antibiotics", "TABLET", 0.35, "ESSENTIAL", "OP_PHARMACY", "medsource", "MEDIUM", "F", "LOW", 5, "NORMAL"],

  // --- Analgesics / Antipyretics (6) ---
  ["AN-001", "Paracetamol", "Cetamol 500", "500 mg", "TABLET", "Analgesics", "TABLET", 0.02, "ESSENTIAL", "OP_PHARMACY", "medsource", "OVERSTOCK", "F", "LOW", -20, "NORMAL"],
  ["AN-002", "Ibuprofen", "Ibufen 400", "400 mg", "TABLET", "Analgesics", "TABLET", 0.04, "ESSENTIAL", "OP_PHARMACY", "medsource", "LOW", "F", "LOW", 0, "NORMAL"],
  ["AN-003", "Diclofenac", "Diclonex 50", "50 mg", "TABLET", "Analgesics", "TABLET", 0.05, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "F", "LOW", 0, "NORMAL"],
  ["AN-004", "Tramadol", "Tramanex 50", "50 mg", "CAPSULE", "Analgesics", "CAPSULE", 0.30, "ESSENTIAL", "IP_PHARMACY", "apex", "HIGH", "S", "MEDIUM", 5, "NORMAL"],
  ["AN-005", "Morphine", "Morvia 10", "10 mg", "INJECTION", "Analgesics", "AMPOULE", 2.10, "VITAL", "OT_STORE", "metroemergency", "HIGH", "S", "MEDIUM", 5, "NORMAL"],
  ["AN-006", "Aspirin", "Asprovid 75", "75 mg", "TABLET", "Analgesics", "TABLET", 0.02, "ESSENTIAL", "OP_PHARMACY", "medsource", "OVERSTOCK", "F", "LOW", -15, "NORMAL"],

  // --- Cardiovascular (10) ---
  ["CV-001", "Atorvastatin", "Atorvia 20", "20 mg", "TABLET", "Cardiovascular", "TABLET", 0.12, "ESSENTIAL", "OP_PHARMACY", "apex", "OVERSTOCK", "F", "LOW", -18, "NORMAL"],
  ["CV-002", "Amlodipine", "Amlodac 5", "5 mg", "TABLET", "Cardiovascular", "TABLET", 0.06, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "F", "LOW", 0, "NORMAL"],
  ["CV-003", "Losartan", "Losatrix 50", "50 mg", "TABLET", "Cardiovascular", "TABLET", 0.10, "ESSENTIAL", "OP_PHARMACY", "apex", "MEDIUM", "F", "LOW", 0, "NORMAL"],
  ["CV-004", "Metoprolol", "Metrocor 50", "50 mg", "TABLET", "Cardiovascular", "TABLET", 0.09, "ESSENTIAL", "OP_PHARMACY", "apex", "MEDIUM", "F", "MEDIUM", -8, "NORMAL"],
  ["CV-005", "Furosemide", "Furozide 40", "40 mg", "TABLET", "Cardiovascular", "TABLET", 0.06, "ESSENTIAL", "IP_PHARMACY", "apex", "HIGH", "F", "MEDIUM", 5, "NORMAL"],
  ["CV-006", "Digoxin", "Digovel 0.25", "0.25 mg", "TABLET", "Cardiovascular", "TABLET", 0.15, "VITAL", "IP_PHARMACY", "apex", "LOW", "S", "LOW", 0, "EXP_90"],
  ["CV-007", "Clopidogrel", "Clopivas 75", "75 mg", "TABLET", "Cardiovascular", "TABLET", 0.18, "ESSENTIAL", "OP_PHARMACY", "apex", "MEDIUM", "F", "LOW", 0, "NORMAL"],
  ["CV-008", "Ramipril", "Ramicard 5", "5 mg", "TABLET", "Cardiovascular", "TABLET", 0.11, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "F", "LOW", 0, "NORMAL"],
  ["CV-009", "Nitroglycerin", "Nitrovex 0.5 SL", "0.5 mg", "TABLET", "Cardiovascular", "TABLET", 0.25, "VITAL", "EMERGENCY_PHARMACY", "metroemergency", "HIGH", "S", "HIGH", 0, "NORMAL"],
  ["CV-010", "Spironolactone", "Spirotal 25", "25 mg", "TABLET", "Cardiovascular", "TABLET", 0.13, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "S", "LOW", 0, "NORMAL"],

  // --- Diabetes / Endocrine (5) ---
  ["DB-001", "Metformin", "Metforal 500", "500 mg", "TABLET", "Diabetes", "TABLET", 0.05, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "F", "LOW", 5, "NORMAL"],
  ["DB-002", "Insulin Glargine", "Glarnova 100IU", "100 IU/mL", "INJECTION", "Diabetes", "VIAL", 18.50, "VITAL", "OP_PHARMACY", "novacare", "HIGH", "F", "MEDIUM", 10, "EXP_60"],
  ["DB-003", "Insulin Regular", "Regunova 100IU", "100 IU/mL", "INJECTION", "Diabetes", "VIAL", 14.00, "VITAL", "IP_PHARMACY", "novacare", "CRITICAL", "F", "MEDIUM", 15, "NORMAL"],
  ["DB-004", "Glimepiride", "Glimestar 2", "2 mg", "TABLET", "Diabetes", "TABLET", 0.08, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "F", "LOW", 0, "NORMAL"],
  ["DB-005", "Levothyroxine", "Levotrix 50", "50 mcg", "TABLET", "Diabetes", "TABLET", 0.07, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "F", "LOW", 0, "NORMAL"],

  // --- Gastrointestinal (5) ---
  ["GI-001", "Pantoprazole", "Pantovel 40", "40 mg", "TABLET", "Gastrointestinal", "TABLET", 0.09, "ESSENTIAL", "OP_PHARMACY", "sunrise", "MEDIUM", "F", "LOW", 0, "NORMAL"],
  ["GI-002", "Omeprazole", "Omezar 20", "20 mg", "CAPSULE", "Gastrointestinal", "CAPSULE", 0.08, "ESSENTIAL", "OP_PHARMACY", "sunrise", "LOW", "F", "LOW", 0, "NORMAL"],
  ["GI-003", "Ranitidine", "Ranidex 150", "150 mg", "TABLET", "Gastrointestinal", "TABLET", 0.06, "DESIRABLE", "OP_PHARMACY", "sunrise", "LOW", "N", "LOW", 0, "NORMAL"],
  ["GI-004", "Domperidone", "Domperon 10", "10 mg", "TABLET", "Gastrointestinal", "TABLET", 0.07, "ESSENTIAL", "OP_PHARMACY", "sunrise", "MEDIUM", "S", "MEDIUM", 0, "NORMAL"],
  ["GI-005", "Ondansetron", "Ondavel 4", "4 mg", "TABLET", "Gastrointestinal", "TABLET", 0.14, "ESSENTIAL", "IP_PHARMACY", "sunrise", "LOW", "F", "LOW", 0, "EXP_30"],

  // --- Anticoagulants (3) ---
  ["AC-001", "Enoxaparin", "Enoxavel 40", "40 mg", "INJECTION", "Anticoagulants", "SYRINGE", 3.20, "VITAL", "IP_PHARMACY", "novacare", "HIGH", "F", "MEDIUM", 10, "NORMAL"],
  ["AC-002", "Warfarin", "Warfatrix 5", "5 mg", "TABLET", "Anticoagulants", "TABLET", 0.10, "VITAL", "OP_PHARMACY", "apex", "MEDIUM", "S", "LOW", 0, "NORMAL"],
  ["AC-003", "Heparin", "Heparex 5000IU", "5000 IU", "INJECTION", "Anticoagulants", "VIAL", 2.40, "VITAL", "IP_PHARMACY", "globalmeditrade", "CRITICAL", "S", "HIGH", 12, "NORMAL"],

  // --- Anesthetics / Critical Care (6) ---
  ["CC-001", "Propofol", "Propofast 200", "200 mg", "INJECTION", "Anesthetics", "VIAL", 5.60, "VITAL", "OT_STORE", "metroemergency", "HIGH", "S", "MEDIUM", 5, "NORMAL"],
  ["CC-002", "Midazolam", "Midazogen 5", "5 mg", "INJECTION", "Anesthetics", "AMPOULE", 1.90, "VITAL", "OT_STORE", "metroemergency", "HIGH", "S", "MEDIUM", 0, "NORMAL"],
  ["CC-003", "Fentanyl", "Fentavex 100mcg", "100 mcg", "INJECTION", "Anesthetics", "AMPOULE", 3.75, "VITAL", "OT_STORE", "metroemergency", "CRITICAL", "S", "HIGH", 10, "NORMAL"],
  ["CC-004", "Succinylcholine", "Succinex 100", "100 mg", "INJECTION", "Anesthetics", "VIAL", 4.10, "VITAL", "OT_STORE", "metroemergency", "MEDIUM", "S", "MEDIUM", 0, "NORMAL"],
  ["CC-005", "Atracurium", "Atracugen 25", "25 mg", "INJECTION", "Anesthetics", "AMPOULE", 3.30, "VITAL", "OT_STORE", "metroemergency", "MEDIUM", "S", "MEDIUM", 0, "NORMAL"],
  ["CC-006", "Ketamine", "Ketavel 500", "500 mg", "INJECTION", "Anesthetics", "VIAL", 6.90, "VITAL", "OT_STORE", "metroemergency", "LOW", "N", "LOW", 0, "NORMAL"],

  // --- Respiratory (4) ---
  ["RS-001", "Salbutamol", "Salbuvent 100mcg", "100 mcg", "INHALER", "Respiratory", "INHALER", 6.50, "ESSENTIAL", "EMERGENCY_PHARMACY", "sunrise", "LOW", "F", "LOW", 0, "NORMAL"],
  ["RS-002", "Budesonide", "Budenova 200mcg", "200 mcg", "INHALER", "Respiratory", "INHALER", 8.20, "ESSENTIAL", "OP_PHARMACY", "sunrise", "MEDIUM", "S", "MEDIUM", 0, "NORMAL"],
  ["RS-003", "Montelukast", "Montevel 10", "10 mg", "TABLET", "Respiratory", "TABLET", 0.20, "ESSENTIAL", "OP_PHARMACY", "sunrise", "LOW", "F", "LOW", 0, "NORMAL"],
  ["RS-004", "Theophylline", "Theovel 200", "200 mg", "TABLET", "Respiratory", "TABLET", 0.10, "ESSENTIAL", "OP_PHARMACY", "sunrise", "LOW", "N", "LOW", 0, "NORMAL"],

  // --- Emergency / Antidotes (4) ---
  ["EM-001", "Epinephrine", "Epinovex 1mg", "1 mg", "INJECTION", "Emergency", "AMPOULE", 2.80, "VITAL", "EMERGENCY_PHARMACY", "metroemergency", "CRITICAL", "S", "HIGH", 20, "NORMAL"],
  ["EM-002", "Atropine", "Atrovel 1mg", "1 mg", "INJECTION", "Emergency", "AMPOULE", 1.60, "VITAL", "EMERGENCY_PHARMACY", "metroemergency", "CRITICAL", "S", "MEDIUM", 5, "NORMAL"],
  ["EM-003", "Naloxone", "Naloxen 0.4mg", "0.4 mg", "INJECTION", "Emergency", "AMPOULE", 3.40, "VITAL", "EMERGENCY_PHARMACY", "metroemergency", "CRITICAL", "S", "MEDIUM", 15, "EXP_30"],
  ["EM-004", "Activated Charcoal", "Carbovel 50g", "50 g", "SUSPENSION", "Emergency", "BOTTLE", 4.20, "ESSENTIAL", "EMERGENCY_PHARMACY", "metroemergency", "MEDIUM", "S", "LOW", 0, "NORMAL"],

  // --- IV Fluids / Electrolytes (6) ---
  ["IV-001", "Normal Saline 0.9%", "Salinex 500", "500 mL", "IV_FLUID", "IV Fluids", "BOTTLE", 1.20, "VITAL", "IP_PHARMACY", "sunrise", "OVERSTOCK", "F", "LOW", -10, "NORMAL"],
  ["IV-002", "Ringer Lactate", "Lactavel 500", "500 mL", "IV_FLUID", "IV Fluids", "BOTTLE", 1.35, "VITAL", "IP_PHARMACY", "sunrise", "LOW", "F", "LOW", 0, "NORMAL"],
  ["IV-003", "Dextrose 5%", "Dextrovel 500", "500 mL", "IV_FLUID", "IV Fluids", "BOTTLE", 1.30, "VITAL", "IP_PHARMACY", "sunrise", "LOW", "F", "LOW", 0, "NORMAL"],
  ["IV-004", "Potassium Chloride 15%", "Kalivel 15%", "15%", "INJECTION", "IV Fluids", "AMPOULE", 1.75, "VITAL", "IP_PHARMACY", "globalmeditrade", "CRITICAL", "S", "MEDIUM", 5, "NORMAL"],
  ["IV-005", "Sodium Bicarbonate 8.4%", "Bicarvel 8.4%", "8.4%", "INJECTION", "IV Fluids", "AMPOULE", 1.55, "VITAL", "IP_PHARMACY", "globalmeditrade", "MEDIUM", "S", "LOW", 0, "NORMAL"],
  ["IV-006", "Calcium Gluconate 10%", "Calcivel 10%", "10%", "INJECTION", "IV Fluids", "AMPOULE", 1.65, "VITAL", "IP_PHARMACY", "globalmeditrade", "MEDIUM", "S", "MEDIUM", 0, "NORMAL"],

  // --- Vitamins / Supplements (4) ---
  ["VT-001", "Vitamin B Complex", "Bcomplon", "1 tab", "TABLET", "Vitamins", "TABLET", 0.03, "DESIRABLE", "OP_PHARMACY", "valuegen", "OVERSTOCK", "F", "LOW", -25, "NORMAL"],
  ["VT-002", "Vitamin D3 60000IU", "D3vel 60K", "60000 IU", "CAPSULE", "Vitamins", "CAPSULE", 0.20, "DESIRABLE", "OP_PHARMACY", "valuegen", "LOW", "S", "LOW", 0, "NORMAL"],
  ["VT-003", "Folic Acid", "Folivel 5", "5 mg", "TABLET", "Vitamins", "TABLET", 0.02, "DESIRABLE", "OP_PHARMACY", "valuegen", "OVERSTOCK", "F", "LOW", -20, "NORMAL"],
  ["VT-004", "Iron Sucrose", "Ferrovel 100", "100 mg", "INJECTION", "Vitamins", "VIAL", 3.90, "ESSENTIAL", "IP_PHARMACY", "valuegen", "MEDIUM", "S", "MEDIUM", 0, "NORMAL"],

  // --- Antihistamines / Steroids (4) ---
  ["HS-001", "Cetirizine", "Cetrivel 10", "10 mg", "TABLET", "Antihistamines", "TABLET", 0.04, "DESIRABLE", "OP_PHARMACY", "valuegen", "OVERSTOCK", "F", "LOW", -15, "NORMAL"],
  ["HS-002", "Dexamethasone", "Dexavel 4", "4 mg", "INJECTION", "Steroids", "AMPOULE", 0.95, "VITAL", "IP_PHARMACY", "apex", "HIGH", "S", "MEDIUM", 5, "NORMAL"],
  ["HS-003", "Hydrocortisone", "Hydrovel 100", "100 mg", "INJECTION", "Steroids", "VIAL", 1.40, "VITAL", "EMERGENCY_PHARMACY", "apex", "LOW", "S", "MEDIUM", 0, "NORMAL"],
  ["HS-004", "Prednisolone", "Prednivel 10", "10 mg", "TABLET", "Steroids", "TABLET", 0.08, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "S", "LOW", 0, "NORMAL"],

  // --- Dermatological (3) ---
  ["DM-001", "Silver Sulfadiazine 1%", "Silvadene", "1%", "CREAM", "Dermatological", "TUBE", 2.60, "ESSENTIAL", "OT_STORE", "valuegen", "LOW", "N", "LOW", 0, "EXPIRED"],
  ["DM-002", "Mupirocin 2%", "Mupirovel", "2%", "OINTMENT", "Dermatological", "TUBE", 3.10, "ESSENTIAL", "OP_PHARMACY", "valuegen", "LOW", "S", "LOW", 0, "NORMAL"],
  ["DM-003", "Betamethasone 0.1%", "Betavel Cream", "0.1%", "CREAM", "Dermatological", "TUBE", 1.90, "ESSENTIAL", "OP_PHARMACY", "valuegen", "LOW", "S", "LOW", 0, "NORMAL"],

  // --- Ophthalmic (2) ---
  ["OP-001", "Ciprofloxacin 0.3%", "Ciprovel Eye", "0.3%", "EYE_DROPS", "Ophthalmic", "BOTTLE", 2.20, "DESIRABLE", "OP_PHARMACY", "apex", "LOW", "S", "LOW", 0, "EXP_30"],
  ["OP-002", "Timolol 0.5%", "Timovel Eye", "0.5%", "EYE_DROPS", "Ophthalmic", "BOTTLE", 3.50, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "S", "LOW", 0, "NORMAL"],

  // --- CNS / Psychiatric (4) ---
  ["CN-001", "Phenytoin", "Phenyvel 100", "100 mg", "TABLET", "CNS", "TABLET", 0.09, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "S", "LOW", 0, "NORMAL"],
  ["CN-002", "Sodium Valproate", "Valprovel 200", "200 mg", "TABLET", "CNS", "TABLET", 0.11, "ESSENTIAL", "OP_PHARMACY", "apex", "LOW", "S", "LOW", 0, "NORMAL"],
  ["CN-003", "Haloperidol", "Halovel 5", "5 mg", "INJECTION", "CNS", "AMPOULE", 1.30, "ESSENTIAL", "EMERGENCY_PHARMACY", "apex", "MEDIUM", "S", "MEDIUM", 0, "NORMAL"],
  ["CN-004", "Diazepam", "Diazovel 5", "5 mg", "TABLET", "CNS", "TABLET", 0.07, "ESSENTIAL", "EMERGENCY_PHARMACY", "apex", "LOW", "S", "LOW", 0, "NORMAL"],

  // --- Anti-TB (2) ---
  ["TB-001", "Isoniazid", "Isovel 300", "300 mg", "TABLET", "Anti-TB", "TABLET", 0.06, "ESSENTIAL", "OP_PHARMACY", "valuegen", "LOW", "N", "LOW", 0, "EXP_90"],
  ["TB-002", "Rifampicin", "Rifavel 450", "450 mg", "TABLET", "Anti-TB", "TABLET", 0.15, "ESSENTIAL", "OP_PHARMACY", "valuegen", "LOW", "S", "LOW", 0, "NORMAL"],

  // --- Miscellaneous (3) ---
  ["MS-001", "Oral Rehydration Salts", "Hydravel ORS", "1 sachet", "SACHET", "Miscellaneous", "SACHET", 0.10, "VITAL", "OP_PHARMACY", "medsource", "LOW", "F", "LOW", 0, "NORMAL"],
  ["MS-002", "Chlorhexidine 2%", "Chlorvel Solution", "2%", "SOLUTION", "Miscellaneous", "BOTTLE", 1.10, "ESSENTIAL", "OT_STORE", "medsource", "LOW", "F", "LOW", 0, "NORMAL"],
  ["MS-003", "Povidone Iodine 10%", "Iodovel Solution", "10%", "SOLUTION", "Miscellaneous", "BOTTLE", 1.20, "ESSENTIAL", "OT_STORE", "medsource", "LOW", "N", "LOW", 0, "EXPIRED"],
];
