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

export interface PanConfig {
  bottomDiameter: number; 
  topDiameter: number;    
  height: number;         
  filletRadius: number;   
}

export interface TubeConfig {
  width: number;          
  height: number;         
  thickness: number;      
  length: number;         
  cornerRadius: number;   
}

export interface AssemblyConfig {
  tiltAngle: number;      
  insertionDistance: number;
  heightOffset: number;   
}

export interface ZeroGapState {
  pan: PanConfig;
  tube: TubeConfig;
  assembly: AssemblyConfig;
  renderMode: 'preview' | 'boolean';
}

export interface CADState {
  parts: CADPart[];
  selectedPartId: string | null;
  viewMode: '3d' | 'drafting' | 'cnc';
  gridVisible: boolean;
  units: 'mm' | 'inch';
  zeroGap: ZeroGapState;
}

