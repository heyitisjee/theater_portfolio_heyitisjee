
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
  onLobbyDoorDistanceChange: (isNear: boolean) => void; // New prop
  onUsherHover: (isHovering: boolean) => void;
  onStageDoorApproach: (isNear: boolean) => void;
  onPerformerHover: (isHovering: boolean) => void;
  highlightedPoster: string | null;
  auditoriumDoorOpen: boolean;
  lobbyDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  isCameraActive: boolean;
  performerArrived: boolean;
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
  highlightedPoster, 
  auditoriumDoorOpen,
  lobbyDoorOpen,
  isSitting,
  sittingChairId,
  isCameraActive,
  performerArrived,
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
      <ambientLight intensity={0.4} /> 
      <directionalLight position={[10, 20, 10]} intensity={0.5} castShadow />
      <fog attach="fog" args={['#000', 5, 60]} />
      
      <Lobby 
        highlightedPoster={highlightedPoster} 
        auditoriumDoorOpen={auditoriumDoorOpen}
        lobbyDoorOpen={lobbyDoorOpen}
        performerArrived={performerArrived}
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
