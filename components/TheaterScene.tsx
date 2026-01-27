
import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Player from './Player';
import Lobby from './Lobby';

declare global {
  namespace JSX {
    interface IntrinsicElements {
      [key: string]: any;
    }
  }
}

interface TheaterSceneProps {
  onTargetChange: (targetName: string | null) => void;
  onChairTargetChange: (chairName: string | null) => void;
  onAuditoriumDoorDistanceChange: (isNear: boolean) => void;
  onLobbyDoorDistanceChange: (isNear: boolean) => void;
  onUsherHover: (isHovering: boolean) => void;
  onStageDoorApproach: (isNear: boolean) => void;
  onPerformerHover: (isHovering: boolean) => void;
  onAuditoriumEntry: () => void;
  highlightedPoster: string | null;
  auditoriumDoorOpen: boolean;
  lobbyDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  isCameraActive: boolean;
  performerArrived: boolean;
  stagePerformerIndex: number;
  fov?: number;
  isVisible?: boolean;
}

const TheaterScene: React.FC<TheaterSceneProps> = ({ 
  onTargetChange, 
  onChairTargetChange,
  onAuditoriumDoorDistanceChange,
  onLobbyDoorDistanceChange,
  onUsherHover,
  onStageDoorApproach,
  onPerformerHover,
  onAuditoriumEntry,
  highlightedPoster, 
  auditoriumDoorOpen,
  lobbyDoorOpen,
  isSitting,
  sittingChairId,
  isCameraActive,
  performerArrived,
  stagePerformerIndex,
  fov = 75,
  isVisible = true
}) => {
  const { camera } = useThree();

  useFrame((state, delta) => {
    if (camera instanceof THREE.PerspectiveCamera) {
      const lerpFactor = 1 - Math.exp(-10 * delta);
      camera.fov = THREE.MathUtils.lerp(camera.fov, fov, lerpFactor);
      camera.updateProjectionMatrix();
    }
  });

  return (
    <group visible={isVisible}>
      {/* High base visibility */}
      <ambientLight intensity={1.0} color="#ffffff" /> 
      
      <directionalLight position={[10, 20, 10]} intensity={0.6} castShadow />
      
      {/* Pushed fog far back to not hide interior details */}
      <fog attach="fog" args={['#000', 40, 150]} />
      
      <Lobby 
        highlightedPoster={highlightedPoster} 
        auditoriumDoorOpen={auditoriumDoorOpen}
        lobbyDoorOpen={lobbyDoorOpen}
        performerArrived={performerArrived}
        stagePerformerIndex={stagePerformerIndex}
        isNearStageDoor={true}
      />
      <Player 
        onTargetChange={onTargetChange} 
        onChairTargetChange={onChairTargetChange}
        onAuditoriumDoorDistanceChange={onAuditoriumDoorDistanceChange}
        onLobbyDoorDistanceChange={onLobbyDoorDistanceChange}
        onUsherHover={onUsherHover}
        onStageDoorApproach={onStageDoorApproach}
        onPerformerHover={onPerformerHover}
        onAuditoriumEntry={onAuditoriumEntry}
        auditoriumDoorOpen={auditoriumDoorOpen}
        lobbyDoorOpen={lobbyDoorOpen}
        isSitting={isSitting}
        sittingChairId={sittingChairId}
        onSecurityViolation={() => {}}
        isCameraActive={isCameraActive}
      />
    </group>
  );
};

export default TheaterScene;
