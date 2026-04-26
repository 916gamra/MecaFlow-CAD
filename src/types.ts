import { Vector3, Euler } from 'three';

export type PartType = 'block' | 'cylinder' | 'hex_nut' | 'hole_block' | 'hole_cylinder';

export interface CADPart {
  id: string;
  name: string;
  type: PartType;
  position: [number, number, number];
  rotation: [number, number, number]; // Radians
  scale: [number, number, number];
  color: string;
  visible: boolean;
  opacity: number;
}

export interface CADState {
  parts: CADPart[];
  selectedPartId: string | null;
  viewMode: '3d' | 'drafting' | 'cnc';
  gridVisible: boolean;
  units: 'mm' | 'inch';
}
