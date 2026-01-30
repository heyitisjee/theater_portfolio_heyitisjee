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
  fov?: number;
  isVisible?: boolean;
  joystickInput?: { x: number, y: number };
  isTouchDevice?: boolean;
  isHoveringUsher?: boolean;
  // Added chandelier control props to match App.tsx usage
  chandelierPos?: [number, number, number];
  chandelierIntensity?: number;
  chandelierScale?: number;
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
  fov = 75,
  isVisible = true,
  joystickInput = { x: 0, y: 0 },
  isTouchDevice = false,
  isHoveringUsher = false,
  // Destructure chandelier props with defaults to ensure Lobby receives valid values
  chandelierPos = [0, 5.0, 7.8],
  chandelierIntensity = 500,
  chandelierScale = 0.8
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
      {/* Drastically reduced global lights to let the Chandelier be the main source in the lobby */}
      <ambientLight intensity={0.05} color="#ffffff" /> 
      <directionalLight position={[10, 20, 10]} intensity={0.02} castShadow />
      
      <Lobby 
        highlightedPoster={highlightedPoster} 
        auditoriumDoorOpen={auditoriumDoorOpen}
        lobbyDoorOpen={lobbyDoorOpen}
        performerArrived={performerArrived}
        stagePerformerIndex={stagePerformerIndex}
        isNearStageDoor={true}
        // Use props passed from TheaterScene instead of hardcoded values
        chandelierPos={chandelierPos}
        chandelierIntensity={chandelierIntensity}
        chandelierScale={chandelierScale}
        isHoveringUsher={isHoveringUsher}
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
      />
    </group>
  );
};

export default TheaterScene;