/**
 * AI Service Adaptor / Backward-compatibility Gateway
 * Directs all triage, chat, IVR, predictions, and hospital lookups to the Universal AI Engine and OSM Geolocation.
 */

import {
  startUniversalChat,
  analyzeUniversalCase,
  getUniversalCallingAIResponse,
  getUniversalOTPResponse,
  generateUniversalHealthRisks,
  trainUniversalAiModel,
  TriageResult,
  UniversalChatSession
} from './aiService';
import { getLiveNearbyHospitals } from './hospitalService';
import { PatientProfile, RiskPrediction, ModelHistoryEntry, Hospital } from '../types';

export type { TriageResult };

export const startNewChat = (): UniversalChatSession => {
  return startUniversalChat();
};

export const getCallingAIResponse = async (
  history: { role: string; text: string }[],
  input: string,
  currentState: string
) => {
  return getUniversalCallingAIResponse(history, input, currentState);
};

export const getOTPAIResponse = async () => {
  return getUniversalOTPResponse();
};

export const analyzeCase = async (transcript: string): Promise<TriageResult> => {
  return analyzeUniversalCase(transcript);
};

export const getRealNearbyHospitals = async (lat: number, lng: number): Promise<Hospital[]> => {
  return getLiveNearbyHospitals(lat, lng);
};

export const generateHealthRisks = async (patients: PatientProfile[]): Promise<RiskPrediction[]> => {
  return generateUniversalHealthRisks(patients);
};

export const trainAiModel = async (cumulativeDataset: any[], config: any): Promise<ModelHistoryEntry> => {
  return trainUniversalAiModel(cumulativeDataset, config);
};
