export interface SignUp {
  isGM: boolean;
  orgPlayNumber: number;
  characterNumber: number;
  characterName: string;
  consumeReplay: boolean;
  repEarned: number;
  faction: string;
}

export interface BonusRep {
  faction: string;
  reputation: number;
}

export interface SessionReport {
  gameDate: string;
  gameSystem: string;
  generateGmChronicle: boolean;
  gmOrgPlayNumber: number;
  repEarned: number;
  reportingA: boolean;
  reportingB: boolean;
  reportingC: boolean;
  reportingD: boolean;
  scenario: string;
  signUps: SignUp[];
  bonusRepEarned: BonusRep[];
}

export interface PendingReport {
  report: SessionReport;
  timestamp: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export type Phase = 'session-type' | 'scenario' | 'fill-fields' | 'complete';
