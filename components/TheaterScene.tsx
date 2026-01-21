
import React from 'react';
import { ThreeElements } from '@react-three/fiber';
import Player from './Player';
import Lobby from './Lobby';

// Fix: Augment the global JSX namespace for React Three Fiber to resolve missing element errors
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
  onUsherHover: (isHovering: boolean) => void;
  // New Handlers
  onStageDoorApproach: (isNear: boolean) => void;
  onPerformerHover: (isHovering: boolean) => void;
  
  highlightedPoster: string | null;
  auditoriumDoorOpen: boolean;
  isSitting: boolean;
  sittingChairId: string | null;
  isCameraActive: boolean;
  
  // New Scene State
  performerArrived: boolean;
}

const TheaterScene: React.FC<TheaterSceneProps> = ({ 
  onTargetChange, 
  onChairTargetChange,
  onAuditoriumDoorDistanceChange,
  onUsherHover,
  onStageDoorApproach,
  onPerformerHover,
  highlightedPoster, 
  auditoriumDoorOpen,
  isSitting,
  sittingChairId,
  isCameraActive,
  performerArrived
}) => {
  return (
    <>
      {/* 
        LIGHTING STRATEGY:
        Use a moderate Ambient Light so Black materials stay dark.
        Use Directional Light for definition.
        Use localized PointLights in Lobby to make it "White Cube" bright.
      */}
      <ambientLight intensity={0.4} /> 
      
      {/* Sun/Global Light */}
      <directionalLight 
        position={[10, 20, 10]} 
        intensity={0.5} 
        castShadow 
      />

      <fog attach="fog" args={['#000', 5, 60]} />
      
      <Lobby 
        highlightedPoster={highlightedPoster} 
        auditoriumDoorOpen={auditoriumDoorOpen}
        performerArrived={performerArrived}
        isNearStageDoor={true} // Passed down to trigger local effects if needed, handled by App for logic
      />
      <Player 
        onTargetChange={onTargetChange} 
        onChairTargetChange={onChairTargetChange}
        onAuditoriumDoorDistanceChange={onAuditoriumDoorDistanceChange}
        onUsherHover={onUsherHover}
        onStageDoorApproach={onStageDoorApproach}
        onPerformerHover={onPerformerHover}
        auditoriumDoorOpen={auditoriumDoorOpen}
        isSitting={isSitting}
        sittingChairId={sittingChairId}
        onSecurityViolation={() => {}} // simplified
        isCameraActive={isCameraActive}
      />
    </>
  );
};

export default TheaterScene;
