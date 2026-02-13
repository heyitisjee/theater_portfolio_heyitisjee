
import React from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import Player from './Player';
import Lobby from './Lobby';

interface TheaterSceneProps {
  onTargetChange: (targetName: string | null) => void;
  onChairTargetChange: (chairName: string | null) => void;
  onAuditoriumDoorDistanceChange: (isNear: boolean) => void;
  onLobbyDoorDistanceChange: (isNear: boolean) => void;
  onUsherHover: (isHovering: boolean) => void;
  onStageDoorApproach: (isNear: boolean) => void;
  onPerformerHover: (isHovering: boolean) => void;
  onAuditoriumEntry: () => void;
  onAuditoriumExit: () => void;
  onPositionUpdate: (pos: { x: number, y: number, z: number }) => void;
  highlightedPoster: string | null;
  auditoriumDoorOpen: boolean;
  lobbyDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  isCameraActive: boolean;
  performerArrived: boolean;
  stagePerformerIndex: number;
  isPerformerSigning?: boolean;
  fov?: number;
  isVisible?: boolean;
  joystickInput?: { x: number, y: number };
  isTouchDevice?: boolean;
  isInAuditorium: boolean;
  equippedItem: string | null;
  hasProgram: boolean;
  phoneProps: any;
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
  onAuditoriumExit,
  onPositionUpdate,
  highlightedPoster, 
  auditoriumDoorOpen,
  lobbyDoorOpen,
  isSitting,
  sittingChairId,
  isCameraActive,
  performerArrived,
  stagePerformerIndex,
  isPerformerSigning = false,
  fov = 75,
  isVisible = true,
  joystickInput = { x: 0, y: 0 },
  isTouchDevice = false,
  isInAuditorium,
  equippedItem,
  hasProgram,
  phoneProps
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
      <ambientLight intensity={isInAuditorium ? 0.05 : 0.8} color="#ffffff" /> 
      <directionalLight position={[10, 20, 10]} intensity={isInAuditorium ? 0.1 : 0.6} castShadow />
      
      <Lobby 
        highlightedPoster={highlightedPoster} 
        auditoriumDoorOpen={auditoriumDoorOpen}
        lobbyDoorOpen={lobbyDoorOpen}
        performerArrived={performerArrived}
        stagePerformerIndex={stagePerformerIndex}
        isPerformerSigning={isPerformerSigning}
        isNearStageDoor={true}
        chandelierPos={[0, -1.2, 7.8]}
        chandelierIntensity={80}
        chandelierScale={0.5}
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
        onAuditoriumExit={onAuditoriumExit}
        onPositionUpdate={onPositionUpdate}
        auditoriumDoorOpen={auditoriumDoorOpen}
        lobbyDoorOpen={lobbyDoorOpen}
        isSitting={isSitting}
        sittingChairId={sittingChairId}
        onSecurityViolation={() => {}}
        isCameraActive={isCameraActive}
        joystickInput={joystickInput}
        isTouchDevice={isTouchDevice}
        equippedItem={equippedItem}
        hasProgram={hasProgram}
        phoneProps={phoneProps}
      />
    </group>
  );
};

export default TheaterScene;
