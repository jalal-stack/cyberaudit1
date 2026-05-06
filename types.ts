import React from 'react';

export enum ScanId {
  SSL = 'ssl',
  PORTS = 'ports',
  HEADERS = 'headers',
  CMS = 'cms',
  LEAKS = 'leaks',
  DDOS = 'ddos',
}

export interface ScanOption {
  id: ScanId;
  label: string;
  // FIX: Added React import to resolve the namespace for React.ComponentType
  icon: React.ComponentType<{ className?: string }>;
}

export enum ScanStatus {
    PASS = 'PASS',
    FAIL = 'FAIL',
    WARN = 'WARN',
}

export interface ScanResultItem {
  title: string;
  status: ScanStatus;
  summary: string;
  recommendation: string;
}

export interface ScanResults {
  overallScore: number;
  summary: string;
  details: ScanResultItem[];
}

export interface ScanHistoryItem {
  id: string;
  url: string;
  date: string;
  results: ScanResults;
}
